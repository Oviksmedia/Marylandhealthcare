'use server';

import { createMeetLink } from './meet';
import { addMinutes, format } from 'date-fns';
import { sendBookingConfirmation, sendStaffNotification, sendWelcomeEmail, sendRegistrationStaffNotification } from './email';
import { supabaseAdmin } from '../supabaseAdmin';
import { supabase } from '../supabase';
import { PRICING_CONSTANTS } from './pricing';
import { rateLimit } from '../rateLimit';

function slotToIsoString(dateStr: string, slot: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [time, ampm] = slot.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  // Lagos WAT is UTC+1. So we subtract 1 hour to get UTC time.
  const utcHours = hours - 1;
  const dateObj = new Date(Date.UTC(year, month - 1, day, utcHours, minutes, 0, 0));
  return dateObj.toISOString();
}

function mapServiceToSpecialty(service: string | null | undefined): string | null {
  if (!service) return null;
  const s = service.trim();
  if (s === "General Practice" || s === "General Medicine") return "General Practice";
  if (s === "Mental Health") return "Mental Health";
  if (s === "Pediatrics" || s === "Child Health") return "Pediatrics";
  if (s === "Maternity & Childbirth" || s === "Maternity & Prenatal" || s === "Obstetrics") return "Obstetrics";
  if (s === "Internal Medicine") return "Internal Medicine";
  if (s === "Diagnostic Laboratory") return "Diagnostic Laboratory";
  return s;
}

async function getActiveDoctorsList(specialty?: string | null): Promise<any[]> {
  if (!supabaseAdmin) return [];
  
  const resolvedSpecialty = specialty ? mapServiceToSpecialty(specialty) : null;

  // Attempt 1: Query with is_active filter
  let query1 = supabaseAdmin
    .from('profiles')
    .select('id, availability, specialty')
    .eq('role', 'doctor')
    .eq('is_active', true)
    .is('deleted_at', null);
  
  if (resolvedSpecialty) {
    query1 = query1.eq('specialty', resolvedSpecialty);
  }
  
  const { data, error } = await query1;
  if (!error) return data || [];

  // Attempt 2 Fallback: If is_active doesn't exist, omit it from the query entirely
  if (error.message.includes('is_active') || error.code === 'PGRST100' || error.message.includes('column')) {
    console.warn("is_active column is missing in Supabase. Falling back to default query.");
    let query2 = supabaseAdmin
      .from('profiles')
      .select('id, availability, specialty')
      .eq('role', 'doctor')
      .is('deleted_at', null);
      
    if (resolvedSpecialty) {
      query2 = query2.eq('specialty', resolvedSpecialty);
    }
    const { data: fallbackData, error: fallbackError } = await query2;
    if (fallbackError) {
      console.error("Fallback doctor query failed:", fallbackError);
      return [];
    }
    return fallbackData || [];
  }
  
  console.error("Doctor query failed:", error);
  return [];
}

async function findFreeDoctorForSlot(scheduledAtIso: string, specialty: string | null): Promise<string | null> {
  if (!supabaseAdmin) return null;

  const dateObj = new Date(scheduledAtIso);
  // Aligns to Lagos time to find day of week
  const lagosTime = new Date(dateObj.getTime() + 1 * 60 * 60 * 1000);
  const dayOfWeek = format(lagosTime, 'eeee').toLowerCase(); // e.g. 'monday'

  // Format to WAT slot representation: e.g. "09:30 AM"
  let hours = lagosTime.getUTCHours();
  const minutes = lagosTime.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;
  const hoursStr = hours < 10 ? "0" + hours : hours;
  const slotLabel = `${hoursStr}:${minutesStr} ${ampm}`;

  // 1. Fetch active, non-deleted doctors of this specialty via self-healing query
  const doctors = await getActiveDoctorsList(specialty);
  if (!doctors || doctors.length === 0) {
    return null;
  }

  // 2. Fetch conflicting appointments at this exact time
  const { data: conflicts, error: conflictError } = await supabaseAdmin
    .from('appointments')
    .select('doctor_id, status, created_at')
    .eq('scheduled_at', scheduledAtIso)
    .neq('status', 'cancelled');

  if (conflictError) {
    console.error('Error fetching conflicts for auto-assign:', conflictError);
  }

  const activeConflicts = (conflicts || []).filter((apt: any) => {
    if (apt.status === 'confirmed') return true;
    if (apt.status === 'pending') {
      const createdAtTime = new Date(apt.created_at).getTime();
      const tenMinsAgo = Date.now() - 10 * 60 * 1000;
      return createdAtTime > tenMinsAgo;
    }
    return false;
  });

  // 3. Find the first doctor who is scheduled for this slot and has no conflicts
  for (const doc of doctors) {
    const avail = (doc.availability as any) || {};
    const slotsForDay = avail[dayOfWeek] || [];
    const isScheduled = slotsForDay.includes(slotLabel);
    if (!isScheduled) continue;

    const hasConflict = activeConflicts.some((apt: any) => apt.doctor_id === doc.id);
    if (!hasConflict) {
      return doc.id;
    }
  }

  return null;
}

function slotLabelToMinutes(label: string): number {
  const [time, ampm] = label.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export async function getDaySlots(date: string, specialty?: string | null): Promise<{ allSlots: string[], bookedSlots: string[] }> {
  try {
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = format(dateObj, 'eeee').toLowerCase();

    const doctors = await getActiveDoctorsList(specialty);

    const slotSet = new Set<string>();
    if (doctors && doctors.length > 0) {
      for (const doc of doctors) {
        const avail = (doc.availability as any) || {};
        const slotsForDay: string[] = avail[dayOfWeek] || [];
        slotsForDay.forEach(slot => slotSet.add(slot));
      }
    }

    const allSlots = Array.from(slotSet).sort((a, b) => slotLabelToMinutes(a) - slotLabelToMinutes(b));

    if (!doctors || doctors.length === 0 || allSlots.length === 0) {
      return { allSlots: [], bookedSlots: [] };
    }

    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    startOfDay.setUTCHours(startOfDay.getUTCHours() - 1);
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    endOfDay.setUTCHours(endOfDay.getUTCHours() - 1);

    const { data: appointments, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select('scheduled_at, status, created_at, doctor_id')
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString())
      .neq('status', 'cancelled');

    if (aptError) {
      console.error('Error fetching appointments for getDaySlots:', aptError);
      throw new Error(`Failed to fetch appointments: ${aptError.message}`);
    }

    const isActive = (apt: any) => {
      if (apt.status === 'confirmed') return true;
      if (apt.status === 'pending') {
        const created = new Date(apt.created_at).getTime();
        return created > Date.now() - 10 * 60 * 1000;
      }
      return false;
    };

    const bookedSlots: string[] = [];
    for (const slot of allSlots) {
      const slotIso = slotToIsoString(date, slot);
      let anyFree = false;
      for (const doc of doctors) {
        const avail = (doc.availability as any) || {};
        const slotsForDay = avail[dayOfWeek] || [];
        if (!slotsForDay.includes(slot)) continue;
        const conflict = (appointments || []).some((apt: any) =>
          apt.doctor_id === doc.id &&
          new Date(apt.scheduled_at).getTime() === new Date(slotIso).getTime() &&
          isActive(apt)
        );
        if (!conflict) { anyFree = true; break; }
      }
      if (!anyFree) bookedSlots.push(slot);
    }

    return { allSlots, bookedSlots };
  } catch (error) {
    console.error('Error in getDaySlots:', error);
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

    // Timezone bounds and slot checking (only for telemedicine)
    if (bookingData.type === 'telemedicine') {
      const minutes = startTime.getUTCMinutes();
      if (minutes % 5 !== 0) {
        return { success: false, error: 'Invalid slot selection. Appointments must align to 5-minute boundaries.' };
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

    // Find and assign available doctor dynamically
    const doctorId = await findFreeDoctorForSlot(startTime.toISOString(), bookingData.service || null);

    // 4. Save Appointment to Supabase with self-healing schema fallback
    const insertPayload: any = {
      patient_id: patientId,
      doctor_id: doctorId,
      patient_name: sanitizeInput(bookingData.patientName),
      patient_email: bookingData.patientEmail.toLowerCase().trim(),
      patient_phone: sanitizeInput(bookingData.patientPhone),
      type: bookingData.type,
      service: bookingData.service || null,
      scheduled_at: startTime.toISOString(),
      meet_link: meetLink,
      notes: sanitizeInput(bookingData.description),
      status: 'confirmed',
      payment_status: paymentStatus,
      amount: secureAmount,
      consent_agreed_at: bookingData.consentAgreedAt || null,
      is_follow_up: resolvedIsFollowUp,
      parent_appointment_id: resolvedParentId
    };

    let { data, error } = await supabaseAdmin
      .from('appointments')
      .insert([insertPayload])
      .select()
      .single();

    if (error && (error.message.includes('service') || error.message.includes('schema cache') || error.code === 'PGRST100')) {
      console.warn("Appointments table is missing 'service' column. Retrying insert with self-healing fallback.");
      const originalDesc = bookingData.description || '';
      const fallbackDesc = `Service: ${bookingData.service || 'General Practice'} | Reason: ${originalDesc}`;
      
      delete insertPayload.service;
      insertPayload.description = fallbackDesc;
      insertPayload.notes = fallbackDesc;
      
      const retryResult = await supabaseAdmin
        .from('appointments')
        .insert([insertPayload])
        .select()
        .single();
        
      data = retryResult.data;
      error = retryResult.error;
    }

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
      bookingData.service || 'General Consultation',
      meetLink,
      bookingData.description
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

    // Timezone bounds and slot checking (only for telemedicine)
    if (bookingData.type === 'telemedicine') {
      const minutes = startTime.getUTCMinutes();
      if (minutes % 5 !== 0) {
        return { success: false, error: 'Invalid slot selection. Appointments must align to 5-minute boundaries.' };
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

    // Find and assign available doctor dynamically
    const doctorId = await findFreeDoctorForSlot(startTime.toISOString(), bookingData.service || null);

    // Save Pending Appointment to Supabase with self-healing schema fallback
    const insertPayload: any = {
      patient_id: patientId,
      doctor_id: doctorId,
      patient_name: sanitizeInput(bookingData.patientName),
      patient_email: bookingData.patientEmail.toLowerCase().trim(),
      patient_phone: sanitizeInput(bookingData.patientPhone),
      type: bookingData.type,
      service: bookingData.service || null,
      scheduled_at: startTime.toISOString(),
      notes: sanitizeInput(bookingData.description),
      status: 'pending',
      payment_status: 'unpaid',
      amount: secureAmount,
      consent_agreed_at: bookingData.consentAgreedAt ? new Date().toISOString() : null,
      is_follow_up: resolvedIsFollowUp,
      parent_appointment_id: resolvedParentId
    };

    let { data, error } = await supabaseAdmin
      .from('appointments')
      .insert([insertPayload])
      .select()
      .single();

    if (error && (error.message.includes('service') || error.message.includes('schema cache') || error.code === 'PGRST100')) {
      console.warn("Appointments table is missing 'service' column. Retrying pending insert with self-healing fallback.");
      const originalDesc = bookingData.description || '';
      const fallbackDesc = `Service: ${bookingData.service || 'General Practice'} | Reason: ${originalDesc}`;
      
      delete insertPayload.service;
      insertPayload.description = fallbackDesc;
      insertPayload.notes = fallbackDesc;
      
      const retryResult = await supabaseAdmin
        .from('appointments')
        .insert([insertPayload])
        .select()
        .single();
        
      data = retryResult.data;
      error = retryResult.error;
    }

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

    // Double-Booking Race Condition check during confirmation (only for telemedicine)
    if (appointment.type === 'telemedicine') {
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

    // Self-healing doctor assignment on confirmation if missing
    let doctorId = appointment.doctor_id;
    if (!doctorId) {
      const specialty = mapServiceToSpecialty(appointment.service);
      if (specialty) {
        doctorId = await findFreeDoctorForSlot(appointment.scheduled_at, specialty);
      }
      if (!doctorId) {
        // Fallback to General Practice if no specialty matched or no doctor found
        doctorId = await findFreeDoctorForSlot(appointment.scheduled_at, 'General Practice');
      }
    }

    // 4. Update the appointment to confirmed
    const { data, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'confirmed',
        doctor_id: doctorId,
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
      appointment.service,
      meetLink,
      appointment.description
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

export async function checkEmailExists(email: string): Promise<{ exists: boolean }> {
  if (!email || !email.includes('@')) return { exists: false };
  
  try {
    if (!supabaseAdmin) return { exists: false };
    
    const emailNormalized = email.toLowerCase().trim();
    
    // 1. Check profiles table first (direct indexed lookup)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', emailNormalized)
      .maybeSingle();
      
    if (profile) {
      return { exists: true };
    }
    
    // 2. Check auth list just in case
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase().trim() === emailNormalized);
    if (existingUser) {
      return { exists: true };
    }
    
    return { exists: false };
  } catch (err) {
    console.error('Error checking email existence:', err);
    return { exists: false };
  }
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

    // Fail hard if the user already has a profile registered
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', emailNormalized)
      .maybeSingle();

    if (existingProfile) {
      return { success: false, error: 'This email address is already registered. Please click "Returning Patient" and log in to proceed.' };
    }

    // Fail hard if the user already exists in auth to prevent duplicates and false sign-ups
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
    }
    const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase().trim() === emailNormalized);
    
    if (existingUser) {
      return { success: false, error: 'This email address is already registered. Please click "Returning Patient" and log in to proceed.' };
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
      return { success: false, error: 'Account created but profile setup failed. Please try logging in — your account will be configured automatically.' };
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


