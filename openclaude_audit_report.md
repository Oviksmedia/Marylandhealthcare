# Telemedicine System — Zero-Error Technical Audit Report

**Auditor:** OpenClaude
**Date:** 2026-05-30
**Scope:** Full system audit — booking state machine, database schema alignment, auth flows, email dispatch, build verification

---

## 1. Static & Build Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx next build` | **0 errors, 35 routes compiled** |

All imports resolve correctly (lucide-react, supabase, react-paystack, framer-motion, date-fns, Resend).

---

## 2. Booking State Machine — Step-by-Step Trace

### Step 1 — Modality & Specialty: CLEAN
- Modality defaults to `"in-clinic"` (BookingWizard.tsx:212)
- Telemedicine filters specialties to General Practice + Mental Health only (lines 261-274)
- `canContinue` at line 430-432 gates on `Boolean(state.service)` — correct
- Follow-up checkbox correctly resets service when modality changes (line 762)

### Step 2 — Scheduling: CLEAN
- `getDaySlots` (booking.ts:149) uses self-healing `getActiveDoctorsList` which handles missing `is_active` column via fallback (lines 41-78)
- Slots dynamically generated from doctor `availability` JSONB configs (lines 160-163)
- Booked slots computed per-doctor with 10-minute pending expiry (lines 189-214)
- `canContinue` gates on `Boolean(state.date && state.timeSlot)` — correct

### Step 3 — Identity & Auth: CLEAN
- Session restore on mount (lines 280-341): queries `appointments` first for name/phone, falls back to `profiles`. Sets `loginSuccess = true` and `patientType = "returning"`. Clean.
- Email blur (lines 493-516): checks `profiles` table by email. If found, switches to `returning`. Triggers follow-up eligibility check. Clean.
- Login (lines 518-589): `signInWithPassword` → autofills name/phone from appointments → checks follow-up. Clean.
- Registration (booking.ts:866-937): rate-limited (5/min), password validated server-side (8+ chars, letters + numbers), `email_confirm: true` prevents Supabase verification emails, profile row inserted via `supabaseAdmin` bypassing RLS. Clean.

### Step 4 — Cart Review: CLEAN
- `paystackReference` managed via `useState("")` with `useEffect` that sets once on step 4 entry and clears on leave (lines 591-599) — stable, no regeneration
- `paystackConfig` memoized on `[paystackReference, email, price]` (line 601-606) — correct
- Price computed server-side via `calculateServicePrice` and validated against Paystack amount at confirmation — correct

### Step 5 — Payment & Confirmation: CLEAN
- `createPendingBooking` inserts with `status: 'pending'`, `payment_status: 'unpaid'` (lines 643-644) — correct
- `confirmBooking` validates status is `pending` (line 733), checks double-booking race condition (lines 743-757), verifies Paystack amount matches server-stored amount (line 773-776)
- Meet link returned and captured in `confirmedMeetLink` state — displayed on success screen
- `sendBookingConfirmation` + `sendStaffNotification` dispatched (lines 830-846)

---

## 3. Database Schema Alignment

### Clinical Notes Alias
**Status: CLEAN**

All dashboard queries use `*, clinical_notes:notes`:
- `dashboard/page.tsx:97` — overview
- `dashboard/appointments/page.tsx:63,87` — appointments archive
- `dashboard/my-appointments/page.tsx:63,87` — patient view

No query writes to a non-existent `clinical_notes` column. Writes go to `notes` (actions.ts:140).

### Payment Keys
**Status: CLEAN**

Inserts use `paystack_ref`. No `payment_reference` usage found.

### Status & Payment Status Enums
**Status: CLEAN**

- Pending bookings: `status: 'pending'`, `payment_status: 'unpaid'` (lines 643-644)
- Confirmed bookings: `status: 'confirmed'`, `payment_status: 'paid'` (lines 778, 807)
- CHECK constraints in schema enforce: `('pending','confirmed','completed','cancelled')` and `('paid','unpaid')`

### Amount Column
**Status: CLEAN**

`amount: secureAmount` is written on both insert paths (lines 463, 645). Self-healing fallback at lines 475-485 and 657-674 handles missing `service` column gracefully.

### Service Column
**Status: CLEAN**

`service: bookingData.service || null` written on both insert paths (lines 457, 640). Self-healing fallback removes `service` from payload if column doesn't exist.

### `is_active` Column
**Status: CLEAN**

`getActiveDoctorsList` (booking.ts:36-78) has a fallback query if `is_active` column doesn't exist in the live database.

---

## 4. Auth & Layout Cascades

### Profile Self-Healing
**Status: CLEAN**

`dashboard/layout.tsx:106-133` handles three cases:
1. Profile found by ID → use it
2. Profile not found → try by email (auto-link via `remapLegacyProfile`)
3. Still not found → create from auth metadata

Error code `23505` (unique violation) triggers a refetch at line 122-129. No race condition crash.

### Suspended Doctor Guard
**Status: CLEAN**

`layout.tsx:135-141`: If `role === 'doctor' && is_active === false`, signs out and redirects to `/login?error=suspended`. Login page displays the error message at `login/page.tsx:24-25`.

### OTP Password Recovery
**Status: CLEAN**

8-digit OTP via `generateLink({ type: 'recovery' })`. `verifyOtp({ type: 'recovery' })` before password update. Link pre-fetchers (Gmail/Outlook) don't invalidate the OTP code.

---

## 5. Email Dispatch System

### Resend SDK Response Handling
**Status: MEDIUM ISSUE — response ID not captured**

All email functions do `await resend.emails.send(...)` without capturing the result. The sent email ID (`response.data?.id`) is never logged, preventing delivery tracking/debugging. Emails still send successfully — this is a observability gap, not a functional failure.

### Email Trigger Map

| Action | Patient Email | Staff Email | Doctor Email |
|--------|--------------|-------------|--------------|
| New patient registration | `sendWelcomeEmail` | `sendRegistrationStaffNotification` | — |
| Booking confirmed | `sendBookingConfirmation` | `sendStaffNotification` | — |
| Reschedule | `sendRescheduleConfirmation` | `sendRescheduleStaffNotification` | `sendRescheduleDoctorNotification` |
| Cancellation | `sendCancellationConfirmation` | `sendCancellationStaffNotification` | — |
| 1hr reminder (cron) | `sendAppointmentReminder` | — | — |
| Doctor created | — | — | `sendDoctorWelcomeEmail` |

### Staff Notification — Service vs Notes Bug
**Status: HIGH — still present**

`booking.ts:838-846`:
```typescript
sendStaffNotification(
  sanitizeInput(appointment.patient_name),
  appointment.patient_email,
  sanitizeInput(appointment.patient_phone),
  appointment.type,
  appointment.scheduled_at,
  appointment.notes,  // ← This is clinical notes, NOT the service name
  meetLink
);
```

The email template at `email.ts:124` displays: `<p><strong>Service:</strong> ${service || 'General Consultation'}</p>`

But `appointment.notes` contains the patient's reason for visit or clinical notes, not the service name (e.g., "Mental Health"). Staff will see clinical notes labeled as "Service."

**Required Fix:** Change `appointment.notes` to `appointment.service` at line 844.

---

## 6. Cron Endpoints

### `/api/cron/reminders` — CLEAN
- Authenticated via `CRON_SECRET`
- Queries confirmed appointments in 35-85 min window with `reminder_sent = false`
- Sends `sendAppointmentReminder`, marks `reminder_sent = true`

### `/api/cron/cleanup` — CLEAN
- Authenticated via `CRON_SECRET`
- Deletes expired pending appointments (>10 min)
- Cancels past-due pending appointments

---

## 7. Identified Issues — Summary

| Severity | # | Issue | Location |
|----------|---|-------|----------|
| **HIGH** | 1 | Staff notification shows `appointment.notes` (clinical notes) instead of `appointment.service` (service name) | `booking.ts:844` |
| **MEDIUM** | 1 | Email send responses discarded — no `response.data?.id` logging for delivery tracking | `email.ts` (all send functions) |
| **LOW** | 0 | No dead code, unused CSS variables, type holes, or broken workflows found | — |

---

## 8. Verdict

**The system is structurally sound.** The booking flow from Step 1 to 5 is correctly wired with proper state management, server-side price validation, double-booking protection, and self-healing schema fallbacks. The database queries are aligned with the actual schema. The auth cascade handles edge cases (race conditions, suspended doctors, legacy profiles) correctly. All cron endpoints are secured and functional.

**One actionable HIGH fix needed:** Change `appointment.notes` to `appointment.service` at `booking.ts:844` so staff see the actual service name (e.g., "Mental Health") instead of clinical notes in their notification email.

---

## Appendix: Cron Setup Required

For the cron endpoints to function, you must configure recurring cron jobs (e.g., via Vercel Cron or an external scheduler):

```
# Appointment reminders — every 15 minutes
GET /api/cron/reminders?secret=<CRON_SECRET>

# Pending booking cleanup — every 5 minutes
GET /api/cron/cleanup?secret=<CRON_SECRET>
```

Environment variables required:
- `CRON_SECRET` — shared secret for cron endpoint authentication
- `STAFF_NOTIFICATION_EMAILS` — comma-separated staff email addresses
- `RESEND_API_KEY` — Resend API key for email dispatch
- `RESEND_FROM_EMAIL` — verified sender address
- `NEXT_PUBLIC_SITE_URL` — production URL for email links
- `PAYSTACK_SECRET_KEY` — Paystack secret for payment verification
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — Paystack public key for client-side checkout
