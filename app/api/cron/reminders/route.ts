import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { sendAppointmentReminder } from '@/app/lib/telemedicine/email';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Authorization check: simple secret header validation
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      return NextResponse.json({ error: 'Cron secret not configured.' }, { status: 500 });
    }

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration missing: supabaseAdmin' }, { status: 500 });
    }

    // 2. Define the 1-hour window (e.g. 40 to 80 minutes from now to catch appointments scheduled 1 hour away)
    const now = new Date();
    const windowStart = new Date(now.getTime() + 35 * 60 * 1000); // 35 mins from now
    const windowEnd = new Date(now.getTime() + 85 * 60 * 1000);   // 85 mins from now

    // 3. Query all confirmed appointments in this window that haven't been reminded yet
    const { data: appointments, error: queryError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('status', 'confirmed')
      .or('reminder_sent.is.null,reminder_sent.eq.false')
      .gte('scheduled_at', windowStart.toISOString())
      .lte('scheduled_at', windowEnd.toISOString());

    if (queryError) {
      console.error('Cron Query Error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ message: 'No appointments in the reminder window.', count: 0 });
    }

    const results = [];

    // 4. Loop through and send reminders
    for (const appt of appointments) {
      // Send email reminder
      const emailResult = await sendAppointmentReminder(
        appt.patient_email,
        appt.patient_name,
        appt.scheduled_at,
        appt.meet_link,
        appt.type
      );

      if (emailResult.success) {
        // Mark reminder_sent flag in dedicated column (no longer polluting clinical notes)
        const { error: updateError } = await supabaseAdmin
          .from('appointments')
          .update({ reminder_sent: true })
          .eq('id', appt.id);

        if (updateError) {
          console.error(`Failed to update reminder status for appt ${appt.id}:`, updateError);
          results.push({ id: appt.id, status: 'sent_but_not_flagged', error: updateError.message });
        } else {
          results.push({ id: appt.id, status: 'sent_and_flagged' });
        }
      } else {
        results.push({ id: appt.id, status: 'failed', error: emailResult.error });
      }
    }

    return NextResponse.json({
      message: 'Reminder execution completed.',
      processed: results.length,
      details: results
    });

  } catch (err: any) {
    console.error('Unhandled Cron Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
