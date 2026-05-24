import { Resend } from 'resend';
import { format } from 'date-fns';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendBookingConfirmation(
  patientEmail: string,
  patientName: string,
  scheduledAt: string,
  meetLink: string | null,
  type: 'telemedicine' | 'in_clinic'
) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠ RESEND_API_KEY is missing. Email skipped.');
      return { success: false, error: 'API key missing' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const appointmentDate = new Date(scheduledAt);
    const formattedDate = format(appointmentDate, 'EEEE, MMMM d, yyyy');
    const formattedTime = format(appointmentDate, 'h:mm a');

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f4c5c; padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Appointment Confirmed</h1>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">Maryland Healthcare</p>
        </div>
        
        <div style="padding: 32px 24px; color: #334155;">
          <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">Dear ${escapeHtml(patientName)},</p>
          <p style="font-size: 16px; line-height: 1.5;">Your appointment has been successfully scheduled. Please review your booking details below:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Type:</strong> ${type === 'telemedicine' ? 'Virtual Consultation' : 'In-Clinic Visit'}</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Time:</strong> ${formattedTime}</p>
            
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
              <a href="${siteUrl}/login" style="display: inline-block; color: #0f4c5c; text-decoration: underline; font-weight: 600; font-size: 14px;">Log in to your Patient Portal dashboard</a>
            </div>

            ${type === 'telemedicine' && meetLink ? `
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;"><strong>Meeting Link:</strong></p>
                <a href="${meetLink}" style="display: inline-block; background-color: #0f4c5c; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">Join Video Call</a>
                <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8;">(This link requires no login. Please join 5 minutes before your scheduled time.)</p>
              </div>
            ` : ''}
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 0;">If you need to reschedule or cancel your appointment, please contact us at least 24 hours in advance.</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Maryland Healthcare &copy; ${new Date().getFullYear()}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Excellence in every heartbeat.</p>
        </div>
      </div>
    `;

    const response = await resend.emails.send({
      from: `Maryland Healthcare <${fromEmail}>`,
      to: [patientEmail],
      subject: `Appointment Confirmed - ${formattedDate}`,
      html: htmlContent,
    });

    console.log('✅ Confirmation email sent successfully:', response.data?.id);
    return { success: true, data: response };
  } catch (error: any) {
    console.error('CRITICAL: Failed to send confirmation email:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendStaffNotification(
  patientName: string,
  patientEmail: string,
  patientPhone: string,
  type: 'telemedicine' | 'in_clinic',
  scheduledAt: string,
  service?: string,
  meetLink?: string | null
) {
  try {
    if (!process.env.RESEND_API_KEY) return { success: false };

    const resend = new Resend(process.env.RESEND_API_KEY);
    const date = new Date(scheduledAt);
    const formattedDate = format(date, 'PPPP p');
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    // Staff notification recipients from env var
    const staffEmails = process.env.STAFF_NOTIFICATION_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || [];
    if (staffEmails.length === 0) {
      console.warn('⚠ STAFF_NOTIFICATION_EMAILS not configured. Staff notification skipped.');
      return { success: false };
    }

    await resend.emails.send({
      from: `Maryland Healthcare <${fromEmail}>`,
      to: staffEmails,
      subject: `New Appointment: ${patientName} (${type === 'telemedicine' ? 'Virtual' : 'In-Clinic'})`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f4c5c;">New Appointment Booking</h2>
          <p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(patientEmail)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(patientPhone)}</p>
          <p><strong>Type:</strong> ${type === 'telemedicine' ? 'Virtual Consultation' : 'In-Clinic Visit'}</p>
          <p><strong>Service:</strong> ${service || 'General Consultation'}</p>
          <p><strong>Scheduled For:</strong> ${formattedDate}</p>
          ${type === 'telemedicine' && meetLink ? `
            <div style="margin-top: 16px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #166534;">Video Call Link:</p>
              <a href="${meetLink}" style="color: #0f4c5c; word-break: break-all;">${meetLink}</a>
            </div>
          ` : ''}
          <hr />
          <p style="font-size: 14px; color: #666;">Please assign a doctor and follow up with the patient to confirm arrival/readiness.</p>
        </div>
      `
    });

    console.log('✅ Staff notification sent successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Staff notification failed:', error.message);
    return { success: false };
  }
}

export async function sendWelcomeEmail(patientEmail: string, patientName: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠ RESEND_API_KEY is missing. Welcome email skipped.');
      return { success: false };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f4c5c; padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Welcome to Maryland Healthcare</h1>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">Your Care Journey Starts Here</p>
        </div>
        
        <div style="padding: 32px 24px; color: #334155;">
          <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">Dear ${escapeHtml(patientName)},</p>
          <p style="font-size: 16px; line-height: 1.5;">Welcome to Maryland Healthcare! Your patient account has been successfully created.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f4c5c;">Account Details</h3>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;"><strong>Email/Username:</strong> ${escapeHtml(patientEmail)}</p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;"><strong>Portal Access:</strong> Use the password you specified during registration.</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <a href="${siteUrl}/login" style="display: inline-block; background-color: #0f4c5c; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Access Patient Portal</a>
            </div>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 0;">If you have any questions or require assistance, please do not hesitate to contact our support team.</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Maryland Healthcare &copy; ${new Date().getFullYear()}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Excellence in every heartbeat.</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: `Maryland Healthcare <${fromEmail}>`,
      to: [patientEmail],
      subject: `Welcome to Maryland Healthcare - Account Created`,
      html: htmlContent,
    });

    console.log('✅ Welcome email sent to patient:', patientEmail);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send welcome email:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendRegistrationStaffNotification(
  patientName: string,
  patientEmail: string,
  patientPhone: string
) {
  try {
    if (!process.env.RESEND_API_KEY) return { success: false };

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const staffEmails = process.env.STAFF_NOTIFICATION_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || [];
    if (staffEmails.length === 0) {
      console.warn('⚠ STAFF_NOTIFICATION_EMAILS not configured. Staff notification skipped.');
      return { success: false };
    }

    await resend.emails.send({
      from: `Maryland Healthcare <${fromEmail}>`,
      to: staffEmails,
      subject: `New Patient Registered: ${patientName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f4c5c;">New Patient Portal Account Created</h2>
          <p><strong>Patient Name:</strong> ${escapeHtml(patientName)}</p>
          <p><strong>Email Address:</strong> ${escapeHtml(patientEmail)}</p>
          <p><strong>Phone Number:</strong> ${escapeHtml(patientPhone)}</p>
          <hr />
          <p style="font-size: 14px; color: #666;">This user has registered on the patient portal and is now proceeding to book/pay for an appointment.</p>
        </div>
      `
    });

    console.log('✅ Registration staff notification sent');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send registration staff notification:', error.message);
    return { success: false };
  }
}

export async function sendAppointmentReminder(
  patientEmail: string,
  patientName: string,
  scheduledAt: string,
  meetLink: string | null,
  type: 'telemedicine' | 'in_clinic'
) {
  try {
    if (!process.env.RESEND_API_KEY) return { success: false };

    const resend = new Resend(process.env.RESEND_API_KEY);
    const appointmentDate = new Date(scheduledAt);
    const formattedTime = format(appointmentDate, 'h:mm a');
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f4c5c; padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Upcoming Appointment Reminder</h1>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">Starting in 1 Hour</p>
        </div>
        
        <div style="padding: 32px 24px; color: #334155;">
          <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">Dear ${escapeHtml(patientName)},</p>
          <p style="font-size: 16px; line-height: 1.5;">This is a friendly reminder that your scheduled consultation with Maryland Healthcare starts in <strong>1 hour</strong> (at <strong>${formattedTime}</strong>).</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Type:</strong> ${type === 'telemedicine' ? 'Virtual Consultation' : 'In-Clinic Visit'}</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Time:</strong> ${formattedTime} (in 1 hour)</p>
            
            ${type === 'telemedicine' && meetLink ? `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; text-align: left;"><strong>Meeting Link:</strong></p>
                <a href="${meetLink}" style="display: inline-block; background-color: #0f4c5c; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; width: 80%;">Join Virtual Consultation</a>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">(No login required. Click the button to join the call.)</p>
              </div>
            ` : `
              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">
                Please arrive at the clinic 10 minutes prior to your appointment time for registration check-in.
              </div>
            `}
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 0;">If you need to contact the clinic immediately, please call <strong>0907 448 7448</strong>.</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Maryland Healthcare &copy; ${new Date().getFullYear()}</p>
          <a href="${siteUrl}/login" style="color: #0f4c5c; text-decoration: underline; font-size: 12px; display: inline-block; margin-top: 8px;">Access Patient Portal</a>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: `Maryland Healthcare <${fromEmail}>`,
      to: [patientEmail],
      subject: `Reminder: Your Appointment is at ${formattedTime}`,
      html: htmlContent,
    });

    console.log(`✅ Reminder email sent to ${patientEmail} for ${formattedTime}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send reminder email:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendRescheduleConfirmation(
  patientEmail: string,
  patientName: string,
  oldScheduledAt: string,
  newScheduledAt: string,
  meetLink: string | null,
  type: 'telemedicine' | 'in_clinic'
) {
  try {
    if (!process.env.RESEND_API_KEY) return { success: false };

    const resend = new Resend(process.env.RESEND_API_KEY);
    const oldDate = new Date(oldScheduledAt);
    const newDate = new Date(newScheduledAt);
    const formattedOldDate = format(oldDate, 'EEEE, MMMM d, yyyy') + ' at ' + format(oldDate, 'h:mm a');
    const formattedNewDate = format(newDate, 'EEEE, MMMM d, yyyy');
    const formattedNewTime = format(newDate, 'h:mm a');
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const htmlContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f4c5c; padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Appointment Rescheduled</h1>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">Maryland Healthcare</p>
        </div>
        <div style="padding: 32px 24px; color: #334155;">
          <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">Dear ${escapeHtml(patientName)},</p>
          <p style="font-size: 16px; line-height: 1.5;">Your appointment has been successfully rescheduled. Please review the updated details below:</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Previous Time:</strong> <span style="text-decoration: line-through;">${formattedOldDate}</span></p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #0f4c5c;"><strong>New Date:</strong> ${formattedNewDate}</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #0f4c5c;"><strong>New Time:</strong> ${formattedNewTime}</p>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;"><strong>Type:</strong> ${type === 'telemedicine' ? 'Virtual Consultation' : 'In-Clinic Visit'}</p>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
              <a href="${siteUrl}/dashboard/my-appointments" style="display: inline-block; color: #0f4c5c; text-decoration: underline; font-weight: 600; font-size: 14px;">View in Patient Portal</a>
            </div>
            ${type === 'telemedicine' && meetLink ? `
              <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;"><strong>Meeting Link (unchanged):</strong></p>
                <a href="${meetLink}" style="display: inline-block; background-color: #0f4c5c; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">Join Video Call</a>
              </div>
            ` : ''}
          </div>
          <p style="font-size: 16px; line-height: 1.5; margin-bottom: 0;">If you need to reschedule again, please do so at least 24 hours in advance through your patient portal.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Maryland Healthcare &copy; ${new Date().getFullYear()}</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: `Maryland Healthcare <${fromEmail}>`,
      to: [patientEmail],
      subject: `Appointment Rescheduled - ${formattedNewDate}`,
      html: htmlContent,
    });

    console.log('✅ Reschedule confirmation sent to patient:', patientEmail);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send reschedule confirmation:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendRescheduleStaffNotification(
  patientName: string,
  patientEmail: string,
  oldScheduledAt: string,
  newScheduledAt: string,
  type: 'telemedicine' | 'in_clinic'
) {
  try {
    if (!process.env.RESEND_API_KEY) return { success: false };

    const resend = new Resend(process.env.RESEND_API_KEY);
    const oldDate = new Date(oldScheduledAt);
    const newDate = new Date(newScheduledAt);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const staffEmails = process.env.STAFF_NOTIFICATION_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || [];
    if (staffEmails.length === 0) {
      console.warn('⚠ STAFF_NOTIFICATION_EMAILS not configured. Staff notification skipped.');
      return { success: false };
    }

    await resend.emails.send({
      from: `Maryland Healthcare <${fromEmail}>`,
      to: staffEmails,
      subject: `Rescheduled: ${patientName} moved from ${format(oldDate, 'MMM d')} to ${format(newDate, 'MMM d')}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f4c5c;">Appointment Rescheduled</h2>
          <p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(patientEmail)}</p>
          <p><strong>Type:</strong> ${type === 'telemedicine' ? 'Virtual' : 'In-Clinic'}</p>
          <p><strong>Previous Time:</strong> <span style="text-decoration: line-through;">${format(oldDate, 'PPPP p')}</span></p>
          <p style="color: #0f4c5c;"><strong>New Time:</strong> ${format(newDate, 'PPPP p')}</p>
          <hr />
          <p style="font-size: 14px; color: #666;">The patient has rescheduled their appointment. Please update your records accordingly.</p>
        </div>
      `
    });

    console.log('✅ Reschedule staff notification sent');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send reschedule staff notification:', error.message);
    return { success: false };
  }
}

export async function sendRescheduleDoctorNotification(
  doctorEmail: string,
  doctorName: string,
  patientName: string,
  oldScheduledAt: string,
  newScheduledAt: string,
  type: 'telemedicine' | 'in_clinic'
) {
  try {
    if (!process.env.RESEND_API_KEY) return { success: false };

    const resend = new Resend(process.env.RESEND_API_KEY);
    const oldDate = new Date(oldScheduledAt);
    const newDate = new Date(newScheduledAt);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    await resend.emails.send({
      from: `Maryland Healthcare <${fromEmail}>`,
      to: [doctorEmail],
      subject: `Rescheduled: ${patientName} moved to ${format(newDate, 'MMM d, h:mm a')}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f4c5c;">Your Patient Rescheduled</h2>
          <p>Dear Dr. ${escapeHtml(doctorName)},</p>
          <p><strong>Patient:</strong> ${escapeHtml(patientName)}</p>
          <p><strong>Type:</strong> ${type === 'telemedicine' ? 'Virtual' : 'In-Clinic'}</p>
          <p><strong>Previous Time:</strong> <span style="text-decoration: line-through;">${format(oldDate, 'PPPP p')}</span></p>
          <p style="color: #0f4c5c;"><strong>New Time:</strong> ${format(newDate, 'PPPP p')}</p>
          <hr />
          <p style="font-size: 14px; color: #666;">Please update your schedule accordingly.</p>
        </div>
      `
    });

    console.log(`✅ Reschedule doctor notification sent to ${doctorEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send reschedule doctor notification:', error.message);
    return { success: false };
  }
}
