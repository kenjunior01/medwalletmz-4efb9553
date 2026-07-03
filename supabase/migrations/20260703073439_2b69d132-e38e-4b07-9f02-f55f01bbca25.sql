
-- Tighten public read policies
DROP POLICY IF EXISTS "Stores are publicly readable" ON public.stores;
CREATE POLICY "Stores are publicly readable" ON public.stores
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Clinics are publicly readable" ON public.clinics;
CREATE POLICY "Clinics are publicly readable" ON public.clinics
  FOR SELECT USING (is_active = true AND is_verified = true);

-- Function for lab owner/admin to upload result and mark completed
CREATE OR REPLACE FUNCTION public.lab_order_set_result(_order_id uuid, _result_url text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ord public.lab_exam_orders;
  is_owner boolean;
BEGIN
  SELECT * INTO ord FROM public.lab_exam_orders WHERE id = _order_id;
  IF ord IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.clinics c WHERE c.id = ord.lab_id AND c.owner_id = auth.uid()) INTO is_owner;
  IF NOT (is_owner OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.lab_exam_orders
    SET result_url = _result_url,
        result_uploaded_at = now(),
        status = 'completed',
        updated_at = now()
    WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- Lab approval helper (admin only)
CREATE OR REPLACE FUNCTION public.moderate_lab(_lab_id uuid, _action text, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas admin'; END IF;
  IF _action = 'approve' THEN
    UPDATE public.clinics SET is_verified = true, is_active = true, updated_at = now() WHERE id = _lab_id;
  ELSIF _action = 'reject' THEN
    UPDATE public.clinics SET is_verified = false, is_active = false, updated_at = now() WHERE id = _lab_id;
  ELSIF _action = 'suspend' THEN
    UPDATE public.clinics SET is_active = false, updated_at = now() WHERE id = _lab_id;
  ELSE RAISE EXCEPTION 'Ação inválida (approve|reject|suspend)'; END IF;
  RETURN jsonb_build_object('ok', true, 'action', _action);
END; $$;
