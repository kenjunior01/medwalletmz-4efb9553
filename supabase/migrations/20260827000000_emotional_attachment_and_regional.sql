-- ============================================================
-- 20260827000000_emotional_attachment_and_regional.sql
-- 
-- Creates tables for:
-- 1. Emotional attachment: health_journal, family_members, support_circles
-- 2. Regional structure: regional_kpis, regional_goals, regional_ranking
-- 3. GCP integration: meddy_conversations, vision_scans, voice_journals
-- 
-- All tables have RLS policies for security.
-- ============================================================

-- ============================================================
-- 1. HEALTH JOURNAL — Diário de bem-estar com insights IA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.health_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  mood smallint CHECK (mood BETWEEN 1 AND 5), -- 1=muito mau, 5=muito bom
  energy smallint CHECK (energy BETWEEN 1 AND 5),
  sleep_hours numeric(3,1),
  sleep_quality smallint CHECK (sleep_quality BETWEEN 1 AND 5),
  pain_level smallint CHECK (pain_level BETWEEN 0 AND 10),
  symptoms text[], -- ['dor de cabeça', 'fadiga']
  notes text,
  gratitude text, -- entrada de gratidão diária
  weather text, -- context: ensolarado, chuvoso (afecta humor)
  location text, -- context: casa, trabalho
  ai_insight text, -- preenchido por job semanal via Gemini
  ai_insight_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_health_journal_user_date ON public.health_journal(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_journal_mood ON public.health_journal(user_id, mood);

ALTER TABLE public.health_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own journal entries" ON public.health_journal
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. FAMILY MEMBERS — Cuidar de familiares a distância
-- ============================================================
CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caretaker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Dados do familiar (não precisa de conta própria)
  full_name text NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('parent','child','spouse','sibling','grandparent','other')),
  birth_date date,
  gender text CHECK (gender IN ('male','female','other')),
  blood_type text,
  allergies text[],
  chronic_conditions text[], -- ['diabetes','hipertensão']
  medications text[], -- nome dos medicamentos que toma
  emergency_contact text,
  -- Permissões (o que o cuidador pode ver/fazer)
  can_view_medical boolean DEFAULT true,
  can_book_appointments boolean DEFAULT true,
  can_receive_medication_alerts boolean DEFAULT true,
  -- Notificações
  medication_alerts_enabled boolean DEFAULT true,
  missed_dose_threshold_minutes integer DEFAULT 60,
  -- Avatar
  avatar_url text,
  color text DEFAULT '#3B82F6', -- cor para identificar na UI
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_members_caretaker ON public.family_members(caretaker_user_id);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caretakers can CRUD their family members" ON public.family_members
  FOR ALL USING (auth.uid() = caretaker_user_id) WITH CHECK (auth.uid() = caretaker_user_id);

-- Logs de medicação dos familiares (para alertas)
CREATE TABLE IF NOT EXISTS public.family_medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  caretaker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  scheduled_time time NOT NULL,
  taken_at timestamptz,
  skipped_at timestamptz,
  skipped_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_med_logs_member_date ON public.family_medication_logs(family_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_med_logs_pending ON public.family_medication_logs(caretaker_user_id, taken_at IS NULL, scheduled_time);

ALTER TABLE public.family_medication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caretakers can CRUD family medication logs" ON public.family_medication_logs
  FOR ALL USING (auth.uid() = caretaker_user_id) WITH CHECK (auth.uid() = caretaker_user_id);

-- ============================================================
-- 3. SUPPORT CIRCLES — Grupos peer-to-peer por condição
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  condition_tag text NOT NULL, -- 'diabetes','hipertensao','maternidade','saudemental'
  country_code text, -- null = global
  language text DEFAULT 'pt',
  is_private boolean DEFAULT false,
  require_approval boolean DEFAULT true,
  max_members integer DEFAULT 50,
  -- Moderação IA
  ai_moderation_enabled boolean DEFAULT true,
  ai_guidelines text DEFAULT 'Proibir: Conselhos médicos específicos que substituam médico. Permitir: Partilha de experiências, dicas de bem-estar, suporte emocional.',
  -- Gamificação
  streak_bonus_enabled boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_circles_condition ON public.support_circles(condition_tag, is_private);
CREATE INDEX IF NOT EXISTS idx_support_circles_country ON public.support_circles(country_code);

ALTER TABLE public.support_circles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public circles" ON public.support_circles FOR SELECT USING (NOT is_private);
CREATE POLICY "Creators can manage their circles" ON public.support_circles FOR ALL USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS public.support_circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.support_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  is_muted boolean DEFAULT false,
  UNIQUE(circle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_user ON public.support_circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON public.support_circle_members(circle_id);

ALTER TABLE public.support_circle_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view circles they're in" ON public.support_circle_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join circles" ON public.support_circle_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave circles" ON public.support_circle_members FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.support_circle_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.support_circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  -- Moderação IA
  ai_moderation_status text DEFAULT 'pending' CHECK (ai_moderation_status IN ('pending','approved','flagged','rejected')),
  ai_moderation_reason text,
  ai_categories text[], -- ['self_harm','medical_advice','spam']
  is_anonymous boolean DEFAULT false,
  reactions jsonb DEFAULT '{}',
  reply_to uuid REFERENCES public.support_circle_messages(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_circle_messages_circle ON public.support_circle_messages(circle_id, created_at DESC);

ALTER TABLE public.support_circle_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view messages" ON public.support_circle_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_circle_members m WHERE m.circle_id = support_circle_messages.circle_id AND m.user_id = auth.uid())
);
CREATE POLICY "Members can post messages" ON public.support_circle_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.support_circle_members m WHERE m.circle_id = support_circle_messages.circle_id AND m.user_id = auth.uid())
);
CREATE POLICY "Users can delete own messages" ON public.support_circle_messages FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. MEDDY AI CONVERSATIONS — Conversas com o mascote
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meddy_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  context text, -- 'morning_checkin','symptom_discussion','medication_question','emotional_support'
  language text DEFAULT 'pt',
  summary text, -- resumo gerado por IA no fim
  mood_before smallint,
  mood_after smallint,
  is_active boolean DEFAULT true,
  message_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_meddy_conversations_user ON public.meddy_conversations(user_id, last_message_at DESC);

ALTER TABLE public.meddy_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.meddy_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON public.meddy_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.meddy_conversations FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.meddy_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.meddy_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  -- Metadados
  detected_intent text, -- 'greeting','health_question','emotional_distress','medication_query'
  detected_language text,
  suggested_actions jsonb DEFAULT '[]', -- [{type:'book_appointment',label:'Marcar consulta'}]
  is_crisis_flagged boolean DEFAULT false, -- se IA detectou crise (suicidio, etc)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meddy_messages_conversation ON public.meddy_messages(conversation_id, created_at);

ALTER TABLE public.meddy_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meddy messages" ON public.meddy_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.meddy_conversations c WHERE c.id = meddy_messages.conversation_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users can insert own meddy messages" ON public.meddy_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.meddy_conversations c WHERE c.id = meddy_messages.conversation_id AND c.user_id = auth.uid())
);

-- ============================================================
-- 5. VISION SCANS — Scans de receitas/exames via Gemini Vision
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vision_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type text NOT NULL CHECK (scan_type IN ('prescription','lab_result','medicine_label','doctor_note','vaccine_card','other')),
  image_url text NOT NULL, -- storage path
  -- Resultado extraído pela IA
  extracted_data jsonb DEFAULT '{}',
  -- Para prescrições
  detected_medications jsonb DEFAULT '[]', -- [{name, dosage, frequency, duration}]
  detected_doctor text,
  detected_facility text,
  detected_date date,
  detected_next_appointment date,
  -- Para exames lab
  detected_test_name text,
  detected_results jsonb DEFAULT '[]', -- [{parameter, value, unit, reference_range, status}]
  -- Confiança e revisão
  confidence_score numeric(3,2), -- 0.00 a 1.00
  was_reviewed_by_user boolean DEFAULT false,
  was_corrected boolean DEFAULT false,
  user_corrections jsonb DEFAULT '{}',
  -- Link para outros registos
  linked_prescription_id uuid,
  linked_lab_order_id uuid,
  -- Metadados
  language_detected text,
  processing_time_ms integer,
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vision_scans_user ON public.vision_scans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vision_scans_type ON public.vision_scans(scan_type);

ALTER TABLE public.vision_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own vision scans" ON public.vision_scans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. VOICE JOURNALS — Diários por voz (Speech-to-Text)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.voice_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url text NOT NULL, -- storage path
  duration_seconds integer NOT NULL,
  -- Transcrição
  transcript text,
  transcript_language text,
  transcript_confidence numeric(3,2),
  -- IA extraiu
  detected_mood text, -- 'happy','sad','anxious','calm','angry'
  detected_symptoms text[],
  detected_keywords text[], -- ['sono','trabalho','família']
  ai_summary text,
  ai_insight text, -- insight gerado pela IA
  -- Metadados
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending','transcribing','analyzing','completed','failed'))
);

CREATE INDEX IF NOT EXISTS idx_voice_journals_user ON public.voice_journals(user_id, recorded_at DESC);

ALTER TABLE public.voice_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own voice journals" ON public.voice_journals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. REGIONAL CEO DASHBOARDS — KPIs e metas por região
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regional_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  kpi_key text NOT NULL, -- 'active_users','revenue_mtd','partners_onboarded','consultations_booked','prescriptions_filled'
  kpi_value numeric(15,2) NOT NULL,
  kpi_unit text, -- 'count','currency','percentage'
  period_start date NOT NULL,
  period_end date NOT NULL,
  -- Contexto
  previous_period_value numeric(15,2),
  yoy_value numeric(15,2), -- year-over-year
  target_value numeric(15,2),
  -- Metadados
  source text, -- 'supabase_aggregation','manual_entry','external_api'
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(country_code, kpi_key, period_start)
);

CREATE INDEX IF NOT EXISTS idx_regional_kpis_country_period ON public.regional_kpis(country_code, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_regional_kpis_key ON public.regional_kpis(kpi_key, period_start DESC);

ALTER TABLE public.regional_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read regional KPIs" ON public.regional_kpis FOR SELECT USING (true);
CREATE POLICY "Admins can write regional KPIs" ON public.regional_kpis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_manager','regional_ceo'))
);

CREATE TABLE IF NOT EXISTS public.regional_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  quarter text NOT NULL, -- '2026-Q1','2026-Q2'
  goal_key text NOT NULL, -- 'users_target','revenue_target','partner_target'
  goal_value numeric(15,2) NOT NULL,
  goal_unit text,
  -- Para tracking de progresso
  current_value numeric(15,2) DEFAULT 0,
  progress_percentage numeric(5,2) GENERATED ALWAYS AS (CASE WHEN goal_value > 0 THEN (current_value / goal_value * 100) ELSE 0 END) STORED,
  status text DEFAULT 'on_track' CHECK (status IN ('on_track','at_risk','behind','achieved','exceeded')),
  -- CEO notes
  ceo_notes text,
  last_updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(country_code, quarter, goal_key)
);

CREATE INDEX IF NOT EXISTS idx_regional_goals_country_quarter ON public.regional_goals(country_code, quarter DESC);

ALTER TABLE public.regional_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read regional goals" ON public.regional_goals FOR SELECT USING (true);
CREATE POLICY "Regional CEOs and admins can manage goals" ON public.regional_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_ceo'))
);

-- ============================================================
-- 8. REGIONAL CONTENT — Conteúdo específico por país
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regional_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('health_campaign','partner_highlight','emergency_notice','holiday_schedule','local_tip')),
  title text NOT NULL,
  description text,
  content_body jsonb DEFAULT '{}', -- rich content
  -- Targeting
  audience_tags text[], -- ['diabetic','pregnant','elderly']
  language text DEFAULT 'pt',
  -- Agendamento
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  is_pinned boolean DEFAULT false,
  -- Visual
  image_url text,
  accent_color text,
  -- CTA
  cta_label text,
  cta_url text,
  -- Métricas
  views_count integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regional_content_country_active ON public.regional_content(country_code, is_active, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_regional_content_type ON public.regional_content(content_type, is_active);

ALTER TABLE public.regional_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active regional content" ON public.regional_content FOR SELECT USING (is_active = true);
CREATE POLICY "Regional managers and admins can manage content" ON public.regional_content FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_manager','regional_ceo'))
);

-- ============================================================
-- 9. REGIONAL RANKING — Leaderboard saudável entre regiões
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regional_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL, -- '2026-W30','2026-Q3','2026'
  country_code text NOT NULL,
  -- Métricas para ranking
  health_score numeric(5,2), -- 0-100, composto
  medication_adherence_pct numeric(5,2),
  active_users_count integer,
  consultations_per_1000 numeric(8,2),
  partner_satisfaction_score numeric(3,2),
  sos_response_time_avg_min numeric(8,2),
  -- Ranking
  rank_overall integer,
  rank_adherence integer,
  rank_growth integer,
  -- Badges desbloqueados
  badges jsonb DEFAULT '[]', -- ['top_adherence','fastest_growth','most_improved']
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period, country_code)
);

CREATE INDEX IF NOT EXISTS idx_regional_rankings_period ON public.regional_rankings(period, rank_overall);

ALTER TABLE public.regional_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view regional rankings" ON public.regional_rankings FOR SELECT USING (true);
CREATE POLICY "Admins can update rankings" ON public.regional_rankings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_ceo'))
);

-- ============================================================
-- 10. COUNTRY ONBOARDING — Wizard para activar nova região
-- ============================================================
CREATE TABLE IF NOT EXISTS public.country_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  -- Estado do wizard
  current_step text DEFAULT 'basics' CHECK (current_step IN ('basics','currency','partners','regulator','translations','emergency_numbers','holidays','review','completed')),
  progress_percentage integer DEFAULT 0,
  -- Dados recolhidos
  wizard_data jsonb DEFAULT '{}',
  -- Configuração final
  is_activated boolean DEFAULT false,
  activated_at timestamptz,
  -- CEO regional atribuído
  regional_ceo_user_id uuid REFERENCES auth.users(id),
  -- Metas iniciais
  q1_targets jsonb DEFAULT '{}',
  -- Auditoria
  started_by uuid NOT NULL REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_country_onboarding_active ON public.country_onboarding(is_activated, country_code);

ALTER TABLE public.country_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage country onboarding" ON public.country_onboarding FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_ceo'))
);

-- ============================================================
-- Triggers para updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY['health_journal','family_members','family_medication_logs',
                        'support_circles','support_circle_members','support_circle_messages',
                        'meddy_conversations','vision_scans','voice_journals',
                        'regional_kpis','regional_goals','regional_content',
                        'regional_rankings','country_onboarding'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_%I ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- Storage buckets para ficheiros
-- ============================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vision-scans', 'vision-scans', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-journals', 'voice-journals', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('family-avatars', 'family-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own vision scans" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'vision-scans' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Users can read own vision scans" ON storage.objects FOR SELECT 
  USING (bucket_id = 'vision-scans' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Users can upload own voice journals" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'voice-journals' AND auth.uid() = (storage.foldername(name))[1]::uuid);
CREATE POLICY "Users can read own voice journals" ON storage.objects FOR SELECT 
  USING (bucket_id = 'voice-journals' AND auth.uid() = (storage.foldername(name))[1]::uuid);

CREATE POLICY "Anyone can read family avatars" ON storage.objects FOR SELECT 
  USING (bucket_id = 'family-avatars');
CREATE POLICY "Authenticated can upload family avatars" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'family-avatars' AND auth.role() = 'authenticated');

-- ============================================================
-- Comentários finais
-- ============================================================
COMMENT ON TABLE public.health_journal IS 'Diário de bem-estar diário com humor, sono, sintomas, gratidão. IA gera insights semanais.';
COMMENT ON TABLE public.family_members IS 'Familiares sob cuidados do utilizador (pais, filhos, etc). Não precisam de conta própria.';
COMMENT ON TABLE public.support_circles IS 'Grupos peer-to-peer por condição. Moderação IA proíbe conselhos médicos perigosos.';
COMMENT ON TABLE public.meddy_conversations IS 'Conversas com o mascote Meddy via Gemini. Multilingue, detecta crises.';
COMMENT ON TABLE public.vision_scans IS 'Scans de receitas/exames via Gemini Vision. Extrai medicamentos, dosagens, resultados.';
COMMENT ON TABLE public.voice_journals IS 'Diários por voz via Google Speech-to-Text. Útil para idosos e baixa literacia.';
COMMENT ON TABLE public.regional_kpis IS 'KPIs por país (utilizadores, receita, parceiros). Atualizado por agregação Supabase.';
COMMENT ON TABLE public.regional_goals IS 'Metas trimestrais por país. CEOs regionais acompanham progresso.';
COMMENT ON TABLE public.regional_content IS 'Conteúdo por país: campanhas, parceiros, emergências, feriados.';
COMMENT ON TABLE public.regional_rankings IS 'Ranking global entre regiões. Badges motivacionais para CEOs regionais.';
COMMENT ON TABLE public.country_onboarding IS 'Wizard de activação de nova região. 9 passos até lançamento.';
