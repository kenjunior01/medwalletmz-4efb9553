-- ═══════════════════════════════════════════════════════════════════════════
-- F40 — Tabelas base do Hub de Sangue (versionamento para bootstrap limpo)
-- ═══════════════════════════════════════════════════════════════════════════
-- As tabelas `blood_donors` e `blood_requests` existem em produção, mas
-- NUNCA foram criadas nas migrations — só havia ALTERs (20260707074327) e
-- policies (20260709081926) que presumem as tabelas já criadas, o que
-- quebra o bootstrap de uma BD nova. Esta migração (timestamp ANTERIOR às
-- que as referenciam) cria as bases de forma idempotente; em produção é
-- no-op (IF NOT EXISTS). As colunas completas vêm das ALTERs seguintes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Dadores (1 por utilizador — upsert onConflict user_id) ────────────────
CREATE TABLE IF NOT EXISTS public.blood_donors (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_type        text NOT NULL DEFAULT 'O+',
  city              text NOT NULL DEFAULT '',
  full_name         text,
  phone             text,
  birth_date        date,
  weight_kg         numeric(5,2),
  neighborhood      text,
  latitude          double precision,
  longitude         double precision,
  is_available      boolean NOT NULL DEFAULT true,
  is_active         boolean NOT NULL DEFAULT true,
  health_notes      text,
  verified_at       timestamptz,
  total_donations   integer NOT NULL DEFAULT 0,
  last_donation_date date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Donors read own row" ON public.blood_donors;
DROP POLICY IF EXISTS "Donors insert own row" ON public.blood_donors;
DROP POLICY IF EXISTS "Donors update own row" ON public.blood_donors;

CREATE POLICY "Donors read own row"
  ON public.blood_donors FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Donors insert own row"
  ON public.blood_donors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Donors update own row"
  ON public.blood_donors FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.blood_donors TO authenticated;

-- ── Pedidos de sangue (status open/fulfilled/cancelled/expired) ───────────
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blood_type           text NOT NULL,
  city                 text NOT NULL,
  hospital_id          uuid,
  hospital_name        text,
  hospital_name_manual text,
  patient_name         text,
  contact_phone        text,
  status               text NOT NULL DEFAULT 'open',
  urgency              text NOT NULL DEFAULT 'normal',
  units_needed         integer NOT NULL DEFAULT 1,
  units_received       integer NOT NULL DEFAULT 0,
  reason               text,
  notes                text,
  deadline             timestamptz,
  latitude             double precision,
  longitude            double precision,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requester inserts own request" ON public.blood_requests;
DROP POLICY IF EXISTS "Requester reads own request" ON public.blood_requests;

CREATE POLICY "Requester inserts own request"
  ON public.blood_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Requester reads own request"
  ON public.blood_requests FOR SELECT
  TO authenticated USING (auth.uid() = created_by);

GRANT SELECT, INSERT ON public.blood_requests TO authenticated;
