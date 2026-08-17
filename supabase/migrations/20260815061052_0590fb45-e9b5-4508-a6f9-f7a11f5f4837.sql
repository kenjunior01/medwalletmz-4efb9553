DO $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.clinics WHERE country_id = 'MZ' AND owner_id IS NOT NULL LIMIT 1;
  IF v_owner IS NULL THEN
    SELECT user_id INTO v_owner FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  END IF;
  IF v_owner IS NULL THEN
    RAISE NOTICE 'sem owner disponivel, a abortar insercao de clinicas';
    RETURN;
  END IF;

  INSERT INTO public.clinics (owner_id, name, type, city, address, phone, description, is_active, is_verified, country_id, rating)
  SELECT v_owner, v.name, v.type, v.city, v.address, v.phone, v.description, true, true, 'MZ', 0
  FROM (VALUES
    ('Hospital Distrital de Manhiça','hospital','Manhiça','EN1, Manhiça, Maputo Província','+258 21 810 000','Hospital distrital de referência na Manhiça'),
    ('Centro de Saúde de Marracuene','clinic','Marracuene','Vila de Marracuene, Maputo Província','+258 21 000 100','Centro de saúde do distrito de Marracuene'),
    ('Hospital Distrital da Namaacha','hospital','Namaacha','Vila da Namaacha, Maputo Província','+258 21 960 100','Hospital distrital da Namaacha'),
    ('Centro de Saúde de Magude','clinic','Magude','Vila de Magude, Maputo Província','+258 21 000 101','Unidade sanitária do distrito de Magude'),
    ('Hospital Rural de Bilene','hospital','Bilene','Macia, Bilene, Gaza','+258 28 200 100','Hospital rural do distrito de Bilene'),
    ('Hospital Rural de Mandlakazi','hospital','Mandlakazi','Vila de Mandlakazi, Gaza','+258 28 200 200','Hospital rural de Mandlakazi'),
    ('Centro de Saúde de Guijá','clinic','Guijá','Caniçado, Guijá, Gaza','+258 28 200 300','Centro de saúde do distrito de Guijá'),
    ('Hospital Rural de Vilanculos','hospital','Vilanculos','Vila de Vilanculos, Inhambane','+258 29 382 100','Hospital rural de Vilanculos'),
    ('Hospital Rural de Maxixe','hospital','Maxixe','Av. Eduardo Mondlane, Maxixe, Inhambane','+258 29 330 100','Hospital rural da Maxixe'),
    ('Centro de Saúde de Homoíne','clinic','Homoíne','Vila de Homoíne, Inhambane','+258 29 300 100','Centro de saúde de Homoíne'),
    ('Hospital Distrital de Nhamatanda','hospital','Nhamatanda','EN6, Nhamatanda, Sofala','+258 23 900 100','Hospital distrital de Nhamatanda'),
    ('Hospital Rural de Marromeu','hospital','Marromeu','Vila de Marromeu, Sofala','+258 23 900 200','Hospital rural de Marromeu'),
    ('Centro de Saúde de Buzi','clinic','Búzi','Vila do Búzi, Sofala','+258 23 900 300','Centro de saúde do Búzi'),
    ('Hospital Distrital de Catandica','hospital','Catandica','Vila de Catandica, Báruè, Manica','+258 25 100 100','Hospital distrital de Catandica'),
    ('Hospital Rural de Sussundenga','hospital','Sussundenga','Vila de Sussundenga, Manica','+258 25 100 200','Hospital rural de Sussundenga'),
    ('Centro de Saúde de Machaze','clinic','Machaze','Chitobe, Machaze, Manica','+258 25 100 300','Centro de saúde de Machaze'),
    ('Hospital Rural de Ulónguè','hospital','Ulónguè','Vila de Ulónguè, Angónia, Tete','+258 25 200 100','Hospital rural de Ulónguè'),
    ('Hospital Distrital de Songo','hospital','Songo','Vila do Songo, Cahora Bassa, Tete','+258 25 200 200','Hospital distrital do Songo'),
    ('Centro de Saúde de Changara','clinic','Changara','Vila de Changara, Tete','+258 25 200 300','Centro de saúde de Changara'),
    ('Hospital Rural de Mocuba','hospital','Mocuba','Vila de Mocuba, Zambézia','+258 24 810 100','Hospital rural de Mocuba'),
    ('Hospital Rural de Gurué','hospital','Gurué','Vila do Gurué, Zambézia','+258 24 810 200','Hospital rural do Gurué'),
    ('Hospital Rural de Alto Molócuè','hospital','Alto Molócuè','Vila de Alto Molócuè, Zambézia','+258 24 810 300','Hospital rural de Alto Molócuè'),
    ('Hospital Rural de Angoche','hospital','Angoche','Vila de Angoche, Nampula','+258 26 720 100','Hospital rural de Angoche'),
    ('Hospital Rural de Nacala','hospital','Nacala','Nacala-Porto, Nampula','+258 26 526 100','Hospital rural de Nacala-Porto'),
    ('Centro de Saúde de Ribáuè','clinic','Ribáuè','Vila de Ribáuè, Nampula','+258 26 720 200','Centro de saúde de Ribáuè'),
    ('Hospital Distrital de Montepuez','hospital','Montepuez','Vila de Montepuez, Cabo Delgado','+258 27 251 100','Hospital distrital de Montepuez'),
    ('Hospital Rural de Chiúre','hospital','Chiúre','Vila de Chiúre, Cabo Delgado','+258 27 251 200','Hospital rural de Chiúre'),
    ('Centro de Saúde de Balama','clinic','Balama','Vila de Balama, Cabo Delgado','+258 27 251 300','Centro de saúde de Balama'),
    ('Hospital Rural de Marrupa','hospital','Marrupa','Vila de Marrupa, Niassa','+258 27 120 100','Hospital rural de Marrupa'),
    ('Centro de Saúde de Mandimba','clinic','Mandimba','Vila de Mandimba, Niassa','+258 27 120 200','Centro de saúde de Mandimba'),
    ('Laboratório Clínico de Nacala','laboratory','Nacala','Nacala-Porto, Nampula','+258 26 526 200','Laboratório de análises clínicas em Nacala'),
    ('Laboratório Clínico de Mocuba','laboratory','Mocuba','Vila de Mocuba, Zambézia','+258 24 810 400','Laboratório de análises clínicas em Mocuba'),
    ('Clínica Veterinária de Vilanculos','veterinary','Vilanculos','Vila de Vilanculos, Inhambane','+258 29 382 200','Clínica veterinária em Vilanculos'),
    ('Clínica Veterinária de Nampula Norte','veterinary','Nampula','Bairro Muhala, Nampula','+258 26 720 300','Clínica veterinária em Nampula')
  ) AS v(name, type, city, address, phone, description)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.clinics c WHERE lower(c.name) = lower(v.name) AND lower(c.city) = lower(v.city)
  );
END $$;

INSERT INTO public.stores (name, type, city, address, phone, description, is_active, country_id, delivery_fee, delivery_time, rating)
SELECT v.name, 'pharmacy', v.city, v.address, v.phone, v.description, true, 'MZ', 50, '30-45 min', 0
FROM (VALUES
  ('Farmácia Popular da Manhiça','Manhiça','EN1, Manhiça','+258 84 000 0101','Farmácia comunitária na Manhiça'),
  ('Farmácia Central de Marracuene','Marracuene','Vila de Marracuene','+258 84 000 0102','Farmácia em Marracuene'),
  ('Farmácia Vida de Macia','Macia','Macia, Bilene, Gaza','+258 84 000 0103','Farmácia em Macia'),
  ('Farmácia Saúde de Mandlakazi','Mandlakazi','Vila de Mandlakazi, Gaza','+258 84 000 0104','Farmácia em Mandlakazi'),
  ('Farmácia Praia de Vilanculos','Vilanculos','Vila de Vilanculos, Inhambane','+258 84 000 0105','Farmácia em Vilanculos'),
  ('Farmácia Maxixe Bem-Estar','Maxixe','Av. Eduardo Mondlane, Maxixe','+258 84 000 0106','Farmácia na Maxixe'),
  ('Farmácia Nhamatanda 24h','Nhamatanda','EN6, Nhamatanda, Sofala','+258 84 000 0107','Farmácia em Nhamatanda'),
  ('Farmácia Sussundenga','Sussundenga','Vila de Sussundenga, Manica','+258 84 000 0108','Farmácia em Sussundenga'),
  ('Farmácia Songo Saúde','Songo','Vila do Songo, Tete','+258 84 000 0109','Farmácia no Songo'),
  ('Farmácia Ulónguè','Ulónguè','Vila de Ulónguè, Angónia, Tete','+258 84 000 0110','Farmácia em Ulónguè'),
  ('Farmácia Mocuba Central','Mocuba','Vila de Mocuba, Zambézia','+258 84 000 0111','Farmácia em Mocuba'),
  ('Farmácia Gurué Verde','Gurué','Vila do Gurué, Zambézia','+258 84 000 0112','Farmácia no Gurué'),
  ('Farmácia Angoche Costa','Angoche','Vila de Angoche, Nampula','+258 84 000 0113','Farmácia em Angoche'),
  ('Farmácia Nacala Porto','Nacala','Nacala-Porto, Nampula','+258 84 000 0114','Farmácia em Nacala-Porto'),
  ('Farmácia Montepuez Saúde','Montepuez','Vila de Montepuez, Cabo Delgado','+258 84 000 0115','Farmácia em Montepuez'),
  ('Farmácia Chiúre','Chiúre','Vila de Chiúre, Cabo Delgado','+258 84 000 0116','Farmácia em Chiúre'),
  ('Farmácia Marrupa','Marrupa','Vila de Marrupa, Niassa','+258 84 000 0117','Farmácia em Marrupa'),
  ('Farmácia Mandimba','Mandimba','Vila de Mandimba, Niassa','+258 84 000 0118','Farmácia em Mandimba')
) AS v(name, city, address, phone, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.stores s WHERE lower(s.name) = lower(v.name) AND lower(s.city) = lower(v.city)
);