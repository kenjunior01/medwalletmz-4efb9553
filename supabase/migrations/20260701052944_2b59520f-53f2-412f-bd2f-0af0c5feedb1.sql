CREATE TABLE public.place_proposal_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.place_proposals(id) ON DELETE CASCADE,
  changed_by uuid,
  action text NOT NULL DEFAULT 'update',
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_before jsonb,
  snapshot_after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.place_proposal_audit_logs TO authenticated;
GRANT ALL ON public.place_proposal_audit_logs TO service_role;

ALTER TABLE public.place_proposal_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view proposal audit logs"
ON public.place_proposal_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create proposal audit logs"
ON public.place_proposal_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_place_proposal_audit_logs_proposal_id_created_at
ON public.place_proposal_audit_logs (proposal_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_place_proposal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  diff jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name THEN
    diff := diff || jsonb_build_object('name', jsonb_build_object('from', OLD.name, 'to', NEW.name));
  END IF;
  IF NEW.address IS DISTINCT FROM OLD.address THEN
    diff := diff || jsonb_build_object('address', jsonb_build_object('from', OLD.address, 'to', NEW.address));
  END IF;
  IF NEW.city IS DISTINCT FROM OLD.city THEN
    diff := diff || jsonb_build_object('city', jsonb_build_object('from', OLD.city, 'to', NEW.city));
  END IF;
  IF NEW.neighborhood IS DISTINCT FROM OLD.neighborhood THEN
    diff := diff || jsonb_build_object('neighborhood', jsonb_build_object('from', OLD.neighborhood, 'to', NEW.neighborhood));
  END IF;
  IF NEW.reference_point IS DISTINCT FROM OLD.reference_point THEN
    diff := diff || jsonb_build_object('reference_point', jsonb_build_object('from', OLD.reference_point, 'to', NEW.reference_point));
  END IF;
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    diff := diff || jsonb_build_object('phone', jsonb_build_object('from', OLD.phone, 'to', NEW.phone));
  END IF;
  IF NEW.website IS DISTINCT FROM OLD.website THEN
    diff := diff || jsonb_build_object('website', jsonb_build_object('from', OLD.website, 'to', NEW.website));
  END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    diff := diff || jsonb_build_object('description', jsonb_build_object('from', OLD.description, 'to', NEW.description));
  END IF;
  IF NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    diff := diff || jsonb_build_object('image_url', jsonb_build_object('from', OLD.image_url, 'to', NEW.image_url));
  END IF;
  IF NEW.latitude IS DISTINCT FROM OLD.latitude THEN
    diff := diff || jsonb_build_object('latitude', jsonb_build_object('from', OLD.latitude, 'to', NEW.latitude));
  END IF;
  IF NEW.longitude IS DISTINCT FROM OLD.longitude THEN
    diff := diff || jsonb_build_object('longitude', jsonb_build_object('from', OLD.longitude, 'to', NEW.longitude));
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    diff := diff || jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF NEW.review_notes IS DISTINCT FROM OLD.review_notes THEN
    diff := diff || jsonb_build_object('review_notes', jsonb_build_object('from', OLD.review_notes, 'to', NEW.review_notes));
  END IF;

  IF diff <> '{}'::jsonb THEN
    INSERT INTO public.place_proposal_audit_logs (
      proposal_id,
      changed_by,
      action,
      changes,
      snapshot_before,
      snapshot_after
    ) VALUES (
      NEW.id,
      auth.uid(),
      CASE
        WHEN NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN 'approve'
        WHEN NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM NEW.status THEN 'reject'
        ELSE 'update'
      END,
      diff,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_place_proposal_changes ON public.place_proposals;
CREATE TRIGGER trg_log_place_proposal_changes
AFTER UPDATE ON public.place_proposals
FOR EACH ROW
EXECUTE FUNCTION public.log_place_proposal_changes();