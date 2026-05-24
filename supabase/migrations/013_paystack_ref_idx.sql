-- Create index on appointments(paystack_ref) where paystack_ref is not null to optimize verification lookups
CREATE INDEX IF NOT EXISTS idx_appointments_paystack_ref 
ON public.appointments(paystack_ref) 
WHERE paystack_ref IS NOT NULL;
