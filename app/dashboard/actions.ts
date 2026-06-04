'use server'

import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import { getCallerProfile } from '@/app/lib/auth'

/**
 * Assigns a doctor to an appointment.
 * Allowed roles: admin, receptionist
 */
export async function assignDoctor(appointmentId: string, doctorId: string) {
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (!['admin', 'receptionist'].includes(caller.role)) {
    return { success: false, error: 'Unauthorized: only admin or receptionist can assign doctors.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ doctor_id: doctorId })
    .eq('id', appointmentId)

  if (error) {
    return { success: false, error: 'Failed to assign doctor: ' + error.message }
  }

  return { success: true }
}

/**
 * Strict appointment status transition map.
 * Only these transitions are allowed; all others are rejected.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  // completed and cancelled are terminal states — no transitions out
};

/**
 * Updates the status of an appointment with strict state machine validation.
 * Allowed roles: admin, receptionist, doctor (own appointments only)
 */
export async function updateAppointmentStatus(appointmentId: string, newStatus: string) {
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (!['admin', 'receptionist', 'doctor'].includes(caller.role)) {
    return { success: false, error: 'Unauthorized: insufficient permissions.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  // Fetch current appointment to validate transition
  const { data: appointment, error: fetchError } = await supabaseAdmin
    .from('appointments')
    .select('id, status, doctor_id')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    return { success: false, error: 'Appointment not found.' }
  }

  // For doctors, verify the appointment is assigned to them
  if (caller.role === 'doctor' && appointment.doctor_id !== caller.id) {
    return { success: false, error: 'Unauthorized: you can only update your own appointments.' }
  }

  // Validate the transition is allowed
  const currentStatus = appointment.status;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];

  if (!allowed || !allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Invalid transition: cannot change from '${currentStatus}' to '${newStatus}'.`
    }
  }

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId)

  if (error) {
    return { success: false, error: 'Failed to update status: ' + error.message }
  }

  return { success: true }
}

/**
 * Saves clinical notes / encounter notes for an appointment.
 * Allowed roles: admin, doctor (own appointments only)
 * Receptionists cannot edit clinical notes.
 */
export async function saveClinicalNotes(appointmentId: string, notes: string) {
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (!['admin', 'doctor'].includes(caller.role)) {
    return { success: false, error: 'Unauthorized: only doctors and admins can save clinical notes.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  // For doctors, verify the appointment is assigned to them
  if (caller.role === 'doctor') {
    const { data: apt } = await supabaseAdmin
      .from('appointments')
      .select('doctor_id')
      .eq('id', appointmentId)
      .single()

    if (!apt || apt.doctor_id !== caller.id) {
      return { success: false, error: 'Unauthorized: you can only add notes to your own appointments.' }
    }
  }

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ doctor_notes: notes })
    .eq('id', appointmentId)

  if (error) {
    return { success: false, error: 'Failed to save clinical notes: ' + error.message }
  }

  return { success: true }
}

/**
 * Reschedules an appointment to a new date/time.
 * Allowed roles: patient (own appointments only), admin, receptionist
 * Validates: caller ownership, slot availability, appointment status
 */
export async function rescheduleAppointment(appointmentId: string, newScheduledAt: string) {
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  // Fetch the appointment
  const { data: appointment, error: fetchError } = await supabaseAdmin
    .from('appointments')
    .select('id, patient_email, patient_name, patient_phone, status, scheduled_at, type, doctor_id, meet_link')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    return { success: false, error: 'Appointment not found.' }
  }

  // Patients can only reschedule their own appointments
  if (caller.role === 'patient') {
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', caller.id)
      .single()

    if (!callerProfile || callerProfile.email?.toLowerCase() !== appointment.patient_email?.toLowerCase()) {
      return { success: false, error: 'Unauthorized: you can only reschedule your own appointments.' }
    }
  }

  // Only pending or confirmed appointments can be rescheduled
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    return { success: false, error: `Cannot reschedule an appointment with status '${appointment.status}'.` }
  }

  // Validate the new slot is not already booked (same double-booking guard from booking.ts)
  const requestedTime = new Date(newScheduledAt)
  const windowStart = new Date(requestedTime.getTime() - 5 * 60 * 1000)
  const windowEnd = new Date(requestedTime.getTime() + 5 * 60 * 1000)

  const { data: conflicting } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .gte('scheduled_at', windowStart.toISOString())
    .lte('scheduled_at', windowEnd.toISOString())
    .neq('status', 'cancelled')
    .neq('id', appointmentId)
    .limit(1)

  if (conflicting && conflicting.length > 0) {
    return { success: false, error: 'This time slot is no longer available. Please select another time.' }
  }

  const oldScheduledAt = appointment.scheduled_at

  // Update the appointment
  const { error: updateError } = await supabaseAdmin
    .from('appointments')
    .update({
      scheduled_at: newScheduledAt,
      reminder_sent: false  // Reset reminder flag for the new time
    })
    .eq('id', appointmentId)

  if (updateError) {
    return { success: false, error: 'Failed to reschedule: ' + updateError.message }
  }

  // Send emails (non-blocking — don't fail the reschedule if email fails)
  try {
    // Patient confirmation
    const { sendRescheduleConfirmation } = await import('@/app/lib/telemedicine/email')
    await sendRescheduleConfirmation(
      appointment.patient_email,
      appointment.patient_name,
      oldScheduledAt,
      newScheduledAt,
      appointment.meet_link,
      appointment.type
    )

    // Staff notification
    const { sendRescheduleStaffNotification } = await import('@/app/lib/telemedicine/email')
    await sendRescheduleStaffNotification(
      appointment.patient_name,
      appointment.patient_email,
      oldScheduledAt,
      newScheduledAt,
      appointment.type
    )

    // Doctor notification (if assigned)
    if (appointment.doctor_id) {
      const { data: doctorProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', appointment.doctor_id)
        .single()

      if (doctorProfile?.email) {
        const { sendRescheduleDoctorNotification } = await import('@/app/lib/telemedicine/email')
        await sendRescheduleDoctorNotification(
          doctorProfile.email,
          doctorProfile.full_name,
          appointment.patient_name,
          oldScheduledAt,
          newScheduledAt,
          appointment.type
        )
      }
    }
  } catch (emailErr) {
    console.error('Reschedule emails failed (non-blocking):', emailErr)
  }

  return { success: true }
}

/**
 * Permanently deletes a patient from the database:
 * 1. Removes all appointments associated with their email.
 * 2. Deletes their profile in the profiles table.
 * 3. Deletes their corresponding user account in Supabase Auth.
 * Allowed roles: admin
 */
export async function deletePatient(email: string) {
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (caller.role !== 'admin') {
    return { success: false, error: 'Unauthorized: only admins can delete patients.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  const normalizedEmail = email.toLowerCase().trim()

  try {
    // 1. Find profile by email first
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    const patientId = profile?.id || null
    const anonId = patientId ? patientId.substring(0, 8) : Math.random().toString(36).substring(2, 10)
    const pseudonymizedEmail = `deleted-${anonId}@marylandhealthcare.com.ng`
    const deletedTime = new Date().toISOString()

    // 2. Soft-delete and pseudonymize appointments
    // We update name, phone, email, and set deleted_at, but we preserve the medical 'notes' column.
    // Only cancel appointments that are still pending or confirmed — completed records keep their status.

    // 2a. Cancel pending/confirmed appointments by email
    const { error: aptCancelError } = await supabaseAdmin
      .from('appointments')
      .update({
        patient_id: null,
        patient_name: 'Archived Patient',
        patient_phone: '[DELETED]',
        patient_email: pseudonymizedEmail,
        status: 'cancelled',
        deleted_at: deletedTime
      })
      .eq('patient_email', normalizedEmail)
      .in('status', ['pending', 'confirmed'])

    if (aptCancelError) {
      console.error('Error cancelling pending/confirmed appointments by email:', aptCancelError)
    }

    // 2b. Pseudonymize completed/cancelled appointments by email (preserve status)
    const { error: aptArchiveError } = await supabaseAdmin
      .from('appointments')
      .update({
        patient_id: null,
        patient_name: 'Archived Patient',
        patient_phone: '[DELETED]',
        patient_email: pseudonymizedEmail,
        deleted_at: deletedTime
      })
      .eq('patient_email', normalizedEmail)
      .in('status', ['completed', 'cancelled'])

    if (aptArchiveError) {
      console.error('Error archiving completed appointments by email:', aptArchiveError)
    }

    if (patientId) {
      // Cancel pending/confirmed appointments by patient_id
      const { error: aptIdCancelError } = await supabaseAdmin
        .from('appointments')
        .update({
          patient_id: null,
          patient_name: 'Archived Patient',
          patient_phone: '[DELETED]',
          patient_email: pseudonymizedEmail,
          status: 'cancelled',
          deleted_at: deletedTime
        })
        .eq('patient_id', patientId)
        .in('status', ['pending', 'confirmed'])

      if (aptIdCancelError) {
        console.error('Error cancelling pending/confirmed appointments by patient_id:', aptIdCancelError)
      }

      // Pseudonymize completed/cancelled appointments by patient_id (preserve status)
      const { error: aptIdArchiveError } = await supabaseAdmin
        .from('appointments')
        .update({
          patient_id: null,
          patient_name: 'Archived Patient',
          patient_phone: '[DELETED]',
          patient_email: pseudonymizedEmail,
          deleted_at: deletedTime
        })
        .eq('patient_id', patientId)
        .in('status', ['completed', 'cancelled'])

      if (aptIdArchiveError) {
        console.error('Error archiving completed appointments by patient_id:', aptIdArchiveError)
      }
    }

    // 3. Soft-delete and pseudonymize patient profile
    if (profile) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: 'Archived Patient',
          phone: '[DELETED]',
          phone_number: '[DELETED]',
          email: pseudonymizedEmail,
          deleted_at: deletedTime
        })
        .eq('id', profile.id)

      if (profileError) {
        console.error('Error soft-deleting profile:', profileError)
        return { success: false, error: 'Failed to archive patient profile. The patient was NOT deleted. Please try again.' }
      }

      // Verify profile was actually pseudonymized
      const { data: verifiedProfile, error: verifyError } = await supabaseAdmin
        .from('profiles')
        .select('deleted_at, email')
        .eq('id', profile.id)
        .single()

      if (verifyError || !verifiedProfile?.deleted_at || verifiedProfile.email === normalizedEmail) {
        console.error('Profile pseudonymization verification failed:', verifyError || 'deleted_at is NULL or email unchanged')
        return { success: false, error: 'Patient profile archive could not be verified. The patient was NOT deleted. Please try again.' }
      }

      // 4. Only delete the auth user AFTER profile pseudonymization is confirmed
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profile.id)
      if (authError) {
        console.error('Error deleting auth user:', authError)
      }
    } else {
      // Fallback: search auth users list to see if they exist in auth but not profiles
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      const targetUser = users?.find((u: any) => u.email?.toLowerCase().trim() === normalizedEmail)
      if (targetUser) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
        if (authError) {
          console.error('Error deleting auth user fallback:', authError)
        }
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Error soft-deleting patient:', err)
    return { success: false, error: err.message || 'Failed to delete patient.' }
  }
}

/**
 * Fetches all appointments for a patient.
 * Resolves doctor profiles (name, specialty) safely on the server side using supabaseAdmin.
 */
export async function getPatientAppointments() {
  const caller = await getCallerProfile()

  if (!caller) {
    throw new Error('Authentication required.')
  }

  if (!supabaseAdmin) {
    throw new Error('Server configuration error.')
  }

  // Find caller correct profile email
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', caller.id)
    .single()

  if (profileErr || !profile) {
    throw new Error('Patient profile not found.')
  }

  // Fetch appointments and join doctor details securely via supabaseAdmin (bypassing public RLS for profiles)
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('*, doctor:doctor_id(full_name, specialty), clinical_notes:notes')
    .eq('patient_email', profile.email.toLowerCase().trim())
    .order('scheduled_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch patient appointments:', error)
    throw new Error('Failed to fetch appointments: ' + error.message)
  }

  return data || []
}

/**
 * Cancels a patient's own appointment.
 * Verifies caller ownership, verifies appointment status, updates status, and triggers automated email dispatch.
 */
export async function cancelAppointmentPatient(appointmentId: string) {
  const caller = await getCallerProfile()

  if (!caller) {
    return { success: false, error: 'Authentication required.' }
  }

  if (!supabaseAdmin) {
    return { success: false, error: 'Server configuration error.' }
  }

  // Fetch target appointment
  const { data: appointment, error: fetchError } = await supabaseAdmin
    .from('appointments')
    .select('id, patient_email, patient_name, status, scheduled_at, type, doctor_id, meet_link')
    .eq('id', appointmentId)
    .single()

  if (fetchError || !appointment) {
    return { success: false, error: 'Appointment not found.' }
  }

  // Verify caller email matches appointment patient email
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', caller.id)
    .single()

  if (!profile || profile.email.toLowerCase().trim() !== appointment.patient_email.toLowerCase().trim()) {
    return { success: false, error: 'Unauthorized: you can only cancel your own appointments.' }
  }

  // Status must be pending or confirmed
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    return { success: false, error: `Cannot cancel an appointment with status '${appointment.status}'.` }
  }

  // Update appointment status to cancelled
  const { error: updateError } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)

  if (updateError) {
    return { success: false, error: 'Failed to cancel appointment: ' + updateError.message }
  }

  // Trigger automated email dispatch (non-blocking)
  try {
    const {
      sendCancellationConfirmation,
      sendCancellationStaffNotification,
      sendCancellationDoctorNotification
    } = await import('@/app/lib/telemedicine/email')

    // 1. Patient cancellation confirmation
    await sendCancellationConfirmation(
      appointment.patient_email,
      appointment.patient_name,
      appointment.scheduled_at,
      appointment.type
    )

    // 2. Staff notification
    await sendCancellationStaffNotification(
      appointment.patient_name,
      appointment.patient_email,
      appointment.scheduled_at,
      appointment.type
    )

    // 3. Doctor notification (if assigned)
    if (appointment.doctor_id) {
      const { data: doctorProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', appointment.doctor_id)
        .single()

      if (doctorProfile?.email) {
        await sendCancellationDoctorNotification(
          doctorProfile.email,
          doctorProfile.full_name,
          appointment.patient_name,
          appointment.scheduled_at,
          appointment.type
        )
      }
    }
  } catch (emailErr) {
    console.error('Cancellation notifications failed (non-blocking):', emailErr)
  }

  return { success: true }
}


