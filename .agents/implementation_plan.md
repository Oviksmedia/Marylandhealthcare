# Maryland Healthcare Telemedicine Hardening Plan (Phases 1 & 2)

This plan serves as a collaborative engineering blueprint for securing and refining the telemedicine booking and auth system. 

**OpenClaude** and **Antigravity** are working as peer partners to co-implement, review, and verify these key improvements.

---

## Phase 1: Critical Security Hardening (Must-Fix)

### 1. Server-Side Pricing Engine (Eliminate NGN 1 Exploit)
* **Problem:** Pricing is determined in `BookingWizard.tsx` (`state.service === "Mental Health" ? 15000 : 200`) and sent directly to `createPendingBooking` and `submitBooking`. An attacker can manipulate this payload to set the price to NGN 1, pay NGN 1 on Paystack, and successfully confirm the booking because the Paystack verification only compares the paid amount with the value submitted to the database.
* **Implementation Approach:**
  - Modify `createPendingBooking` and `submitBooking` in [booking.ts](file:///c:/Users/Swift%20America/Desktop/Redisign of Maryland Website/Redesign of Maryland Website/app/lib/telemedicine/booking.ts).
  - **Do NOT** trust or accept the `amount` parameter from the client.
  - Create a server-side pricing resolver function:
    ```typescript
    export function calculateServicePrice(service: string | null, type: 'telemedicine' | 'in_clinic'): number {
      if (type === 'in_clinic') return 0; // Or standard in-clinic pricing logic if applicable
      if (service === "Mental Health") return 15000;
      return 200; // General Practice / standard virtual fee
    }
    ```
  - Use `calculateServicePrice` inside both `createPendingBooking` and `submitBooking` to insert the secure amount into the database's `amount` column.
  - Update `confirmBooking` so that the Paystack verification checks the paid amount against the server-calculated, pre-saved `appointment.amount`.

### 2. Lock Down Mock Auth & Role Elevation
* **Problem:** `.env.local` contains `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true`. Dynamic logic elevates users with `@marylandhealthcare.com.ng` to staff roles client-side without strict backend verification.
* **Implementation Approach:**
  - Audit `NEXT_PUBLIC_ENABLE_MOCK_AUTH` usage across layout and login paths. Ensure it is completely ignored or disabled in production mode (`process.env.NODE_ENV === 'production'`).
  - Secure the staff role checking. The patient portal, doctor portal, and admin portals must fetch roles strictly from the authenticated Supabase session database user profile (`profiles.role` column) using Row-Level Security, never dynamically assigning permissions client-side based on the email domain name alone.

### 3. Server-Side Booking Transactions (Eliminate Double-Booking Race Conditions)
* **Problem:** Two patients booking the exact same date-time slot simultaneously will both succeed because slot occupancy checking only happens client-side before checkout.
* **Implementation Approach:**
  - Update `createPendingBooking` and `submitBooking` inside `app/lib/telemedicine/booking.ts` to perform a database check *immediately* before executing the insert statement.
  - Query for existing appointments on the target slot:
    ```typescript
    const { data: existingSlots } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('scheduled_at', startTime.toISOString())
      .neq('status', 'cancelled')
      .limit(1);
    ```
  - If a confirmed booking (or active pending lock less than 10 minutes old) already occupies that slot, block the insertion and return `{ success: false, error: 'This time slot is no longer available. Please select another time.' }`.

### 4. High-Entropy Jitsi Meet Links
* **Problem:** Video room IDs are generated with low entropy using `Date.now() + Math.random()`. This is highly guessable and brute-forceable, exposing patients to privacy intrusions.
* **Implementation Approach:**
  - In `app/lib/telemedicine/booking.ts` (or the underlying `createMeetLink` function), replace the low-entropy randomizer.
  - Generate cryptographically secure UUID v4 or high-entropy hex strings using Node's standard `crypto` module:
    ```typescript
    import crypto from 'crypto';
    const secureRoomId = crypto.randomUUID(); // Or crypto.randomBytes(16).toString('hex');
    ```

---

## Phase 2: Correctness Hardening

### 5. Timezone Enforcement (`Africa/Lagos`)
* **Problem:** Calendar slots are calculated using browser local times but written raw to UTC. If patients in different timezones book, their slots drift, leading to scheduling collisions.
* **Implementation Approach:**
  - Force a standardized scheduling timezone (`UTC+1` / `Africa/Lagos`) for all date-time parses and database inserts.
  - When parsing the client-submitted ISO timestamp in `app/lib/telemedicine/booking.ts`, normalize it to represent the exact intended hour in West Africa Time (WAT) before saving it as UTC.
  - Ensure client rendering formats slots relative to Nigeria's timezone so that a "09:00 AM" booking is always 08:00 AM UTC, regardless of the patient's global location.

### 6. Clean Clinical Notes (Isolate System Metadata)
* **Problem:** The cron job appends `[REMINDER_SENT]` directly to the clinical `notes` column. This pollutes patient medical records and complicates text-parsing or rendering.
* **Implementation Approach:**
  - Modify the reminder cron job in `/app/api/cron/reminders/route.ts` and the reminder logic.
  - Rather than dirtying the medical records text in the `notes` column, use a delimited system marker or create/use a dedicated column if possible. If schema modifications are restricted, delimit the flags cleanly (e.g. within a specialized XML/JSON metadata envelope in the database) or query using strict substring parsing to isolate clinical text from operational flags in dashboard textareas.

---

## Verification Plan

Once OpenClaude completes the execution phase, **Antigravity** will run the following verification protocols before finalizing:

### Automated Tests
- **Typescript Compilation:** Run `npx tsc --noEmit` to verify all server actions and types align perfectly.
- **Next.js Production Build:** Execute `npm run build` to confirm zero static compilation or hydration issues occur with the updated server action payloads.

### Manual Audit (Validation Trace)
1. **Pricing Manipulation Test:** Run a test script attempting to book a `Mental Health` appointment by invoking `createPendingBooking` with `amount: 1` manually. The server must discard it and record `amount: 15000` in the database.
2. **Double-Booking Race Condition Test:** Attempt to write two pending appointments on the exact same date-time block. The second insert must be gracefully rejected by the database validation query.
3. **Timezone Shift Test:** Check that a simulated client request from a non-Lagos timezone maps the selected hour perfectly to `UTC+1` in the database.
