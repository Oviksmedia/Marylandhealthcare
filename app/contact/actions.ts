'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const staffEmails = process.env.STAFF_NOTIFICATION_EMAILS?.split(',').map(e => e.trim()) || [
  'overcomer.israel@marylandhealthcare.com.ng',
  'chidinma.emenike@marylandhealthcare.com.ng'
]

export async function submitAppointmentRequest(formData: FormData) {
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const preferredDate = formData.get('preferredDate') as string
  const reason = formData.get('reason') as string

  if (!firstName || !lastName || !email || !phone || !reason) {
    return { success: false, error: 'All fields are required.' }
  }

  const patientName = `${firstName} ${lastName}`

  // Send notification to staff
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: staffEmails,
      subject: `New Appointment Request - ${patientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A5C5C;">New Appointment Request</h2>
          <p>A new appointment request has been submitted through the website.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Patient Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${patientName}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${email}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${phone}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Preferred Date</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${preferredDate || 'Not specified'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${reason}</td></tr>
          </table>
          <p style="color: #666; font-size: 14px;">Please contact the patient to confirm their appointment.</p>
        </div>
      `
    })
  } catch (error) {
    console.error('Failed to send appointment request email:', error)
    return { success: false, error: 'Failed to send request. Please try again or call us directly.' }
  }

  return { success: true }
}
