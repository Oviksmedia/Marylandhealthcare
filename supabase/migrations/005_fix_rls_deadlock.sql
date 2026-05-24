-- ============================================================
-- Phase 5: High-Performance, Recursion-Proof & Stale-Session-Proof RLS Migration
-- Maryland Healthcare Telemedicine System
-- ============================================================
-- This migration permanently fixes the recursive RLS stack overflow loop
-- and resolves the stale browser session lockout issue by:
-- 1. Re-defining get_user_role() to query auth.users directly (recursion-proof).
-- 2. Automatically syncing all profiles' roles, names, and phone numbers to auth.users.
-- 3. Setting up database triggers to keep auth.users and public.profiles 100% in sync.
-- 4. Using the live get_user_role() function in policies (immune to stale JWTs).
-- ============================================================

-- 1. Re-create get_user_role as a highly secure, recursion-proof function
-- Because it queries the protected auth.users table (which has no RLS policies),
-- it never triggers infinite RLS recursion on the profiles table.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT LOWER(raw_user_meta_data->>'role') FROM auth.users WHERE id = user_id;
$$;

-- 2. Sync profile emails from auth.users (recovers null values like Overcomer Israel and Chidinma Emenike)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Force-sync existing public.profiles metadata to auth.users
-- This guarantees auth.users metadata is 100% up-to-date for our new get_user_role() function.
UPDATE auth.users u
SET raw_user_meta_data = 
  COALESCE(u.raw_user_meta_data, '{}'::jsonb) || 
  JSONB_BUILD_OBJECT('role', p.role, 'full_name', p.full_name, 'phone', p.phone)
FROM public.profiles p
WHERE u.id = p.id;

-- 4. Establish a self-healing trigger to keep auth metadata and profile roles synchronized
CREATE OR REPLACE FUNCTION public.sync_profile_changes_to_auth()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || JSONB_BUILD_OBJECT(
    'role', NEW.role,
    'full_name', NEW.full_name,
    'phone', NEW.phone
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_profile_changes ON public.profiles;
CREATE TRIGGER tr_sync_profile_changes
AFTER INSERT OR UPDATE OF role, full_name, phone ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_changes_to_auth();

-- 5. Drop all old policies to prevent collision
DROP POLICY IF EXISTS "staff_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "doctors_read_profiles" ON public.profiles;
DROP POLICY IF EXISTS "patients_own_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "patients_own_profile_update" ON public.profiles;
DROP POLICY IF EXISTS "service_role_full_access_profiles" ON public.profiles;

DROP POLICY IF EXISTS "staff_full_access_appointments" ON public.appointments;
DROP POLICY IF EXISTS "doctors_read_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "doctors_update_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "patients_read_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "patients_insert_appointments" ON public.appointments;
DROP POLICY IF EXISTS "patients_cancel_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "service_role_full_access_appointments" ON public.appointments;

-- ============================================================
-- DEADLOCK-FREE & STALE-SESSION-FREE PROFILES RLS POLICIES
-- ============================================================

-- A. Staff (Admin / Receptionist): Full CRUD Access
CREATE POLICY "staff_full_access_profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'receptionist') 
  AND deleted_at IS NULL
)
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('admin', 'receptionist') 
  AND deleted_at IS NULL
);

-- B. Doctors: Can read all patient and team member profiles
CREATE POLICY "doctors_read_profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'doctor' 
  AND deleted_at IS NULL
);

-- C. Patients: Read own profile only
CREATE POLICY "patients_own_profile_select" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id 
  AND deleted_at IS NULL
);

-- D. Patients: Update own profile only
CREATE POLICY "patients_own_profile_update" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = id 
  AND deleted_at IS NULL
)
WITH CHECK (
  auth.uid() = id 
  AND deleted_at IS NULL
);

-- E. Service Role: Full access for server-side functions and cron jobs
CREATE POLICY "service_role_full_access_profiles" 
ON public.profiles 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);


-- ============================================================
-- DEADLOCK-FREE & STALE-SESSION-FREE APPOINTMENTS RLS POLICIES
-- ============================================================

-- A. Staff (Admin / Receptionist): Full CRUD Access
CREATE POLICY "staff_full_access_appointments" 
ON public.appointments 
FOR ALL 
TO authenticated
USING (
  public.get_user_role(auth.uid()) IN ('admin', 'receptionist') 
  AND deleted_at IS NULL
)
WITH CHECK (
  public.get_user_role(auth.uid()) IN ('admin', 'receptionist') 
  AND deleted_at IS NULL
);

-- B. Doctors: Read own appointments + Admins read all
CREATE POLICY "doctors_read_own_appointments" 
ON public.appointments 
FOR SELECT 
TO authenticated
USING (
  (doctor_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin') 
  AND deleted_at IS NULL
);

-- C. Doctors: Update own appointments (notes, status)
CREATE POLICY "doctors_update_own_appointments" 
ON public.appointments 
FOR UPDATE 
TO authenticated
USING (
  doctor_id = auth.uid() 
  AND public.get_user_role(auth.uid()) = 'doctor' 
  AND deleted_at IS NULL
)
WITH CHECK (
  doctor_id = auth.uid() 
  AND public.get_user_role(auth.uid()) = 'doctor' 
  AND deleted_at IS NULL
);

-- D. Patients: Read own appointments (robust, recursion-proof lookup)
CREATE POLICY "patients_read_own_appointments" 
ON public.appointments 
FOR SELECT 
TO authenticated
USING (
  (
    patient_id = auth.uid() 
    OR patient_email = auth.jwt()->>'email'
    OR patient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  AND deleted_at IS NULL
);

-- E. Patients: Insert new appointments (during booking wizard)
CREATE POLICY "patients_insert_appointments" 
ON public.appointments 
FOR INSERT 
TO authenticated
WITH CHECK (
  (
    patient_id = auth.uid()
    OR patient_email = auth.jwt()->>'email'
    OR patient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR public.get_user_role(auth.uid()) IN ('admin', 'receptionist')
  )
  AND deleted_at IS NULL
);

-- F. Patients: Cancel / Reschedule own appointments
CREATE POLICY "patients_cancel_own_appointments" 
ON public.appointments 
FOR UPDATE 
TO authenticated
USING (
  (
    patient_id = auth.uid()
    OR patient_email = auth.jwt()->>'email'
    OR patient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  AND status IN ('pending', 'confirmed')
  AND deleted_at IS NULL
)
WITH CHECK (
  (
    patient_id = auth.uid()
    OR patient_email = auth.jwt()->>'email'
    OR patient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  AND deleted_at IS NULL
);

-- G. Service Role: Full access for server-side functions and cron jobs
CREATE POLICY "service_role_full_access_appointments" 
ON public.appointments 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- ============================================================
-- 6. RELOAD SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
