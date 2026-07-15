# MedWallet Moçambique — Gestor Nacional & Sistema Funcional

## 🔑 CREDENCIAIS DE ACESSO

### Gestor Nacional (país inteiro MZ)
- **Email:** `gestor.nacional@medwalletmz.online`
- **Password:** `GestorNacional2026`
- **Role:** `country_manager` scoped to MZ (sem province_scope)
- **Permissões:** todas (admin + verticais + M-Pesa confirm)

### Utentes de Demonstração (5 pacientes nas 5 verticais)
- `utente.ana@medwalletmz.online` / `Utente2026` — Maputo Cidade
- `utente.carlos@medwalletmz.online` / `Utente2026` — Beira
- `utente.fatima@medwalletmz.online` / `Utente2026` — Nampula
- `utente.joao@medwalletmz.online` / `Utente2026` — Quelimane
- `utente.rosa@medwalletmz.online` / `Utente2026` — Chimoio

---

## ✅ O QUE FOI FEITO

### 1. Migração SQL (`20260726000000_national_manager_and_seed_data.sql`)
- **Cria** o gestor nacional único (sem gestores provinciais)
- **Restaura** referências a M-Pesa nas micro-insurance products (M-Pesa funciona via fluxo manual)
- **Cria** 5 utentes de demonstração para alimentar as 5 verticais
- **Faz seed** de:
  - 12 visitas APE (8 tipos: malaria, TB screen, HIV test, ANC, PNC, vacinação, geral, referência)
  - 8 casos TB DOT (3 fases: intensive, continuation, follow_up)
  - 10 logs ART adherence (4 regimes ARV)
  - 15 casos malaria (positive/negative, uncomplicated/severe)
  - 8 maternal profiles (4+ ANC visits, risk levels low/medium/high)
  - 5 pagamentos M-Pesa pendentes (para gestor confirmar)
- **Adiciona** 3 novos micro-seguros bônus:
  - `BONUS_APE_MZ` — Bônus Performance APE (250 MZN)
  - `BONUS_TB_MZ` — Bônus TB Cura Completa (500 MZN)
  - `BONUS_ART_MZ` — Bônus ARV Adesão 90% (100 MZN)

### 2. CountryDashboard atualizado
- Labels: "Gestão Regional" → **"Gestão Nacional"** e "Painel do Gestor Nacional"
- Badge: "MANAGER" → **"GESTOR NACIONAL"**
- **Nova secção "Verticais de Saúde Moçambicanas"** com 6 cards clicáveis:
  - APE (visitas) → `/manager/mz-verticals/ape`
  - TB DOT (casos) → `/manager/mz-verticals/tb-dot`
  - ART HIV (pacientes ARV) → `/manager/mz-verticals/art`
  - Malaria (casos test-and-treat) → `/manager/mz-verticals/malaria`
  - Materna (gestantes em seguimento) → `/manager/mz-verticals/maternal`
  - M-Pesa (pagamentos pendentes) → `/manager/insurance`

### 3. Google Cloud Integration (já existente, verificado)
6 serviços Google Cloud ativos via `GoogleCloudHub`:

| Serviço | Página que Usa | Estado |
|---------|----------------|--------|
| **Google Maps JS API** | APE, Malaria, Maternal, Facilities | ✅ Geolocalização real |
| **Google Maps Routes API v2** | Malaria, Maternal (farmácia/maternidade mais próxima) | ✅ Distância + duração real |
| **Google Cloud Vision OCR** | TB DOT (verificação de rótulo de medicação) | ✅ TEXT_DETECTION |
| **Google Cloud Text-to-Speech** | ART Adherence, Maternal (lembretes por voz pt-PT) | ✅ Neural2-A female |
| **Google Cloud Translation** | Multi-idioma (via Supabase Edge Function) | ✅ Changana, Sena, Macua, PT, EN |
| **Google Air Quality + Weather** | APE (qualidade do ar + clima para triagem) | ✅ Open-Meteo fallback |

### 4. WhatsApp + M-Pesa (sem APIs externas)
- **WhatsApp**: via `wa.me` URL scheme — abre WhatsApp do utilizador com mensagem pré-preenchida. Funciona em mobile + desktop. Sem necessidade de WhatsApp Business API.
- **M-Pesa**: via fluxo manual interno (`mpesa_manual_payments` table):
  1. Sistema gera referência única `MW-XXXXXX`
  2. Utilizador paga via M-Pesa no telemóvel (USSD `*150*00#`)
  3. Pagamento fica `pending`
  4. Gestor nacional confirma com ID de transação M-Pesa
  5. Status → `confirmed` dispara ações (libertar bônus, etc.)

### 5. Instituições de Saúde Moçambicanas (200+)
A migration `20260724010000_mz_plan_part2_institutions.sql` já adicionou ~148 instituições em 11 cidades:
- **Maputo, Matola, Beira, Nampula, Pemba, Quelimane, Tete, Chimoio, Xai-Xai, Inhambane, Lichinga**
- Categorias: ~70 farmácias, ~60 hospitais, ~40 clínicas, ~35 laboratórios

### 6. Build Validado
- ✅ `npx tsc --noEmit` — sem erros TypeScript
- ✅ `npx vite build` — build de produção bem-sucedido (14s)
- Bundle: 3.5 MB JS (986 KB gzip), 150 KB CSS (23 KB gzip)

---

## 🚀 COMO TESTAR

1. **Aplicar as migrations no Supabase:**
   ```bash
   supabase db push
   # ou aplicar manualmente no SQL Editor do dashboard Supabase:
   #   - 20260725000000_remove_provincial_managers.sql (já aplicada)
   #   - 20260725010000_mpesa_manual_payments.sql (já aplicada)
   #   - 20260726000000_national_manager_and_seed_data.sql (NOVA)
   ```

2. **Fazer login como Gestor Nacional:**
   - URL: `/auth`
   - Email: `gestor.nacional@medwalletmz.online`
   - Password: `GestorNacional2026`

3. **Ver o Resumo Nacional:**
   - URL: `/manager`
   - Verá: KPIs + secção "Verticais de Saúde Moçambicanas" com 6 cards
   - Cada card é clicável e navega para a página da vertical correspondente

4. **Testar fluxo M-Pesa:**
   - Aceder a qualquer vertical (ex: APE)
   - Clicar em "Gerar Pagamento 250 MZN" no card M-Pesa
   - Ver instruções geradas com referência MW-XXXXXX
   - Ir a `/manager/insurance` para confirmar pagamento

5. **Testar Google Cloud APIs:**
   - Aceder a `/manager/google-cloud` (Painel Nacional → ☁️ Google Cloud Hub)
   - Clicar "Testar" em cada serviço para validar funcionamento

6. **Testar WhatsApp:**
   - APE: card "WhatsApp — Resultado RDT"
   - TB DOT: card "Lembrete de Toma — WhatsApp"
   - ART: botão "WhatsApp" em cada paciente
   - Malaria: card "Resultado RDT — WhatsApp"
   - Maternal: botão "SOS Obstétrico" + botão "WhatsApp" por paciente

---

## 📋 FLUXOS POR VERTICAL (todas funcionais)

### APE Digital (`/manager/mz-verticals/ape`)
- **Google Maps geolocation** → GPS do APE no campo
- **Google Air Quality + Weather** → dados ambientais
- **WhatsApp** → envio de resultado RDT ao paciente
- **M-Pesa** → geração de bônus de performance (250 MZN)
- 12 visitas de seed em 11 províncias

### TB DOT Digital (`/manager/mz-verticals/tb-dot`)
- **Google Cloud Vision OCR** → verificação de rótulo de medicação (RHZE/RH)
- **WhatsApp** → lembrete de toma observada
- Log de dose (toma confirmada / falhada)
- 8 casos de seed em 8 províncias, 3 fases de tratamento

### ART Adherence HIV (`/manager/mz-verticals/art`)
- **Google Cloud TTS** → lembrete ARV por voz (pt-PT Neural2-A)
- **WhatsApp** → lembrete de toma (manhã/noite + refill)
- Tracking: carga viral, CD4, adesão 30d, refill due
- 10 pacientes de seed (4 regimes ARV diferentes)

### Malaria Test-and-Treat (`/manager/mz-verticals/malaria`)
- **Google Maps Routes API v2** → farmácia mais próxima (distância + duração real)
- **WhatsApp** → envio de resultado RDT + tratamento
- Haversine fallback se API falhar
- 15 casos de seed (positive/negative, uncomplicated/severe, gestantes)

### Saúde Materna (`/manager/mz-verticals/maternal`)
- **Google Maps Routes API v2** → maternidade mais próxima
- **WhatsApp** → SOS obstétrico + lembretes ANC
- **Google Cloud TTS** → lembrete ANC por voz
- Tracking: LMP, EDD, gravida/para, tipo sanguíneo, risco, ANC visits, BP, peso
- 8 gestantes de seed (5 províncias, 3 risk levels)
