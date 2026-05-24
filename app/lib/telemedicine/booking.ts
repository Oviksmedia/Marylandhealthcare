'use server';

import { createMeetLink } from './meet';
import { addMinutes, format } from 'date-fns';
import { sendBookingConfirmation, sendStaffNotification, sendWelcomeEmail, sendRegistrationStaffNotification } from './email';
import { supabaseAdmin } from '../supabaseAdmin';
import { supabase } from '../supabase';
import { PRICING_CONSTANTS } from './pricing';
import { rateLimit } from '../rateLimit';

export async function getBookedSlots(date: string): Promise<string[]> {
  try {
    // 1. Calculate date ranges strictly in the target Lagos (UTC+1) timezone,
    // making the query completely environment-independent (running identical on any server globally)
    const [year, month, day] = date.split('-').map(Number);

    // Start of Lagos day in UTC (00:00 WAT = 23:00 previous day UTC)
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    startOfDay.setUTCHours(startOfDay.getUTCHours() - 1);

    // End of Lagos day in UTC (23:59:59.999 WAT = 22:59 same day UTC)
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    endOfDay.setUTCHours(endOfDay.getUTCHours() - 1);

    // 2. Query using supabaseAdmin client to bypass Row-Level Security (RLS) constraints.
    // Anonymous public client queries would be blocked by RLS policies on the appointments table,
    // resulting in an empty [] response, leaving slots incorrectly showing as open in the UI.
    // Secure because we only select 'scheduled_at' - exposing no patient details.
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('scheduled_at')
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString())
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error fetching booked slots:', error);
      throw new Error(`Failed to fetch booked slots: ${error.message}`);
    }

    // Return raw ISO timestamps — the client will format them
    // in its own timezone so they match the UI slot labels
    return ((data || []) as { scheduled_at: string }[]).map(apt => apt.scheduled_at);
  } catch (error) {
    console.error('Error in getBookedSlots:', error);
    throw error;
  }
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function verifyPaystackPayment(reference: string): Promise<{ success: boolean; amount?: number; error?: string }> {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return { success: false, error: 'Payment verification not configured.' };
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      return { success: false, error: 'Payment was not successful.' };
    }

    return { success: true, amount: data.data.amount };
  } catch (error) {
    console.error('Paystack verification error:', error);
    return { success: false, error: 'Failed to verify payment.' };
  }
}

export async function checkFollowUpEligibility(email: string): Promise<{ eligible: boolean; parentId: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { eligible: false, parentId: null };
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) {
      return { eligible: false, parentId: null };
    }

    // Query active completed or confirmed appointments in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('id, scheduled_at')
      .eq('patient_email', normalizedEmail)
      .in('status', ['confirmed', 'completed'])
      .gte('scheduled_at', thirtyDaysAgo.toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking follow-up eligibility:', error);
      return { eligible: false, parentId: null };
    }

    if (data && data.length > 0) {
      return { eligible: true, parentId: data[0].id };
    }

    return { eligible: false, parentId: null };
  } catch (err) {
    console.error('checkFollowUpEligibility exception:', err);
    return { eligible: false, parentId: null };
  }
}

export async function calculateServicePrice(
  service: string | null | undefined, 
  type: 'telemedicine' | 'in_clinic',
  isFollowUp?: boolean,
  email?: string
): Promise<number> {
  if (type === 'in_clinic') return 0;
  
  let basePrice = PRICING_CONSTANTS.generalPractice;
  if (service === "Mental Health") basePrice = PRICING_CONSTANTS.mentalHealth;

  if (isFollowUp && email) {
    const check = await checkFollowUpEligibility(email);
    if (check.eligible) {
      return basePrice / 2;
    }
  }

  return basePrice;
}

export async function submitBooking(bookingData: {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  type: 'telemedicine' | 'in_clinic';
  scheduledAt: string;
  description: string;
  amount: number;
  service?: string | null;
  paymentReference?: string;
  consentAgreedAt?: string;
  isFollowUp?: boolean;
}) {
  try {
    // 1. Validate inputs
    if (!bookingData.patientName || !bookingData.patientEmail || !bookingData.patientPhone) {
      return { success: false, error: 'Patient name, email, and phone are required.' };
    }

    if (!isValidEmail(bookingData.patientEmail)) {
      return { success: false, error: 'Invalid email address.' };
    }

    if (!['telemedicine', 'in_clinic'].includes(bookingData.type)) {
      return { success: false, error: 'Invalid appointment type.' };
    }

    const scheduledDate = new Date(bookingData.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return { success: false, error: 'Invalid appointment date.' };
    }

    // Resolve follow-up parameters strictly on the server for security
    let resolvedIsFollowUp = false;
    let resolvedParentId: string | null = null;
    if (bookingData.isFollowUp) {
      const eligibility = await checkFollowUpEligibility(bookingData.patientEmail);
      if (eligibility.eligible) {
        resolvedIsFollowUp = true;
        resolvedParentId = eligibility.parentId;
      }
    }

    // Securely resolve price on the server
    const secureAmount = await calculateServicePrice(bookingData.service, bookingData.type, resolvedIsFollowUp, bookingData.patientEmail);

    // 2. Verify payment for telemedicine appointments
    let paymentStatus = 'unpaid';
    if (bookingData.type === 'telemedicine') {
      if (!bookingData.paymentReference) {
        return { success: false, error: 'Payment reference is required for telemedicine appointments.' };
      }

      const verification = await verifyPaystackPayment(bookingData.paymentReference);
      if (!verification.success) {
        return { success: false, error: verification.error || 'Payment verification failed.' };
      }

      // Verify amount matches using secure server-calculated price (Paystack amounts are in kobo)
      const expectedKobo = secureAmount * 100;
      if (verification.amount !== expectedKobo) {
        return { success: false, error: 'Payment amount mismatch.' };
      }

      paymentStatus = 'paid';
    }

    // 3. Check supabaseAdmin is available
    if (!supabaseAdmin) {
      console.error('Supabase admin client not configured');
      return { success: false, error: 'Server configuration error. Please contact support.' };
    }

    const startTime = scheduledDate;
    const endTime = addMinutes(startTime, 30); // Default 30 min duration

    // Timezone bounds and slot checking
    const minutes = startTime.getUTCMinutes();
    if (minutes !== 0 && minutes !== 30) {
      return { success: false, error: 'Invalid slot selection. Appointments must align to 30-minute boundaries.' };
    }

    // Double-Booking Check (Transaction/Insert guard)
    const { data: existingSlots, error: checkError } = await supabaseAdmin
      .from('appointments')
      .select('id, status, created_at')
      .eq('scheduled_at', startTime.toISOString())
      .neq('status', 'cancelled');

    if (checkError) {
      console.error('Database slot check error:', checkError);
      return { success: false, error: 'Failed to verify slot availability.' };
    }

    const isOccupied = existingSlots && existingSlots.some((apt: { status: string; created_at: string }) => {
      if (apt.status === 'confirmed') return true;
      if (apt.status === 'pending') {
        const createdAtTime = new Date(apt.created_at).getTime();
        const tenMinsAgo = Date.now() - 10 * 60 * 1000;
        return createdAtTime > tenMinsAgo;
      }
      return false;
    });

    if (isOccupied) {
      return { success: false, error: 'This time slot is no longer available. Please select another time.' };
    }

    // 3. Handle Google Meet / Jitsi for Telemedicine
    let meetLink = null;
    if (bookingData.type === 'telemedicine') {
      const meetResult = await createMeetLink(
        `Maryland Virtual Consultation: ${sanitizeInput(bookingData.patientName)}`,
        startTime.toISOString(),
        endTime.toISOString(),
        bookingData.patientEmail
      );

      meetLink = meetResult.meetLink;
    }

    let patientId: string | null = null;
    const { data: patientProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', bookingData.patientEmail.toLowerCase().trim())
      .maybeSingle();
    if (patientProfile) patientId = patientProfile.id;

    // 4. Save Appointment to Supabase
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert([{
        patient_id: patientId,
        patient_name: sanitizeInput(bookingData.patientName),
        patient_email: bookingData.patientEmail.toLowerCase().trim(),
        patient_phone: sanitizeInput(bookingData.patientPhone),
        type: bookingData.type,
        scheduled_at: startTime.toISOString(),
        meet_link: meetLink,
        notes: sanitizeInput(bookingData.description),
        status: 'confirmed',
        payment_status: paymentStatus,
        amount: secureAmount,
        consent_agreed_at: bookingData.consentAgreedAt || null,
        is_follow_up: resolvedIsFollowUp,
        parent_appointment_id: resolvedParentId
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return {
        success: false,
        error: "Database error: " + error.message
      };
    }

    // 5. Send Confirmation Emails (Patient & Staff)
    sendBookingConfirmation(
      bookingData.patientEmail,
      sanitizeInput(bookingData.patientName),
      startTime.toISOString(),
      meetLink,
      bookingData.type
    );

    sendStaffNotification(
      sanitizeInput(bookingData.patientName),
      bookingData.patientEmail,
      sanitizeInput(bookingData.patientPhone),
      bookingData.type,
      startTime.toISOString(),
      bookingData.description || '',
      meetLink
    );

    return {
      success: true,
      meetLink
    };

  } catch (error: any) {
    console.error('Booking Submission Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during booking'
    };
  }
}

export async function createPendingBooking(bookingData: {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  type: 'telemedicine' | 'in_clinic';
  scheduledAt: string;
  description: string;
  amount: number;
  service?: string | null;
  isNewPatient?: boolean;
  consentAgreedAt?: string;
  isFollowUp?: boolean;
}) {
  // Apply rate limiting
  const rateLimitCheck = await rateLimit(10, 60 * 1000);
  if (!rateLimitCheck.success) {
    return { success: false, error: rateLimitCheck.error };
  }

  try {
    if (!bookingData.patientName || !bookingData.patientEmail || !bookingData.patientPhone) {
      return { success: false, error: 'Patient name, email, and phone are required.' };
    }

    if (!isValidEmail(bookingData.patientEmail)) {
      return { success: false, error: 'Invalid email address.' };
    }

    const scheduledDate = new Date(bookingData.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return { success: false, error: 'Invalid appointment date.' };
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not configured');
      return { success: false, error: 'Server configuration error.' };
    }

    const startTime = scheduledDate;

    // Timezone bounds and slot checking
    const minutes = startTime.getUTCMinutes();
    if (minutes !== 0 && minutes !== 30) {
      return { success: false, error: 'Invalid slot selection. Appointments must align to 30-minute boundaries.' };
    }

    // Double-Booking Check (Transaction/Insert guard)
    const { data: existingSlots, error: checkError } = await supabaseAdmin
      .from('appointments')
      .select('id, status, created_at')
      .eq('scheduled_at', startTime.toISOString())
      .neq('status', 'cancelled');

    if (checkError) {
      console.error('Database slot check error:', checkError);
      return { success: false, error: 'Failed to verify slot availability.' };
    }

    const isOccupied = existingSlots && existingSlots.some((apt: { status: string; created_at: string }) => {
      if (apt.status === 'confirmed') return true;
      if (apt.status === 'pending') {
        const createdAtTime = new Date(apt.created_at).getTime();
        const tenMinsAgo = Date.now() - 10 * 60 * 1000;
        return createdAtTime > tenMinsAgo;
      }
      return false;
    });

    if (isOccupied) {
      return { success: false, error: 'This time slot is no longer available. Please select another time.' };
    }

    // Validate follow-up parameters strictly on the server for security
    let resolvedIsFollowUp = false;
    let resolvedParentId: string | null = null;
    if (bookingData.isFollowUp) {
      const eligibility = await checkFollowUpEligibility(bookingData.patientEmail);
      if (eligibility.eligible) {
        resolvedIsFollowUp = true;
        resolvedParentId = eligibility.parentId;
      }
    }

    // Securely calculate price on the server
    const secureAmount = await calculateServicePrice(bookingData.service, bookingData.type, resolvedIsFollowUp, bookingData.patientEmail);

    let patientId: string | null = null;
    const { data: patientProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', bookingData.patientEmail.toLowerCase().trim())
      .maybeSingle();
    if (patientProfile) patientId = patientProfile.id;

    // Save Pending Appointment to Supabase
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert([{
        patient_id: patientId,
        patient_name: sanitizeInput(bookingData.patientName),
        patient_email: bookingData.patientEmail.toLowerCase().trim(),
        patient_phone: sanitizeInput(bookingData.patientPhone),
        type: bookingData.type,
        scheduled_at: startTime.toISOString(),
        notes: sanitizeInput(bookingData.description),
        status: 'pending',
        payment_status: 'unpaid',
        amount: secureAmount,
        consent_agreed_at: bookingData.consentAgreedAt ? new Date().toISOString() : null,
        is_follow_up: resolvedIsFollowUp,
        parent_appointment_id: resolvedParentId
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase Pending Insert Error:', error);
      return { success: false, error: "Database error: " + error.message };
    }

    // If it's a new patient, trigger welcome email and staff registration notification
    if (bookingData.isNewPatient) {
      sendWelcomeEmail(bookingData.patientEmail, sanitizeInput(bookingData.patientName));
      sendRegistrationStaffNotification(
        sanitizeInput(bookingData.patientName),
        bookingData.patientEmail,
        sanitizeInput(bookingData.patientPhone)
      );
    }

    return {
      success: true,
      appointmentId: data.id
    };

  } catch (error: any) {
    console.error('Pending Booking Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

export async function confirmBooking(
  appointmentId: string,
  paymentReference?: string,
  consentAgreedAt?: string
) {
  // Apply rate limiting
  const rateLimitCheck = await rateLimit(15, 60 * 1000);
  if (!rateLimitCheck.success) {
    return { success: false, error: rateLimitCheck.error };
  }

  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server configuration error.' };
    }

    // 1. Get the pending appointment
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return { success: false, error: 'Appointment not found.' };
    }

    // Enforce that only pending or confirmed appointments can be processed
    if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
      return { success: false, error: 'Cannot confirm appointment: Status is not pending.' };
    }

    // Prevent double-confirmation if already confirmed
    if (appointment.status === 'confirmed') {
      return { success: true, meetLink: appointment.meet_link };
    }

    // Double-Booking Race Condition check during confirmation
    const { data: otherConfirmed, error: otherCheckError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('scheduled_at', appointment.scheduled_at)
      .eq('status', 'confirmed')
      .neq('id', appointmentId)
      .limit(1);

    if (otherCheckError) {
      console.error('Check other confirmed error:', otherCheckError);
    }

    if (otherConfirmed && otherConfirmed.length > 0) {
      return { success: false, error: 'This time slot is no longer available. Another patient has confirmed this booking.' };
    }

    let paymentStatus = appointment.payment_status;

    // 2. Verify payment for virtual appointments
    if (appointment.type === 'telemedicine') {
      if (!paymentReference) {
        return { success: false, error: 'Payment reference is required for virtual consultations.' };
      }

      const verification = await verifyPaystackPayment(paymentReference);
      if (!verification.success) {
        return { success: false, error: verification.error || 'Payment verification failed.' };
      }

      // Verify amount matches pre-saved server amount (Paystack amounts are in kobo)
      const expectedKobo = appointment.amount * 100;
      if (verification.amount !== expectedKobo) {
        return { success: false, error: 'Payment amount mismatch.' };
      }

      paymentStatus = 'paid';
    }

    // 3. Handle Google Meet / Jitsi link for Telemedicine
    let meetLink = null;
    if (appointment.type === 'telemedicine') {
      const scheduledDate = new Date(appointment.scheduled_at);
      const endTime = addMinutes(scheduledDate, 30);
      const meetResult = await createMeetLink(
        `Maryland Virtual Consultation: ${sanitizeInput(appointment.patient_name)}`,
        scheduledDate.toISOString(),
        endTime.toISOString(),
        appointment.patient_email
      );

      meetLink = meetResult.meetLink;
    }

    // 4. Update the appointment to confirmed
    const { data, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'confirmed',
        payment_status: paymentStatus,
        paystack_ref: paymentReference || null,
        meet_link: meetLink,
        ...(consentAgreedAt ? { consent_agreed_at: new Date().toISOString() } : {})
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Confirm update error:', updateError);
      return { success: false, error: 'Failed to confirm appointment: ' + updateError.message };
    }

    // 5. Send booking confirmation emails
    sendBookingConfirmation(
      appointment.patient_email,
      sanitizeInput(appointment.patient_name),
      appointment.scheduled_at,
      meetLink,
      appointment.type
    );

    sendStaffNotification(
      sanitizeInput(appointment.patient_name),
      appointment.patient_email,
      sanitizeInput(appointment.patient_phone),
      appointment.type,
      appointment.scheduled_at,
      appointment.notes,
      meetLink
    );

    return {
      success: true,
      meetLink
    };

  } catch (error: any) {
    console.error('Booking confirmation error:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Validates password strength: at least 8 chars, must contain both letters and numbers.
 */
function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

export async function registerPatientUser(userData: {
  email: string;
  password?: string;
  fullName: string;
  phone: string;
}) {
  // Apply rate limiting
  const rateLimitCheck = await rateLimit(5, 60 * 1000); // Strict limit on registrations
  if (!rateLimitCheck.success) {
    return { success: false, error: rateLimitCheck.error };
  }

  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server configuration error.' };
    }

    // Enforce password strength on the server
    if (!userData.password || !isValidPassword(userData.password)) {
      return { success: false, error: 'Password must be at least 8 characters and contain both letters and numbers.' };
    }

    const emailNormalized = userData.email.toLowerCase().trim();

    // Check if user already exists in auth to avoid duplicate errors
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
    }
    const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase().trim() === emailNormalized);
    
    if (existingUser) {
      return { success: true, user: existingUser, alreadyExists: true };
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: emailNormalized,
      password: userData.password,
      email_confirm: true, // This marks the email confirmed immediately and prevents verification emails!
      user_metadata: {
        full_name: userData.fullName,
        phone: userData.phone,
        role: 'patient'
      }
    });

    if (error) {
      console.error('Error creating patient user:', error);
      return { success: false, error: error.message };
    }

    // Direct insertion of public.profiles row using service role to bypass RLS
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: data.user.id,
        email: emailNormalized,
        full_name: userData.fullName,
        phone: userData.phone,
        role: 'patient'
      }]);

    if (profileError) {
      console.error('Error inserting profile during registration:', profileError);
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    console.error('Error in registerPatientUser:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

export async function createProfileForUser(profileData: {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role?: string;
}) {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server configuration error.' };
    }

    const { data: newProfile, error } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: profileData.id,
        email: profileData.email.toLowerCase().trim(),
        full_name: profileData.fullName,
        phone: profileData.phone || null,
        role: profileData.role || 'patient'
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, code: '23505', error: error.message };
      }
      console.error('Error creating profile for user:', error);
      return { success: false, error: error.message };
    }
    return { success: true, profile: newProfile };
  } catch (error: any) {
    console.error('Error in createProfileForUser:', error);
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

export async function remapLegacyProfile(email: string, newUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Server configuration error.' };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Retrieve the legacy profile row matching the email
    const { data: legacyProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !legacyProfile) {
      return { success: false, error: 'Legacy profile not found.' };
    }

    if (legacyProfile.id === newUserId) {
      return { success: true }; // Already correctly mapped
    }

    // Check if new profile already exists
    const { data: existingNewProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', newUserId)
      .maybeSingle();

    if (!existingNewProfile) {
      // 2. Copy its data and insert a new profile row with id = newUserId
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: newUserId,
          email: legacyProfile.email,
          full_name: legacyProfile.full_name,
          phone: legacyProfile.phone,
          phone_number: legacyProfile.phone_number,
          role: legacyProfile.role,
          specialty: legacyProfile.specialty,
          deleted_at: legacyProfile.deleted_at
        }]);

      if (insertError) {
        console.error('Error inserting re-mapped profile:', insertError);
        return { success: false, error: 'Failed to insert new profile: ' + insertError.message };
      }
    }

    // 3. Update all child appointments matching the email or patient_id to set patient_id = newUserId
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({ patient_id: newUserId })
      .or(`patient_email.eq.${normalizedEmail},patient_id.eq.${legacyProfile.id}`);

    if (updateError) {
      console.error('Error updating child appointments during remapping:', updateError);
      // Clean up the inserted profile if we just created it and update failed
      if (!existingNewProfile) {
        await supabaseAdmin.from('profiles').delete().eq('id', newUserId);
      }
      return { success: false, error: 'Failed to update child appointments: ' + updateError.message };
    }

    // 4. Delete the legacy profile row
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', legacyProfile.id);

    if (deleteError) {
      console.error('Error deleting legacy profile:', deleteError);
      // Non-blocking but logged
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in remapLegacyProfile:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during remapping.' };
  }
}


