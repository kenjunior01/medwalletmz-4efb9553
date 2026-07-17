
ALTER TABLE public.video_sessions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS room_url text,
  ADD COLUMN IF NOT EXISTS room_name text,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS end_reason text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

CREATE INDEX IF NOT EXISTS idx_video_sessions_consultation ON public.video_sessions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_created_at ON public.video_sessions(created_at DESC);

-- Allow patient/doctor of the consultation to read + insert + update their own sessions
DROP POLICY IF EXISTS "Participants can view video sessions" ON public.video_sessions;
CREATE POLICY "Participants can view video sessions"
ON public.video_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = video_sessions.consultation_id
      AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Participants can insert video sessions" ON public.video_sessions;
CREATE POLICY "Participants can insert video sessions"
ON public.video_sessions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = video_sessions.consultation_id
      AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Participants can update video sessions" ON public.video_sessions;
CREATE POLICY "Participants can update video sessions"
ON public.video_sessions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = video_sessions.consultation_id
      AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
);

GRANT SELECT, INSERT, UPDATE ON public.video_sessions TO authenticated;
GRANT ALL ON public.video_sessions TO service_role;

-- Log when a participant joins
CREATE OR REPLACE FUNCTION public.video_session_add_participant(_session_id uuid, _user_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.video_sessions
  SET participants = participants || jsonb_build_array(
    jsonb_build_object('user_id', _user_id, 'role', _role, 'joined_at', now())
  ),
  status = CASE WHEN status = 'waiting' THEN 'active' ELSE status END
  WHERE id = _session_id;
END;
$$;

-- Mark ended and compute duration
CREATE OR REPLACE FUNCTION public.video_session_end(_session_id uuid, _reason text DEFAULT 'hangup')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE started timestamptz;
BEGIN
  SELECT started_at INTO started FROM public.video_sessions WHERE id = _session_id;
  UPDATE public.video_sessions
  SET status = 'ended',
      ended_at = COALESCE(ended_at, now()),
      end_reason = _reason,
      duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(started, now())))::int)
  WHERE id = _session_id;
END;
$$;
