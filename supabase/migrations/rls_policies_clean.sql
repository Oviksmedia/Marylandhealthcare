DROP POLICY IF EXISTS "staff_full_access_profiles" ON profiles;
DROP POLICY IF EXISTS "doctors_read_profiles" ON profiles;
DROP POLICY IF EXISTS "patients_own_profile_select" ON profiles;
DROP POLICY IF EXISTS "patients_own_profile_update" ON profiles;
DROP POLICY IF EXISTS "service_role_full_access_profiles" ON profiles;

DROP POLICY IF EXISTS "staff_full_access_appointments" ON appointments;
DROP POLICY IF EXISTS "doctors_read_own_appointments" ON appointments;
DROP POLICY IF EXISTS "doctors_update_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_read_own_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "patients_cancel_own_appointments" ON appointments;
DROP POLICY IF EXISTS "service_role_full_access_appointments" ON appointments;

CREATE POLICY "staff_full_access_profiles" ON profiles FOR ALL TO authenticated
USING ((auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist'))
WITH CHECK ((auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist'));

CREATE POLICY "doctors_read_profiles" ON profiles FOR SELECT TO authenticated
USING ((auth.jwt()->'user_metadata'->>'role') = 'doctor');

CREATE POLICY "patients_own_profile_select" ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "patients_own_profile_update" ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "service_role_full_access_profiles" ON profiles FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "staff_full_access_appointments" ON appointments FOR ALL TO authenticated
USING ((auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist'))
WITH CHECK ((auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist'));

CREATE POLICY "doctors_read_own_appointments" ON appointments FOR SELECT TO authenticated
USING (doctor_id = auth.uid() OR (auth.jwt()->'user_metadata'->>'role') = 'admin');

CREATE POLICY "doctors_update_own_appointments" ON appointments FOR UPDATE TO authenticated
USING (doctor_id = auth.uid() AND (auth.jwt()->'user_metadata'->>'role') = 'doctor')
WITH CHECK (doctor_id = auth.uid() AND (auth.jwt()->'user_metadata'->>'role') = 'doctor');

CREATE POLICY "patients_read_own_appointments" ON appointments FOR SELECT TO authenticated
USING (patient_email = (auth.jwt()->>'email'));

CREATE POLICY "patients_insert_appointments" ON appointments FOR INSERT TO authenticated
WITH CHECK (patient_email = (auth.jwt()->>'email') OR (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist'));

CREATE POLICY "patients_cancel_own_appointments" ON appointments FOR UPDATE TO authenticated
USING (patient_email = (auth.jwt()->>'email') AND status IN ('pending', 'confirmed'))
WITH CHECK (patient_email = (auth.jwt()->>'email') AND status = 'cancelled');

CREATE POLICY "service_role_full_access_appointments" ON appointments FOR ALL TO service_role
USING (true) WITH CHECK (true);
