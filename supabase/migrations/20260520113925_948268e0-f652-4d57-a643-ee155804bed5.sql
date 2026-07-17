
-- Add new roles to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'clinic';

-- Medical specialties
CREATE TABLE public.medical_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT '🩺',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specialties are publicly readable" ON public.medical_specialties FOR SELECT USING (true);
CREATE POLICY "Admins manage specialties" ON public.medical_specialties FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.medical_specialties (name, slug, icon) VALUES
('Clínica Geral','clinica-geral','🩺'),
('Pediatria','pediatria','👶'),
('Cardiologia','cardiologia','❤️'),
('Dermatologia','dermatologia','🧴'),
('Ginecologia','ginecologia','🌸'),
('Psicologia','psicologia','🧠'),
('Nutrição','nutricao','🥗'),
('Oftalmologia','oftalmologia','👁️'),
('Ortopedia','ortopedia','🦴'),
('Odontologia','odontologia','🦷');

-- Doctor profiles
CREATE TABLE public.doctor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  license_number text NOT NULL,
  specialty_id uuid REFERENCES public.medical_specialties(id),
  bio text,
  consultation_fee integer NOT NULL DEFAULT 500,
  years_experience integer DEFAULT 0,
  languages text[] DEFAULT ARRAY['Português'],
  avatar_url text,
  is_verified boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  rating numeric DEFAULT 0,
  total_consultations integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view doctor profiles" ON public.doctor_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors manage own profile" ON public.doctor_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage all doctor profiles" ON public.doctor_profiles FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER doctor_profiles_updated BEFORE UPDATE ON public.doctor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Patient profiles
CREATE TABLE public.patient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  date_of_birth date,
  gender text,
  blood_type text,
  allergies text[] DEFAULT '{}',
  chronic_conditions text[] DEFAULT '{}',
  current_medications text[] DEFAULT '{}',
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patient views own profile" ON public.patient_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Patient manages own profile" ON public.patient_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all patient profiles" ON public.patient_profiles FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER patient_profiles_updated BEFORE UPDATE ON public.patient_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Consultations
CREATE TABLE public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  consultation_type text NOT NULL DEFAULT 'chat',
  status text NOT NULL DEFAULT 'scheduled',
  reason text,
  notes text,
  diagnosis text,
  fee integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctor and patient view own consultations" ON public.consultations FOR SELECT TO authenticated USING (doctor_id = auth.uid() OR patient_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Patient creates consultations" ON public.consultations FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Doctor or patient update own consultations" ON public.consultations FOR UPDATE TO authenticated USING (doctor_id = auth.uid() OR patient_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE TRIGGER consultations_updated BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_consultations_doctor ON public.consultations(doctor_id, scheduled_at);
CREATE INDEX idx_consultations_patient ON public.consultations(patient_id, scheduled_at);

-- Consultation messages (chat)
CREATE TABLE public.consultation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view messages" ON public.consultation_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND (c.doctor_id = auth.uid() OR c.patient_id = auth.uid()))
  OR has_role(auth.uid(),'admin')
);
CREATE POLICY "Participants send messages" ON public.consultation_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND (c.doctor_id = auth.uid() OR c.patient_id = auth.uid()))
);
CREATE INDEX idx_msgs_consultation ON public.consultation_messages(consultation_id, created_at);

-- Prescriptions
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  expires_at timestamptz DEFAULT (now() + interval '90 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctor and patient view own prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING (doctor_id = auth.uid() OR patient_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Doctor creates prescriptions" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "Doctor updates own prescriptions" ON public.prescriptions FOR UPDATE TO authenticated USING (doctor_id = auth.uid());

CREATE TABLE public.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View items via prescription" ON public.prescription_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND (p.doctor_id = auth.uid() OR p.patient_id = auth.uid() OR has_role(auth.uid(),'admin')))
);
CREATE POLICY "Doctor manages items" ON public.prescription_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND p.doctor_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.prescriptions p WHERE p.id = prescription_id AND p.doctor_id = auth.uid())
);

-- Update handle_new_user to also create patient profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.patient_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_messages;
ALTER TABLE public.consultation_messages REPLICA IDENTITY FULL;
ALTER TABLE public.consultations REPLICA IDENTITY FULL;
