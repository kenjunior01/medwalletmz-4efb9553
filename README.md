# MedWallet MZ · Carteira Digital de Saúde

> **Saúde, farmácia numa só carteira** — triagem com IA, médicos verificados, teleconsulta, farmácia 24h e pagamentos M-Pesa em Moçambique.

Plataforma mobile-first (React + Vite + Supabase) que aproxima serviços de saúde das populações moçambicanas.

---

## Visão geral

A MedWallet é uma **carteira digital de saúde** construída em torno de três pilares:

1. **Acesso** — Triagem com IA, teleconsultas (chat + vídeo), farmácia 24h com entrega em Maputo.
2. **Confiança** — Médicos verificados, avaliações reais, partilha segura de registos médicos.
3. **Pagamento local** — Carteira MZN integrada com M-Pesa, e-Mola e Mkesh.

Construído com React 18, Vite 5, TypeScript, shadcn-ui, Tailwind, Supabase (Postgres + Auth + Storage + Edge Functions) e Leaflet para mapas.

---

## Novas funcionalidades (round estratégico)

Esta versão aplica as **recomendações do relatório estratégico "MedWallet e o Mercado Moçambicano de Saúde Digital"**.

### 1. Conteúdo Educacional Localizado · `rec 4.1` ✅

- **Nova rota:** `/health/education` e `/health/education/:slug`
- **8 artigos seed** focados em Moçambique: malária, cólera, hipertensão, pré-natal, HIV, diabetes, saúde mental, primeiros socorros infantis.
- Pesquisa, categorias (Prevenção, Mãe&Bebé, Crónicas, Saúde Mental…), artigo em destaque, markdown leve para rendering rápido.
- Tabela `health_articles` + `article_views` (métricas de leitura).
- Banner de entrada na Home ligando a `/health/education`.

### 2. Lista de Espera de Profissionais · `rec 1.2 / 4.1` ✅

Resolve a fricção do estado "**Nenhum médico disponível nesta especialidade**" — agora o paciente escolhe:

- 🔔 **Avisa-me quando houver** — entra na lista de espera (tabela `provider_waitlist`).
- ✨ **Fazer triagem com IA agora**.
- 💬 **Chat médico geral** (clínico geral).
- 📚 **Ler artigos de saúde**.

Implementado em `Doctors.tsx` via componente `WaitlistDialog`.

### 3. Página de Parcerias (MISAU / Empresas / ONGs) · `rec 5.3` ✅

- **Nova rota:** `/partners`
- Mostra os tipos de parceria em curso (hospitais públicos, farmácias, ONGs, seguradoras).
- Formulário único para candidatura (setor público, corporativo, ONG, seguradora).
- Destaque para integração **M-Pesa + micro-seguros de saúde**.
- Tabela `partner_applications` com RLS (anon insert + admin read).

### 4. KlipyBanner localizado · `rec 1.2` ✅

Substitui os GIFs genéricos "healthcare smile" por queries moçambicanas contextuais: `mozambique healthcare`, `maputo family`, `africa doctor`, `tropical health`.

### 5. Página Help ampliada · `rec 5.3` ✅

- **Guia M-Pesa em 4 passos** (depósito na carteira MedWallet).
- **Nova categoria FAQ:** Consultas & Telemedicina.
- Quick actions para Educação MZ, Parcerias e Convite.

### 6. Personalização no Home · `rec 4.1` ✅

Widget `PersonalizedForYou` recomenda, baseado no histórico do utilizador:

- Retorno com mesmo médico (se consulta > 14 dias).
- Continuar com médico da última consulta.
- Confirmar triagem com clínico (se última triagem moderada/alta).
- Artigo de hipertensão (condição mais comum em MZ).
- Check-up geral (fallback).

### 7. ReferralBanner MZ · `rec 5.2` ✅

Componente `ReferralBanner` com copy adaptado ao contexto moçambicano:

- Saudação personalizada com nome da cidade.
- Partilha direta via **WhatsApp** (canal dominante em MZ).
- Link de convite copy-paste.

---

## Schema (Supabase)

As alterações de schema estão na migration
`supabase/migrations/20260630120000_strategic_recommendations_v1.sql`:

| Tabela | Finalidade |
|---|---|
| `health_articles` | Artigos educacionais publicados (admin write, public read de publicados). |
| `article_views`   | Tracking anónimo de leituras. |
| `provider_waitlist` | Lista de espera dos pacientes (auto insert + admin all). |
| `partner_applications` | Candidaturas de parceria (anon insert + admin read). |

RLS policies e seed inicial estão incluídos.

---

## Como correr

```bash
# Pré-requisitos: Node.js 18+ e npm ou bun
npm install                # ou: bun install

npm run dev                # dev server (Vite, HMR)
npm run build              # build de produção
npm run test               # vitest
npm run lint               # eslint
```

A app fala com Supabase via as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env`.

Para aplicar a nova migration:

```bash
supabase db push
# ou, no painel Supabase: SQL Editor → colar o conteúdo do ficheiro
```

---

## Estrutura (resumo)

```
src/
├── components/
│   ├── health/        # FollowUpReminders, PostConsultationReview, PersonalizedForYou
│   ├── home/          # NearbyProvidersWidget
│   ├── klipy/         # KlipyBanner (queries MZ)
│   ├── providers/     # WaitlistDialog
│   ├── referrals/     # ReferralBanner
│   └── reviews/       # ReviewModal, StoreReviews
├── contexts/          # Auth, Cart, Location, DataSaver
├── pages/
│   ├── health/        # Doctors, Triage, MedicalRecords, Exams,
│   │                  # VideoConsultation, ConsultationChat, **HealthEducation**
│   ├── admin/         # Painel admin
│   ├── doctor/        # Painel médico
│   ├── driver/        # Painel entregador
│   ├── clinic/        # Painel clínica
│   ├── store/         # Painel farmácia
│   ├── Home.tsx
│   ├── **Partners.tsx**
│   ├── Wallet.tsx
│   ├── Referrals.tsx
│   ├── Help.tsx       # Atualizado com M-Pesa
│   └── ...
├── hooks/             # useWallet, useFavorites, useNotifications, etc.
├── integrations/supabase/   # cliente + types
└── lib/
```

---

## Roadmap de expansão (próximas iterações)

Recomendação 5.3 do relatório:

- Expansão geográfica para **Beira** e **Nampula**.
- Micro-seguros de saúde com seguradoras locais.
- Telemetria de leitura + personalização por ML.
- Programa de **micro-influenciadores** MZ com dashboard para creators.

---

## Licença

Proprietário · © MedWallet MZ.