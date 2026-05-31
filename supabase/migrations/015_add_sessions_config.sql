-- Add sessions_config column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sessions_config JSONB DEFAULT '{
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
}'::jsonb;

-- Populate existing doctors with default sessions_config if currently NULL
UPDATE public.profiles
SET sessions_config = '{
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
}'::jsonb
WHERE role = 'doctor' AND sessions_config IS NULL;
