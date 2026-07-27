-- ============================================================
-- 20260828000000_jobs_module.sql
--
-- Jobs module — Yango-style job creation in health-tech niche:
-- 1. health_riders — courier network for meds/samples delivery
-- 2. health_deliveries — delivery requests with earnings tracking
-- 3. health_worker_profiles — marketplace for doctors/nurses/caregivers/APEs
-- 4. health_worker_bookings — booking system per worker
--
-- All tables have RLS policies.
-- ============================================================

-- ============================================================
-- 1. HEALTH RIDERS — Rede de estafetas de saúde (Yango-style)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.health_riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  -- Identificação
  full_name text NOT NULL,
  phone text NOT NULL,
  national_id text, -- BI/NUIT in MZ, BI in AO
  -- Veículo
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('bicycle','motorbike','car','foot')),
  vehicle_plate text,
  vehicle_color text,
  -- Documentos (storage paths)
  license_url text,
  id_document_url text,
  vehicle_document_url text,
  -- Estado
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  is_online boolean DEFAULT false,
  last_online_at timestamptz,
  -- Localização (live tracking)
  current_location jsonb, -- {lat, lng, heading, recorded_at}
  -- Métricas
  rating numeric(3,2) DEFAULT 5.00,
  total_deliveries integer DEFAULT 0,
  total_earnings_mzn numeric(15,2) DEFAULT 0,
  total_distance_km numeric(10,2) DEFAULT 0,
  -- Configuração
  available_zones text[], -- ['Maputo Cidade', 'Matola']
  languages text[], -- ['pt', 'mgh', 'tsn']
  accepts_cold_chain boolean DEFAULT false, -- transporta meds termossensíveis
  max_delivery_distance_km integer DEFAULT 15,
  -- Pagamento
  mobile_money_number text, -- M-Pesa, e-Mola
  bank_account jsonb, -- {bank, account, iban}
  -- Onboarding progress
  onboarding_step text DEFAULT 'basics' CHECK (onboarding_step IN ('basics','vehicle','documents','payment','review','completed')),
  onboarding_progress integer DEFAULT 0,
  -- Rejeição
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_health_riders_country_verified ON public.health_riders(country_code, is_verified);
CREATE INDEX IF NOT EXISTS idx_health_riders_online ON public.health_riders(is_online, country_code);
CREATE INDEX IF NOT EXISTS idx_health_riders_user ON public.health_riders(user_id);

ALTER TABLE public.health_riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders can view own profile" ON public.health_riders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Riders can insert own profile" ON public.health_riders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Riders can update own profile" ON public.health_riders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view verified riders" ON public.health_riders FOR SELECT USING (is_verified = true);
CREATE POLICY "Admins can verify riders" ON public.health_riders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_manager','regional_ceo'))
);

-- ============================================================
-- 2. HEALTH DELIVERIES — Pedidos de entrega
-- ============================================================
CREATE TABLE IF NOT EXISTS public.health_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Atribuição
  rider_id uuid REFERENCES public.health_riders(id) ON DELETE SET NULL,
  -- Pedido
  customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  country_code text NOT NULL,
  -- Pickup (origem)
  pickup_type text NOT NULL CHECK (pickup_type IN ('pharmacy','lab','clinic','warehouse','home')),
  pickup_name text NOT NULL,
  pickup_location jsonb NOT NULL, -- {lat, lng}
  pickup_address text,
  -- Dropoff (destino)
  dropoff_name text,
  dropoff_location jsonb NOT NULL, -- {lat, lng}
  dropoff_address text,
  dropoff_phone text,
  -- Encomenda
  package_type text NOT NULL CHECK (package_type IN ('medication','lab_sample','equipment','document','other')),
  package_description text,
  requires_cold_chain boolean DEFAULT false,
  requires_signature boolean DEFAULT true,
  -- Pricing
  estimated_distance_km numeric(5,2),
  estimated_duration_min integer,
  delivery_fee numeric(10,2) NOT NULL, -- what customer pays
  rider_earnings numeric(10,2) NOT NULL, -- what rider gets (fee - platform cut)
  platform_fee numeric(10,2) NOT NULL,
  currency text DEFAULT 'MZN',
  -- Estado
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','accepted','arriving_pickup','picked_up','in_transit','arriving_dropoff','delivered','cancelled','failed'
  )),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  -- Tracking
  tracking_history jsonb DEFAULT '[]', -- [{lat,lng,ts,status}]
  -- Avaliação
  rating integer CHECK (rating BETWEEN 1 AND 5),
  rating_comment text,
  rated_by uuid REFERENCES auth.users(id),
  rated_at timestamptz,
  -- Origem
  source text DEFAULT 'app', -- 'app', 'pharmacy_partnership', 'lab_partnership'
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_deliveries_rider_status ON public.health_deliveries(rider_id, status);
CREATE INDEX IF NOT EXISTS idx_health_deliveries_country_status ON public.health_deliveries(country_code, status);
CREATE INDEX IF NOT EXISTS idx_health_deliveries_pending ON public.health_deliveries(status, country_code) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_health_deliveries_customer ON public.health_deliveries(customer_user_id);

ALTER TABLE public.health_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders can view assigned deliveries" ON public.health_deliveries FOR SELECT USING (
  rider_id IN (SELECT id FROM public.health_riders WHERE user_id = auth.uid())
);
CREATE POLICY "Customers can view own deliveries" ON public.health_deliveries FOR SELECT USING (customer_user_id = auth.uid());
CREATE POLICY "Riders can update assigned deliveries" ON public.health_deliveries FOR UPDATE USING (
  rider_id IN (SELECT id FROM public.health_riders WHERE user_id = auth.uid())
);
CREATE POLICY "Customers can create deliveries" ON public.health_deliveries FOR INSERT WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "Customers can update own pending deliveries" ON public.health_deliveries FOR UPDATE USING (
  customer_user_id = auth.uid() AND status = 'pending'
);
CREATE POLICY "Admins can manage all deliveries" ON public.health_deliveries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_manager','regional_ceo'))
);

-- ============================================================
-- 3. HEALTH WORKER PROFILES — Marketplace de profissionais
-- ============================================================
CREATE TABLE IF NOT EXISTS public.health_worker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  -- Identidade
  full_name text NOT NULL,
  profile_photo_url text,
  bio text,
  -- Profissão
  profession text NOT NULL CHECK (profession IN (
    'doctor','nurse','midwife','ape','pharmacist','lab_tech','caregiver','translator','traditional_healer','community_health_worker'
  )),
  specialization text, -- Cardiologia, Pediatria, etc.
  years_of_experience integer,
  -- Credenciais
  license_number text,
  license_url text, -- storage path
  id_document_url text,
  certificates jsonb DEFAULT '[]', -- [{name, url, year}]
  -- Disponibilidade
  is_available boolean DEFAULT true,
  availability_hours jsonb DEFAULT '{}', -- {mon:{start:'08:00',end:'17:00'}, tue:...}
  home_visits_enabled boolean DEFAULT false,
  telehealth_enabled boolean DEFAULT true,
  service_radius_km integer DEFAULT 10,
  -- Localização
  base_location jsonb, -- {lat, lng}
  base_address text,
  service_zones text[],
  -- Skills
  languages text[],
  conditions_treated text[], -- ['diabetes','hypertension','maternal']
  -- Preços
  consultation_fee numeric(10,2),
  home_visit_fee numeric(10,2),
  telehealth_fee numeric(10,2),
  currency text DEFAULT 'MZN',
  -- Verificação
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  verification_notes text,
  -- Métricas
  rating numeric(3,2) DEFAULT 5.00,
  total_bookings integer DEFAULT 0,
  total_earnings numeric(15,2) DEFAULT 0,
  response_time_avg_min integer,
  -- Onboarding
  onboarding_step text DEFAULT 'basics',
  onboarding_progress integer DEFAULT 0,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_health_workers_country_verified ON public.health_worker_profiles(country_code, is_verified, is_available);
CREATE INDEX IF NOT EXISTS idx_health_workers_profession ON public.health_worker_profiles(profession, is_verified);
CREATE INDEX IF NOT EXISTS idx_health_workers_user ON public.health_worker_profiles(user_id);

ALTER TABLE public.health_worker_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers can view own profile" ON public.health_worker_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Workers can insert own profile" ON public.health_worker_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Workers can update own profile" ON public.health_worker_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view verified workers" ON public.health_worker_profiles FOR SELECT USING (is_verified = true);
CREATE POLICY "Admins can verify workers" ON public.health_worker_profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_manager','regional_ceo'))
);

-- ============================================================
-- 4. HEALTH WORKER BOOKINGS — Reservas de serviços
-- ============================================================
CREATE TABLE IF NOT EXISTS public.health_worker_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.health_worker_profiles(id) ON DELETE CASCADE,
  customer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  -- Tipo de serviço
  service_type text NOT NULL CHECK (service_type IN ('telehealth','home_visit','clinic_consultation','translation','caregiver_session')),
  -- Agendamento
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  -- Localização (para home_visit)
  location jsonb,
  address text,
  -- Detalhes
  reason text,
  symptoms text[],
  notes_for_worker text,
  -- Pricing
  fee numeric(10,2) NOT NULL,
  worker_earnings numeric(10,2) NOT NULL,
  platform_fee numeric(10,2) NOT NULL,
  currency text DEFAULT 'MZN',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','failed')),
  -- Estado
  status text NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested','confirmed','in_progress','completed','cancelled','no_show'
  )),
  confirmed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  cancelled_by uuid REFERENCES auth.users(id),
  -- Avaliação
  rating integer CHECK (rating BETWEEN 1 AND 5),
  rating_comment text,
  rated_at timestamptz,
  -- Ligação a outros registos
  linked_consultation_id uuid,
  linked_prescription_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_worker_bookings_worker ON public.health_worker_bookings(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_health_worker_bookings_customer ON public.health_worker_bookings(customer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_health_worker_bookings_scheduled ON public.health_worker_bookings(scheduled_at);

ALTER TABLE public.health_worker_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workers can view own bookings" ON public.health_worker_bookings FOR SELECT USING (
  worker_id IN (SELECT id FROM public.health_worker_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Customers can view own bookings" ON public.health_worker_bookings FOR SELECT USING (customer_user_id = auth.uid());
CREATE POLICY "Workers can update own bookings" ON public.health_worker_bookings FOR UPDATE USING (
  worker_id IN (SELECT id FROM public.health_worker_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Customers can create bookings" ON public.health_worker_bookings FOR INSERT WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "Customers can update own bookings" ON public.health_worker_bookings FOR UPDATE USING (customer_user_id = auth.uid());

-- ============================================================
-- 5. RIDER EARNINGS DAILY — Agregado diário para dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rider_earnings_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.health_riders(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_deliveries integer DEFAULT 0,
  total_earnings numeric(15,2) DEFAULT 0,
  total_distance_km numeric(10,2) DEFAULT 0,
  total_time_online_min integer DEFAULT 0,
  avg_rating numeric(3,2),
  UNIQUE(rider_id, date)
);

CREATE INDEX IF NOT EXISTS idx_rider_earnings_date ON public.rider_earnings_daily(date DESC);

ALTER TABLE public.rider_earnings_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders can view own earnings" ON public.rider_earnings_daily FOR SELECT USING (
  rider_id IN (SELECT id FROM public.health_riders WHERE user_id = auth.uid())
);

-- ============================================================
-- Triggers para updated_at
-- ============================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['health_riders','health_deliveries','health_worker_profiles',
                        'health_worker_bookings','rider_earnings_daily'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_%I ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- Storage buckets para documentos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('rider-documents', 'rider-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-documents', 'worker-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-photos', 'worker-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Riders can upload own documents" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'rider-documents' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Riders can read own documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'rider-documents' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Admins can read all rider documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'rider-documents' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_manager','regional_ceo')));

CREATE POLICY "Workers can upload own documents" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'worker-documents' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Workers can read own documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'worker-documents' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Admins can read all worker documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'worker-documents' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_manager','regional_ceo')));

CREATE POLICY "Workers can upload own photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'worker-photos' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Anyone can read worker photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'worker-photos');

-- ============================================================
-- Comentários
-- ============================================================
COMMENT ON TABLE public.health_riders IS 'Rede de estafetas para entrega de medicamentos e samples lab. Cria empregos estilo Yango em saúde.';
COMMENT ON TABLE public.health_deliveries IS 'Pedidos de entrega com tracking em tempo real. Pricing: customer paga fee, rider ganha earnings, plataforma fica com fee.';
COMMENT ON TABLE public.health_worker_profiles IS 'Marketplace de profissionais de saúde: médicos, enfermeiros, APEs, cuidadores, tradutores, curandeiros verificados.';
COMMENT ON TABLE public.health_worker_bookings IS 'Reservas de serviços: telehealth, visita domiciliária, tradução, sessão de cuidador.';
COMMENT ON TABLE public.rider_earnings_daily IS 'Agregado diário para dashboard de ganhos do rider.';
