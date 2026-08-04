CREATE TABLE IF NOT EXISTS public.manager_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  country_id text,
  province text,
  target_region text,
  current_occupation text,
  experience_years int NOT NULL DEFAULT 0,
  languages text[] NOT NULL DEFAULT '{}',
  weekly_hours int NOT NULL DEFAULT 0,
  has_transport boolean NOT NULL DEFAULT false,
  linkedin text,
  motivation text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  quiz_score int NOT NULL DEFAULT 0,
  max_score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manager_applications_status_chk CHECK (status IN ('pending','in_review','interview','approved','rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS manager_applications_active_uidx
  ON public.manager_applications (user_id)
  WHERE status IN ('pending','in_review','interview');

GRANT SELECT, INSERT, UPDATE ON public.manager_applications TO authenticated;
GRANT ALL ON public.manager_applications TO service_role;

ALTER TABLE public.manager_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_application_select" ON public.manager_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own_application_insert" ON public.manager_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_application_update" ON public.manager_applications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "staff_application_select" ON public.manager_applications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'country_manager'));

CREATE POLICY "staff_application_update" ON public.manager_applications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'country_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'country_manager'));

CREATE TRIGGER manager_applications_touch
  BEFORE UPDATE ON public.manager_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();