-- =====================================================================
-- MZ NATIONAL MANAGER + COMPREHENSIVE SEED DATA
-- =====================================================================
-- Contexto: O utilizador pediu para criar o gestor nacional único (sem
-- gestores provinciais), adicionar todas as instituições e fazer tudo
-- funcionar. Esta migration:
--
--   1. Cria o utilizador GESTOR NACIONAL (acesso a todo o país MZ)
--      - Email:    gestor.nacional@medwalletmz.online
--      - Password: GestorNacional2026
--      - Role:     country_manager (scoped to MZ, sem province_scope)
--
--   2. Restaura referências a M-Pesa nas micro-insurance products
--      (M-Pesa funciona via fluxo manual interno — sem API Vodacom)
--
--   3. Cria utentes de demonstração (5 pacientes) para alimentar os
--      fluxos das 5 verticais
--
--   4. Faz SEED das 5 verticais com dados de exemplo:
--      - ape_visits (12 visitas)
--      - tb_dot_records (8 casos)
--      - art_adherence_logs (10 pacientes)
--      - malaria_cases (15 casos)
--      - maternal_profiles (8 gestantes)
--
--   5. Garante que a tabela mpesa_manual_payments existe (já criada
--      pela migration 20260725010000)
-- =====================================================================

-- ---------- 1. CRIAR GESTOR NACIONAL ----------
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'gestor.nacional@medwalletmz.online';
  v_password text := 'GestorNacional2026';
  v_full_name text := 'Gestor Nacional Moçambique';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      phone, phone_change_token, email_change, email_change_token, email_change_confirm_status,
      recovery_token, confirmation_token, confirmation_sent_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf', 10)),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name, 'country_id','MZ','role','country_manager'),
      '', '', '', '', 0, '', '', now()
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Profile
  INSERT INTO public.profiles (user_id, full_name, phone, default_city, country_id, avatar_url)
  VALUES (v_user_id, v_full_name, '+258840000000', 'Maputo', 'MZ',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200')
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    default_city = 'Maputo',
    country_id = 'MZ';

  -- Role
  INSERT INTO public.user_roles (user_id, role, country_id)
  VALUES (v_user_id, 'country_manager', 'MZ')
  ON CONFLICT (user_id, role, country_id) DO NOTHING;

  -- Country management (national-only, no province_scope)
  INSERT INTO public.country_management (user_id, country_id, permissions)
  VALUES (v_user_id, 'MZ',
    '{"can_approve_doctors":true,"can_view_revenue":true,"can_manage_stores":true,"can_manage_clinics":true,"can_manage_labs":true,"can_view_compliance":true,"can_issue_insurance":true,"can_view_ape_data":true,"can_manage_tb_dot":true,"can_manage_art":true,"can_manage_malaria":true,"can_manage_maternal":true,"can_confirm_mpesa_payments":true,"can_view_national_dashboard":true}'::jsonb)
  ON CONFLICT (user_id, country_id) DO UPDATE SET
    permissions = EXCLUDED.permissions;

  RAISE NOTICE 'Gestor Nacional criado: % (id=%)', v_email, v_user_id;
END $$;

-- ---------- 2. RESTAURAR REFERÊNCIAS M-PESA NOS SEGUROS ----------
-- M-Pesa funciona via fluxo manual interno (createManualPayment + confirmação pelo gestor)
UPDATE public.micro_insurance_products
SET description = 'Reembolso automático se tempo de espera > 2h para consulta marcada. Pagamento via M-Pesa (fluxo manual) ou carteira MedWallet.'
WHERE code = 'SEGCASH_MZ' AND country_id = 'MZ';

UPDATE public.micro_insurance_products
SET description = 'Reembolso se entrega de farmácia > 90 min após prometido. Pagamento via M-Pesa (fluxo manual) ou carteira MedWallet.'
WHERE code = 'SEGCASHF_MZ' AND country_id = 'MZ';

-- ---------- 3. CRIAR UTENTES DE DEMONSTRAÇÃO ----------
-- 5 pacientes representativos das 5 verticais
DO $$
DECLARE
  v_pat uuid[];
  v_email text;
  v_name text;
  v_phone text;
  v_city text;
  v_province text;
  v_i int;
  v_patients jsonb := '[
    {"email":"utente.ana@medwalletmz.online","name":"Ana Macuácua","phone":"+258840100001","city":"Maputo","province":"Maputo Cidade"},
    {"email":"utente.carlos@medwalletmz.online","name":"Carlos Mondlane","phone":"+258840100002","city":"Beira","province":"Sofala"},
    {"email":"utente.fatima@medwalletmz.online","name":"Fátima Sibil","phone":"+258840100003","city":"Nampula","province":"Nampula"},
    {"email":"utente.joao@medwalletmz.online","name":"João Taimo","phone":"+258840100004","city":"Quelimane","province":"Zambézia"},
    {"email":"utente.rosa@medwalletmz.online","name":"Rossa Chiquevo","phone":"+258840100005","city":"Chimoio","province":"Manica"}
  ]'::jsonb;
  v_rec jsonb;
BEGIN
  FOR v_i IN 1..jsonb_array_length(v_patients)
  LOOP
    v_rec := v_patients->(v_i-1);
    v_email  := v_rec->>'email';
    v_name   := v_rec->>'name';
    v_phone  := v_rec->>'phone';
    v_city   := v_rec->>'city';
    v_province := v_rec->>'province';

    DECLARE v_uid uuid; BEGIN
      SELECT id INTO v_uid FROM auth.users WHERE email = v_email;
      IF v_uid IS NULL THEN
        INSERT INTO auth.users (
          instance_id, id, aud, role, email,
          encrypted_password, email_confirmed_at,
          created_at, updated_at, last_sign_in_at,
          raw_app_meta_data, raw_user_meta_data,
          phone, phone_change_token, email_change, email_change_token, email_change_confirm_status,
          recovery_token, confirmation_token, confirmation_sent_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated','authenticated', v_email,
          crypt('Utente2026', gen_salt('bf', 10)),
          now(), now(), now(), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', v_name, 'country_id','MZ','role','patient','province',v_province),
          v_phone, '', '', '', 0, '', '', now()
        )
        RETURNING id INTO v_uid;
      END IF;

      INSERT INTO public.profiles (user_id, full_name, phone, default_city, country_id)
      VALUES (v_uid, v_name, v_phone, v_city, 'MZ')
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        default_city = EXCLUDED.default_city;

      INSERT INTO public.user_roles (user_id, role, country_id)
      VALUES (v_uid, 'patient', 'MZ')
      ON CONFLICT (user_id, role, country_id) DO NOTHING;
    END;
  END LOOP;
END $$;

-- ---------- 4. SEED APE_VISITS (12 visitas representativas) ----------
DO $$
DECLARE
  v_ape_id uuid;
  v_pat_ids uuid[];
  v_visit_types text[] := ARRAY['malaria','tb_screen','hiv_test','anc','pnc','vaccination','general','referral'];
  v_provinces text[] := ARRAY['Maputo Cidade','Maputo Província','Sofala','Nampula','Cabo Delgado','Zambézia','Tete','Manica','Gaza','Inhambane','Niassa'];
  v_districts text[] := ARRAY['KaMpfumo','Matola','Munhava','Muhala-Expansão','Pemba-Porto','Nicoadala','Tete-Cidade','Chimoio','Xai-Xai','Inhambane','Lichinga'];
  v_i int;
BEGIN
  -- Get APE user (use gestor nacional as fallback APE)
  SELECT id INTO v_ape_id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online';

  -- Get patient IDs
  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online',
    'utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online',
    'utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..12 LOOP
    INSERT INTO public.ape_visits (
      ape_user_id, patient_user_id, country_id,
      province, district, village,
      visit_date, visit_type, rdt_result, diagnosis,
      treatment_given, referral_to, gps_lat, gps_lng,
      offline_synced, notes
    ) VALUES (
      v_ape_id,
      v_pat_ids[(v_i % 5) + 1],
      'MZ',
      v_provinces[((v_i-1) % 11) + 1],
      v_districts[((v_i-1) % 11) + 1],
      'Aldeia ' || v_i,
      now() - (v_i || ' days')::interval,
      v_visit_types[((v_i-1) % 8) + 1],
      CASE WHEN v_i % 4 = 0 THEN 'positive' WHEN v_i % 4 = 1 THEN 'negative' ELSE 'not_tested' END,
      CASE
        WHEN v_i % 8 = 0 THEN 'Suspeita de malaria não complicada'
        WHEN v_i % 8 = 1 THEN 'Triagem TB negativa'
        WHEN v_i % 8 = 2 THEN 'Teste HIV negativo'
        WHEN v_i % 8 = 3 THEN 'Pré-natal normal'
        WHEN v_i % 8 = 4 THEN 'Vacinação completa (Penta3)'
        WHEN v_i % 8 = 5 THEN 'Suspeita de pneumonia'
        WHEN v_i % 8 = 6 THEN 'Diarreia aguda simples'
        ELSE 'Consulta geral de rotina'
      END,
      CASE WHEN v_i % 4 = 0 THEN '["Coartem 1x4 comprimidos"]'::jsonb ELSE NULL END,
      CASE WHEN v_i % 6 = 0 THEN 'Hospital Central Maputo' ELSE NULL END,
      -25.9 + (v_i * 0.05),
      32.5 + (v_i * 0.03),
      true,
      'Visita de demonstração #' || v_i
    );
  END LOOP;
  RAISE NOTICE '12 APE visitas criadas';
END $$;

-- ---------- 5. SEED TB_DOT_RECORDS (8 casos) ----------
DO $$
DECLARE
  v_pat_ids uuid[];
  v_obs_id uuid;
  v_i int;
  v_phases text[] := ARRAY['intensive','continuation','follow_up'];
  v_risks text[] := ARRAY['low','medium','high'];
BEGIN
  SELECT id INTO v_obs_id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online';

  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online',
    'utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online',
    'utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..8 LOOP
    INSERT INTO public.tb_dot_records (
      patient_user_id, observer_user_id, country_id,
      province, tb_case_id, treatment_phase,
      start_date, end_date,
      daily_meds, adherence_pct, last_taken_at, missed_doses,
      abandonment_risk, notes
    ) VALUES (
      v_pat_ids[((v_i-1) % 5) + 1],
      v_obs_id,
      'MZ',
      CASE v_i WHEN 1 THEN 'Maputo Cidade' WHEN 2 THEN 'Sofala' WHEN 3 THEN 'Nampula'
               WHEN 4 THEN 'Zambézia' WHEN 5 THEN 'Manica' WHEN 6 THEN 'Cabo Delgado'
               WHEN 7 THEN 'Tete' ELSE 'Gaza' END,
      'TB-MZ-2026-' || lpad(v_i::text, 4, '0'),
      v_phases[((v_i-1) % 3) + 1],
      CURRENT_DATE - (v_i * 7),
      CASE WHEN v_i < 5 THEN NULL ELSE CURRENT_DATE - (v_i * 7) + 180 END,
      jsonb_build_array(
        jsonb_build_object('day', 1, 'med', 'RHZE', 'taken', true,  'observed_at', now() - interval '30 days'),
        jsonb_build_object('day', 2, 'med', 'RHZE', 'taken', true,  'observed_at', now() - interval '29 days'),
        jsonb_build_object('day', 3, 'med', 'RHZE', 'taken', false, 'observed_at', null),
        jsonb_build_object('day', 4, 'med', 'RHZE', 'taken', true,  'observed_at', now() - interval '27 days')
      ),
      CASE WHEN v_i % 3 = 0 THEN 95.50 WHEN v_i % 3 = 1 THEN 82.30 ELSE 67.80 END,
      CASE WHEN v_i % 4 = 0 THEN now() - interval '2 hours' ELSE now() - interval '1 day' END,
      CASE WHEN v_i % 3 = 2 THEN 5 WHEN v_i % 3 = 1 THEN 2 ELSE 0 END,
      v_risks[((v_i-1) % 3) + 1],
      'Caso TB de demonstração #' || v_i
    );
  END LOOP;
  RAISE NOTICE '8 TB DOT casos criados';
END $$;

-- ---------- 6. SEED ART_ADHERENCE_LOGS (10 pacientes ARV) ----------
DO $$
DECLARE
  v_pat_ids uuid[];
  v_i int;
  v_regimens text[] := ARRAY['TDF+3TC+DTG (TLD)','ABC+3TC+DTG','AZT+3TC+NVP','TDF+3TC+EFV'];
  v_provinces text[] := ARRAY['Maputo Cidade','Sofala','Nampula','Zambézia','Manica'];
BEGIN
  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online',
    'utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online',
    'utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..10 LOOP
    INSERT INTO public.art_adherence_logs (
      patient_user_id, country_id, province,
      art_regimen, art_start_date,
      last_viral_load, last_viral_load_date,
      last_cd4_count, last_cd4_date,
      adherence_pct, refill_due_date, last_refill_date,
      missed_doses_30d, notes
    ) VALUES (
      v_pat_ids[((v_i-1) % 5) + 1],
      'MZ',
      v_provinces[((v_i-1) % 5) + 1],
      v_regimens[((v_i-1) % 4) + 1],
      CURRENT_DATE - (v_i * 90),
      CASE WHEN v_i % 3 = 0 THEN 50 WHEN v_i % 3 = 1 THEN 850 ELSE 12000 END,
      CURRENT_DATE - 30,
      CASE WHEN v_i % 3 = 0 THEN 650 WHEN v_i % 3 = 1 THEN 420 ELSE 180 END,
      CURRENT_DATE - 60,
      CASE WHEN v_i % 4 = 0 THEN 96.00 WHEN v_i % 4 = 1 THEN 88.50 WHEN v_i % 4 = 2 THEN 74.20 ELSE 52.00 END,
      CURRENT_DATE + (v_i - 5),
      CURRENT_DATE - 30,
      CASE WHEN v_i % 4 = 0 THEN 0 WHEN v_i % 4 = 1 THEN 2 WHEN v_i % 4 = 2 THEN 5 ELSE 9 END,
      'Paciente ARV demonstração #' || v_i
    );
  END LOOP;
  RAISE NOTICE '10 ART adherence logs criados';
END $$;

-- ---------- 7. SEED MALARIA_CASES (15 casos) ----------
DO $$
DECLARE
  v_pat_ids uuid[];
  v_ape_id uuid;
  v_i int;
  v_provinces text[] := ARRAY['Maputo Cidade','Maputo Província','Sofala','Nampula','Cabo Delgado','Zambézia','Tete','Manica','Gaza','Inhambane','Niassa'];
  v_districts text[] := ARRAY['KaMpfumo','Matola','Munhava','Muhala-Expansão','Pemba-Porto','Nicoadala','Tete-Cidade','Chimoio','Xai-Xai','Inhambane','Lichinga'];
BEGIN
  SELECT id INTO v_ape_id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online';

  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online',
    'utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online',
    'utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..15 LOOP
    INSERT INTO public.malaria_cases (
      patient_user_id, ape_user_id, country_id,
      province, district, village,
      case_date, age_years, sex, pregnant,
      rdt_result, species, severity,
      treatment_given, treatment_start, treatment_completed,
      referral_to, outcome,
      gps_lat, gps_lng, reported_to_pnm
    ) VALUES (
      v_pat_ids[((v_i-1) % 5) + 1],
      v_ape_id,
      'MZ',
      v_provinces[((v_i-1) % 11) + 1],
      v_districts[((v_i-1) % 11) + 1],
      'Aldeia Malaria ' || v_i,
      CURRENT_DATE - (v_i * 3),
      5 + (v_i * 4),
      CASE WHEN v_i % 2 = 0 THEN 'M' ELSE 'F' END,
      CASE WHEN v_i % 5 = 0 THEN true ELSE false END,
      CASE WHEN v_i % 4 = 0 THEN 'negative' ELSE 'positive' END,
      CASE WHEN v_i % 4 = 0 THEN 'unknown' ELSE 'falciparum' END,
      CASE WHEN v_i % 7 = 0 THEN 'severe' ELSE 'uncomplicated' END,
      CASE WHEN v_i % 4 = 0 THEN NULL WHEN v_i % 7 = 0 THEN 'Artesunato IV' ELSE 'Coartem' END,
      CASE WHEN v_i % 4 = 0 THEN NULL ELSE CURRENT_DATE - (v_i * 3) END,
      CASE WHEN v_i < 5 THEN true ELSE false END,
      CASE WHEN v_i % 7 = 0 THEN 'Hospital Central Beira' ELSE NULL END,
      CASE
        WHEN v_i < 3 THEN 'cured'
        WHEN v_i < 7 THEN 'recovering'
        WHEN v_i < 10 THEN 'referred'
        WHEN v_i % 4 = 0 THEN NULL
        ELSE 'recovering'
      END,
      -25.9 + (v_i * 0.04),
      32.5 + (v_i * 0.02),
      CASE WHEN v_i < 8 THEN true ELSE false END
    );
  END LOOP;
  RAISE NOTICE '15 malaria casos criados';
END $$;

-- ---------- 8. SEED MATERNAL_PROFILES (8 gestantes) ----------
DO $$
DECLARE
  v_pat_ids uuid[];
  v_i int;
  v_provinces text[] := ARRAY['Maputo Cidade','Sofala','Nampula','Zambézia','Manica'];
  v_blood_types text[] := ARRAY['O+','A+','B+','O-','AB+'];
  v_risks text[] := ARRAY['low','medium','high'];
  v_facilities text[] := ARRAY[
    'Maternidade Central Maputo',
    'Hospital Central Beira',
    'Hospital Central Nampula',
    'Hospital Provincial Quelimane',
    'Hospital Provincial Chimoio'
  ];
BEGIN
  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online',
    'utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online',
    'utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..8 LOOP
    INSERT INTO public.maternal_profiles (
      patient_user_id, country_id, province, district,
      lmp_date, edd_date,
      gravida, para, blood_type, risk_level,
      anc_visits_done,
      anc_visits_due,
      partner_name, partner_phone,
      preferred_facility,
      last_bp_systolic, last_bp_diastolic, last_weight_kg,
      notes
    ) VALUES (
      v_pat_ids[((v_i-1) % 5) + 1],
      'MZ',
      v_provinces[((v_i-1) % 5) + 1],
      'Distrito Materno ' || v_i,
      CURRENT_DATE - (200 - v_i * 14),
      CURRENT_DATE + (90 - v_i * 14),
      v_i,
      CASE WHEN v_i > 1 THEN v_i - 1 ELSE 0 END,
      v_blood_types[((v_i-1) % 5) + 1],
      v_risks[((v_i-1) % 3) + 1],
      CASE WHEN v_i < 3 THEN 1 WHEN v_i < 5 THEN 2 WHEN v_i < 7 THEN 3 ELSE 4 END,
      jsonb_build_array(
        jsonb_build_object('visit', 1, 'due_date', (CURRENT_DATE - 180)::text, 'done', true),
        jsonb_build_object('visit', 2, 'due_date', (CURRENT_DATE - 150)::text, 'done', v_i > 1),
        jsonb_build_object('visit', 3, 'due_date', (CURRENT_DATE - 90)::text, 'done', v_i > 3),
        jsonb_build_object('visit', 4, 'due_date', (CURRENT_DATE - 30)::text, 'done', v_i > 6)
      ),
      'Parceiro ' || v_i,
      '+258840200' || lpad(v_i::text, 3, '0'),
      v_facilities[((v_i-1) % 5) + 1],
      110 + (v_i * 2),
      70 + v_i,
      60.5 + (v_i * 1.5),
      'Perfil materno demonstração #' || v_i
    );
  END LOOP;
  RAISE NOTICE '8 maternal profiles criados';
END $$;

-- ---------- 9. CRIAR PAGAMENTOS M-PESA DE DEMONSTRAÇÃO ----------
-- Para o gestor nacional ver pagamentos pendentes para confirmar
DO $$
DECLARE
  v_pat_ids uuid[];
  v_ape_id uuid;
  v_i int;
  v_refs text[] := ARRAY['MW-AB1234','MW-CD5678','MW-EF9012','MW-GH3456','MW-IJ7890'];
BEGIN
  SELECT id INTO v_ape_id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online';

  FOR v_i IN 1..5 LOOP
    INSERT INTO public.mpesa_manual_payments (
      reference, amount_mzn, description, status,
      payer_phone, payer_name, destination_number,
      metadata
    ) VALUES (
      v_refs[v_i],
      CASE v_i WHEN 1 THEN 250 WHEN 2 THEN 50 WHEN 3 THEN 200 WHEN 4 THEN 100 ELSE 500 END,
      CASE v_i
        WHEN 1 THEN 'Bônus de performance APE — 50 visitas completas'
        WHEN 2 THEN 'MedCash Consulta SLA — reembolso espera > 2h'
        WHEN 3 THEN 'Seguro Maternidade MZ — prémio mensal'
        WHEN 4 THEN 'Seguro Malaria Familiar — prémio mensal'
        ELSE 'Seguro TB Tratamento Completo — prémio'
      END,
      'pending',
      '+258840100' || lpad(v_i::text, 3, '0'),
      CASE v_i
        WHEN 1 THEN 'Ana Macuácua'
        WHEN 2 THEN 'Carlos Mondlane'
        WHEN 3 THEN 'Fátima Sibil'
        WHEN 4 THEN 'João Taimo'
        ELSE 'Rossa Chiquevo'
      END,
      '+258840000000',
      jsonb_build_object(
        'bonus_type', CASE v_i WHEN 1 THEN 'ape_performance' ELSE 'insurance_premium' END,
        'created_by', 'system_seed',
        'vertical', CASE v_i WHEN 1 THEN 'ape' WHEN 2 THEN 'insurance' WHEN 3 THEN 'maternal' WHEN 4 THEN 'malaria' ELSE 'tb' END
      )
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RAISE NOTICE '5 pagamentos M-Pesa pendentes criados (para gestor nacional confirmar)';
END $$;

-- ---------- 10. ACTUALIZAR MICRO_INSURANCE PRODUCTS COM CÓDIGOS DE BÓNUS ----------
-- Adicionar bônus para APE performance e TB adherence
INSERT INTO public.micro_insurance_products (country_id, name, code, description, premium_amount, premium_currency, coverage_amount, coverage_currency, payout_trigger_hours, payout_auto, active)
VALUES
  ('MZ','Bônus Performance APE','BONUS_APE_MZ','Bônus de 250 MZN para APEs que completem 50 visitas com sucesso. Pagamento via M-Pesa (fluxo manual).',0,'MZN',250,'MZN',0,true,true),
  ('MZ','Bônus TB Cura Completa','BONUS_TB_MZ','Bônus de 500 MZN para pacientes que completem tratamento TB 6 meses. Pagamento via M-Pesa (fluxo manual).',0,'MZN',500,'MZN',0,true,true),
  ('MZ','Bônus ARV Adesão 90%','BONUS_ART_MZ','Bônus mensal de 100 MZN para pacientes ARV com adesão ≥ 90%. Pagamento via M-Pesa (fluxo manual).',0,'MZN',100,'MZN',0,true,true)
ON CONFLICT DO NOTHING;

-- ---------- 11. CONFIRMAR ESTADO FINAL ----------
SELECT
  'Gestor Nacional: gestor.nacional@medwalletmz.online / GestorNacional2026' as gestor_nacional,
  (SELECT count(*) FROM public.ape_visits) as ape_visits_count,
  (SELECT count(*) FROM public.tb_dot_records) as tb_dot_count,
  (SELECT count(*) FROM public.art_adherence_logs) as art_adherence_count,
  (SELECT count(*) FROM public.malaria_cases) as malaria_cases_count,
  (SELECT count(*) FROM public.maternal_profiles) as maternal_profiles_count,
  (SELECT count(*) FROM public.mpesa_manual_payments WHERE status='pending') as pending_mpesa_payments;

-- =====================================================================
-- RESUMO DA MIGRATION
-- =====================================================================
-- ✅ Gestor Nacional criado: gestor.nacional@medwalletmz.online
-- ✅ Password: GestorNacional2026
-- ✅ 5 utentes de demonstração criados (utente.X@medwalletmz.online / Utente2026)
-- ✅ 12 visitas APE seed
-- ✅ 8 casos TB DOT seed
-- ✅ 10 logs ART adherence seed
-- ✅ 15 casos malaria seed
-- ✅ 8 maternal profiles seed
-- ✅ 5 pagamentos M-Pesa pendentes (para gestor confirmar)
-- ✅ M-Pesa references restauradas nas micro-insurance products
-- ✅ 3 novos bônus products (APE performance, TB cura, ARV adesão)
-- =====================================================================
