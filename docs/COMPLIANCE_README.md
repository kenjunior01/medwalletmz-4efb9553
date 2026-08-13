# Compliance Command Center · MedWallet Global

Módulo de Compliance Global adicionado ao MedWalletMZ — painel dark estilo "Command Center" para gestão regulatória multi-país.

## O que foi construído

### Novos ficheiros (3 815 linhas)

| Ficheiro | Função |
|---|---|
| `supabase/migrations/20260722000000_global_compliance_engine.sql` | 7 tabelas novas + RLS + triggers + seed de 16 frameworks regulatórios (ANVISA, NAFDAC, BPOM, SFDA, GDPR, etc.) e 6 produtos de micro-seguro |
| `supabase/functions/meddy-copilot/index.ts` | Edge Function Deno que chama a API ZAI (GLM-4.6) para análise de compliance em linguagem natural |
| `src/integrations/supabase/compliance-types.ts` | Tipos TypeScript + metadados estáticos (tiers, labels, bandeiras, severidades) |
| `src/hooks/useCompliance.ts` | Hook React Query com 7 queries + 3 mutations (upgrade tier, verificar doc, aprovar sinistro) |
| `src/pages/admin/ComplianceCommandCenter.tsx` | Painel executivo dark com KPIs globais + heatmap por país |
| `src/pages/admin/PartnerVerification.tsx` | Lista de parceiros com tiers Bronze→Platina + botão upgrade/downgrade |
| `src/pages/admin/DocumentVault.tsx` | Cofre documental com alertas de expiração 30/60/90 dias |
| `src/pages/admin/AuditTrail.tsx` | Log imutável com hash chain SHA-256 + verificação de integridade |
| `src/pages/admin/MicroInsurance.tsx` | Seguros paramétricos por país com auto-payout |
| `src/pages/admin/RegulatoryFrameworks.tsx` | Cards por país com score, requisitos, penalidades |
| `src/pages/admin/MeddyCopilot.tsx` | Chat IA para análise de compliance (fallback local se Edge Function falhar) |

### Ficheiros modificados

- `src/App.tsx` — adicionadas 14 rotas (7 admin + 7 manager)
- `src/pages/admin/AdminDashboard.tsx` — 2 novos itens no menu (Compliance + Meddy IA)
- `src/pages/admin/RegionalManagerDashboard.tsx` — 2 novos itens no menu para gestores regionais
- `src/index.css` — estilos dark para o Command Center (scrollbar, glow, scanlines)

## Como ativar

### 1. Aplicar migration no Supabase

```bash
# Via Supabase CLI
supabase db push

# OU colar directamente no SQL Editor do dashboard Supabase
# Conteúdo de: supabase/migrations/20260722000000_global_compliance_engine.sql
```

### 2. Deploy da Edge Function

```bash
# Instalar Supabase CLI se não tiveres
npm install -g supabase

# Login + link ao projecto
supabase login
supabase link --project-ref <teu-project-ref>

# Deploy da função
supabase functions deploy meddy-copilot

# Definir a chave da API ZAI (GLM-4.6)
supabase secrets set ZAI_API_KEY=<tua-chave-zai>
# Opcional: ZAI_API_URL (default: https://api.z.ai/api/paas/v4)
```

> **Sem a chave ZAI**, o Meddy Copilot corre em modo fallback local — responde a perguntas básicas com base nos dados carregados, mas sem IA generativa completa.

### 3. Aceder no browser

- **Admins globais**: `/admin/compliance`
- **Gestores regionais**: `/manager/compliance`

Sub-páginas (ambos os roles):
- `/admin/compliance/partners` — Parceiros verificados
- `/admin/compliance/documents` — Cofre documental
- `/admin/compliance/audit` — Audit trail imutável
- `/admin/compliance/insurance` — Micro-seguros
- `/admin/compliance/frameworks` — Frameworks regulatórios
- `/admin/compliance/copilot` — Meddy IA Copilot

## Funcionalidades principais

### 1. Painel Command Center (dark)
- 8 KPIs em tempo real (score compliance, parceiros verificados, docs expirados, etc.)
- Heatmap por país com score colorido (verde→vermelho)
- Distribuição por bloco regional (PALOP, SSA, LATAM, SEA, MENA, Europa)

### 2. Partner Verification
- 4 tiers: 🥉 Bronze → 🥈 Prata → 🥇 Ouro → 💎 Platina
- Cada tier tem requisitos automáticos (transações, rating, SLA)
- Botões de upgrade/downgrade com log automático no audit trail
- Selos ISO 9001 e JCI

### 3. Document Vault
- 12 tipos de documento (licença farmácia, médica, lab, vet, ISO, etc.)
- Filtros por expiração: 30 / 60 / 90 dias
- Hash SHA-256 de cada ficheiro para integridade
- Workflow: pendente → verificado/rejeitado

### 4. Audit Trail (blockchain-style)
- Tabela append-only (UPDATE/DELETE bloqueados por trigger)
- Hash chain SHA-256: cada evento referencia o hash do anterior
- 15 tipos de evento (certificação, documento, sinistro, breach, etc.)
- Verificação visual da integridade da cadeia

### 5. Micro-Seguros Paramétricos
- 6 produtos seed (MZ, BR, NG, ID, AE, PT)
- 6 triggers: no-show médico, atraso entrega, stockout, cancelamento, downtime, cold chain
- Auto-payout sem intervenção manual quando trigger dispara
- Cobertura limitada por apólice

### 6. Regulatory Frameworks
- 16 frameworks seed cobrindo 5 regiões
- Cada um com: score 0-100, requisitos granulares, penalidades
- Filtro por bloco regional
- Link directo para site da autoridade

### 7. Meddy IA Copilot
- Chat com ZAI GLM-4.6 (ou fallback local)
- 6 queries sugeridas pré-definidas
- Injecta contexto: países, frameworks, parceiros, audit, sinistros
- Responde em português europeu com Markdown

## Cobertura geográfica (seed)

| Região | Países |
|---|---|
| **PALOP** | Moçambique (MZ), Angola (AO), Cabo Verde (CV) |
| **África Subsaariana** | Nigéria (NG), Quénia (KE), Gana (GH) |
| **América Latina** | Brasil (BR), México (MX), Colômbia (CO) |
| **Sudeste Asiático** | Indonésia (ID), Filipinas (PH), Vietnã (VN) |
| **Médio Oriente** | EAU (AE), Arábia Saudita (SA), Catar (QA) |
| **Europa** | Portugal (PT), Espanha (ES) |

## Segurança

- **RLS ativo** em todas as 7 tabelas novas
- Gestores regionais só vêem dados do seu país (`fn_user_can_manage_country`)
- Audit trail é imutável (triggers `BEFORE UPDATE/DELETE` bloqueiam)
- Hashes SHA-256 calculados server-side no INSERT
- Wallet e transições financeiras validadas por PL/pgSQL com `FOR UPDATE`

## Próximos passos sugeridos

1. **Ativar ZAI_API_KEY** no Supabase para Meddy Copilot completo
2. Adicionar mais frameworks (UG, TZ, AR, CL, TH)
3. Integrar upload de documentos com Supabase Storage (já existe `file_url` no schema)
4. Adicionar webhook para auto-trigger de sinistros quando SLA falha
5. Criar dashboard executivo PDF exportável (para board meeting)

---

Construído como módulo autónomo — não altera nenhuma funcionalidade existente.
