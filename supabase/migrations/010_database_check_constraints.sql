-- Add CHECK constraints for role, type, status, and payment_status to enforce domain integrity
ALTER TABLE public.profiles ADD CONSTRAINT check_profile_role CHECK (role IN ('patient', 'doctor', 'receptionist', 'admin'));
ALTER TABLE public.appointments ADD CONSTRAINT check_appointment_type CHECK (type IN ('telemedicine', 'in_clinic'));
ALTER TABLE public.appointments ADD CONSTRAINT check_appointment_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));
ALTER TABLE public.appointments ADD CONSTRAINT check_payment_status CHECK (payment_status IN ('paid', 'unpaid'));
