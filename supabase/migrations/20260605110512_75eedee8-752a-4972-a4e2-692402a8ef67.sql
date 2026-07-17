
-- 1. MEDICAL RECORDS
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'exam',
  description TEXT,
  file_url TEXT,
  file_mime TEXT,
  issued_at DATE,
  issued_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO authenticated;
GRANT ALL ON public.medical_records TO service_role;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patient manages own records" ON public.medical_records
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE TRIGGER trg_med_records_updated BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. MEDICAL RECORD SHARES
CREATE TABLE public.medical_record_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(record_id, doctor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_record_shares TO authenticated;
GRANT ALL ON public.medical_record_shares TO service_role;
ALTER TABLE public.medical_record_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patient manages shares" ON public.medical_record_shares
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctor views shares with them" ON public.medical_record_shares
  FOR SELECT USING (auth.uid() = doctor_id AND revoked_at IS NULL);

-- Doctors can SELECT shared records
CREATE POLICY "Doctor views shared records" ON public.medical_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.medical_record_shares s
      WHERE s.record_id = medical_records.id
        AND s.doctor_id = auth.uid()
        AND s.revoked_at IS NULL
    )
  );

-- 3. VIDEO SESSIONS
CREATE TABLE public.video_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_sessions TO authenticated;
GRANT ALL ON public.video_sessions TO service_role;
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Consultation parties access video" ON public.video_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = video_sessions.consultation_id
        AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = video_sessions.consultation_id
        AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
    )
  );
CREATE TRIGGER trg_video_sessions_updated BEFORE UPDATE ON public.video_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_sessions;

-- 4. TRIAGE LOGS
CREATE TABLE public.triage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL,
  age INT,
  duration TEXT,
  severity TEXT,
  recommendation TEXT,
  suggested_specialty TEXT,
  ai_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.triage_logs TO authenticated;
GRANT ALL ON public.triage_logs TO service_role;
ALTER TABLE public.triage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patient owns triage" ON public.triage_logs
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);

-- 5. PUSH SUBSCRIPTIONS
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own push subs" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. HEALTH REFERRAL REWARDS (config)
CREATE TABLE public.health_referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joy_coins_referrer INT NOT NULL DEFAULT 100,
  joy_coins_referred INT NOT NULL DEFAULT 50,
  coupon_code TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.health_referral_rewards TO authenticated, anon;
GRANT ALL ON public.health_referral_rewards TO service_role;
ALTER TABLE public.health_referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads rewards config" ON public.health_referral_rewards
  FOR SELECT USING (true);
CREATE POLICY "Admins manage rewards" ON public.health_referral_rewards
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_referral_rewards_updated BEFORE UPDATE ON public.health_referral_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default reward
INSERT INTO public.health_referral_rewards (joy_coins_referrer, joy_coins_referred, coupon_code)
VALUES (100, 50, 'SAUDE10');

-- 7. Add referral_code to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
