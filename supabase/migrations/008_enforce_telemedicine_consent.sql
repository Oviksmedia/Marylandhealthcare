-- Enforce telemedicine consent at the DB level
ALTER TABLE public.appointments 
ADD CONSTRAINT check_telemedicine_consent 
CHECK (type = 'in_clinic' OR consent_agreed_at IS NOT NULL);
