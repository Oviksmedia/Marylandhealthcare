-- Add reminder_sent column to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_sent ON public.appointments(reminder_sent) WHERE reminder_sent = FALSE;
