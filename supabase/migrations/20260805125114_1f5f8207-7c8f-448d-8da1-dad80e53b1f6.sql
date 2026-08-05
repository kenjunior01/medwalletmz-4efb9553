
CREATE TABLE IF NOT EXISTS public.voice_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  transcript text,
  transcript_language text,
  transcript_confidence numeric,
  detected_mood text,
  detected_symptoms text[] DEFAULT '{}',
  detected_keywords text[] DEFAULT '{}',
  ai_summary text,
  ai_insight text,
  processing_status text NOT NULL DEFAULT 'pending',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_journals TO authenticated;
GRANT ALL ON public.voice_journals TO service_role;
ALTER TABLE public.voice_journals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own voice journals" ON public.voice_journals;
CREATE POLICY "own voice journals" ON public.voice_journals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_voice_journals_user ON public.voice_journals(user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.vision_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type text NOT NULL,
  image_url text,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  detected_medications jsonb DEFAULT '[]'::jsonb,
  detected_doctor text,
  detected_facility text,
  detected_date text,
  detected_next_appointment text,
  detected_test_name text,
  detected_results jsonb DEFAULT '[]'::jsonb,
  confidence_score numeric,
  was_reviewed_by_user boolean NOT NULL DEFAULT false,
  was_corrected boolean NOT NULL DEFAULT false,
  user_corrections jsonb DEFAULT '{}'::jsonb,
  linked_prescription_id uuid,
  linked_lab_order_id uuid,
  language_detected text,
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vision_scans TO authenticated;
GRANT ALL ON public.vision_scans TO service_role;
ALTER TABLE public.vision_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own vision scans" ON public.vision_scans;
CREATE POLICY "own vision scans" ON public.vision_scans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_vision_scans_user ON public.vision_scans(user_id, created_at DESC);

DROP POLICY IF EXISTS "voice journal own files" ON storage.objects;
CREATE POLICY "voice journal own files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'voice-journals' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'voice-journals' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "vision scans own files" ON storage.objects;
CREATE POLICY "vision scans own files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'vision-scans' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'vision-scans' AND (storage.foldername(name))[1] = auth.uid()::text);
