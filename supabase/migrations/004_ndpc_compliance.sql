-- ============================================================
-- NDPC/NDPA 2023 Compliance Remediations Migration
-- ============================================================

-- 1. Add consent_agreed_at column to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consent_agreed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add deleted_at column to profiles and appointments tables for soft deletion
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Adjust RLS policies to respect soft deletion (deleted_at IS NULL)

-- Drop existing SELECT/ALL policies to recreate them with soft-delete filter
DROP POLICY IF EXISTS "staff_full_access_profiles" ON profiles;
DROP POLICY IF EXISTS "doctors_read_profiles" ON profiles;
DROP POLICY IF EXISTS "patients_own_profile_select" ON profiles;
DROP POLICY IF EXISTS "patients_own_profile_update" ON profiles;

CREATE POLICY "staff_full_access_profiles" ON profiles FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'receptionist') AND deleted_at IS NULL)
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'receptionist') AND deleted_at IS NULL);

CREATE POLICY "doctors_read_profiles" ON profiles FOR SELECT TO authenticated
USING (public.get_user_role(auth.uid()) = 'doctor' AND deleted_at IS NULL);

CREATE POLICY "patients_own_profile_select" ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "patients_own_profile_update" ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id AND deleted_at IS NULL)
WITH CHECK (auth.uid() = id AND deleted_at IS NULL);


DROP POLICY IF EXISTS "staff_full_access_appointments" ON appointments;
DROP POLICY IF EXISTS "doctors_read_own_appointments" ON appointments;
DROP POLICY IF EXISTS "doctors_update_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_read_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_cancel_own_appointments" ON appointments;

CREATE POLICY "staff_full_access_appointments" ON appointments FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'receptionist') AND deleted_at IS NULL)
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'receptionist') AND deleted_at IS NULL);

CREATE POLICY "doctors_read_own_appointments" ON appointments FOR SELECT TO authenticated
USING ((doctor_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin') AND deleted_at IS NULL);

CREATE POLICY "doctors_update_own_appointments" ON appointments FOR UPDATE TO authenticated
USING (doctor_id = auth.uid() AND public.get_user_role(auth.uid()) = 'doctor' AND deleted_at IS NULL)
WITH CHECK (doctor_id = auth.uid() AND public.get_user_role(auth.uid()) = 'doctor' AND deleted_at IS NULL);

CREATE POLICY "patients_read_own_appointments" ON appointments FOR SELECT TO authenticated
USING (
  (patient_email = auth.jwt()->>'email' OR patient_email = (SELECT email FROM profiles WHERE id = auth.uid()))
  AND deleted_at IS NULL
);

CREATE POLICY "patients_insert_appointments" ON appointments FOR INSERT TO authenticated
WITH CHECK (
  (patient_email = auth.jwt()->>'email' OR patient_email = (SELECT email FROM profiles WHERE id = auth.uid()))
  AND deleted_at IS NULL
);

CREATE POLICY "patients_cancel_own_appointments" ON appointments FOR UPDATE TO authenticated
USING (
  (patient_email = auth.jwt()->>'email' OR patient_email = (SELECT email FROM profiles WHERE id = auth.uid()))
  AND status IN ('pending', 'confirmed')
  AND deleted_at IS NULL
)
WITH CHECK (
  (patient_email = auth.jwt()->>'email' OR patient_email = (SELECT email FROM profiles WHERE id = auth.uid()))
  AND deleted_at IS NULL
);
