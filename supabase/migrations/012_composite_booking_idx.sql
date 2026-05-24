-- Add composite index on appointments(scheduled_at, status) where status = 'confirmed' for high performance double booking checks
CREATE INDEX IF NOT EXISTS idx_appointments_double_booking_check 
ON public.appointments(scheduled_at, status) 
WHERE status = 'confirmed';
