-- ============================================================
-- MARYLAND HEALTHCARE TELEMEDICINE PORTAL
-- DATABASE SCHEMA SNAPSHOT (SINGLE SOURCE OF TRUTH)
-- ============================================================
-- This file documents the active structure of the database tables, 
-- columns, indexes, and Row-Level Security (RLS) policies.
-- Use this as a reference when developing locally or deploying migrations.
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  phone_number TEXT, -- Backward compatibility field
  role TEXT NOT NULL DEFAULT 'patient', -- Options: 'patient', 'doctor', 'receptionist', 'admin'
  specialty TEXT, -- Defined for role='doctor' (e.g., 'General Practice', 'Mental Health')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- For NDPA-compliant soft deletion
  is_active BOOLEAN DEFAULT TRUE, -- Doctor suspension flag: FALSE = cannot log in, all data preserved
  updated_at TIMESTAMPTZ DEFAULT NOW(), -- Autoupdated timestamp
  availability JSONB DEFAULT '{
    "monday": ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"],
    "tuesday": ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"],
    "wednesday": ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"],
    "thursday": ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"],
    "friday": ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM"]
  }'::jsonb,
  sessions_config JSONB DEFAULT '{
    "slotDuration": 30,
    "days": {
      "monday": { "active": true, "start": "09:00", "end": "18:00", "breaks": [{ "start": "13:00", "end": "14:00" }] },
      "tuesday": { "active": true, "start": "09:00", "end": "18:00", "breaks": [{ "start": "13:00", "end": "14:00" }] },
      "wednesday": { "active": true, "start": "09:00", "end": "18:00", "breaks": [{ "start": "13:00", "end": "14:00" }] },
      "thursday": { "active": true, "start": "09:00", "end": "18:00", "breaks": [{ "start": "13:00", "end": "14:00" }] },
      "friday": { "active": true, "start": "09:00", "end": "18:00", "breaks": [{ "start": "13:00", "end": "14:00" }] },
      "saturday": { "active": false, "start": "09:00", "end": "18:00", "breaks": [] },
      "sunday": { "active": false, "start": "09:00", "end": "18:00", "breaks": [] }
    }
  }'::jsonb,
  CONSTRAINT check_profile_role CHECK (role IN ('patient', 'doctor', 'receptionist', 'admin'))
);

-- Indexes for active checks and search performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active) WHERE is_active = FALSE;

-- Enable Row-Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  type TEXT NOT NULL, -- Options: 'telemedicine', 'in_clinic'
  service TEXT, -- Booked service name (e.g. 'General Practice', 'Mental Health')
  status TEXT NOT NULL DEFAULT 'pending', -- Options: 'pending', 'confirmed', 'completed', 'cancelled'
  scheduled_at TIMESTAMPTZ NOT NULL,
  meet_link TEXT, -- Jitsi or Google Meet rooms
  notes TEXT, -- Clinical/encounter diagnostics
  amount NUMERIC DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- Options: 'paid', 'unpaid'
  paystack_ref TEXT,
  consent_agreed_at TIMESTAMPTZ, -- Mandatory NDPA-compliant telemedicine consent log
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- For NDPA-compliant soft deletion
  is_follow_up BOOLEAN DEFAULT FALSE, -- Approved follow-up indicator
  parent_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL, -- Medical care lineage
  reminder_sent BOOLEAN DEFAULT FALSE, -- Flag indicating reminder email has been sent
  updated_at TIMESTAMPTZ DEFAULT NOW(), -- Autoupdated timestamp
  CONSTRAINT check_telemedicine_consent CHECK (type = 'in_clinic' OR consent_agreed_at IS NOT NULL),
  CONSTRAINT check_appointment_type CHECK (type IN ('telemedicine', 'in_clinic')),
  CONSTRAINT check_appointment_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('paid', 'unpaid'))
);

-- Indexes for double-booking checks, search performance and verification
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_email ON public.appointments(patient_email);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at ON public.appointments(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_sent ON public.appointments(reminder_sent) WHERE reminder_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_appointments_double_booking_check ON public.appointments(scheduled_at, status) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS idx_appointments_paystack_ref ON public.appointments(paystack_ref) WHERE paystack_ref IS NOT NULL;

-- Enable Row-Level Security (RLS)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. UTILITIES & SYNCHRONIZATION TRIGGERS
-- ============================================================

-- Highly secure, recursion-proof get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT LOWER(raw_user_meta_data->>'role') FROM auth.users WHERE id = user_id;
$$;

-- Database trigger to keep auth.users metadata in sync with public.profiles
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

-- Triggers for automatic updated_at updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_appointments_updated_at ON public.appointments;
CREATE TRIGGER tr_update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- --- Profiles Table Policies ---

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

-- B. Doctors: Can read all patient and team profiles
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


-- --- Appointments Table Policies ---

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
