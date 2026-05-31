-- Add doctor_notes column to appointments to separate doctor notes from patient reason of visit
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_notes TEXT;

-- Backfill: For existing completed appointments, we can copy the notes to doctor_notes
-- so that doctors don't lose any past historical encounter details.
UPDATE public.appointments 
SET doctor_notes = notes 
WHERE doctor_notes IS NULL AND status = 'completed';
