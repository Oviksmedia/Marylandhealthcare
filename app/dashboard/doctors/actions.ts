'use server'

import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { sendDoctorWelcomeEmail } from '@/app/lib/telemedicine/email'
import { getCallerProfile } from '@/app/lib/auth'

export async function addDoctorWithAuth(data: {
  fullName: string
  email: string
  specialty: string
  phone: string
}) {
  // Server-side role verification
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can add doctors.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  if (!data.fullName || !data.email) {
    return { success: false, error: 'Name and email are required.' }
  }

  // Check if a doctor profile with this email already exists (active or soft-deleted)
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id, deleted_at, availability, sessions_config')
    .eq('email', data.email)
    .eq('role', 'doctor')
    .maybeSingle()

  if (existing && !existing.deleted_at) {
    return { success: false, error: 'A doctor with this email already exists.' }
  }

  // Create Supabase Auth account for the doctor
  const tempPassword = Math.random().toString(36).slice(-12) + 'A1!' // Generate temp password

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: data.fullName,
      role: 'doctor'
    }
  })

  if (authError) {
    console.error('Auth account creation failed:', authError)
    return { success: false, error: 'Failed to create login account: ' + authError.message }
  }

  // Create profile linked to the new auth user
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{
      id: authData.user.id,
      full_name: data.fullName,
      email: data.email,
      role: 'doctor',
      specialty: data.specialty,
      phone: data.phone,
      availability: existing?.availability || null,
      sessions_config: existing?.sessions_config || null
    }])

  if (profileError) {
    console.error('Profile creation failed:', profileError)
    // Clean up the orphaned auth user to prevent duplicate registration errors
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {})
    return { success: false, error: 'Failed to create doctor profile: ' + profileError.message }
  }

  // If this is a re-add of a soft-deleted doctor, migrate historical appointments
  if (existing && existing.deleted_at) {
    // 1. Migrate all historical appointments from old doctor ID to new doctor ID
    const { error: migrateError } = await supabaseAdmin
      .from('appointments')
      .update({ doctor_id: authData.user.id })
      .eq('doctor_id', existing.id)

    if (migrateError) {
      console.error('Failed to migrate appointments to new doctor ID:', migrateError)
      // Roll back: delete the new profile and auth user, preserve old profile
      await supabaseAdmin.from('profiles').delete().eq('id', authData.user.id).catch(() => {})
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {})
      return { success: false, error: 'Failed to migrate historical appointments: ' + migrateError.message + '. The old doctor profile has been preserved.' }
    }

    // 2. Only delete the old soft-deleted profile after successful migration
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', existing.id)

    if (deleteError) {
      console.error('Failed to delete old soft-deleted profile:', deleteError)
      // Non-fatal: appointments are already migrated, old profile is just a stale ghost
    }
  }

  // Trigger welcome email with credentials
  try {
    const emailResult = await sendDoctorWelcomeEmail(data.email, data.fullName, tempPassword)
    if (!emailResult.success) {
      console.error('Failed to send onboarding email to doctor:', emailResult.error)
    }
  } catch (err: any) {
    console.error('Failed to send onboarding email (exception):', err.message || err)
  }

  return {
    success: true,
    tempPassword,
    message: `Doctor added successfully. They can log in with their email and temporary password: ${tempPassword}`
  }
}

export async function editDoctorProfile(doctorId: string, data: {
  fullName: string
  email: string
  specialty: string
  phone: string
}) {
  // Server-side role verification
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can edit doctor profiles.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  if (!data.fullName || !data.email) {
    return { success: false, error: 'Name and email are required.' }
  }

  // Verify the target is actually a doctor
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', doctorId)
    .single()

  if (!target || target.role !== 'doctor') {
    return { success: false, error: 'Target profile is not a doctor.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: data.fullName,
      email: data.email,
      specialty: data.specialty,
      phone: data.phone
    })
    .eq('id', doctorId)

  if (error) {
    return { success: false, error: 'Failed to update doctor profile: ' + error.message }
  }

  return { success: true }
}

export async function deactivateDoctor(doctorId: string) {
  // Server-side role verification
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can deactivate doctors.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  // Verify the target is actually a doctor before deleting
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', doctorId)
    .single()

  if (!target || target.role !== 'doctor') {
    return { success: false, error: 'Target profile is not a doctor.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', doctorId)
    .eq('role', 'doctor') // Safety check: only deactivate doctors

  if (error) {
    return { success: false, error: 'Failed to deactivate doctor: ' + error.message }
  }

  // Soft deletion in Auth: delete the user login record while preserving profile data
  try {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(doctorId);
    if (authError) {
      console.error('Failed to delete doctor auth user:', authError);
    }
  } catch (authErr) {
    console.error('Failed to delete doctor auth user (non-blocking):', authErr);
  }

  return { success: true }
}

export async function suspendDoctor(doctorId: string) {
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can suspend doctors.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  // Verify the target is actually a doctor
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', doctorId)
    .single()

  if (!target || target.role !== 'doctor') {
    return { success: false, error: 'Target profile is not a doctor.' }
  }

  if (target.is_active === false) {
    return { success: false, error: 'Doctor is already suspended.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: false })
    .eq('id', doctorId)
    .eq('role', 'doctor')

  if (error) {
    return { success: false, error: 'Failed to suspend doctor: ' + error.message }
  }

  return { success: true }
}

export async function unsuspendDoctor(doctorId: string) {
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can unsuspend doctors.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role, is_active')
    .eq('id', doctorId)
    .single()

  if (!target || target.role !== 'doctor') {
    return { success: false, error: 'Target profile is not a doctor.' }
  }

  if (target.is_active !== false) {
    return { success: false, error: 'Doctor is not suspended.' }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: true })
    .eq('id', doctorId)
    .eq('role', 'doctor')

  if (error) {
    return { success: false, error: 'Failed to unsuspend doctor: ' + error.message }
  }

  return { success: true }
}

function convertSlotsToSessionsConfig(availability: Record<string, string[]>) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayConfigs: Record<string, any> = {};

  for (const day of days) {
    const slots = availability[day] || [];
    if (slots.length === 0) {
      dayConfigs[day] = { active: false, start: "09:00", end: "18:00", breaks: [] };
      continue;
    }

    // Sort slots by time
    const timeToMinutes = (s: string) => {
      const [time, ampm] = s.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    const minutesToTime = (min: number) => {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const sortedMinutes = slots.map(timeToMinutes).sort((a, b) => a - b);
    const startMinutes = sortedMinutes[0];
    const endMinutes = sortedMinutes[sortedMinutes.length - 1] + 30; // 30-min slot duration

    // Find breaks (gaps in consecutive slots)
    const breaks: { start: string; end: string }[] = [];
    let inBreak = false;
    let breakStart = 0;

    for (let t = startMinutes; t < endMinutes; t += 30) {
      const hasSlot = sortedMinutes.includes(t);
      if (!hasSlot && !inBreak) {
        inBreak = true;
        breakStart = t;
      } else if (hasSlot && inBreak) {
        inBreak = false;
        breaks.push({
          start: minutesToTime(breakStart),
          end: minutesToTime(t)
        });
      }
    }
    // If break extends to the end
    if (inBreak) {
      breaks.push({
        start: minutesToTime(breakStart),
        end: minutesToTime(endMinutes)
      });
    }

    dayConfigs[day] = {
      active: true,
      start: minutesToTime(startMinutes),
      end: minutesToTime(endMinutes),
      breaks: breaks
    };
  }

  return {
    slotDuration: 30,
    days: dayConfigs
  };
}

export async function updateDoctorAvailability(doctorId: string, availability: any) {
  // Server-side role verification
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can update doctor availability.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  // Verify target is actually a doctor
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', doctorId)
    .single()

  if (!target || target.role !== 'doctor') {
    return { success: false, error: 'Target profile is not a doctor.' }
  }

  // Reconstruct sessions_config from the slot array to keep in sync
  const sessionsConfig = convertSlotsToSessionsConfig(availability);

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      availability: availability,
      sessions_config: sessionsConfig
    })
    .eq('id', doctorId)

  if (error) {
    return { success: false, error: 'Failed to update doctor availability: ' + error.message }
  }

  return { success: true }
}
