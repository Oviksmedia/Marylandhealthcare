-- ============================================================
-- Phase 3: Row-Level Security (RLS) Migration
-- Maryland Healthcare Telemedicine System
-- ============================================================
-- IMPORTANT: All role checks use auth.jwt() to avoid recursive
-- policy evaluation on the profiles table. The user's role is
-- stored in user_metadata during registration (booking.ts, doctors/actions.ts).
-- ============================================================

-- ============================================================
-- PROFILES TABLE POLICIES
-- ============================================================

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Admins & Receptionists: full access to all profiles
--    Uses JWT claims — no subquery into profiles (avoids recursion)
CREATE POLICY "staff_full_access_profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist')
)
WITH CHECK (
  (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist')
);

-- 2. Doctors: can SELECT all profiles (to view patient details)
CREATE POLICY "doctors_read_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  (auth.jwt()->'user_metadata'->>'role') = 'doctor'
);

-- 3. Patients: can SELECT and UPDATE only their own profile
CREATE POLICY "patients_own_profile_select"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "patients_own_profile_update"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Service role: unrestricted access (for server actions using supabaseAdmin)
CREATE POLICY "service_role_full_access_profiles"
ON profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ============================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================

-- Enable RLS on appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 1. Admins & Receptionists: full access to all appointments
CREATE POLICY "staff_full_access_appointments"
ON appointments
FOR ALL
TO authenticated
USING (
  (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist')
)
WITH CHECK (
  (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist')
);

-- 2. Doctors: can SELECT appointments assigned to them + admins see all
CREATE POLICY "doctors_read_own_appointments"
ON appointments
FOR SELECT
TO authenticated
USING (
  doctor_id = auth.uid()
  OR (auth.jwt()->'user_metadata'->>'role') = 'admin'
);

-- 3. Doctors: can UPDATE appointments assigned to them (status, notes)
CREATE POLICY "doctors_update_own_appointments"
ON appointments
FOR UPDATE
TO authenticated
USING (
  doctor_id = auth.uid()
  AND (auth.jwt()->'user_metadata'->>'role') = 'doctor'
)
WITH CHECK (
  doctor_id = auth.uid()
  AND (auth.jwt()->'user_metadata'->>'role') = 'doctor'
);

-- 4. Patients: can SELECT their own appointments (matched by JWT email)
CREATE POLICY "patients_read_own_appointments"
ON appointments
FOR SELECT
TO authenticated
USING (
  patient_email = (auth.jwt()->>'email')
);

-- 5. Patients: can INSERT new appointments (booking flow)
--    Matches by JWT email; staff can also insert
CREATE POLICY "patients_insert_appointments"
ON appointments
FOR INSERT
TO authenticated
WITH CHECK (
  patient_email = (auth.jwt()->>'email')
  OR (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist')
);

-- 6. Patients: can UPDATE own appointments only to cancel
CREATE POLICY "patients_cancel_own_appointments"
ON appointments
FOR UPDATE
TO authenticated
USING (
  patient_email = (auth.jwt()->>'email')
  AND status IN ('pending', 'confirmed')
)
WITH CHECK (
  patient_email = (auth.jwt()->>'email')
  AND status = 'cancelled'
);

-- 7. Service role: unrestricted access (for server actions, cron jobs)
CREATE POLICY "service_role_full_access_appointments"
ON appointments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ============================================================
-- VERIFICATION QUERIES (run these to confirm policies are active)
-- ============================================================
-- SELECT tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('profiles', 'appointments')
-- ORDER BY tablename, policyname;
