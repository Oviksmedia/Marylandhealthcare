import { google } from 'googleapis';
import { randomUUID } from 'crypto';

/**
 * Generates a unique Jitsi Meet room link and creates a Google Calendar event.
 * Jitsi: Free, no login required, encrypted, instant.
 * Google Calendar: Still used to put the event on the clinic's calendar.
 */
export async function createMeetLink(
  summary: string,
  startTime: string,
  endTime: string,
  patientEmail?: string
) {
  try {
    // 1. Generate a unique, secure Jitsi Meet room link
    const roomId = `maryland-${randomUUID()}`;
    const meetLink = `https://meet.jit.si/${roomId}`;

    // 2. Create Google Calendar event with the Jitsi link in the description
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    const privateKey = privateKeyRaw
      ?.replace(/^"|"$/g, '')
      ?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey && calendarId) {
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      await auth.authorize();

      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.insert({
        calendarId,
        requestBody: {
          summary,
          description: `Telemedicine Consultation\n\nJoin the video call:\n${meetLink}\n\nPatient: ${patientEmail || 'N/A'}\n\nThis link requires no login — just click and join.`,
          start: { dateTime: startTime, timeZone: 'Africa/Lagos' },
          end: { dateTime: endTime, timeZone: 'Africa/Lagos' },
        },
      });

      console.log('✅ Google Calendar event created with Jitsi link');
    } else {
      console.warn('⚠ Google Calendar credentials missing — skipping calendar event');
    }

    // 3. Return the Jitsi link regardless of calendar success
    return {
      success: true,
      meetLink,
    };
  } catch (error: any) {
    console.error('Meet link generation error:', error.message);

    // Even if Google Calendar fails, still return the Jitsi link
    const roomId = `maryland-fallback-${randomUUID()}`;
    return {
      success: true,
      meetLink: `https://meet.jit.si/${roomId}`,
    };
  }
}
