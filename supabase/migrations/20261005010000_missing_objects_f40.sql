-- ═══════════════════════════════════════════════════════════════════════════
-- F40 — Objectos referenciados pelo código mas ausentes das migrations
-- ═══════════════════════════════════════════════════════════════════════════
-- Auditoria f40_audit.py (web + APK vs migrations + types.ts de produção):
--  • Em falta na PRODUÇÃO e nas migrations (cria de facto):
--      streak_log, user_devices, delivery_assignments, health_rider_deliveries,
--      appointments, campaign_links, province_content, views referrals e
--      triage_sessions, RPCs increment_content_views/clicks
--  • Só faltam nas MIGRATIONS (produção já tem — no-op / guardado):
--      driver_vehicles, checkout_debit_order, register_driver_vehicle
--  • Buckets de storage usados por web+APK sem CREATE na repo: avatars,
--      licenses (policies do licenses já existem em 20260618084526)
-- Tudo aditivo e idempotente. Convenções: has_role(uid, app_role) para
-- admin; SECURITY DEFINER com SET search_path; REVOKE→GRANT explícitos.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. GAMIFICAÇÃO — streak diário (useGamification.checkStreak)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streak_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_date)
);
ALTER TABLE public.streak_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Streak own rows" ON public.streak_log;
CREATE POLICY "Streak own rows"
  ON public.streak_log FOR ALL
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT ON public.streak_log TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. PUSH — dispositivos FCM da web (FcmService.upsert onConflict user_id+platform)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_devices (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform   text NOT NULL CHECK (platform IN ('web','android','ios')),
  fcm_token  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Devices own rows" ON public.user_devices;
CREATE POLICY "Devices own rows"
  ON public.user_devices FOR ALL
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_devices TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. DELIVERY — atribuições de entrega ao motorista (rider-mode / active-trip)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'assigned',
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  picked_up_at    timestamptz,
  delivered_at    timestamptz,
  driver_earnings numeric(12,2),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS delivery_assignments_driver_day_idx
  ON public.delivery_assignments (driver_id, assigned_at);
CREATE INDEX IF NOT EXISTS delivery_assignments_order_idx
  ON public.delivery_assignments (order_id);
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Driver reads own assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Driver updates own assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Driver inserts own assignments" ON public.delivery_assignments;
CREATE POLICY "Driver reads own assignments"
  ON public.delivery_assignments FOR SELECT
  TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "Driver inserts own assignments"
  ON public.delivery_assignments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Driver updates own assignments"
  ON public.delivery_assignments FOR UPDATE
  TO authenticated USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);
GRANT SELECT, INSERT, UPDATE ON public.delivery_assignments TO authenticated;

-- FK order_items.delivery_assignment_id → permite o embed PostgREST
-- `order_items(...)` a partir de delivery_assignments (active-trip).
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS delivery_assignment_id uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_delivery_assignment_fkey') THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_delivery_assignment_fkey
      FOREIGN KEY (delivery_assignment_id) REFERENCES public.delivery_assignments(id);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. DELIVERY SAÚDE — entregas dos health riders (RoleBasedHome RiderHome)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_rider_deliveries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'delivered',
  rider_earnings numeric(12,2) NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS health_rider_deliveries_rider_idx
  ON public.health_rider_deliveries (rider_id, created_at);
ALTER TABLE public.health_rider_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rider reads own deliveries" ON public.health_rider_deliveries;
CREATE POLICY "Rider reads own deliveries"
  ON public.health_rider_deliveries FOR SELECT
  TO authenticated USING (auth.uid() = rider_id);
GRANT SELECT ON public.health_rider_deliveries TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. CONSULTAS — marcações (CancelAppointment: participantes gerem)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at        timestamptz NOT NULL,
  status              text NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','confirmed','in_progress','completed','cancelled','no_show')),
  type                text NOT NULL DEFAULT 'in_person'
                      CHECK (type IN ('in_person','video','emergency','follow_up')),
  reason              text,
  cancellation_reason text,
  cancelled_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS appointments_patient_idx ON public.appointments (patient_id, scheduled_at);
CREATE INDEX IF NOT EXISTS appointments_doctor_idx ON public.appointments (doctor_id, scheduled_at);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants read appointment" ON public.appointments;
DROP POLICY IF EXISTS "Participants update appointment" ON public.appointments;
DROP POLICY IF EXISTS "Participants create appointment" ON public.appointments;
CREATE POLICY "Participants read appointment"
  ON public.appointments FOR SELECT
  TO authenticated USING (auth.uid() IN (patient_id, doctor_id));
CREATE POLICY "Participants create appointment"
  ON public.appointments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IN (patient_id, doctor_id));
CREATE POLICY "Participants update appointment"
  ON public.appointments FOR UPDATE
  TO authenticated USING (auth.uid() IN (patient_id, doctor_id))
  WITH CHECK (auth.uid() IN (patient_id, doctor_id));
GRANT SELECT, INSERT, UPDATE ON public.appointments TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. MARKETING — links de campanha (página admin, UNIQUE short_code)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaign_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  type          text NOT NULL DEFAULT 'general_growth'
                CHECK (type IN ('province_launch','doctor_recruitment','rider_push','general_growth')),
  province_id   text,
  province_name text,
  role_target   text,
  short_code    text NOT NULL UNIQUE,
  full_url      text NOT NULL DEFAULT '',
  clicks        integer NOT NULL DEFAULT 0,
  signups       integer NOT NULL DEFAULT 0,
  conversions   integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manages campaign links" ON public.campaign_links;
CREATE POLICY "Admin manages campaign links"
  ON public.campaign_links FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_links TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. CONTEÚDO PROVINCIAL — alertas/campanhas/dicas por província
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.province_content (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  type        text NOT NULL DEFAULT 'tip'
              CHECK (type IN ('alert','campaign','tip')),
  priority    text NOT NULL DEFAULT 'medium'
              CHECK (priority IN ('high','medium','low')),
  province    text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS province_content_province_idx
  ON public.province_content (province, created_at);
ALTER TABLE public.province_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Managers read province content" ON public.province_content;
DROP POLICY IF EXISTS "Managers write province content" ON public.province_content;
CREATE POLICY "Managers read province content"
  ON public.province_content FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Managers write province content"
  ON public.province_content FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'provincial_manager')
    OR public.has_role(auth.uid(), 'country_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'provincial_manager')
    OR public.has_role(auth.uid(), 'country_manager')
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.province_content TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. VEÍCULOS DE MOTORISTA — versionamento (produção já tem; bootstrap novo)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.driver_vehicles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type        text NOT NULL,
  brand               text NOT NULL,
  model               text NOT NULL,
  color               text,
  year                integer,
  license_plate       text,
  photo_front         text,
  photo_side          text,
  photo_back          text,
  photo_interior      text,
  license_carta_url   text,
  license_viatura_url text,
  insurance_url       text,
  inspection_url      text,
  is_primary          boolean DEFAULT false,
  is_verified         boolean DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Driver manages own vehicles" ON public.driver_vehicles;
CREATE POLICY "Driver manages own vehicles"
  ON public.driver_vehicles FOR ALL
  TO authenticated USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_vehicles TO authenticated;
