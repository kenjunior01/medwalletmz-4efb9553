
CREATE OR REPLACE FUNCTION public.list_profiles_admin(_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, phone text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.user_id, p.full_name, p.phone FROM public.profiles p WHERE p.user_id = ANY(_ids);
END; $$;
REVOKE ALL ON FUNCTION public.list_profiles_admin(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_profiles_admin(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_patients_for_doctor(_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, phone text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  -- Only return patients the caller (as doctor) has a consultation with
  RETURN QUERY
    SELECT p.user_id, p.full_name, p.phone
    FROM public.profiles p
    WHERE p.user_id = ANY(_ids)
      AND EXISTS (
        SELECT 1 FROM public.consultations c
        WHERE c.doctor_id = auth.uid() AND c.patient_id = p.user_id
      );
END; $$;
REVOKE ALL ON FUNCTION public.list_patients_for_doctor(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_patients_for_doctor(uuid[]) TO authenticated;
