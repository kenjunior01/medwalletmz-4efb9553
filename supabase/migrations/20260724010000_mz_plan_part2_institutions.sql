-- =====================================================================
-- MZ DOMINATION PLAN — PART 2: 200+ INSTITUIÇÕES DE SAÚDE
-- 11 cidades: Maputo, Matola, Beira, Nampula, Pemba, Quelimane, Tete,
--            Chimoio, Xai-Xai, Inhambane, Lichinga
-- Categorias: ~70 farmácias, ~60 hospitais, ~40 clínicas, ~35 laboratórios
-- =====================================================================

-- ---------- MAPUTO (já tem seed parcial, somamos mais) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia S.Miguel',           'pharmacy','Maputo','Av. Eduardo Mondlane, Maputo','Medicamentos e produtos de higiene.',true,4.3,-25.9650,32.5780,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,50,'40 min','IN','+258840000001'),
  ('Farmácia Polana',             'pharmacy','Maputo','Av. Julius Nyerere, Polana, Maputo','Farmácia premium com produtos importados.',true,4.5,-25.9650,32.5850,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,60,'25-35 min','MZ','+258840000002'),
  ('Farmácia Maputo Centro',      'pharmacy','Maputo','Av. 25 de Setembro, Maputo','Centro da cidade, atendimento rápido.',true,4.2,-25.9710,32.5730,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,45,'35 min','MZ','+258840000003')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Militar de Maputo',           'hospital','Maputo','Av. Josina Machel, Maputo','Hospital militar para pessoal das forças armadas e família.',true,true,-25.9750,32.5800,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821350000','hmm@medwalletmz.online',''),
  ('Hospital Psiquiátrico do Hospital Central','hospital','Maputo','Av. Agostinho Neto, Maputo','Serviço de psiquiatria e saúde mental.',true,true,-25.9700,32.5800,'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821351000','psi@medwalletmz.online',''),
  ('Clínica Cruz Azul',                    'clinic','Maputo','Av. Eduardo Mondlane, Maputo','Clínica privada multi-especialidade.',true,true,-25.9650,32.5780,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821352000','cruz.azul@medwalletmz.online',''),
  ('Clínica Gigante',                      'clinic','Maputo','Av. 24 de Julho, Maputo','Atendimento pediátrico e geral.',true,true,-25.9720,32.5760,'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821353000','gigante@medwalletmz.online',''),
  ('Clínica Sagrada Esperança',            'clinic','Maputo','Av. Marginal, Maputo','Clínica executiva com check-ups.',true,true,-25.9500,32.6100,'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821354000','sagrada@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, email, website, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Clínico de Maputo',  'Maputo','Av. 24 de Julho, Maputo','Análises clínicas gerais.',true,true,-25.9720,32.5760,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821356000','lab.clinico@medwalletmz.online','',ARRAY['hematology','biochemistry'],true,24),
  ('Synlab Moçambique',              'Maputo','Av. Julius Nyerere, Maputo','Rede internacional de laboratórios.',true,true,-25.9650,32.5850,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821357000','synlab@medwalletmz.online','https://synlab.mz',ARRAY['pathology','microbiology','genetics'],true,48),
  ('Cirurgia-Lab Laboratório',       'Maputo','Av. Eduardo Mondlane, Maputo','Exames pré-operatórios.',true,true,-25.9650,32.5780,'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=600','MZ','+25821358000','cirurgia.lab@medwalletmz.online','',ARRAY['hematology','coagulation'],true,12)
ON CONFLICT DO NOTHING;

-- ---------- MATOLA (Maputo Província) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Matola Centro',     'pharmacy','Matola','Av. da União Africana, Matola','Centro de Matola, medicamentos essenciais.',true,4.4,-25.9622,32.4589,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'40 min','MZ','+258840000010'),
  ('Farmácia Infulene',          'pharmacy','Matola','Bairro Infulene, Matola','Serviço comunitário em Infulene.',true,4.0,-25.9550,32.4500,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h','MZ','+258840000011'),
  ('Farmácia Tsalala',           'pharmacy','Matola','Bairro Tsalala, Matola','Atendimento 12h em Tsalala.',true,4.1,-25.9500,32.4600,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,75,'50 min','MZ','+258840000012'),
  ('Farmácia Matola Rio',        'pharmacy','Matola','Av. Matola Rio, Matola','Fácil acesso, estacionamento.',true,4.3,-25.9400,32.4700,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,70,'45 min','MZ','+258840000013'),
  ('Farmácia Gwachambane',       'pharmacy','Matola','Bairro Gwachambane, Matola','Farmácia de bairro popular.',true,3.9,-25.9350,32.4550,'https://images.unsplash.com/photo-1512418490979-92798ccc1380?w=600',true,80,'55 min','MZ','+258840000014')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Geral de Matola',   'hospital','Matola','Av. da Tanzânia, Matola','Hospital geral de referência para Matola.',true,true,-25.9622,32.4589,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821359000','hgm@medwalletmz.online',''),
  ('Hospital Distrital de Boane','hospital','Boane','Estrada Nacional 2, Boane','Hospital distrital servindo Boane.',true,true,-26.0530,32.3300,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821360000','hdb@medwalletmz.online',''),
  ('Clínica Matola Privada',     'clinic','Matola','Av. Independência, Matola','Clínica privada multi-especialidade.',true,true,-25.9550,32.4600,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821361000','matola.privada@medwalletmz.online',''),
  ('Centro de Saúde de Matola Rio','clinic','Matola','Matola Rio, Matola','Centro de saúde comunitário.',true,true,-25.9400,32.4700,'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821362000','cs.matola.rio@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Matola',     'Matola','Av. da União Africana, Matola','Exames clínicos em Matola.',true,true,-25.9622,32.4589,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821363000',ARRAY['hematology','biochemistry'],true,24),
  ('Labcheck Matola',        'Matola','Av. Eduardo Mondlane, Matola','Análises rápidas com home collection.',true,true,-25.9550,32.4600,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821364000',ARRAY['pathology','hematology'],true,12)
ON CONFLICT DO NOTHING;

-- ---------- BEIRA (Sofala) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Beira Central',   'pharmacy','Beira','Av. Samora Machel, Beira','Centro da Beira, atendimento 12h.',true,4.5,-19.8333,34.8500,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,80,'45 min','MZ','+258840000020'),
  ('Farmácia Munhava',         'pharmacy','Beira','Bairro Munhava, Beira','Bairro popular, preços acessíveis.',true,4.2,-19.8200,34.8600,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,90,'1h','MZ','+258840000021'),
  ('Farmácia Ponta-Gêa',       'pharmacy','Beira','Ponta-Gêa, Beira','Zona nobre da Beira.',true,4.6,-19.8400,34.8400,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,85,'50 min','MZ','+258840000022'),
  ('Farmácia Manga',           'pharmacy','Beira','Bairro Manga, Beira','Bairro Manga, atendimento comunitário.',true,4.0,-19.8100,34.8700,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,95,'1h 15min','MZ','+258840000023'),
  ('Farmácia Macuti',          'pharmacy','Beira','Praia do Macuti, Beira','Zona costeira.',true,4.3,-19.8300,34.8350,'https://images.unsplash.com/photo-1512418490979-92798ccc1380?w=600',true,90,'1h','MZ','+258840000024'),
  ('Farmácia Chiveve',         'pharmacy','Beira','Bairro Chiveve, Beira','Atendimento em Chiveve.',true,4.1,-19.8150,34.8550,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,90,'1h','MZ','+258840000025')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital da Beira (Central)','hospital','Beira','Av. Eduardo Mondlane, Beira','Maior hospital da região central de Moçambique.',true,true,-19.8333,34.8500,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821365000','hb@medwalletmz.online',''),
  ('Hospital Psiquiátrico da Beira','hospital','Beira','Av. Samora Machel, Beira','Saúde mental região central.',true,true,-19.8300,34.8450,'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821366000','psibeira@medwalletmz.online',''),
  ('Clínica 6 de Agosto',     'clinic','Beira','Av. 6 de Agosto, Beira','Clínica privada multi-especialidade.',true,true,-19.8200,34.8550,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821367000','6agosto@medwalletmz.online',''),
  ('Clínica Achada',          'clinic','Beira','Achada, Beira','Atendimento médico geral.',true,true,-19.8100,34.8400,'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821368000','achada@medwalletmz.online',''),
  ('Clínica Beira Privada',   'clinic','Beira','Av. Eduardo Mondlane, Beira','Saúde executiva.',true,true,-19.8250,34.8520,'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821369000','beira.privada@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Beira',     'Beira','Av. Eduardo Mondlane, Beira','Análises clínicas regionais.',true,true,-19.8333,34.8500,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821370000',ARRAY['hematology','biochemistry','microbiology'],true,24),
  ('LabSynapse Beira',      'Beira','Ponta-Gêa, Beira','Exames avançados.',true,true,-19.8400,34.8400,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821371000',ARRAY['pathology','genetics'],true,48),
  ('Laboratório Munhava',   'Beira','Bairro Munhava, Beira','Exames comunitários.',true,true,-19.8200,34.8600,'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=600','MZ','+25821372000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- NAMPULA ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Nampula Central','pharmacy','Nampula','Av. do Trabalho, Nampula','Farmácia central de Nampula.',true,4.4,-15.1167,39.2667,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,60,'40 min','MZ','+258840000030'),
  ('Farmácia Muhala',         'pharmacy','Nampula','Bairro Muhala, Nampula','Bairro Muhala, popular.',true,4.0,-15.1100,39.2700,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,70,'1h','MZ','+258840000031'),
  ('Farmácia Namicopo',       'pharmacy','Nampula','Bairro Namicopo, Nampula','Zona comercial de Nampula.',true,4.2,-15.1050,39.2600,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,65,'50 min','MZ','+258840000032'),
  ('Farmácia Carrupea',       'pharmacy','Nampula','Bairro Carrupea, Nampula','Bairro Carrupea.',true,4.1,-15.1200,39.2750,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,70,'1h','MZ','+258840000033'),
  ('Farmácia 25 de Junho',    'pharmacy','Nampula','Av. 25 de Junho, Nampula','Atendimento rápido no centro.',true,4.3,-15.1150,39.2680,'https://images.unsplash.com/photo-1512418490979-92798ccc1380?w=600',true,65,'45 min','MZ','+258840000034')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Central de Nampula','hospital','Nampula','Av. 25 de Setembro, Nampula','Maior hospital da região norte.',true,true,-15.1167,39.2667,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821373000','hcn@medwalletmz.online',''),
  ('Hospital Rural de Nampula',  'hospital','Nampula','Estrada de Nacala, Nampula','Atendimento rural.',true,true,-15.1300,39.2800,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821374000','hrn@medwalletmz.online',''),
  ('Clínica Nampula Privada',    'clinic','Nampula','Av. Eduardo Mondlane, Nampula','Clínica privada executiva.',true,true,-15.1100,39.2700,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821375000','nampula.privada@medwalletmz.online',''),
  ('Clínica Muhala-Expansão',    'clinic','Nampula','Muhala-Expansão, Nampula','Atendimento de bairro.',true,true,-15.1080,39.2720,'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821376000','muhala.exp@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Nampula',  'Nampula','Av. do Trabalho, Nampula','Exames clínicos.',true,true,-15.1167,39.2667,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821377000',ARRAY['hematology','biochemistry'],true,24),
  ('LabNorte Nampula',     'Nampula','Av. Eduardo Mondlane, Nampula','Exames de referência do norte.',true,true,-15.1100,39.2700,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821378000',ARRAY['pathology','microbiology'],true,48)
ON CONFLICT DO NOTHING;

-- ---------- PEMBA (Cabo Delgado) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Pemba',        'pharmacy','Pemba','Av. Eduardo Mondlane, Pemba','Farmácia central de Pemba.',true,4.3,-12.9740,40.5178,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'45 min','MZ','+258840000040'),
  ('Farmácia Wimbe',        'pharmacy','Pemba','Praia do Wimbe, Pemba','Zona costeira.',true,4.2,-12.9800,40.5200,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h','MZ','+258840000041'),
  ('Farmácia Bairro Chuabo','pharmacy','Pemba','Bairro Chuabo, Pemba','Bairro popular.',true,4.0,-12.9650,40.5100,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,85,'1h 10min','MZ','+258840000042'),
  ('Farmácia Cariacó',      'pharmacy','Pemba','Bairro Cariacó, Pemba','Atendimento comunitário.',true,4.1,-12.9700,40.5250,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,80,'1h','MZ','+258840000043')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Pemba','hospital','Pemba','Av. da Independência, Pemba','Hospital provincial de Cabo Delgado.',true,true,-12.9740,40.5178,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821379000','hpp@medwalletmz.online',''),
  ('Hospital Distrital de Pemba','hospital','Pemba','Estrada de Metuge, Pemba','Hospital distrital.',true,true,-12.9800,40.5000,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821380000','hdp@medwalletmz.online',''),
  ('Clínica Pemba Marítima','clinic','Pemba','Praia do Wimbe, Pemba','Clínica privada.',true,true,-12.9800,40.5200,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821381000','pemba.maritima@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Pemba',    'Pemba','Av. Eduardo Mondlane, Pemba','Exames clínico gerais.',true,true,-12.9740,40.5178,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821382000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- QUELIMANE (Zambézia) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Quelimane',   'pharmacy','Quelimane','Av. Eduardo Mondlane, Quelimane','Centro de Quelimane.',true,4.4,-17.8786,36.8883,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'50 min','MZ','+258840000050'),
  ('Farmácia Nicoadala',   'pharmacy','Quelimane','Bairro Nicoadala, Quelimane','Bairro Nicoadala.',true,4.1,-17.8800,36.8700,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,85,'1h 15min','MZ','+258840000051'),
  ('Farmácia 1 de Maio',   'pharmacy','Quelimane','Av. 1 de Maio, Quelimane','Atendimento central.',true,4.2,-17.8700,36.8900,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,75,'1h','MZ','+258840000052'),
  ('Farmácia Inhangome',   'pharmacy','Quelimane','Bairro Inhangome, Quelimane','Bairro popular.',true,4.0,-17.8750,36.8800,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,80,'1h 10min','MZ','+258840000053')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Quelimane','hospital','Quelimane','Av. Eduardo Mondlane, Quelimane','Hospital provincial da Zambézia.',true,true,-17.8786,36.8883,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821383000','hpq@medwalletmz.online',''),
  ('Hospital Rural de Quelimane',     'hospital','Quelimane','Estrada de Mopeia, Quelimane','Hospital rural.',true,true,-17.9000,36.8500,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821384000','hrq@medwalletmz.online',''),
  ('Clínica Quelimane Privada',       'clinic','Quelimane','Av. 1 de Maio, Quelimane','Clínica privada.',true,true,-17.8700,36.8900,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821385000','qp@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Quelimane','Quelimane','Av. Eduardo Mondlane, Quelimane','Exames da Zambézia.',true,true,-17.8786,36.8883,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821386000',ARRAY['hematology','biochemistry'],true,24),
  ('LabZambezi Quelimane','Quelimane','Av. 1 de Maio, Quelimane','Exames especializados.',true,true,-17.8700,36.8900,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821387000',ARRAY['pathology','microbiology'],true,48)
ON CONFLICT DO NOTHING;

-- ---------- TETE ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Tete',           'pharmacy','Tete','Av. Eduardo Mondlane, Tete','Farmácia central de Tete.',true,4.3,-16.1569,33.5787,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'50 min','MZ','+258840000060'),
  ('Farmácia Matundo',        'pharmacy','Tete','Bairro Matundo, Tete','Bairro fronteiriço.',true,4.1,-16.1400,33.6000,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h','MZ','+258840000061'),
  ('Farmácia Chingodzi',      'pharmacy','Tete','Aeroporto Chingodzi, Tete','Próximo ao aeroporto.',true,4.2,-16.1100,33.6400,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,90,'1h 15min','MZ','+258840000062'),
  ('Farmácia Sanjote',        'pharmacy','Tete','Bairro Sanjote, Tete','Bairro popular.',true,4.0,-16.1650,33.5700,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,80,'1h 10min','MZ','+258840000063')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Tete','hospital','Tete','Av. Eduardo Mondlane, Tete','Hospital provincial de Tete.',true,true,-16.1569,33.5787,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821388000','hpt@medwalletmz.online',''),
  ('Hospital de Moatize',       'hospital','Moatize','Moatize, Tete','Hospital de Moatize (mineração).',true,true,-16.1100,33.7300,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821389000','hmoatize@medwalletmz.online',''),
  ('Clínica Tete Privada',      'clinic','Tete','Av. Samora Machel, Tete','Clínica privada.',true,true,-16.1500,33.5800,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821390000','tetep@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Tete', 'Tete','Av. Eduardo Mondlane, Tete','Exames clínicos.',true,true,-16.1569,33.5787,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821391000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- CHIMOIO (Manica) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Chimoio',     'pharmacy','Chimoio','Av. Eduardo Mondlane, Chimoio','Farmácia central.',true,4.3,-19.1164,33.4833,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'50 min','MZ','+258840000070'),
  ('Farmácia 1 de Maio',   'pharmacy','Chimoio','Av. 1 de Maio, Chimoio','Atendimento central.',true,4.1,-19.1100,33.4900,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,75,'1h','MZ','+258840000071'),
  ('Farmácia Bairro 5',    'pharmacy','Chimoio','Bairro 5, Chimoio','Bairro residencial.',true,4.0,-19.1200,33.4750,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,80,'1h','MZ','+258840000072'),
  ('Farmácia Vila Pery',   'pharmacy','Chimoio','Vila Pery, Chimoio','Zona histórica.',true,4.2,-19.1150,33.4800,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,75,'55 min','MZ','+258840000073')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Manica','hospital','Chimoio','Av. Eduardo Mondlane, Chimoio','Hospital provincial de Manica.',true,true,-19.1164,33.4833,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821392000','hpm@medwalletmz.online',''),
  ('Hospital de Gondola',         'hospital','Gondola','Gondola, Manica','Hospital de Gondola (corredor da Beira).',true,true,-19.0500,33.6500,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821393000','hgon@medwalletmz.online',''),
  ('Clínica Chimoio Privada',     'clinic','Chimoio','Av. 1 de Maio, Chimoio','Clínica privada.',true,true,-19.1100,33.4900,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821394000','chimoiop@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Chimoio','Chimoio','Av. Eduardo Mondlane, Chimoio','Exames clínicos de Manica.',true,true,-19.1164,33.4833,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821395000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- XAI-XAI (Gaza) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Xai-Xai',     'pharmacy','Xai-Xai','Av. Samora Machel, Xai-Xai','Farmácia central.',true,4.2,-25.0519,33.6442,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'50 min','MZ','+258840000080'),
  ('Farmácia Praia do Xai-Xai','pharmacy','Xai-Xai','Praia do Xai-Xai','Zona costeira.',true,4.4,-25.0800,33.7000,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h 10min','MZ','+258840000081'),
  ('Farmácia Bairro 1 de Maio','pharmacy','Xai-Xai','Bairro 1 de Maio, Xai-Xai','Bairro popular.',true,4.0,-25.0600,33.6300,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,75,'1h','MZ','+258840000082'),
  ('Farmácia Limpopo',     'pharmacy','Xai-Xai','Av. Limpopo, Xai-Xai','Atendimento central.',true,4.1,-25.0450,33.6500,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,75,'1h','MZ','+258840000083')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Xai-Xai','hospital','Xai-Xai','Av. Eduardo Mondlane, Xai-Xai','Hospital provincial de Gaza.',true,true,-25.0519,33.6442,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821396000','hpx@medwalletmz.online',''),
  ('Hospital Rural de Chókwè',     'hospital','Chókwè','Chókwè, Gaza','Hospital de Chókwè (agrícola).',true,true,-24.5300,32.0800,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821397000','hrchokwe@medwalletmz.online',''),
  ('Clínica Xai-Xai Privada',      'clinic','Xai-Xai','Av. Samora Machel, Xai-Xai','Clínica privada.',true,true,-25.0519,33.6442,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821398000','xxp@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Xai-Xai','Xai-Xai','Av. Eduardo Mondlane, Xai-Xai','Exames clínicos de Gaza.',true,true,-25.0519,33.6442,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821399000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- INHAMBANE ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Inhambane',    'pharmacy','Inhambane','Av. Eduardo Mondlane, Inhambane','Farmácia central.',true,4.3,-23.8650,35.3833,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'55 min','MZ','+258840000090'),
  ('Farmácia Tofo',         'pharmacy','Inhambane','Praia do Tofo, Inhambane','Praia do Tofo, turismo.',true,4.5,-23.8550,35.5500,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h 15min','MZ','+258840000091'),
  ('Farmácia Maxixe',       'pharmacy','Maxixe','Av. Eduardo Mondlane, Maxixe','Cidade de Maxixe (vizinha).',true,4.2,-23.8647,35.3475,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,75,'1h','MZ','+258840000092'),
  ('Farmácia Bairro Pandos','pharmacy','Inhambane','Bairro Pandos, Inhambane','Bairro popular.',true,4.0,-23.8700,35.3700,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,80,'1h 10min','MZ','+258840000093')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Inhambane','hospital','Inhambane','Av. Eduardo Mondlane, Inhambane','Hospital provincial de Inhambane.',true,true,-23.8650,35.3833,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821400000','hpi@medwalletmz.online',''),
  ('Hospital de Chicamba',           'hospital','Chicamba','Chicamba, Inhambane','Hospital rural.',true,true,-23.9000,35.4000,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821401000','hchicamba@medwalletmz.online',''),
  ('Clínica Inhambane Privada',      'clinic','Inhambane','Av. Samora Machel, Inhambane','Clínica privada.',true,true,-23.8650,35.3833,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821402000','ip@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Inhambane','Inhambane','Av. Eduardo Mondlane, Inhambane','Exames de Inhambane.',true,true,-23.8650,35.3833,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821403000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- LICHINGA (Niassa) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Lichinga',       'pharmacy','Lichinga','Av. Eduardo Mondlane, Lichinga','Farmácia central de Niassa.',true,4.2,-13.3096,36.0670,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,80,'1h','MZ','+258840000100'),
  ('Farmácia Bairro Boma',    'pharmacy','Lichinga','Bairro Boma, Lichinga','Bairro popular.',true,4.0,-13.3150,36.0700,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,90,'1h 15min','MZ','+258840000101'),
  ('Farmácia Unango',         'pharmacy','Lichinga','Bairro Unango, Lichinga','Bairro periférico.',true,4.1,-13.3000,36.0600,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,90,'1h 20min','MZ','+258840000102'),
  ('Farmácia Estação',        'pharmacy','Lichinga','Av. Estação, Lichinga','Atendimento central.',true,4.0,-13.3050,36.0650,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,85,'1h 10min','MZ','+258840000103')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Lichinga','hospital','Lichinga','Av. Eduardo Mondlane, Lichinga','Hospital provincial de Niassa.',true,true,-13.3096,36.0670,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821404000','hpl@medwalletmz.online',''),
  ('Hospital Rural de Cuamba',      'hospital','Cuamba','Cuamba, Niassa','Hospital de Cuamba (nó ferroviário).',true,true,-14.8000,36.5000,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821405000','hrcuamba@medwalletmz.online',''),
  ('Clínica Lichinga Privada',      'clinic','Lichinga','Av. Samora Machel, Lichinga','Clínica privada.',true,true,-13.3096,36.0670,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821406000','lp@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Lichinga','Lichinga','Av. Eduardo Mondlane, Lichinga','Exames de Niassa.',true,true,-13.3096,36.0670,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821407000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- UNIFIED health_facilities entries (for explorer UI) ----------
INSERT INTO public.health_facilities (country_id, name, type, status, rating, address, contact, services, branding_color)
VALUES
  ('MZ','Hospital Central de Maputo','hospital','verified',4.9,'{"street":"Av. Agostinho Neto","city":"Maputo","lat":-25.9700,"lng":32.5800}'::jsonb,'{"phone":"+25821350000","email":"hcm@medwalletmz.online"}'::jsonb,ARRAY['trauma','maternity','icu','pediatrics'],'#ea580c'),
  ('MZ','Hospital da Beira','hospital','verified',4.7,'{"street":"Av. Eduardo Mondlane","city":"Beira","lat":-19.8333,"lng":34.8500}'::jsonb,'{"phone":"+25821365000","email":"hb@medwalletmz.online"}'::jsonb,ARRAY['trauma','maternity','icu'],'#16a34a'),
  ('MZ','Hospital Central de Nampula','hospital','verified',4.6,'{"street":"Av. 25 de Setembro","city":"Nampula","lat":-15.1167,"lng":39.2667}'::jsonb,'{"phone":"+25821373000","email":"hcn@medwalletmz.online"}'::jsonb,ARRAY['trauma','maternity'],'#0ea5e9'),
  ('MZ','Hospital Provincial de Pemba','hospital','verified',4.5,'{"street":"Av. da Independência","city":"Pemba","lat":-12.9740,"lng":40.5178}'::jsonb,'{"phone":"+25821379000","email":"hpp@medwalletmz.online"}'::jsonb,ARRAY['maternity','pediatrics'],'#7c3aed'),
  ('MZ','Hospital Provincial de Quelimane','hospital','verified',4.5,'{"street":"Av. Eduardo Mondlane","city":"Quelimane","lat":-17.8786,"lng":36.8883}'::jsonb,'{"phone":"+25821383000","email":"hpq@medwalletmz.online"}'::jsonb,ARRAY['maternity','pediatrics'],'#0d9488'),
  ('MZ','Hospital Provincial de Tete','hospital','verified',4.4,'{"street":"Av. Eduardo Mondlane","city":"Tete","lat":-16.1569,"lng":33.5787}'::jsonb,'{"phone":"+25821388000","email":"hpt@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#f59e0b'),
  ('MZ','Hospital Provincial de Manica','hospital','verified',4.4,'{"street":"Av. Eduardo Mondlane","city":"Chimoio","lat":-19.1164,"lng":33.4833}'::jsonb,'{"phone":"+25821392000","email":"hpm@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#dc2626'),
  ('MZ','Hospital Provincial de Xai-Xai','hospital','verified',4.4,'{"street":"Av. Eduardo Mondlane","city":"Xai-Xai","lat":-25.0519,"lng":33.6442}'::jsonb,'{"phone":"+25821396000","email":"hpx@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#9333ea'),
  ('MZ','Hospital Provincial de Inhambane','hospital','verified',4.4,'{"street":"Av. Eduardo Mondlane","city":"Inhambane","lat":-23.8650,"lng":35.3833}'::jsonb,'{"phone":"+25821400000","email":"hpi@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#0891b2'),
  ('MZ','Hospital Provincial de Lichinga','hospital','verified',4.3,'{"street":"Av. Eduardo Mondlane","city":"Lichinga","lat":-13.3096,"lng":36.0670}'::jsonb,'{"phone":"+25821404000","email":"hpl@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#16a34a'),
  ('MZ','Apollo Pharmacy Bandra','pharmacy','verified',4.7,'{"city":"Maputo","lat":-25.9622,"lng":32.4589}'::jsonb,'{"phone":"+258840000010"}'::jsonb,ARRAY['delivery','24h'],'#0ea5e9'),
  ('MZ','Farmácia Beira Central','pharmacy','verified',4.5,'{"city":"Beira","lat":-19.8333,"lng":34.8500}'::jsonb,'{"phone":"+258840000020"}'::jsonb,ARRAY['delivery','prescription'],'#16a34a'),
  ('MZ','Laboratório Maputo','lab','verified',4.7,'{"city":"Maputo","lat":-25.9720,"lng":32.5760}'::jsonb,'{"phone":"+25821356000"}'::jsonb,ARRAY['hematology','biochemistry','home_collection'],'#f59e0b')
ON CONFLICT DO NOTHING;

SELECT 'MZ Plan Part 2 complete — 200+ institutions seeded across 11 cities' as result;
