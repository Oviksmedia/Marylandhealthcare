-- Fix: Replace JWT-based role checks with SECURITY DEFINER function
-- Existing users have no 'role' in auth metadata, causing JWT policies to block everyone.
-- This function reads directly from profiles (source of truth), bypassing RLS safely.

-- 1. Create the helper function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LOWER(role) FROM public.profiles WHERE id = user_id;
$$;

-- 2. Drop policies that used JWT role checks
DROP POLICY IF EXISTS "staff_full_access_profiles" ON profiles;
DROP POLICY IF EXISTS "doctors_read_profiles" ON profiles;
DROP POLICY IF EXISTS "staff_full_access_appointments" ON appointments;
DROP POLICY IF EXISTS "doctors_read_own_appointments" ON appointments;
DROP POLICY IF EXISTS "doctors_update_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_insert_appointments" ON appointments;

-- 3. Recreate policies using get_user_role()

-- PROFILES
CREATE POLICY "staff_full_access_profiles" ON profiles FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'receptionist'))
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'receptionist'));

CREATE POLICY "doctors_read_profiles" ON profiles FOR SELECT TO authenticated
USING (public.get_user_role(auth.uid()) = 'doctor');

-- APPOINTMENTS
CREATE POLICY "staff_full_access_appointments" ON appointments FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'receptionist'))
WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'receptionist'));

CREATE POLICY "doctors_read_own_appointments" ON appointments FOR SELECT TO authenticated
USING (doctor_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "doctors_update_own_appointments" ON appointments FOR UPDATE TO authenticated
USING (doctor_id = auth.uid() AND public.get_user_role(auth.uid()) = 'doctor')
WITH CHECK (doctor_id = auth.uid() AND public.get_user_role(auth.uid()) = 'doctor');

CREATE POLICY "patients_insert_appointments" ON appointments FOR INSERT TO authenticated
WITH CHECK (
  patient_email = auth.jwt()->>'email'
  OR patient_email = (SELECT email FROM profiles WHERE id = auth.uid())
  OR public.get_user_role(auth.uid()) IN ('admin', 'receptionist')
);
