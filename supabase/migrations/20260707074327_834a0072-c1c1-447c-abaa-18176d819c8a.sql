
-- =========================================================
-- FASE 1: MedWallet Sangue
-- =========================================================

-- Extend blood_donors
ALTER TABLE public.blood_donors
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2),
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS health_notes text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_donations int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Extend blood_requests
ALTER TABLE public.blood_requests
  ADD COLUMN IF NOT EXISTS hospital_id uuid,
  ADD COLUMN IF NOT EXISTS patient_name text,
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal','urgent','critical')),
  ADD COLUMN IF NOT EXISTS units_needed int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS units_received int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Matches table
CREATE TABLE IF NOT EXISTS public.blood_donation_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','accepted','declined','completed','cancelled')),
  distance_km numeric(6,2),
  scheduled_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, donor_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_donation_matches TO authenticated;
GRANT ALL ON public.blood_donation_matches TO service_role;
ALTER TABLE public.blood_donation_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donor sees own matches" ON public.blood_donation_matches FOR SELECT TO authenticated
  USING (donor_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.blood_requests r WHERE r.id = request_id AND r.created_by = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "donor creates match" ON public.blood_donation_matches FOR INSERT TO authenticated
  WITH CHECK (donor_user_id = auth.uid());
CREATE POLICY "involved updates match" ON public.blood_donation_matches FOR UPDATE TO authenticated
  USING (donor_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.blood_requests r WHERE r.id = request_id AND r.created_by = auth.uid()) OR public.has_role(auth.uid(),'admin'));

-- Campaigns table
CREATE TABLE IF NOT EXISTS public.blood_donation_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  hospital_id uuid,
  title text NOT NULL,
  description text,
  city text NOT NULL,
  address text,
  latitude double precision,
  longitude double precision,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  target_units int,
  blood_types_needed text[] DEFAULT ARRAY[]::text[],
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blood_donation_campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blood_donation_campaigns TO authenticated;
GRANT ALL ON public.blood_donation_campaigns TO service_role;
ALTER TABLE public.blood_donation_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads active campaigns" ON public.blood_donation_campaigns FOR SELECT USING (is_active = true OR organizer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "organizer manages" ON public.blood_donation_campaigns FOR ALL TO authenticated
  USING (organizer_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (organizer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_bdm_upd BEFORE UPDATE ON public.blood_donation_matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bdc_upd BEFORE UPDATE ON public.blood_donation_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bd_upd BEFORE UPDATE ON public.blood_donors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_br_upd BEFORE UPDATE ON public.blood_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reward on completed donation
CREATE OR REPLACE FUNCTION public.reward_blood_donation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    BEGIN
      PERFORM public.wallet_credit(NEW.donor_user_id, 100, 'bonus', NEW.id, 'Recompensa por doação de sangue');
      INSERT INTO public.joy_coin_transactions (user_id, amount, transaction_type, description, reference_id)
        VALUES (NEW.donor_user_id, 200, 'earn', 'Doação de sangue concluída', NEW.id);
      UPDATE public.blood_donors SET total_donations = total_donations + 1, last_donation_date = CURRENT_DATE
        WHERE user_id = NEW.donor_user_id;
      UPDATE public.blood_requests SET units_received = units_received + 1,
        status = CASE WHEN units_received + 1 >= units_needed THEN 'fulfilled' ELSE status END
        WHERE id = NEW.request_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_reward_blood AFTER UPDATE ON public.blood_donation_matches
  FOR EACH ROW EXECUTE FUNCTION public.reward_blood_donation();

-- =========================================================
-- FASE 2: Tabelas dedicadas por tipo de instituição
-- =========================================================

CREATE TABLE IF NOT EXISTS public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  legacy_clinic_id uuid,
  name text NOT NULL,
  description text,
  city text NOT NULL,
  address text,
  neighborhood text,
  phone text,
  email text,
  website text,
  logo_url text,
  latitude double precision,
  longitude double precision,
  emergency_24h boolean NOT NULL DEFAULT false,
  beds_count int,
  has_maternity boolean DEFAULT false,
  has_icu boolean DEFAULT false,
  has_pediatrics boolean DEFAULT false,
  has_blood_bank boolean DEFAULT false,
  departments text[] DEFAULT ARRAY[]::text[],
  insurance_accepted text[] DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  rating numeric(3,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospitals TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospitals public read" ON public.hospitals FOR SELECT USING (is_active = true OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "hospitals owner manage" ON public.hospitals FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.medical_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  legacy_clinic_id uuid,
  name text NOT NULL,
  description text,
  city text NOT NULL,
  address text,
  neighborhood text,
  phone text,
  email text,
  website text,
  logo_url text,
  latitude double precision,
  longitude double precision,
  specialties text[] DEFAULT ARRAY[]::text[],
  consultation_price_avg numeric(10,2),
  has_pediatrics boolean DEFAULT false,
  opening_hours jsonb,
  insurance_accepted text[] DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  rating numeric(3,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.medical_clinics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medical_clinics TO authenticated;
GRANT ALL ON public.medical_clinics TO service_role;
ALTER TABLE public.medical_clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinics public read" ON public.medical_clinics FOR SELECT USING (is_active = true OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clinics owner manage" ON public.medical_clinics FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.laboratories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  legacy_clinic_id uuid,
  name text NOT NULL,
  description text,
  city text NOT NULL,
  address text,
  neighborhood text,
  phone text,
  email text,
  website text,
  logo_url text,
  latitude double precision,
  longitude double precision,
  exam_categories text[] DEFAULT ARRAY[]::text[],
  home_collection boolean DEFAULT false,
  result_delivery_hours int,
  opening_hours jsonb,
  insurance_accepted text[] DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  rating numeric(3,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.laboratories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.laboratories TO authenticated;
GRANT ALL ON public.laboratories TO service_role;
ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "labs public read" ON public.laboratories FOR SELECT USING (is_active = true OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "labs owner manage" ON public.laboratories FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  legacy_store_id uuid,
  name text NOT NULL,
  description text,
  city text NOT NULL,
  address text,
  neighborhood text,
  phone text,
  email text,
  website text,
  logo_url text,
  image_url text,
  latitude double precision,
  longitude double precision,
  is_24h boolean DEFAULT false,
  has_delivery boolean DEFAULT false,
  delivery_fee numeric(10,2) DEFAULT 0,
  sells_prescription_only boolean DEFAULT false,
  opening_hours jsonb,
  insurance_accepted text[] DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  rating numeric(3,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pharmacies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pharmacies TO authenticated;
GRANT ALL ON public.pharmacies TO service_role;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharm public read" ON public.pharmacies FOR SELECT USING (is_active = true OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pharm owner manage" ON public.pharmacies FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_hospitals_upd BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_mc_upd BEFORE UPDATE ON public.medical_clinics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_labs_upd BEFORE UPDATE ON public.laboratories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pharm_upd BEFORE UPDATE ON public.pharmacies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill: copy from legacy clinics & stores
INSERT INTO public.hospitals (owner_id, legacy_clinic_id, name, description, city, address, phone, logo_url, latitude, longitude, is_active, is_verified)
  SELECT owner_id, id, name, description, city, address, phone, logo_url, latitude, longitude, is_active, is_verified
  FROM public.clinics WHERE type = 'hospital'
  ON CONFLICT DO NOTHING;

INSERT INTO public.medical_clinics (owner_id, legacy_clinic_id, name, description, city, address, phone, logo_url, latitude, longitude, is_active, is_verified)
  SELECT owner_id, id, name, description, city, address, phone, logo_url, latitude, longitude, is_active, is_verified
  FROM public.clinics WHERE type = 'clinic' OR type IS NULL
  ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (owner_id, legacy_clinic_id, name, description, city, address, phone, logo_url, latitude, longitude, is_active, is_verified)
  SELECT owner_id, id, name, description, city, address, phone, logo_url, latitude, longitude, is_active, is_verified
  FROM public.clinics WHERE type = 'laboratory'
  ON CONFLICT DO NOTHING;

INSERT INTO public.pharmacies (legacy_store_id, name, description, city, address, phone, image_url, latitude, longitude, delivery_fee, is_active)
  SELECT id, name, description, city, address,
    NULLIF(SPLIT_PART(COALESCE(description,''), 'Tel: ', 2), ''),
    image_url, latitude, longitude, COALESCE(delivery_fee, 0), is_active
  FROM public.stores WHERE type = 'pharmacy'
  ON CONFLICT DO NOTHING;
