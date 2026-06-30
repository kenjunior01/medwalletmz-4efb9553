-- ============================================================================
-- MedWallet MZ — Recomendações Estratégicas (relatório PDF)
-- Migration: Conteúdo Educacional Localizado + Lista de Espera de Profissionais
--
-- Cobre as recomendações do relatório estratégico:
--  4.1 - "Conteúdo Educacional Localizado": artigos/vídeos/infográficos sobre
--         saúde adaptados à realidade moçambicana, com foco em prevenção.
--  4.1 - "Expansão da Rede de Prestadores": lista de espera para pacientes
--         solicitarem profissionais/áreas não disponíveis na sua região.
--  5.2 - "Conteúdo Localizado" para influenciadores e depoimentos.
-- ============================================================================

-- ============================================================
-- 1) health_articles — Artigos Educacionais Localizados (PT-PT/MZ)
-- ============================================================
create table if not exists public.health_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null,
  body_md text not null,
  cover_url text,
  category text not null check (category in (
    'prevention', 'nutrition', 'maternal', 'child', 'chronic',
    'mental_health', 'sexual_health', 'first_aid', 'mozambique_focus'
  )),
  locale text not null default 'pt-MZ',
  target_regions text[] default array['MZ']::text[],
  author_name text,
  author_credentials text,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  read_minutes int default 4,
  views_count int default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_health_articles_published
  on public.health_articles (is_published, published_at desc);
create index if not exists idx_health_articles_category
  on public.health_articles (category, is_published);
create index if not exists idx_health_articles_featured
  on public.health_articles (is_featured) where is_featured = true;

-- RLS: leitura pública para publicados, escrita só para admins/service role
alter table public.health_articles enable row level security;

drop policy if exists "health_articles_read_published" on public.health_articles;
create policy "health_articles_read_published" on public.health_articles
  for select using (is_published = true);

drop policy if exists "health_articles_admin_write" on public.health_articles;
create policy "health_articles_admin_write" on public.health_articles
  for all using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_health_articles_updated on public.health_articles;
create trigger trg_health_articles_updated
  before update on public.health_articles
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2) provider_waitlist — Lista de Espera de Profissionais
--    (rec 1.2 / 4.1 - "Sem médicos disponíveis" -> oferecer alternativa)
-- ============================================================
create table if not exists public.provider_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_kind text not null check (requested_kind in ('doctor', 'pharmacy', 'clinic')),
  specialty_id uuid references public.medical_specialties(id) on delete set null,
  city text not null,
  neighborhood text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'notified', 'fulfilled', 'cancelled')),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_waitlist_city_kind on public.provider_waitlist (city, requested_kind);
create index if not exists idx_waitlist_user on public.provider_waitlist (user_id);

alter table public.provider_waitlist enable row level security;

drop policy if exists "waitlist_self_read" on public.provider_waitlist;
create policy "waitlist_self_read" on public.provider_waitlist
  for select using (auth.uid() = user_id);

drop policy if exists "waitlist_self_insert" on public.provider_waitlist;
create policy "waitlist_self_insert" on public.provider_waitlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "waitlist_self_update" on public.provider_waitlist;
create policy "waitlist_self_update" on public.provider_waitlist
  for update using (auth.uid() = user_id);

drop policy if exists "waitlist_admin_all" on public.provider_waitlist;
create policy "waitlist_admin_all" on public.provider_waitlist
  for all using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
    )
  );

-- ============================================================
-- 3) article_views — Métricas simples para artigos publicados
-- ============================================================
create table if not exists public.article_views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.health_articles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  viewed_at timestamptz not null default now()
);
create index if not exists idx_article_views_article on public.article_views (article_id, viewed_at desc);

alter table public.article_views enable row level security;
drop policy if exists "article_views_insert" on public.article_views;
create policy "article_views_insert" on public.article_views
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists "article_views_admin_read" on public.article_views;
create policy "article_views_admin_read" on public.article_views
  for select using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
    )
  );

-- ============================================================
-- 4) Seed inicial — Artigos focados em Moçambique
--    (rec 4.1 — "prevenção e bem-estar" + "realidade moçambicana")
-- ============================================================
insert into public.health_articles
  (slug, title, excerpt, body_md, category, is_published, is_featured, author_name, author_credentials, read_minutes, published_at)
values
  (
    'malaria-prevencao-mozambique',
    'Malária em Moçambique: como se proteger durante a época das chuvas',
    'A malária é uma das principais causas de internamento no país. Saiba como prevenir e reconhecer os primeiros sinais.',
    E'# Malária: o que precisas saber\n\nA **malária** é transmitida pela picada do mosquito *Anopheles* infectado. Em Moçambique, a época das chuvas (entre novembro e abril) traz o maior número de casos.\n\n## Sintomas mais comuns\n\n- Febre alta (acima de 38°C)\n- Dores de cabeça e no corpo\n- Calafrios e suores\n- Náuseas e vómitos\n\n## Como prevenir\n\n1. **Dormir debaixo de mosquitoeira tratada** — é a forma mais eficaz.\n2. **Eliminar água parada** perto de casa (pneus, latas, vasos).\n3. **Usar repelente** nas zonas do corpo expostas, especialmente ao final do dia.\n4. **Manter portas e janelas fechadas** ou com redes.\n\n## Quando procurar ajuda\n\nEm caso de febre persistente por mais de 24h, procure imediatamente uma unidade sanitária. O tratamento é gratuito nas unidades públicas.\n\n> ⚠️ Em emergência, ligue **84 144** (serviço nacional de emergências) ou vá direto ao Hospital Central mais próximo.\n',
    'prevention',
    true, true,
    'Dr(a). Equipa MedWallet',
    'Equipa clínica MedWallet MZ',
    4,
    now()
  ),
  (
    'colera-agua-segura',
    'Água segura: como evitar a cólera e a diarreia',
    'Surtos de doenças diarreicas aumentam no verão. Aprenda 5 formas práticas de tornar a água segura em casa.',
    E'# Água segura em casa\n\nA **cólera** e outras doenças diarreicas continuam a ser preocupação em Moçambique, especialmente nas zonas periurbanas e após cheias.\n\n## 5 formas de tornar a água segura\n\n1. **Ferver** — pelo menos 5 minutos.\n2. **Clorar** — 2 gotas de lixívia por litro e esperar 30 minutos.\n3. **Filtro de cerâmica** — manutenção semanal.\n4. **Água engarrafada** — verifique o lacre.\n5. **Pastilhas de purificação** — vendidas em farmácias e lojas.\n\n## Sinais de desidratação em crianças\n\n- Boca e língua secas\n- Choro sem lágrima\n- Fraldas secas por mais de 6 horas\n- Olhos encovados\n\nLactantes devem continuar a mamar. Para crianças maiores, ofereça **SRO (sais de rehidratação oral)** disponível nas farmácias.\n',
    'prevention',
    true, false,
    'Dr(a). Equipa MedWallet',
    'Equipa clínica MedWallet MZ',
    3,
    now()
  ),
  (
    'hipertensao-controlo',
    'Hipertensão: o assassino silencioso — como controlar em casa',
    'Um em cada três moçambicanos adultos tem pressão alta. Veja como medir e controlar sem complicação.',
    E'# Pressão alta? Não sinta nada, mas cuide.\n\nA **hipertensão arterial** raramente dá sintomas — e é por isso que é perigosa. Se não for controlada, pode levar a AVC, enfarte e problemas renais.\n\n## Como medir em casa\n\n1. Sente-se durante **5 minutos** antes de medir.\n2. Apoie o braço na mesa, à altura do coração.\n3. Faça **2 medições** com intervalo de 1 minuto.\n4. Anote os valores e partilhe com o seu médico na próxima consulta.\n\n## Valores de referência\n\n- **Normal:** abaixo de 120/80 mmHg\n- **Atenção:** 120–139 / 80–89\n- **Hipertensão:** igual ou acima de 140/90\n\n## Dicas práticas para baixar a pressão\n\n- Reduzir o **sal** na comida (menos de 5g/dia)\n- Caminhar pelo menos **30 minutos** por dia\n- Comer mais fruta, vegetais e peixe\n- **Evitar bebidas alcoólicas** em excesso\n- Tomar a medicação **todos os dias**, mesmo quando se sente bem\n',
    'chronic',
    true, true,
    'Dr(a). Equipa MedWallet',
    'Equipa clínica MedWallet MZ',
    5,
    now()
  ),
  (
    'gravidez-acompanhamento-pre-natal',
    'Gravidez saudável: consultas pré-natais que toda gestante deve fazer',
    'O acompanhamento pré-natal reduz riscos para mãe e bebé. Veja o calendário essencial para Moçambique.',
    E'# Calendário pré-natal\n\nO **MISAU recomenda pelo menos 4 consultas** durante a gravidez. Cada uma tem um objetivo específico.\n\n## Quando marcar\n\n- **1.ª consulta:** assim que confirmar a gravidez (até às 12 semanas)\n- **2.ª consulta:** entre 20 e 24 semanas\n- **3.ª consulta:** entre 28 e 32 semanas\n- **4.ª consulta:** entre 36 e 38 semanas\n\n## O que esperar em cada consulta\n\n- Medição da pressão arterial\n- Peso e altura uterina\n- Análises (hemograma, HIV, sífilis, urina)\n- Vacinas (tétano, hepatite)\n- Aconselhamento sobre aleitamento e parto\n\n> 📍 Todas as consultas pré-natais são **gratuitas** nas unidades sanitárias públicas.\n',
    'maternal',
    true, false,
    'Dr(a). Equipa MedWallet',
    'Equipa clínica MedWallet MZ',
    4,
    now()
  ),
  (
    'sida-testagem-prep',
    'HIV: testar é cuidar — onde e como fazer em Moçambique',
    'Saber o seu estado serológico muda tudo. Teste gratuito, confidencial e disponível em todo o país.',
    E'# Testagem de HIV\n\nSaber se tem ou não HIV é o primeiro passo para cuidar de si e de quem ama. Em Moçambique, o teste é **gratuito, confidencial e rápido** — demora apenas 20 minutos.\n\n## Onde testar\n\n- **Centros de saúde** públicos (todas as unidades sanitárias)\n- **ONGs parceiras** (Monaso, FDC, N'weti)\n- **Farmácias privadas** (teste rápido)\n- **Pelo MedWallet** — em breve, atendimento ao domicílio\n\n## O que fazer se o resultado for positivo\n\nO tratamento antirretroviral (TARV) é **gratuito** e começa no mesmo dia. Tomar a medicação todos os dias permite ter uma **vida longa e saudável** e impede a transmissão.\n\n## PrEP e PEP\n\n- **PrEP** (profilaxia pré-exposição): comprimido preventivo para pessoas com maior risco.\n- **PEP** (profilaxia pós-exposição): tratamento de emergência até 72 horas após exposição.\n',
    'sexual_health',
    true, true,
    'Dr(a). Equipa MedWallet',
    'Equipa clínica MedWallet MZ',
    4,
    now()
  ),
  (
    'diabetes-sinais-cuidados',
    'Diabetes: 7 sinais de alerta que poucos conhecem',
    'A diabetes tipo 2 está a crescer em Moçambique. Identifique precocemente e evite complicações.',
    E'# Sinais de alerta da diabetes\n\nA diabetes pode estar presente durante anos **sem sintomas**. Esteja atento a:\n\n1. **Sede constante** e boca seca\n2. **Urinar muitas vezes**, especialmente à noite\n3. **Fome constante** mesmo comendo\n4. **Perda de peso** sem razão aparente\n5. **Visão turva**\n6. **Feridas que demoram a cicatrizar**\n7. **Formigamento** nas mãos e pés\n\n## Como confirmar\n\nUma simples análise de **glicemia em jejum** (acima de 126 mg/dL) ou **hemoglobina glicada** (acima de 6,5%) confirma o diagnóstico.\n\n## Cuidados diários\n\n- Alimentação com menos açúcar e carbohidratos refinados\n- Atividade física regular\n- Tomar a medicação conforme indicado\n- Monitorizar a glicemia em casa (glicosímetro)\n- Consulta médica a cada 3–6 meses\n',
    'chronic',
    true, false,
    'Dr(a). Equipa MedWallet',
    'Equipa clínica MedWallet MZ',
    4,
    now()
  ),
  (
    'saude-mental-bem-estar',
    'Saúde mental importa: como pedir ajuda em Moçambique',
    'Depressão e ansiedade são reais e tratáveis. Conheça os sinais e onde procurar apoio.',
    E'# Saúde mental: pedir ajuda é um acto de coragem\n\nSentir-se em baixo, ansioso ou sobrecarregado **não é fraqueza**. É um sinal de que precisa de apoio.\n\n## Sinais de que deve procurar ajuda\n\n- Tristeza profunda por mais de 2 semanas\n- Perda de interesse em actividades que gostava\n- Alterações de sono ou apetite\n- Dificuldade em concentrar-se\n- Pensamentos de se magoar\n\n## Onde procurar apoio em Moçambique\n\n- **Hospital Psiquiátrico de Maputo** (consulta especializada)\n- **Centro de Saúde Mental** da sua província\n- **Linha verde da AMI:** 1458\n- **Médicos e psicólogos na MedWallet** — marcar consulta online\n\n> 💙 Conversar com alguém de confiança é o primeiro passo.\n',
    'mental_health',
    true, false,
    'Dr(a). Equipa MedWallet',
    'Equipa clínica MedWallet MZ',
    3,
    now()
  ),
  (
    'primeiros-socorros-crianca',
    'Primeiros socorros: o que fazer quando uma criança tem febre alta',
    'Passo a passo simples para actuar em casa antes de chegar ao hospital.',
    E'# Febre alta em crianças — primeiros socorros\n\nFebre não é doença — é sinal de que o corpo está a combater uma infecção. Mas em crianças pequenas exige atenção.\n\n## Quando é considerada febre alta\n\n- **Bebés (0–3 meses):** ≥ 38°C — **emergência!**\n- **3–36 meses:** ≥ 39°C\n- **Maiores de 3 anos:** ≥ 39,5°C\n\n## O que fazer em casa\n\n1. Manter a criança **ligeiramente vestida**\n2. Oferecer **líquidos com frequência**\n3. Dar **paracetamol** na dose certa para o peso (ver embalagem)\n4. Aplicar **compressas mornas** (não frias!) na testa e axilas\n5. **Não dar aspirina** a menores de 12 anos\n\n## Quando ir ao hospital imediatamente\n\n- Febre acima de 40°C que não baixa com medicação\n- Convulsões\n- Sonolência excessiva\n- Manchas roxas na pele\n- Vómitos repetidos\n',
    'child',
    true, false,
    'Dr(a). Equipa MedWallet',
    'Equipa clínica MedWallet MZ',
    4,
    now()
  )
on conflict (slug) do nothing;

-- ============================================================
-- 5) partner_applications — Pedidos de Parceria (rec 5.3)
--    Empresas, sector público, ONGs, seguradoras.
-- ============================================================
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('public_sector', 'corporate', 'ngo', 'insurance', 'pharma')),
  organization text not null,
  contact_name text not null,
  email text not null,
  city text default 'Maputo',
  message text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
create index if not exists idx_partner_apps_status on public.partner_applications (status, created_at desc);

alter table public.partner_applications enable row level security;

drop policy if exists "partner_apps_insert_anon" on public.partner_applications;
create policy "partner_apps_insert_anon" on public.partner_applications
  for insert with check (true);

drop policy if exists "partner_apps_admin_read" on public.partner_applications;
create policy "partner_apps_admin_read" on public.partner_applications
  for select using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
    )
  );

-- ============================================================
-- 6) Comentário / changelog
-- ============================================================
comment on table public.health_articles is
  'Artigos educacionais localizados sobre saúde em Moçambique (rec 4.1 do relatório estratégico).';
comment on table public.provider_waitlist is
  'Lista de espera de pacientes para profissionais/áreas indisponíveis (rec 1.2 do relatório).';
comment on table public.partner_applications is
  'Pedidos de parceria (setor público, empresas, ONGs, seguradoras) — rec 5.3 do relatório.';