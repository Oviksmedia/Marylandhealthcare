-- Add is_active column to profiles for doctor suspension
-- This allows temporarily disabling a doctor without deleting their auth or profile data.
-- Re-activation is instant — just flip the flag back.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Backfill: all existing profiles are active by default
UPDATE public.profiles SET is_active = TRUE WHERE is_active IS NULL;

-- Index for filtering active/inactive doctors
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active) WHERE is_active = FALSE;
