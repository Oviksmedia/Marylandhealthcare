-- ============================================================
-- Phase 3: Security Definer Helper Functions to Avoid Recursion
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Drop all old JWT-based and table-based policies to start fresh
DROP POLICY IF EXISTS "staff_full_access_profiles" ON profiles;
DROP POLICY IF EXISTS "doctors_read_profiles" ON profiles;
DROP POLICY IF EXISTS "patients_own_profile_select" ON profiles;
DROP POLICY IF EXISTS "patients_own_profile_update" ON profiles;
DROP POLICY IF EXISTS "service_role_full_access_profiles" ON profiles;

DROP POLICY IF EXISTS "staff_full_access_appointments" ON appointments;
DROP POLICY IF EXISTS "doctors_read_own_appointments" ON appointments;
DROP POLICY IF EXISTS "doctors_update_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_read_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_cancel_own_appointments" ON appointments;
DROP POLICY IF EXISTS "service_role_full_access_appointments" ON appointments;

-- ============================================================
-- NEW ROBUST PROFILES POLICIES
-- ============================================================

-- 1. Staff: full CRUD access
CREATE POLICY "staff_full_access_profiles" ON profiles FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'receptionist'))
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'receptionist'));

-- 2. Doctors: select profiles to view patient information
CREATE POLICY "doctors_read_profiles" ON profiles FOR SELECT TO authenticated
USING (public.get_user_role(auth.uid()) = 'doctor');

-- 3. Patients: read and update own profile only
CREATE POLICY "patients_own_profile_select" ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "patients_own_profile_update" ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Service Role: unrestricted
CREATE POLICY "service_role_full_access_profiles" ON profiles FOR ALL TO service_role
USING (true) WITH CHECK (true);


-- ============================================================
-- NEW ROBUST APPOINTMENTS POLICIES
-- ============================================================

-- 1. Staff: full CRUD access
CREATE POLICY "staff_full_access_appointments" ON appointments FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'receptionist'))
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'receptionist'));

-- 2. Doctors: read own appointments
CREATE POLICY "doctors_read_own_appointments" ON appointments FOR SELECT TO authenticated
USING (doctor_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- 3. Doctors: update own appointments (notes, status)
CREATE POLICY "doctors_update_own_appointments" ON appointments FOR UPDATE TO authenticated
USING (doctor_id = auth.uid() AND public.get_user_role(auth.uid()) = 'doctor')
WITH CHECK (doctor_id = auth.uid() AND public.get_user_role(auth.uid()) = 'doctor');

-- 4. Patients: read own appointments (fallback to email lookup)
CREATE POLICY "patients_read_own_appointments" ON appointments FOR SELECT TO authenticated
USING (
  patient_email = auth.jwt()->>'email'
  OR patient_email = (SELECT email FROM profiles WHERE id = auth.uid())
);

-- 5. Patients: book new appointments
CREATE POLICY "patients_insert_appointments" ON appointments FOR INSERT TO authenticated
WITH CHECK (
  patient_email = auth.jwt()->>'email'
  OR patient_email = (SELECT email FROM profiles WHERE id = auth.uid())
  OR public.get_user_role(auth.uid()) IN ('admin', 'receptionist')
);

-- 6. Patients: reschedule/cancel own appointments
CREATE POLICY "patients_cancel_own_appointments" ON appointments FOR UPDATE TO authenticated
USING (
  (patient_email = auth.jwt()->>'email' OR patient_email = (SELECT email FROM profiles WHERE id = auth.uid()))
  AND status IN ('pending', 'confirmed')
)
WITH CHECK (
  (patient_email = auth.jwt()->>'email' OR patient_email = (SELECT email FROM profiles WHERE id = auth.uid()))
);

-- 7. Service Role: unrestricted
CREATE POLICY "service_role_full_access_appointments" ON appointments FOR ALL TO service_role
USING (true) WITH CHECK (true);
