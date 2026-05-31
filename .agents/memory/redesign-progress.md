# Maryland Healthcare — Workspace Memory

**Last updated:** 2026-05-28  
**Project path:** `c:\Users\Swift America\Desktop\Redisign of Maryland Website\Redesign of Maryland Website`

---

## What Has Been Built

### Completed Phases
- **Phase 1:** Global design system (Outfit + Playfair Display, CSS tokens, globals.css)
- **Phase 2:** Full booking wizard redesign (Steps 1–5, all screens)
- **Phase 3:** Verification (TSC + build)
- **Phase 4:** Patient dashboard (`my-appointments`)
- **Phase 5:** Doctor & Staff dashboards
- **Phase 6:** Doctor-driven availability + specialty booking
- **Phase 7:** Doctor credentials + admin availability editor
- **Phase 8:** Admin doctor sessions week planner
- **Phase 9:** Dynamic slot sync (`getDaySlots`)
- **Phase 10:** Full audit — soft deactivation, auth helper, specialty map, session validation, strong typings
- **Phase 11:** Booking Wizard Step 1 overhaul — two-stage sub-step (1A modality auto-advance → 1B specialty), directional AnimatePresence, progress 10%/20%, action bar hidden on 1A. Includes layout optimizations relocates the follow-up toggle below the services grid, overrides active SVG icon fill colors to high-contrast white, and corrects input-wrapper spacing conflicts on credentials fields.
- **Phase 12:** Patient Appointments Page redesign (`my-appointments`) — glassmorphism cards, Framer Motion staggered entrances, sliding tabs switcher, secure server action for querying doctor details bypassing RLS, patient-driven safety cancellations, automated cancellation emails (patient/doctor/staff), and self-healing doctor retrieval queries.
- **Phase 13:** Telemedicine Confirmation Page Redesign — Redesigned Step 5 in `BookingWizard.tsx` to use a single fintech-inspired card container, removed obsolete terms ("waiting room", "meeting room" -> "virtual clinic"), fixed garbled emergency emojis with a clean warning strip, and reverted state default back to Step 1.
- **Phase 14:** Cross-Audit Fix Sprint — Applied 5 fixes from OpenClaude/OpenCode audit analysis: (1) HIGH: Staff email `appointment.notes` → `appointment.service` at booking.ts:844, (2) MEDIUM: Normalized Resend email ID logging across all 11 send paths, (3) LOW: `.paymentCard div` → explicit `.paymentRow` CSS class, (4) LOW: `registerPatientUser()` now fails hard on profile insert error, (5) LOW: Dead state vars `pendingAppointmentId`/`confirmedMeetLink` documented for future use. Build: 0 errors, 35/35 routes.
- **Phase 15:** In-Clinic Visit Flow Redesign — Designed and implemented a dedicated walk-in scheduling flow for physical facility visits. (1) Step 2 opens all calendar dates (disabling only past dates) and renders a walk-in check-in advisory, bypassing doctor time slots, (2) Step 3 conditionally renders a guest intake form (exposing first name, last name, phone, email, and reason; stripping out password credentials and login switches), (3) Step 4 renders a pay-at-clinic summary card, bypassing Paystack payment gating, (4) Submission creates guest bookings directly with `patient_id` as `null` and default hour WAT offsets, disabling auth account creation.
- **Phase 16:** Telemedicine Verbatim Consent Text Restoration — Restored the exact, verbatim clinical consent text (emergency warnings, definitions, details, goals, suitabilities, checklist requirements, and Steve Ekwelibe's signature block dated 2nd. Jan. 2026) extracted from `What Is Telemedicine.docx`. Staged, committed, and pushed to GitHub main branch to trigger Vercel redeployment.

### Key Architecture Facts
- Doctor deactivation = soft delete (`deleted_at`). Auth user preserved. Re-add by email migrates history.
- Slots compiled at query time from session configs, not pre-stored.
- Follow-up = 50% discount, requires completed visit within 30 days.
- Paystack: pending booking → popup → confirm on success.
- Consent modal gates telemedicine payment; timestamp stored on appointment.
- Secure server actions: `getPatientAppointments()` joins doctor metadata safely bypassing RLS restrictions.
- Self-Healing Queries: `getActiveDoctorsList` handles missing database columns (e.g. `is_active`) gracefully, logging a warning and falling back without crashing.

---

## Next Page in Sequence
`/dashboard` — Admin dashboard overview.

After that:
- `/dashboard` (admin overview)
- `/dashboard/appointments`
- `/dashboard/patients`
- `/` (homepage)
- `/services`, `/about`, `/contact`, `/leadership`

---

## Patterns to Follow
- All changes are **frontend only** — no backend logic changes unless explicitly flagged
- Always run `npx tsc --noEmit` then `npx next build` after each phase
- Check `.agents/memory/` at session start
- Update `.agents/workflow-state.json` at phase boundaries
- Update `task.md` artifact as work progresses
