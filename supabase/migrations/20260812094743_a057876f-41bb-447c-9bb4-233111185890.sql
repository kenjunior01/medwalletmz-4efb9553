INSERT INTO public.hospitals (name, city, address, neighborhood, phone, latitude, longitude, emergency_24h, has_maternity, has_icu, has_pediatrics, has_blood_bank, is_active, is_verified, description)
SELECT * FROM (VALUES
  ('Hospital Central de Maputo','Maputo','Av. Eduardo Mondlane','Central',' +258 21 320 828',-25.9680,32.5830,true,true,true,true,true,true,true,'Maior hospital de referência do país'),
  ('Hospital Geral José Macamo','Maputo','Av. de Angola','Chamanculo','+258 21 401 800',-25.9430,32.5610,true,true,false,true,false,true,true,'Hospital geral urbano'),
  ('Hospital Geral de Mavalane','Maputo','Av. Acordos de Lusaka','Mavalane','+258 21 465 000',-25.9200,32.5760,true,true,false,true,false,true,true,'Hospital geral do distrito de Mavalane'),
  ('Hospital Provincial da Matola','Matola','Av. da Namaacha','Matola A','+258 21 720 400',-25.9622,32.4589,true,true,true,true,true,true,true,'Hospital provincial de Maputo Província'),
  ('Hospital Central da Beira','Beira','Rua Correia de Brito','Ponta Gêa','+258 23 322 003',-19.8330,34.8500,true,true,true,true,true,true,true,'Hospital central da região centro'),
  ('Hospital Central de Nampula','Nampula','Av. do Trabalho','Central','+258 26 213 032',-15.1165,39.2666,true,true,true,true,true,true,true,'Hospital central da região norte'),
  ('Hospital Central de Quelimane','Quelimane','Av. Samora Machel','Central','+258 24 213 000',-17.8786,36.8883,true,true,true,true,true,true,true,'Hospital central da Zambézia'),
  ('Hospital Provincial de Tete','Tete','Av. Julius Nyerere','Francisco Manyanga','+258 25 222 000',-16.1564,33.5867,true,true,false,true,true,true,true,'Hospital provincial de Tete'),
  ('Hospital Provincial de Pemba','Pemba','Av. 25 de Setembro','Cimento','+258 27 220 000',-12.9740,40.5178,true,true,false,true,true,true,true,'Hospital provincial de Cabo Delgado'),
  ('Hospital Provincial de Xai-Xai','Xai-Xai','Av. Samora Machel','Chibuto','+258 28 222 000',-25.0519,33.6442,true,true,false,true,false,true,true,'Hospital provincial de Gaza'),
  ('Hospital Provincial de Inhambane','Inhambane','Av. da Independência','Balane','+258 29 320 000',-23.8650,35.3833,true,true,false,true,false,true,true,'Hospital provincial de Inhambane'),
  ('Hospital Provincial de Chimoio','Chimoio','Av. 25 de Setembro','Centro','+258 25 122 000',-19.1164,33.4833,true,true,false,true,true,true,true,'Hospital provincial de Manica'),
  ('Hospital Provincial de Lichinga','Lichinga','Av. Samora Machel','Central','+258 27 120 000',-13.3128,35.2406,true,true,false,true,false,true,true,'Hospital provincial do Niassa')
) AS v(name, city, address, neighborhood, phone, latitude, longitude, emergency_24h, has_maternity, has_icu, has_pediatrics, has_blood_bank, is_active, is_verified, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.hospitals h WHERE lower(h.name) = lower(v.name) AND lower(h.city) = lower(v.city)
);

INSERT INTO public.pharmacies (name, city, address, neighborhood, phone, latitude, longitude, is_24h, has_delivery, is_active, is_verified, description)
SELECT * FROM (VALUES
  ('Farmácia Calêndula','Maputo','Av. Julius Nyerere','Polana','+258 21 485 000',-25.9700,32.6000,true,true,true,true,'Farmácia com serviço permanente'),
  ('Farmácia Nossa Senhora de Fátima','Maputo','Av. 24 de Julho','Central','+258 21 300 000',-25.9660,32.5810,false,true,true,true,'Farmácia comunitária'),
  ('Farmácia Popular Baixa','Maputo','Av. 25 de Setembro','Baixa','+258 21 302 000',-25.9690,32.5730,false,false,true,true,'Medicamentos essenciais'),
  ('Farmácia Sommerschield','Maputo','Rua Kassuende','Sommerschield','+258 21 490 100',-25.9640,32.6050,false,true,true,true,'Atendimento e entregas'),
  ('Farmácia Costa do Sol','Maputo','Av. Marginal','Costa do Sol','+258 21 455 200',-25.9280,32.6210,false,true,true,true,'Farmácia de bairro'),
  ('Farmácia Matola Gare','Matola','Av. da Namaacha','Matola Gare','+258 21 780 300',-25.9500,32.4300,false,true,true,true,'Farmácia local'),
  ('Farmácia Machava','Matola','Av. de Moçambique','Machava','+258 21 750 400',-25.9310,32.4700,false,false,true,true,'Farmácia comunitária'),
  ('Farmácia Beira Central','Beira','Rua Major Serpa Pinto','Ponta Gêa','+258 23 325 400',-19.8340,34.8480,true,true,true,true,'Serviço 24 horas'),
  ('Farmácia Manga','Beira','Av. Samora Machel','Manga','+258 23 350 100',-19.8100,34.8700,false,false,true,true,'Farmácia de bairro'),
  ('Farmácia Nampula Central','Nampula','Av. Eduardo Mondlane','Central','+258 26 216 700',-15.1180,39.2680,false,true,true,true,'Farmácia central'),
  ('Farmácia Zambézia','Quelimane','Av. 1 de Julho','Central','+258 24 215 300',-17.8790,36.8890,false,true,true,true,'Farmácia central de Quelimane'),
  ('Farmácia Tete Cidade','Tete','Av. Eduardo Mondlane','Centro','+258 25 223 400',-16.1570,33.5880,false,false,true,true,'Farmácia central de Tete'),
  ('Farmácia Pemba Cimento','Pemba','Av. 25 de Setembro','Cimento','+258 27 221 500',-12.9750,40.5180,false,true,true,true,'Farmácia central de Pemba'),
  ('Farmácia Chimoio Centro','Chimoio','Av. 25 de Junho','Centro','+258 25 123 400',-19.1170,33.4840,false,true,true,true,'Farmácia central de Chimoio'),
  ('Farmácia Xai-Xai Praia','Xai-Xai','Av. Samora Machel','Praia','+258 28 223 500',-25.0520,33.6450,false,false,true,true,'Farmácia local')
) AS v(name, city, address, neighborhood, phone, latitude, longitude, is_24h, has_delivery, is_active, is_verified, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.pharmacies p WHERE lower(p.name) = lower(v.name) AND lower(p.city) = lower(v.city)
);