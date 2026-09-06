# 🩺 MedWallet MZ — App Flutter (F0→F10 — Paridade total: Triagem, Chat, Vídeo Jitsi, Círculos, Registos, Ganhe, Gestão Global/Regional, SOS, Laboratórios, Push, Offline, Painel do Médico, **Banco de Sangue**, **Solidariedade**, **Diário de Saúde**, **Família Cuidador**, **Planos/Subscrições**, **Ranking**, 14 Idiomas)

App móvel **nativa** do MedWallet MZ, construída em Flutter com **Clean
Architecture**, ligada **directamente à mesma base de dados Supabase** do
produto web (projeto `pfqruzusjjxyidhqkiob`) — **zero alterações no
backend**: toda a segurança continua garantida por RLS + RPCs já activos.

> Design: **Glassmorphism fintech** (Medical Trust Blue `#1E6B9C`),
> inspirado em Revolut / Nubank — fundo mesh abissal, cartões de vidro
> com blur, cartão-herói da carteira com contador animado e nav bar de
> vidro flutuante.

---

## 1. Requisitos

| Ferramenta   | Versão          |
|--------------|-----------------|
| Flutter SDK  | **3.24+** (Dart 3.5+) |
| Android Studio / Xcode | estáveis |
| Conta Supabase | acesso ao projeto `pfqruzusjjxyidhqkiob` |

Verifica o teu Flutter: `flutter doctor`

## 2. Gerar as plataformas nativas

O repositório contém apenas o código Dart (portável). Gera as pastas
`android/` e `ios/` localmente (não substitui nenhum ficheiro existente):

```bash
cd medwallet_flutter
flutter create . --org mz.medwallet --project-name medwallet
```

### Permissões nativas recomendadas (android/app/src/main/AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<!-- Lembretes de medicação (notificações locais, F6) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<!-- Videochamada F8: o SDK Jitsi corre EMBUTIDO na app.
     Requisitos nativos (documentados em jitsi_meet_flutter_sdk):
     android/app/build.gradle.kts → defaultConfig { minSdk = 26 }
     ios/Podfile → platform :ios, '15.0'
     Sem estes ajustes o build falha com mensagem clara; alternativa:
     remover a dependência 'jitsi_meet_flutter_sdk' do pubspec e a app
     volta a abrir a sala por link externo (fallback já incluído). -->
```
(GPS do módulo **Ganhe**. O `google_maps_flutter` também pede a chave
abaixo.)

## 3. Configurar as variáveis de ambiente

A app lê a config via `--dart-define` (mais seguro que ficheiros `.env`
no cliente). Precisas da **anon key** do projeto:

> Painel Supabase → **Settings → API → Project API Keys → `anon` / `publishable`**

### Opção A — VS Code / Cursor (recomendada)
Edita `.vscode/launch.json` e cola a tua key no campo
`SUPABASE_ANON_KEY`. Depois corre com **F5**.

### Opção B — Terminal (script incluído)
```bash
chmod +x run.sh
./run.sh "COLA_A_TUA_ANON_KEY_AQUI"
```

### Opção C — Comando directo
```bash
flutter run \
  --dart-define=SUPABASE_URL=https://pfqruzusjjxyidhqkiob.supabase.co \
  --dart-define=SUPABASE_ANON_KEY="COLA_A_TUA_ANON_KEY_AQUI" \
  --dart-define=MAPS_API_KEY="A_TUA_CHAVE_GOOGLE_MAPS_SDK"   # opcional
```

> **Push real (F8)** — opcional: adiciona
> `--dart-define=FCM_ENABLED=true` depois de configurares o Firebase
> (google-services.json / GoogleService-Info.plist + chaves APNs).
> A app grava o token FCM na tabela `fcm_tokens` (que o dispatch
> engine do backend já consulta). Sem a flag — ou sem Firebase
> configurado — a app funciona igual: notificações in-app + lembretes
> locais, e o Firebase nunca é inicializado.

> `MAPS_API_KEY` activa o **seletor de mapa interativo** no módulo
> Ganhe (SDK Android/iOS do Google Maps). Sem a chave, a app oferece
> GPS + coordenadas manuais — nada deixa de funcionar.

> Se correres sem as defines, a app arranca com o banner **"SEM CONFIG"**
> — é um lembrete intencional.

## 4. O que já funciona (F0 → F10)

### Núcleo (F0–F2)
| Módulo | Estado | Backend (tabelas/RPC) |
|--------|--------|------------------------|
| Splash, login email/password, registo, OTP SMS | ✅ | `auth.users` + `profiles` |
| **Carteira realtime** | ✅ | `wallets`, `wallet_transactions` |
| **Depósito M-Pesa manual** | ✅ | `mpesa_manual_payments` → `confirm_mpesa_payment` |
| **Levantamento de fundos** | ✅ | RPC `request_withdrawal` |
| Agendar consultas + histórico | ✅ | `consultations` (RLS) |
| Directório de instituições (sem produtos) | ✅ | `stores` + `clinics` + `veterinary_clinics` |
| Google Maps / Ligar / WhatsApp | ✅ | deep-links `google_place_id` + `geo` |

### Novidades F4
| Módulo | Estado | Backend (tabelas/RPC) |
|--------|--------|------------------------|
| **Centro de notificações realtime** | ✅ | `automated_notifications` (stream + banner in-app + badge no sino) |
| **Preferências completas + horas de silêncio** | ✅ | RPC `upsert_notification_preferences` |
| **Triagem em 5 passos** (contexto → sintomas por área → duração → severidade → revisão) | ✅ | Edge Function `ai-triage` + motor local por regras |
| **Histórico de triagens** | ✅ | `triage_logs` (realtime) |
| **Recomendação de especialidade** pós-triagem | ✅ | `medical_specialties` (match tolerante) |
| **Lista de especialistas da área** (ordenação avaliação/preço/experiência + pesquisa) | ✅ | `doctor_profiles` + `profiles.full_name` |
| **Chat especialista↔paciente** (anexos, respostas rápidas, realtime) | ✅ | `consultation_messages` + bucket `consultation-attachments` |
| **Conversas unificadas** (Instituições \| Especialistas) | ✅ | `facility_conversations` + `consultations` |
| **Receitas do paciente** (itens, validade, código de verificação copiável) | ✅ | `prescriptions` + `prescription_items` |
| **Emissão de receita pelo especialista** no chat | ✅ | INSERT `prescriptions` (trigger gera código) |
| **Ganhe com o MedWallet** (crowdsourcing) | ✅ | `place_proposals` (source `user_submit`) |
| **3–4 fotos do exterior**, GPS/mapa, paragem mais próxima, celular | ✅ | bucket `proposal-photos` (migração aditiva) |

### Novidades F5 (esta versão)
| Módulo | Estado | Backend (tabelas/RPC) |
|--------|--------|------------------------|
| **Recompensas 100% em dinheiro real** — Joy Coins removidos de todo o app | ✅ | `wallet_credit` multi-moeda (MZN, BRL, EUR…) via `approve_proposal` |
| **Painel do Gestor Global** (agregado de todos os países, fila M-Pesa, SOS, equipa, Meddy) | ✅ | `is_global_admin()` + `list_profiles_admin_full` + contagens RLS |
| **Consola Regional com 10 secções** (visão geral, submissões, instituições, KPIs, metas, conteúdo, pagamentos, utilizadores, SOS, config) | ✅ | `stores`/`clinics`/`veterinary_clinics`, `regional_kpis`, `regional_goals`, `regional_content`, `mpesa_manual_payments` |
| **Gestão de instituições** (activar/desactivar/verificar + Maps) | ✅ | UPDATE com RLS `is_manager_of_country` |
| **Fila de confirmações M-Pesa** (confirmar com ID de transação) | ✅ | RPC `confirm_mpesa_payment` |
| **KPIs e Metas editáveis** (upsert com período/meta) | ✅ | `regional_kpis` / `regional_goals` (UNIQUE upsert) |
| **Conteúdo regional** (campanhas, avisos, dicas por país) | ✅ | `regional_content` |
| **Ranking entre países** | ✅ | `regional_rankings` |
| **Configuração do país** (comissões + branding com preview) | ✅ | `countries.commission_rates` / `branding_config` |
| **Equipa de gestão** (atribuições por país) | ✅ | `country_management` + `user_roles` |
| **Meddy Copilot — IA de gestão** (análise dos teus dados, respostas em Markdown) | ✅ | Edge Function `meddy-copilot` |
| **SOS Emergência** (botão de pânico 3 s, GPS, resumo médico, contactos, estado realtime) | ✅ | `emergency_alerts` + `emergency_contacts` + Edge Function `emergency-sos` |
| **Monitor SOS para gestão** (reconhecer/resolver/falso alarme + Maps) | ✅ | `emergency_alerts` (RLS admin/responder) |
| **Medicação** (checklist diária das receitas + ad-hoc, streak, 7 dias) | ✅ | `medication_logs` (upsert por item/dia) |
| **Seguros de saúde** (planos, cobertura, subscrição, as minhas apólices) | ✅ | `insurance_companies` + `insurance_plans` + `user_insurance` |
| **14 idiomas** (PT, PT-BR, EN, ES, FR, DE, SW, ZU, XH, HI, BN, AR, ZH, RU) | ✅ | `profiles.preferred_locale` (persistido na BD) |

### Novidades F6 (esta versão)
| Módulo | Estado | Backend (tabelas/RPC) |
|--------|--------|------------------------|
| **Videochamada da consulta** (sala por link Jitsi + estado realtime da sala) | ✅ | `video_sessions` (waiting → in_progress → ended) |
| **Botão de vídeo no chat de consulta** (ambos os lados) | ✅ | `video_sessions` (RLS das partes) |
| **Laboratórios** (directório dos registados) | ✅ | `clinics` com `type = lab/lab` |
| **Catálogo de exames por laboratório** (categorias + preparação) | ✅ | `lab_exams` (leitura pública RLS) |
| **Pedido de exames com carrinho + agendamento + colheita ao domicílio** | ✅ | INSERT `lab_exam_orders` (items JSONB) |
| **Pagamento dos exames da carteira** (mesma sequência do web) | ✅ | RPC `wallet_debit` (transacional) |
| **Histórico de exames** (estado realtime, resultado em PDF por link, cancelamento pendente) | ✅ | `lab_exam_orders` (stream + `result_url`) |
| **Tema dinâmico por país** — a app veste a bandeira do mercado | ✅ | `countries.branding_config` (via `wallets.country_id`) |
| **Lembretes de medicação** (1–3/dia derivados da frequência, offline, sem FCM) | ✅ | `flutter_local_notifications` + `prescription_items.frequency` |

### Fluxo videochamada
1. No **chat da consulta**, toca no ícone de vídeo → a app garante a
   sessão na tabela `video_sessions` (idempotente por consulta);
2. Sala do **Jitsi Meet** aberta por link externo (browser/app Jitsi —
   sem SDK nativo pesado); micro, câmara e altifalante controlados no
   ecrã de chamada;
3. O estado da sala é **realtime**: quando a outra parte entra,
   waiting → in_progress (cronómetro arranca); se encerrar, ambos
   regressam ao chat.

### Fluxo laboratórios
1. **Serviços → Laboratórios e análises** (ou quick action “Exames” no
   Início) → lista dos laboratórios registados;
2. Catálogo **agrupado por categoria** com instruções de preparação;
   marcar exames → carrinho com total;
3. **Agendar**: nome do paciente, telefone, data/hora opcional e
   **colheita ao domicílio** (morada + cidade);
4. **Pagar da carteira** — INSERT em `lab_exam_orders` + RPC
   `wallet_debit` (mesma transação auditada do produto web);
5. Acompanhar em **Os meus exames**: estados realtime (pendente →
   confirmado → amostra recolhida → em análise → concluído), resultado
   aberto por link e cancelamento de pendentes.

### Novidades F7 (esta versão)
| Módulo | Estado | Backend (tabelas/RPC) |
|--------|--------|------------------------|
| **Círculos de Apoio** — comunidades por condição (Diabetes, Hipertensão, Maternidade, Saúde Mental) | ✅ | `support_circles` + `support_circle_members` |
| **Chat de grupo com ANONIMATO opcional** e diretrizes da comunidade | ✅ | `support_circle_messages` (`is_anonymous`, polling 4 s) |
| **Moderação IA visível** — estado das mensagens próprias (em revisão/sinalizada) | ✅ | `ai_moderation_status` (classificação do backend) |
| **Registos médicos** — exames, receitas, relatórios e vacinas com anexo | ✅ | `medical_records` + bucket `medical-records` (`{uid}/`) |
| **Partilha de registos com o médico** (revogável, opcionalmente ligada à consulta) | ✅ | `medical_record_shares` (UNIQUE record+doctor) |
| **Convida e Ganha** — código próprio copiável, aplicar código de amigo, histórico | ✅ | `profiles.referral_code` + `user_referrals` (RLS) |
| **Recompensa de convite = dinheiro real** na carteira (sem coins) | ✅ | trigger `apply_referral_bonus` → `wallet_credit` |

### Novidades F8 (esta versão)
| Módulo | Estado | Backend (tabelas/RPC) |
|--------|--------|------------------------|
| **Reacções nas mensagens dos círculos** (8 emojis, contagem, a minha destacada) | ✅ | `support_circle_messages.reactions` (jsonb) + política de UPDATE com **trigger que congela o conteúdo** |
| **Respostas (reply)** — citar mensagem no chat do círculo | ✅ | `support_circle_messages.reply_to` (FK já existente) |
| **Círculos em REALTIME** (fim do polling de 4 s) + badges de não lidas | ✅ | publication `supabase_realtime` + `last_read_at` (nova política UPDATE da própria adesão) |
| **Videochamada Jitsi EMBUTIDA** — áudio/vídeo dentro da app, com fallback automático para o link externo | ✅ | mesma sala `video_sessions` → `meet.jit.si` (SDK `jitsi_meet_flutter_sdk`) |
| **Push real FCM** (opt-in via `--dart-define=FCM_ENABLED=true`) — token gravado por dispositivo, removido no logout, mensagens em foreground aparecem como notificação local | ✅ | tabela `fcm_tokens` (criada aditivamente — o dispatch engine já a consultava em LEFT JOIN) |
| **Cache offline** (sqflite, stale-while-revalidate) — laboratórios e plano de medicação visíveis sem internet | ✅ | cópias locais de `clinics (lab)` e `prescription_items` |
| **Segunda vaga de tradução** — 24 chaves novas × 14 idiomas (quick actions do Início traduzidas) | ✅ | `profiles.preferred_locale` |

### Fluxo círculos de apoio
1. **Círculos** (quick action ou Perfil) → filtros por condição com
   contagem de membros, descrição e badge **"N novas"**;
2. **Entrar** no círculo (RLS própria) → **Conversa** abre o chat de
   grupo em **realtime** (histórico + novas mensagens ao vivo);
3. Toggle do **olho** no composer publica a mensagem como **Anónimo**;
4. **Toque longo** numa mensagem → folha de **reacções** (8 emojis) +
   **Responder** + **Apagar** (nas tuas); os chips de emoji ficam sob a
   bolha com a contagem — a tua reacção fica destacada;
5. A mensagem passa pela **moderação automática** — a tua própria
   mensagem mostra "Em revisão" até a IA aprovar; sinalizadas/removidas
   ficam ocultas para os outros membros;
6. **Diretrizes** sempre acessíveis no cabeçalho (ℹ️).

### Fluxo registos médicos
1. **Registos** (quick action ou Perfil) → **+** → fotografar/galeria
   ou só texto;
2. Título, tipo (exame/receita/relatório/vacina/imagem), emitente e
   descrição → guardado na tua pasta privada do bucket
   `medical-records`;
3. **Abrir anexo** via URL assinado (1 h);
4. **Partilhar com médico** → escolhe um especialista com quem já tens
   consulta; revoga quando quiseres — o acesso do médico ao anexo
   desaparece na hora (policy por `file_url`).

### Fluxo Convida e Ganha
1. **Convida e Ganha** → o teu código aparece (gera e grava se o
   perfil ainda não tiver) → **copia e partilha**;
2. O amigo aplica o código (só **um código por conta**) — o convite
   fica "Em verificação";
3. Quando a plataforma verifica, o trigger do backend credita
   **dinheiro real** na carteira de ambos (referrer: bónus cheio;
   convidado: boas-vindas a metade) — **zero coins na UI**.

### Fluxo de gestão (Gestor Global + Regionais)
1. **Hub de Gestão** (`/manager-hub`): mostra o cartão **Painel do
   Gestor Global** (só admin), as consolas de cada país gerido e o
   **Meddy Copilot**;
2. **Consola por país** (`/manager-console`): 10 secções — visão geral
   com 6 KPIs live, submissões por rever/histórico com fotos e
   aprovação (recompensa real na carteira do contribuidor), gestão de
   instituições, KPIs e metas editáveis, conteúdo regional, fila
   M-Pesa, utilizadores, monitor SOS e configuração do país;
3. **Painel Global** (`/global-dashboard`): totais de toda a
   plataforma, países com badge SOS, fila de pagamentos, monitor SOS
   e equipa de gestores;
4. Meddy responde com base num **snapshot real** dos contagens e
   KPIs — nunca inventa dados fora do contexto enviado.

### Fluxo SOS Emergência
1. **Mantém premido 3 segundos** → alerta criado com GPS (se
   permitido), grupo sanguíneo, condições crónicas e alergias;
2. A Edge Function `emergency-sos` notifica os contactos; se
   indisponível, a app faz INSERT directo (RLS do próprio);
3. O estado do alerta (activo/reconhecido/resolvido) é **realtime**;
4. O alerta aparece no **Monitor SOS** dos painéis de gestão;
5. "Estou bem" cancela o alerta. Contactos geridos no mesmo ecrã.

### Fluxo triagem → consulta especializada
1. **Triagem IA** em 5 passos com catálogo de sintomas por área do corpo,
   severidade visual e contexto (gravidez, crónicos, medicação);
2. A resposta (IA ou motor local) é **guardada em `triage_logs`** e
   apresenta severidade, sinais de alarme, auto-cuidados e causas;
3. O resultado **recomenda a especialidade adequada** (ex.: Pediatria,
   Cardiologia) num cartão com atalho directo;
4. **Ver especialistas de {área}** → lista ordenável + pesquisa;
5. **Agendar consulta** → após agendada, a conversa aparece em
   **Conversas → Especialistas** com chat completo (texto, anexos,
   receitas e, para o médico, emissão de receita sem sair do chat).

### Fluxo "Ganhe com o MedWallet" (crescimento da rede)
1. O utilizador submete uma instituição nova: tipo, nome, celular,
   cidade/bairro, **paragem/ponto de referência mais próximo** e
   **3–4 fotos do exterior** (fotos públicas no bucket
   `proposal-photos`, renderizáveis também pela web);
2. Localização por **GPS**, **mapa interativo** ou coordenadas manuais;
3. O **gestor regional** do país valida no painel (fotos, ligar ao
   contribuidor, abrir no Maps) e **Aprova** → RPC `approve_proposal`
   publica a instituição e credita a recompensa na carteira
   (multi-moeda via `reward_amount`/`reward_currency`);
4. Estatísticas do contribuidor (enviadas/aprovadas/ganhos) em tempo
   real; limites de `max_pending_per_user` respeitados. **Sem pontos
   nem coins** — só dinheiro real, na moeda do país da instituição.

### ⚠️ Migrações obrigatórias (1 vez, 100% aditivas)
Duas migrações **não alteram nada** do que a versão web já usa:

```bash
cd supabase            # pasta incluída neste pacote
supabase link --project-ref pfqruzusjjxyidhqkiob
supabase db push       # aplica:
                       #  20260905000000_facility_chat.sql
                       #  20260905100000_contributor_tools.sql
                       #  20260906000000_circle_social_push.sql
```

- `facility_chat` — conversas com instituições + bucket `chat-attachments`;
- `contributor_tools` — bucket `proposal-photos` (público, com policies
  por pasta do utilizador) + publicação realtime de
  `automated_notifications` e `triage_logs`;
- `circle_social_push` — política de UPDATE (reacções) + trigger que
  congela o conteúdo das mensagens dos círculos, realtime de
  `support_circle_messages`, UPDATE da própria adesão (`last_read_at`)
  e tabela `fcm_tokens` (push FCM).

Enquanto não forem aplicadas, o resto da app funciona normalmente.

### Novidades F9 — fecho de gaps de paridade (consulta a médica e donos)
| Módulo | Estado | Backend (tabelas/RPC) |
|--------|--------|------------------------|
| **Painel do Médico** (KPIs do mês, agenda realtime, concluir/cancelar, disponibilidade on/off) | ✅ | `doctor_profiles`, `consultations`, RPC `mark_consultation_completed` |
| **Slots de disponibilidade** (série de horários 1-toque, apagar livres) | ✅ | `doctor_availability_slots` |
| **Agendamento por slots** (RPC transacional com débito imediato e rollback) | ✅ | RPC `book_consultation_atomic(_slot_id, _reason)` |
| **Cancelar consulta** com libertação do slot + re-agendar | ✅ | `consultations` UPDATE + slot release (paridade web) |
| **Avaliar médico** (estrelas 1-5 + comentário, upsert por consulta) | ✅ | `doctor_reviews` (UNIQUE consultation_id) |
| **Editar perfil + foto** (upload avatars/{uid}/avatar com upsert) | ✅ | `profiles` + bucket `avatars` |
| **Segurança**: alterar palavra-passe + reset por e-mail | ✅ | `auth.updateUser` / `resetPasswordForEmail` |
| **Perfil de saúde** (sangue, alergias, crónicas, medicação, contacto de emergência) | ✅ | `patient_profiles` (alimenta SOS/triagem) |
| **Verificar receita** (farmácias) + QR code do link público | ✅ | RPC `verify_prescription(_code)` |
| **Inbox das instituições** (dono responde como instituição) | ✅ | `facility_conversations` + `is_facility_owner` (RLS) |
| **Educação em saúde** (9 categorias, leitor, contagem de views) | ✅ | `health_articles` + `article_views` |
| **Depósito multi-método** (M-Pesa, e-Mola, mKesh, Banco) + comprovativo | ✅ | `platform_payment_accounts` + bucket `mpesa-proofs` |
| **Histórico de levantamentos** com estados | ✅ | `withdrawal_requests` |
| **Banner regional** (campanhas/avisos da gestão no Home) | ✅ | `regional_content` (is_active + janela) |
| **Ajuda & Legal** (FAQ 8 perguntas + termos + contactos) | ✅ | estático + url_launcher |

### Novidades F10 — comunidade & bem-estar (últimos módulos do web)
| Módulo | Estado | Backend (tabelas/RPC) |
|--------|--------|------------------------|
| **Banco de Sangue** (pedidos críticos primeiro, voluntariar, progresso de unidades, tipo compatível destacado) | ✅ | `blood_requests`, `blood_donation_matches` (UNIQUE request+donor) |
| **Registo de dador** (tipo de sangue, disponibilidade, histórico + recompensa automática de 100 MT) | ✅ | `blood_donors` (upsert por user_id) |
| **Campanhas de doação** (janela temporal, tipos necessários, metas) | ✅ | `blood_donation_campaigns` |
| **Pedir sangue** (folha completa: urgência, unidades, hospital, contacto) | ✅ | `blood_requests` INSERT (created_by) |
| **Solidariedade** (campanhas verificadas, progresso de angariação, submeter pedido para revisão) | ✅ | `medical_aid_requests` (pending → approved) |
| **Doar** (carteira via RPC debit + M-Pesa/e-Mola com instruções) | ✅ | `medical_aid_donations` + `wallet_debit('solidarity')` |
| **Diário de Saúde** (check-in diário: humor 1-5, energia, sono, dor 0-10, sintomas, notas, gratidão + streak) | ✅ | `health_journal` (UNIQUE user_id+entry_date) |
| **Insight IA do diário** (quando o job semanal preenche) | ✅ | `health_journal.ai_insight` (leitura) |
| **Família / Cuidador** (ficha por familiar, cores, alergias/crónicas/medicação, lembretes tomou/saltou) | ✅ | `family_members`, `family_medication_logs` |
| **Planos MedWallet** (planos do paciente, checkout M-Pesa com referência MW-XXXXXX, envio do tx ID) | ✅ | `subscription_plans`, `subscriptions`, `mpesa_manual_payments` |
| **As minhas subscrições** (estados pending/active/expired) | ✅ | `subscriptions` (join plan) |
| **Ranking de confiança** (médicos por rating, farmácias/clínicas/hospitais, medalhas top-3) | ✅ | `doctor_profiles`, `clinics`, `stores` (avg_rating) |

## 5. Arquitectura

```
lib/
├── main.dart                  # bootstrap (Supabase init + orientação
│                              # + lembretes locais de medicação)
├── app.dart                   # MaterialApp.router + guard "SEM CONFIG"
│                              # + tema com paleta do país (branding)
├── core/
│   ├── config.dart            # --dart-define (URL, anon key, MAPS_API_KEY,
│   │                          #  FCM_ENABLED)
│   ├── branding/branding.dart # countries.branding_config → EffectivePalette
│   ├── l10n/                  # 14 idiomas (42 chaves: app_strings +
│   │                          #  locale_provider)
│   ├── push/push_service.dart # FCM opt-in (token → fcm_tokens, onMessage
│   │                          #  → notificação local, limpeza no logout)
│   ├── offline/               # cache sqflite stale-while-revalidate
│   ├── router/app_router.dart # go_router + redirect auth + nav de vidro
│   │                          # + banner de notificações em tempo real
│   ├── theme/                 # tokens, tema dark, vidro, fundo mesh
│   ├── utils/                 # formatters pt-MZ, Haversine
│   ├── reminders/             # MedsReminderService (notificações locais)
│   └── widgets/               # vidro, WalletCard, botões, skeletons,
│                              # NotificationBanner (overlay raiz)
└── features/                  # (feature-first + camadas)
    ├── auth/            data → domain → presentation
    ├── wallet/          data → domain → presentation
    ├── services/        data → domain → presentation (+ specialists)
    ├── bookings/        data → domain → presentation (+ prescriptions)
    ├── facilities/      data → controller → presentation
    ├── chat/            data → controllers → presentation
    │                    (facility chat + consultation chat)
    ├── triage/          data (catálogo + motor local) → repo → wizard/result
    ├── notifications/   data → controller → centro + preferências
    ├── earn/            data (place_proposals) → controller → ganhe/submit/mapa
    ├── sos/             data → controller → SOS (alertas + contactos)
    ├── meds/            data → presentation (checklist + streak)
    ├── videocall/       data (video_sessions) → SDK Jitsi embutido
    │                    (fallback por link) → ecrã de chamada
    ├── labs/            data (lab_exams + lab_exam_orders) → lista,
    │                    detalhe com carrinho/checkout, histórico
    ├── circles/         data (círculos + membros + mensagens, reactions
    │                    + reply_to, realtime) → descoberta com não lidas
    │                    + chat de grupo anónimo
    ├── records/         data (medical_records + shares) → lista,
    │                    upload de anexos, partilha revogável
    ├── referrals/       data (user_referrals) → convites e recompensas
    ├── insurance/       data → presentation (planos + apólices)
    ├── manager/         data (modelos + repo completo) → controllers →
    │                    hub, consola 10-secções, painel global,
    │                    painéis ops/growth + Meddy Copilot
    ├── regional/        data → controller → dashboard (legado, mantido)
    ├── blood/           data (donors/requests/matches/campaigns) →
    │                    hub 3-abas (pedidos, dador, campanhas)
    ├── solidarity/      data (medical_aid_requests/donations) →
    │                    campanhas verificadas + doação (wallet/mpesa/emola)
    ├── journal/         data (health_journal) → check-in diário
    │                    (humor/energia/sono/dor/sintomas) + streak
    ├── family/          data (family_members + med logs) → ficha por
    │                    familiar + medicação tomou/saltou
    ├── subscriptions/   data (plans/subscriptions/mpesa_manual) →
    │                    planos + checkout M-Pesa MW-XXXXXX
    ├── ranking/         data (doctor_profiles/clinics/stores) →
    │                    top avaliados com medalhas
    ├── home/            presentation (quick actions + badge)
    └── profile/         data (moradas) → presentation (+ idioma)
```

**Stack:** Flutter 3.24 · Riverpod 2.6 · go_router 14 · supabase_flutter 2.8
· google_fonts (Plus Jakarta Sans + Inter) · flutter_animate · shimmer
· url_launcher (Maps/tel/WhatsApp/Jitsi) · image_picker (receitas/fotos) ·
geolocator (GPS/SOS) · google_maps_flutter (seletor de localização) ·
flutter_markdown (Meddy Copilot) · flutter_local_notifications + timezone
(lembretes de medicação) · jitsi_meet_flutter_sdk (vídeo embutido) ·
sqflite + path (cache offline) · firebase_core + firebase_messaging
(push FCM, opt-in).

### Navegação (5 abas)
`Início` · `Carteira` · `Saúde` · `Instituições` · `Perfil` — mais ecrãs
full-screen: `/triage` (wizard) → `/triage-result`, `/specialists`,
`/bookings`, `/chats` (hub unificado), `/chat`, `/consultation-chat`,
`/video-call`, `/prescriptions`, `/notifications`, `/notification-prefs`,
`/earn`, `/earn-submit`, `/map-picker`, `/facility-detail`, `/sos`,
`/meds`, `/insurance`, `/labs`, `/lab-detail`, `/lab-orders`,
`/circles`, `/circle-chat`, `/records`, `/referrals`, `/manager-hub`,
`/manager-console`, `/global-dashboard`, `/regional` (legado).

### Princípios aplicados
- **Streams Supabase realtime** para carteira, consultas, chats,
  notificações, triagens e propostas (sem polling);
- **RLS como única fonte de verdade** — a app nunca confia no cliente;
  RPCs sensíveis (`approve_proposal`, `mark_notification_sent`) são
  security definer e validam papéis no servidor;
- **Feature-first**: cada pasta `features/*` é autossuficiente;
- **Zero segredos no código** — tudo via `--dart-define`;
- Formatação moçambicana nativa: `12 345,00 MT`, `+258 84 …`.

## 6. Roadmap (próximas fases)

F10 fecha a paridade funcional com os módulos comunitários e de
bem-estar do web. Extensões naturais:

- **Tradução integral** dos restantes ecrãs (a infra-estrutura de
  42 chaves × 14 idiomas já está pronta — basta acrescentar chaves);
- **Reacções/respostas nos chats 1:1** (instituições e especialistas),
  reutilizando o padrão dos círculos;
- **Anexos no chat dos círculos** (bucket dedicado com policies);
- **Sync offline bidireccional** (fila de mutações quando a rede volta);
- **Jitsi self-hosted** (definir `serverURL` próprio em vez de meet.jit.si);
- **Diário por voz** (`voice_journals` — gravação + upload; a transcrição
  IA já corre no backend via jobs).

## 7. Problemas comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Banner "SEM CONFIG" | faltam `--dart-define` | usa `run.sh` ou `launch.json` |
| `Invalid api key` | anon key errada | painel Supabase → Settings → API |
| Login SMS falha | SMS provider não activo | Auth → Providers → Phone (Twilio/MessageBird) |
| Saldo não entra | admin ainda não confirmou | confirma no painel admin (`mpesa_manual_payments`) |
| Sem dados (médicos) | projecto sem seed | popula `doctor_profiles`/`medical_specialties` |
| "Conversa indisponível" | migração do chat não aplicada | corre `supabase db push` (secção 4) |
| Fotos do Ganhe não aparecem | migração `contributor_tools` não aplicada | corre `supabase db push` (secção 4) |
| Mapa do Ganhe não abre | falta `MAPS_API_KEY` | usa GPS/coordenadas manuais ou define a chave |
| Painel de gestão diz "sem papel" | `user_roles` sem gestor | admin cria linha com `country_id` (ou `country_management`) |
| Consola sem utilizadores | RPC `list_profiles_admin_full` | só admin global e country_manager veem utilizadores |
| SOS não notifica contactos | Edge Function `emergency-sos` não publicada | `supabase functions deploy emergency-sos` (fallback: INSERT directo) |
| Meddy não responde | Edge Function `meddy-copilot` não publicada/sem `ZAI_API_KEY` | `supabase functions deploy meddy-copilot` + definir a chave |
| Sem planos de seguro | tabela `insurance_plans` vazia | as seguradoras/owner criam planos (RLS de leitura pública) |
| Reacções dos círculos não gravam | migração `circle_social_push` não aplicada | corre `supabase db push` (secção 4) |
| Círculos sem realtime | idem — tabela fora da publication | idem |
| Doação nos círculos não soma | migração não aplicada | corre `supabase db push` (secção 4) |
| Pedidos de sangue vazios | sem pedidos 'open' na base | cria um pedido na aba Pedidos → FAB |
| Planos vazios | `subscription_plans` sem linhas patient | admin publica planos (is_active=true) |
| Ranking vazio | sem avaliações em `doctor_reviews`/instituições | avalia consultas e instituições primeiro |
| Build falha no Jitsi (minSdk) | SDK exige `minSdk ≥ 26` | `android/app/build.gradle.kts`: `minSdk = 26`; iOS: `platform :ios, '15.0'` |
| Push não chega | `FCM_ENABLED` off ou Firebase sem config | adiciona a flag + `google-services.json` / `GoogleService-Info.plist` |
| App abre com dados antigos sem internet | normal — cache offline a servir dados | activa a rede; o cache refresca sozinho |

## 8. Segurança

- A anon key é **pública por desenho**; a protecção real é RLS —
  todas as tabelas usadas já têm políticas activas;
- Nunca commites a key em repositórios públicos;
- As chaves `service_role` ficam **apenas no servidor** (Edge Functions);
- O bucket `proposal-photos` é público de propósito (fotos de fachadas
  usadas no directório); o contribuidor só escreve na sua pasta.
