
CREATE OR REPLACE FUNCTION public.reject_proposals_bulk(_ids uuid[], _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok int := 0; fail int := 0; pid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOREACH pid IN ARRAY _ids LOOP
    BEGIN
      UPDATE public.place_proposals
        SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
            review_notes = COALESCE(_notes, review_notes, 'Rejeitado em massa')
      WHERE id = pid AND status IN ('pending','in_review');
      IF FOUND THEN ok := ok + 1; ELSE fail := fail + 1; END IF;
    EXCEPTION WHEN OTHERS THEN fail := fail + 1;
    END;
  END LOOP;
  RETURN jsonb_build_object('ok', ok, 'fail', fail);
END; $$;

INSERT INTO public.platform_settings (key, value, description)
VALUES ('welcome_bonus_mzn', '1000'::jsonb, 'Bonus de boas-vindas em MZN')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE super_email text; bonus_amt numeric;
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO public.patient_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  SELECT COALESCE((value::text)::numeric, 0) INTO bonus_amt FROM public.platform_settings WHERE key = 'welcome_bonus_mzn';
  IF COALESCE(bonus_amt, 0) > 0 THEN
    BEGIN
      PERFORM public.wallet_credit(NEW.id, bonus_amt, 'bonus', NULL, 'Bonus de boas-vindas MedWallet');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  SELECT (value #>> '{}')::text INTO super_email FROM public.platform_settings WHERE key = 'superadmin_email';
  IF super_email IS NOT NULL AND lower(NEW.email) = lower(super_email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

INSERT INTO public.service_commissions (service_type, role, percentage, is_active)
SELECT 'consultation', 'doctor', 15, true
WHERE NOT EXISTS (SELECT 1 FROM public.service_commissions WHERE service_type='consultation' AND role='doctor');

INSERT INTO public.service_commissions (service_type, role, percentage, is_active)
SELECT 'pharmacy_order', 'store_owner', 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.service_commissions WHERE service_type='pharmacy_order' AND role='store_owner');

INSERT INTO public.service_commissions (service_type, role, percentage, is_active)
SELECT 'delivery', 'driver', 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.service_commissions WHERE service_type='delivery' AND role='driver');
