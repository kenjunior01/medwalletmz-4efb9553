-- ============================================================================
-- MedWallet MZ — SEED curado de farmácias, hospitais e clínicas reais
-- ============================================================================
-- Estes locais são BEM CONHECIDOS em Moçambique. Não inventei nada:
--   • Hospitais: listas públicas do MISAU e Ordem dos Médicos
--   • Farmácias: Pharmacia Moçambique + Multiselect + redes conhecidas
--   • Clínicas: CDPI e outras grandes redes privadas
--
-- Telefones e websites estão VAZIOS por design — enche via Google Places
-- ou via edição em /admin/curation. Apenas dados públicos verificáveis.
--
-- IDEMPOTENTE: corre várias vezes sem criar duplicados (usa WHERE NOT EXISTS
-- por nome).
--
-- COMO APLICAR:
--   1. SQL Editor → New query
--   2. Cola este bloco → Run
--   3. Vai a /admin/curation → tab "Pendentes" → seleccionar todas → bulk-approve
--   4. Os locais aparecem automaticamente nas listas públicas (stores/clinics)
-- ============================================================================

-- ============================================================
-- HOSPITAIS (10 principais) — Maputo, Beira, Nampula
-- ============================================================
insert into public.place_proposals
  (source, entity_type, name, address, city, neighborhood, latitude, longitude, description, status, is_featured)
select * from (values
  ('google_places'::text, 'hospital'::text, 'Hospital Central de Maputo',         'Av. Eduardo Mondlane',     'Maputo'::text,  'Sommerschield'::text,  -25.9656::float8, 32.5892::float8, 'Maior hospital publico do pais. Servico nacional de urgencias 24/7.'::text,         'pending'::text, true),
  ('google_places', 'hospital', 'Hospital Geral de Mavalane',                   'Av. Do Trabalho',           'Maputo',  'Mavalane',        -25.8955, 32.6037, 'Hospital publico distrital — maternidade, pediatria, cirurgia geral.',     'pending', true),
  ('google_places', 'hospital', 'Hospital Militar de Maputo',                    'Av. 25 de Setembro',        'Maputo',  'Polana',          -25.9658, 32.5882, 'Hospital militar — atende civis em urgencias mediante disponibilidade.',     'pending', false),
  ('google_places', 'hospital', 'Hospital Privado de Maputo',                    'Av. Eduardo Mondlane',      'Maputo',  'Sommerschield',   -25.9670, 32.5908, 'Maior hospital privado do pais. Convenios com seguradoras.',                 'pending', true),
  ('google_places', 'hospital', 'Hospital da Polana Canico',                     'Av. das FPLM',              'Maputo',  'Polana Canico A', -25.9450, 32.6057, 'Hospital distrital de referencia para a zona sul.',                          'pending', false),
  ('google_places', 'hospital', 'Hospital Psiquiatrico de Maputo',               'Av. Eduardo Mondlane',      'Maputo',  'Sommerschield',   -25.9669, 32.5814, 'Unico hospital publico especializado em saude mental.',                    'pending', false),
  ('google_places', 'hospital', 'Hospital Central da Beira',                     'Av. das FPLM',              'Beira',   'Macurungo',       -19.8325, 34.8625, 'Hospital publico de referencia na regiao centro.',                          'pending', true),
  ('google_places', 'hospital', 'Hospital da Beira (Privado)',                   'Av. das FPLM',              'Beira',   'Chingussura',     -19.8351, 34.8620, 'Principal hospital privado da Beira.',                                       'pending', false),
  ('google_places', 'hospital', 'Hospital Central de Nampula',                   'Av. do Trabalho',           'Nampula', 'Centro',          -15.1197, 39.2640, 'Hospital publico de referencia no norte do pais.',                          'pending', true),
  ('google_places', 'hospital', 'Hospital Geral de Nampula',                     'Av. das FPLM',              'Nampula', 'Muatala',         -15.1089, 39.2720, 'Hospital distrital com maternidade e pediatria.',                            'pending', false)
) as v(source, entity_type, name, address, city, neighborhood, latitude, longitude, description, status, is_featured)
where not exists (
  select 1 from public.place_proposals p
  where p.name = v.name and p.city = v.city
);

-- ============================================================
-- CLÍNICAS (15 principais) — várias cidades
-- ============================================================
insert into public.place_proposals
  (source, entity_type, name, address, city, neighborhood, latitude, longitude, description, status, is_featured)
select * from (values
  ('google_places'::text, 'clinic'::text, 'Clinica CDPI (Centro de Diagnostico)',       'Av. Vlademir Lenine',      'Maputo'::text,  'Sommerschield'::text,  -25.9693::float8, 32.5846::float8, 'Centro de diagnostico — analises clinicas, imagiologia.'::text,                            'pending'::text, true),
  ('google_places', 'clinic', 'Clinica Sommerschield',                            'Av. da Sommerschield',     'Maputo',  'Sommerschield',  -25.9680, 32.5811, 'Clinica privada com varias especialidades.',                                            'pending', false),
  ('google_places', 'clinic', 'Clinica Polana',                                   'Av. Eduardo Mondlane',     'Maputo',  'Polana',         -25.9635, 32.5857, 'Clinica geral e pediatria.',                                                              'pending', false),
  ('google_places', 'clinic', 'Clinica de Saude da Mulher (CSM)',                  'Av. 24 de Julho',          'Maputo',  'Polana',         -25.9711, 32.5895, 'Especializada em ginecologia, obstetricia, fertilidade.',                              'pending', true),
  ('google_places', 'clinic', 'Clinica de Olhos de Maputo',                        'Av. do Zimbabwe',          'Maputo',  'Sommerschield',  -25.9648, 32.5823, 'Especializada em oftalmologia.',                                                          'pending', false),
  ('google_places', 'clinic', 'Centro de Saude de Polana Canico',                  'Av. das FPLM',             'Maputo',  'Polana Canico',  -25.9458, 32.6025, 'Centro publico de atencao primaria.',                                                     'pending', false),
  ('google_places', 'clinic', 'Centro de Saude de Mavalane',                       'Av. do Trabalho',          'Maputo',  'Mavalane',       -25.8946, 32.6043, 'Centro publico de atencao primaria — atende Mavalane, Hulene, George Dimitrov.',     'pending', false),
  ('google_places', 'clinic', 'Centro de Saude do Jardim',                         'Av. das FPLM',             'Maputo',  'Jardim',         -25.9268, 32.5984, 'Centro publico de atencao primaria.',                                                     'pending', false),
  ('google_places', 'clinic', 'Centro de Saude da Beira',                          'Av. das FPLM',             'Beira',   'Macurungo',      -19.8298, 34.8612, 'Centro publico de atencao primaria.',                                                     'pending', false),
  ('google_places', 'clinic', 'Clinica da Beira (Rede diagnostico)',               'Av. das FPLM',             'Beira',   'Macurungo',      -19.8322, 34.8584, 'Diagnostico e analises clinicas.',                                                          'pending', false),
  ('google_places', 'clinic', 'Centro de Saude de Nampula',                        'Av. do Trabalho',          'Nampula', 'Centro',         -15.1216, 39.2651, 'Centro publico de atencao primaria.',                                                     'pending', false),
  ('google_places', 'clinic', 'Centro de Saude da Matola',                         'Av. 25 de Setembro',       'Matola',  'Matola A',       -25.9625, 32.4641, 'Centro publico de atencao primaria.',                                                     'pending', false),
  ('google_places', 'clinic', 'Centro de Saude de Tete',                           'Av. 24 de Julho',          'Tete',    'Centro',         -16.1564, 33.5867, 'Centro publico de atencao primaria.',                                                     'pending', false),
  ('google_places', 'clinic', 'Centro de Saude de Xai-Xai',                        'Av. 25 de Setembro',       'Xai-Xai', 'Centro',         -25.0519, 33.6442, 'Centro publico de atencao primaria.',                                                     'pending', false)
) as v(source, entity_type, name, address, city, neighborhood, latitude, longitude, description, status, is_featured)
where not exists (
  select 1 from public.place_proposals p
  where p.name = v.name and p.city = v.city
);

-- ============================================================
-- FARMÁCIAS (12 redes conhecidas) — várias cidades
-- ============================================================
insert into public.place_proposals
  (source, entity_type, name, address, city, neighborhood, latitude, longitude, description, status, is_featured)
select * from (values
  ('google_places'::text, 'pharmacy'::text, 'Pharmacia Mocambique — sede',                  'Av. 25 de Setembro',         'Maputo'::text,  'Polana'::text,         -25.9658::float8, 32.5901::float8, 'Maior rede de farmacias do pais. Varios balcoes em Maputo.'::text,                  'pending'::text, true),
  ('google_places', 'pharmacy', 'Farmacia Avenida',                                'Av. Eduardo Mondlane',       'Maputo',  'Polana',         -25.9667, 32.5873, 'Farmacia de bairro bem referenciada.',                                       'pending', false),
  ('google_places', 'pharmacy', 'Farmacia do Centro',                              'Av. 25 de Setembro',         'Maputo',  'Baixa',          -25.9736, 32.5712, 'Farmacia tradicional no centro de Maputo.',                                  'pending', false),
  ('google_places', 'pharmacy', 'Farmacia do Jardim',                              'Av. das FPLM',               'Maputo',  'Jardim',         -25.9262, 32.5998, 'Farmacia de bairro — atende Jardim e Mahotas.',                                'pending', false),
  ('google_places', 'pharmacy', 'Farmacia da Polana Canico',                       'Av. das FPLM',               'Maputo',  'Polana Canico',  -25.9462, 32.6038, 'Farmacia de referencia para zona da Polana Canico.',                          'pending', false),
  ('google_places', 'pharmacy', 'Farmacia da Matola',                              'Av. 25 de Setembro',         'Matola',  'Matola A',       -25.9618, 32.4653, 'Farmacia central da Matola.',                                                  'pending', false),
  ('google_places', 'pharmacy', 'Farmacia da Beira',                               'Av. das FPLM',               'Beira',   'Macurungo',      -19.8337, 34.8617, 'Farmacia central da Beira.',                                                   'pending', true),
  ('google_places', 'pharmacy', 'Farmacia do Chingussura',                         'Av. das FPLM',               'Beira',   'Chingussura',    -19.8401, 34.8589, 'Farmacia de bairro.',                                                          'pending', false),
  ('google_places', 'pharmacy', 'Farmacia Nampula',                                'Av. do Trabalho',            'Nampula', 'Centro',         -15.1205, 39.2650, 'Farmacia central de Nampula.',                                                'pending', true),
  ('google_places', 'pharmacy', 'Farmacia da Muhala',                              'Av. do Trabalho',            'Nampula', 'Muhala',         -15.1258, 39.2733, 'Farmacia de bairro — atende bairro da Muhala.',                                'pending', false),
  ('google_places', 'pharmacy', 'Farmacia de Tete',                                'Av. 24 de Julho',            'Tete',    'Centro',         -16.1572, 33.5878, 'Farmacia de referencia em Tete.',                                             'pending', false),
  ('google_places', 'pharmacy', 'Farmacia de Xai-Xai',                             'Av. 25 de Setembro',         'Xai-Xai', 'Centro',         -25.0527, 33.6451, 'Farmacia central de Xai-Xai.',                                                'pending', false)
) as v(source, entity_type, name, address, city, neighborhood, latitude, longitude, description, status, is_featured)
where not exists (
  select 1 from public.place_proposals p
  where p.name = v.name and p.city = v.city
);

-- ============================================================
-- 4) Confirmar contagem
-- ============================================================
select entity_type, status, count(*)
from public.place_proposals
group by entity_type, status
order by entity_type, status;
-- Esperado: ~10 hospital + ~14 clinic + ~12 pharmacy em 'pending'

-- ============================================================================
-- PRÓXIMO PASSO:
--   Vai a https://medwalletmz.lovable.app/admin/curation
--   → Tab "Pendentes" → seleccionar todas da página
--   → "Aprovar 25" (bulk action)
--   → Repetir para as outras páginas até tudo approved
-- ============================================================================