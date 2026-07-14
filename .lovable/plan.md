## Escopo

Vais receber 5 correções concretas, agrupadas para não repetir trabalho. Confirma antes de eu começar.

### 1. Curadoria e importação Brasil (verificar/aprovar)
- Adicionar `veterinary` e `laboratory` ao filtro de tipos em `AdminCuration.tsx` (hoje `TypeFilter` só tem pharmacy/clinic/hospital/lab e o filtro `lab` mapeia erradamente para `entity_type = 'clinic'`, escondendo laboratórios e veterinárias).
- Corrigir a query: `lab` → `entity_type IN ('lab','laboratory')`, adicionar chip `veterinary` → `entity_type = 'veterinary'`.
- Confirmar que `import-places` grava `country_id` (já grava) e que a página respeita o país selecionado (já respeita). Adicionar aviso visível quando 0 propostas pendentes para o país atual apontando para o seletor de país.

### 2. Painel dos gestores (acesso e restrições)
- Em `AdminUsers.tsx`: para cada perfil com role `country_manager`, mostrar botão "Entrar no painel" que leva a `/admin/country/:countryId` do gestor.
- Guard em `CountryDashboard` / `CountrySettings` / `CountryBranding`: se o utilizador NÃO é `admin` global, só pode aceder ao país onde consta em `country_management`. Caso contrário, redirect para `/admin/country/<seu país>` ou `/`.
- Esconder do menu do gestor os itens globais (Financial, GlobalMetrics, GlobalCommandCenter, AdminPlatformSettings, AdminUsers global, etc.) — só `admin` puro vê.

### 3. Moeda nas transações e widgets
- Substituir strings fixas `MZN` / `MT` em telas de transações, wallet e relatórios por `formatCurrency(amount, wallet.currency)` ou `country.currency_code`.
- Ficheiros alvo: `Wallet.tsx`, `AdminTransactions.tsx`, `AdminWithdrawals.tsx`, `Orders.tsx`, `OrderTracking.tsx`, `FinancialDashboard.tsx`, `EarningsWidget.tsx`, `store/StoreReports.tsx`, `store/StoreOrders.tsx`, `MySubscriptions.tsx`, `Checkout.tsx`, `Cart.tsx`, `Pharmacy.tsx`, `SubscribePlans.tsx`, `Subscribe.tsx`, `PaymentSettings.tsx`.
- Regra: nunca hard-coded "MZN"/"MT" na UI — sempre via `useWallet()` ou `useCountry()`.

### 4. Auditoria automática Brasil (Moçambique/M-Pesa/Urgência)
- Adicionar um helper `useCountryLabels()` que expõe `{emergencyNumber, paymentMethods, countryName, capital}` a partir da tabela `countries`.
- Substituir literais "Maputo", "Moçambique", "M-Pesa", "e-Mola", "192"/"117" hardcoded por esse hook nos ficheiros listados no ponto 3 e em: `Auth.tsx`, `Legal.tsx`, `Help.tsx`, `Home.tsx`, `Partners.tsx`, `ComingSoon.tsx`, `Addresses.tsx`, `ReferralBanner.tsx`, `SmartEngagementPopUp.tsx`, `MeddyMessages.ts`, `regional-neighborhoods.ts`.
- Nota: `i18n/pt.json` mantém strings PT-MZ como fallback do locale pt; o BR já usa `pt-BR.json`. Não vou reescrever traduções, só remover hardcodes em código.

### 5. Onboarding de tipo de utilizador só na 1ª vez
- Hoje `RegistrationWizard` (ou a Home) pergunta o tipo em cada login. Vou:
  - Marcar `profiles.onboarding_completed = true` após a primeira resposta.
  - Rota `/onboarding` só é forçada quando `onboarding_completed !== true`.
  - Remover qualquer prompt de "que tipo de utilizador és" das telas principais para utilizadores já onboarded.

## Ordem de execução
1. Migration: coluna `profiles.onboarding_completed` + backfill (utilizadores existentes = true).
2. Fix curadoria (filtros veterinary/lab).
3. Guards e link nos gestores.
4. Substituição de MZN/MT hardcoded + hook `useCountryLabels`.
5. Onboarding lógica.
6. `tsgo` para validar.

## Fora de escopo (avisar depois)
- Reescrever traduções `i18n/pt.json`.
- Adicionar novas instituições/seed do Brasil (usar botão Importar).
- Redesign visual Brasil (já tratado em turnos anteriores).

Confirma para começar, ou diz-me se queres priorizar/cortar alguma parte.
