CREATE TABLE public.manager_application_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.manager_applications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mam_application ON public.manager_application_messages(application_id, created_at);

GRANT SELECT, INSERT ON public.manager_application_messages TO authenticated;
GRANT ALL ON public.manager_application_messages TO service_role;

ALTER TABLE public.manager_application_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicant reads own application messages"
ON public.manager_application_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.manager_applications a WHERE a.id = application_id AND a.user_id = auth.uid()));

CREATE POLICY "Admins read all application messages"
ON public.manager_application_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Applicant sends message on own application"
ON public.manager_application_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND is_staff = false AND EXISTS (SELECT 1 FROM public.manager_applications a WHERE a.id = application_id AND a.user_id = auth.uid()));

CREATE POLICY "Admins send staff messages"
ON public.manager_application_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mam_updated_at
BEFORE UPDATE ON public.manager_application_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();