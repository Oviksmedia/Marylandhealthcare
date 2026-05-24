'use server';

import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { Resend } from 'resend';
import { headers } from 'next/headers';

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'Email service not configured. Please contact support.' };
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server misconfiguration. Please contact support.' };
  }

  try {
    // Generate a secure recovery link and OTP via Supabase Admin API
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const siteUrl = `${protocol}://${host}`;

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: `${siteUrl}/reset-password`,
      },
    });

    if (linkError) {
      console.error('generateLink error:', linkError.message);
      // Return success anyway to prevent user enumeration
      return { success: true };
    }

    const resetOtp = data.properties?.email_otp;
    if (!resetOtp) {
      console.error('No OTP returned from generateLink');
      return { success: true };
    }

    // Send via Resend from our verified domain
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f4c5c; padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">Maryland Healthcare</p>
        </div>

        <div style="padding: 32px 24px; color: #334155;">
          <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">We received a request to reset the password for your Maryland Healthcare account.</p>
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 8px;">Your 8-digit password reset code is:</p>
          
          <div style="text-align: center; margin: 24px 0;">
            <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #0f4c5c; color: #0f4c5c; font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 4px; padding: 14px 28px; border-radius: 8px;">
              ${resetOtp}
            </div>
          </div>

          <p style="font-size: 16px; line-height: 1.5;">Click the button below to open the password reset page, then enter this code to securely update your credentials:</p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${siteUrl}/reset-password?email=${encodeURIComponent(normalizedEmail)}" style="display: inline-block; background-color: #0f4c5c; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Reset Page</a>
          </div>

          <p style="font-size: 14px; color: #64748b; line-height: 1.5;">This security code will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        </div>

        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Maryland Healthcare &copy; ${new Date().getFullYear()}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Excellence in every heartbeat.</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: `Maryland Healthcare <${fromEmail}>`,
      to: [normalizedEmail],
      subject: 'Reset Your Password — Maryland Healthcare',
      html: htmlContent,
    });

    console.log('✅ Password reset email with OTP sent to:', normalizedEmail);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset email failed:', error.message);
    return { success: true };
  }
}
