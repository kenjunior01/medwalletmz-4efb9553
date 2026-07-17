-- Seeding Mozambique Health Places (Pharmacies, Hospitals, Clinics)
-- Categorized into 'stores' (pharmacy) and 'clinics' (hospital, clinic, laboratory)

-- PHARMACIES (stores table)
INSERT INTO public.stores (id, name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time)
VALUES
  (gen_random_uuid(), 'Farmácia 24 - Maputo', 'pharmacy', 'Maputo', 'Av. 24 de Julho, Maputo', 'Atendimento 24h com stock completo.', true, 4.8, -25.9690, 32.5730, 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?auto=format&fit=crop&q=80&w=800', true, 50, '30-45 min'),
  (gen_random_uuid(), 'Farmácia Internacional', 'pharmacy', 'Maputo', 'Av. Samora Machel, Maputo', 'Uma das farmácias mais antigas e confiáveis.', true, 4.5, -25.9710, 32.5710, 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&q=80&w=800', true, 40, '40 min'),
  (gen_random_uuid(), 'Farmácia Lusitana', 'pharmacy', 'Maputo', 'Av. Karl Marx, Maputo', 'Serviço de qualidade no centro da cidade.', true, 4.2, -25.9680, 32.5750, 'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?auto=format&fit=crop&q=80&w=800', true, 45, '45 min'),
  (gen_random_uuid(), 'Farmácia Medly Polana', 'pharmacy', 'Maputo', 'Av. Julius Nyerere, Polana', 'Conveniência e variedade de suplementos.', true, 4.7, -25.9650, 32.5850, 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=800', true, 60, '25-35 min'),
  (gen_random_uuid(), 'Farmácia Moderna', 'pharmacy', 'Maputo', 'Av. Eduardo Mondlane, Maputo', 'Farmácia com laboratório próprio.', true, 4.0, -25.9620, 32.5780, 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=800', true, 50, '50 min'),
  (gen_random_uuid(), 'Farmácia Medly Matola', 'pharmacy', 'Matola', 'Av. da União Africana, Matola', 'A maior farmácia da Matola com entrega expressa.', true, 4.6, -25.9622, 32.4589, 'https://images.unsplash.com/photo-1512418490979-92798ccc1380?auto=format&fit=crop&q=80&w=800', true, 70, '30-50 min'),
  (gen_random_uuid(), 'Farmácia Miramar - Beira', 'pharmacy', 'Beira', 'Av. das FPLM, Beira', 'Farmácia de referência na cidade da Beira.', true, 4.3, -19.8333, 34.8500, 'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&q=80&w=800', true, 80, '1h'),
  (gen_random_uuid(), 'Farmácia Fênix Nampula', 'pharmacy', 'Nampula', 'Av. do Trabalho, Nampula', 'Medicamentos essenciais sempre disponíveis.', true, 4.1, -15.1167, 39.2667, 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?auto=format&fit=crop&q=80&w=800', true, 60, '45 min');

-- HOSPITALS (clinics table with type='hospital')
INSERT INTO public.clinics (id, name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id)
VALUES
  (gen_random_uuid(), 'Hospital Central de Maputo', 'hospital', 'Maputo', 'Av. Agostinho Neto, Maputo', 'O maior hospital público de Moçambique, referência nacional.', true, true, -25.9700, 32.5800, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'Hospital Privado de Maputo (Lenmed)', 'hospital', 'Maputo', 'Rua do Rio Inhamiara, Sommerschield', 'Hospital privado de alta complexidade com atendimento 24h.', true, true, -25.9550, 32.5950, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'Clínica 222', 'hospital', 'Maputo', 'Av. 24 de Julho, 222, Maputo', 'Especializada em urgências e cirurgias.', true, true, -25.9720, 32.5760, 'https://images.unsplash.com/photo-1538108176635-6c098c219dfa?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'Hospital Geral de Mavalane', 'hospital', 'Maputo', 'Av. das FPLM, Mavalane', 'Hospital geral servindo a zona norte de Maputo.', true, true, -25.9200, 32.5900, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'Hospital Central da Beira', 'hospital', 'Beira', 'Av. Samora Machel, Beira', 'Principal unidade de saúde da região centro.', true, true, -19.8250, 34.8450, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'Hospital Central de Nampula', 'hospital', 'Nampula', 'Av. 25 de Setembro, Nampula', 'Centro de saúde de referência na região norte.', true, true, -15.1200, 39.2700, 'https://images.unsplash.com/photo-1586773860418-d319a221f52c?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000');

-- CLINICS (clinics table with type='clinic')
INSERT INTO public.clinics (id, name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id)
VALUES
  (gen_random_uuid(), 'Sommerschield Clinic', 'clinic', 'Maputo', 'Av. Kenneth Kaunda, Maputo', 'Clínica multidisciplinar de alto padrão.', true, true, -25.9600, 32.5900, 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'Clínica da Polana', 'clinic', 'Maputo', 'Av. Armando Tivane, Maputo', 'Especialistas em pediatria e medicina geral.', true, true, -25.9630, 32.5870, 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'ICOR - Instituto do Coração', 'clinic', 'Maputo', 'Av. Eduardo Mondlane, Maputo', 'Referência em cardiologia em Moçambique.', true, true, -25.9650, 32.5800, 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'Clinicare Maputo', 'clinic', 'Maputo', 'Av. Marginal, Maputo', 'Consultas rápidas e atendimento personalizado.', true, true, -25.9500, 32.6100, 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000');

-- LABORATORIES (clinics table with type='laboratory')
INSERT INTO public.laboratories (id, name, city, address, description, is_active, is_verified, latitude, longitude, logo_url)
VALUES
  (gen_random_uuid(), 'Lancet Laboratories Maputo', 'Maputo', 'Av. Eduardo Mondlane, Maputo', 'Análises clínicas com certificação internacional.', true, true, -25.9660, 32.5790, 'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?auto=format&fit=crop&q=80&w=800'),
  (gen_random_uuid(), 'Joaquim Chaves Saúde', 'Maputo', 'Av. Julius Nyerere, Maputo', 'Laboratório de referência e exames de imagem.', true, true, -25.9640, 32.5860, 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&q=80&w=800'),
  (gen_random_uuid(), 'Laboratório Central de Saúde Pública', 'Maputo', 'Av. Eduardo Mondlane, Maputo', 'Laboratório nacional de referência.', true, true, -25.9670, 32.5770, 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?auto=format&fit=crop&q=80&w=800');

-- Also adding them to clinics table to ensure UI works
INSERT INTO public.clinics (id, name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id)
VALUES
  (gen_random_uuid(), 'Lancet Laboratories Maputo', 'laboratory', 'Maputo', 'Av. Eduardo Mondlane, Maputo', 'Análises clínicas com certificação internacional.', true, true, -25.9660, 32.5790, 'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000'),
  (gen_random_uuid(), 'Joaquim Chaves Saúde', 'laboratory', 'Maputo', 'Av. Julius Nyerere, Maputo', 'Laboratório de referência e exames de imagem.', true, true, -25.9640, 32.5860, 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&q=80&w=800', '00000000-0000-0000-0000-000000000000');
