-- Migration: Add follow-up fields to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
