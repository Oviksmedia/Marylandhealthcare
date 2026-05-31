import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

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

    // 2. Define the 10-minute window for pending bookings expiration
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // 3. Delete pending appointments older than 10 minutes
    const { data: expiredBookings, error: deleteError } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', tenMinutesAgo.toISOString())
      .select('id, patient_name, scheduled_at');

    if (deleteError) {
      console.error('Cron Cleanup Delete Error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 4. Cancel pending appointments where the scheduled time has already passed
    const now = new Date();
    const { data: cancelledBookings, error: cancelError } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('status', 'pending')
      .lt('scheduled_at', now.toISOString())
      .select('id, patient_name, scheduled_at');

    if (cancelError) {
      console.error('Cron Cleanup Cancel Error:', cancelError);
      return NextResponse.json({ error: cancelError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Pending bookings cleanup execution completed successfully.',
      cleanedCount: expiredBookings?.length || 0,
      cancelledCount: cancelledBookings?.length || 0,
      details: {
        deleted: expiredBookings || [],
        cancelled: cancelledBookings || []
      }
    });

  } catch (err: any) {
    console.error('Unhandled Cron Cleanup Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
