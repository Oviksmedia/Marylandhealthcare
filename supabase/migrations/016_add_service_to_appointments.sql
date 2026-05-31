-- Migration: Add service column to appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_service ON public.appointments(service);
