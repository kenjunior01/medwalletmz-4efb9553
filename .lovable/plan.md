## Contexto

Pediste um pacote grande de melhorias: correções de bugs (rejeição em massa, páginas 404), gamificação Pulse, modelo de comissões/take-rate, bónus de boas-vindas 1000 MT, filtro por cidade a funcionar, laboratórios com auto-registo, navegação inovadora (floating glass bar, FAB, command palette) e social proof. Vamos dividir em fases para entregar valor rápido sem quebrar o que já funciona.

## Fase 1 — Correções críticas (bloqueios actuais)

1. **Rejeição em massa de propostas** — investigar `reject_proposal` e adicionar RPC `reject_proposals_bulk(ids[], notes)` que itera com `SECURITY DEFINER`. Ligar ao botão do AdminCuration.
2. **Filtro por cidade no Header** — mover `selectedCity` para o `LocationContext` já existente e propagar para `Pharmacy`, `Doctors`, `Facilities`, `Exams` (query `.eq('city', city)`).
3. **Rotas 404 (Farmácias/Entregadores/outras)** — auditar `App.tsx` e ligar as rotas em falta ou redirecionar para páginas existentes; melhorar `NotFound` com sugestões contextuais.

## Fase 2 — Modelo económico e onboarding

4. **Bónus de boas-vindas 1000 MT** — actualizar `handle_new_user()` para creditar 1000 MZN via `wallet_credit` com `reference_type='welcome_bonus'`. Adicionar setting `welcome_bonus_mzn` (default 1000) para ser configurável no admin.
5. **Take-rate visível** — garantir `service_commissions` tem entradas para `consultation` (15%), `pharmacy_order` (7%), `delivery` (fixa). Já existe `pay_service` que aplica; só precisa das entradas seed + UI no admin.
6. **Pulse gamificação** — atribuir Pulse ao completar perfil (>80% campos) e ao sugerir prestador aprovado (já parcialmente feito). Adicionar hook `usePulseAwards` que dispara ao guardar perfil.

## Fase 3 — Laboratórios self-service

7. **Auto-registo de laboratórios** — página `/lab/register` (baseada em `ClinicRegister`) que cria clinic com `type='laboratory'` e `is_verified=false`. Fluxo de aprovação já existe em `/admin/labs`.
8. **Dashboard do laboratório** — `/lab/dashboard` para ver pedidos, fazer upload de resultado PDF (já existe `lab_order_set_result`).

## Fase 4 — Navegação inovadora (mobile-first)

9. **Floating Glass BottomNav** — refactor `BottomNav.tsx`: `fixed bottom-4 left-4 right-4 rounded-3xl glass shadow-2xl`, com FAB central maior que abre um radial menu (Triagem, Consulta, Farmácia, Emergência) usando `framer-motion`.
10. **Command Palette (Cmd+K)** — usar `cmdk` (já instalado via shadcn Command) e montar em `AppLayout`; atalhos globais para navegação.
11. **Contextual Header** — o header já mostra cidade; adicionar saldo em `/wallet` e filtros rápidos em `/health/doctors` via slot dinâmico.

## Fase 5 — Design & Social Proof

12. **Home**: mapa interactivo com marcadores pulsantes de farmácias 24h (Mapbox + `react-leaflet` custom pulse CSS).
13. **Social proof**: nova secção com depoimentos moçambicanos (dados seed em `platform_settings` para ser editável).
14. **Avatares adaptativos**: usar `usePulseIdentity` para colorir o avatar do utilizador conforme o role dominante.

## Detalhes técnicos

- **DB**: migrações apenas para `reject_proposals_bulk`, `welcome_bonus_mzn` setting, seed de `service_commissions`, testimonials JSON em `platform_settings`.
- **Sem quebras**: mantém tokens Ocean Trust, `PanelShell`, `BentoGrid`, `NumberFlow`.
- **Ordem sugerida**: Fases 1 → 2 → 4 (navegação) → 3 → 5. Cada fase é entregável isolado.

## Pergunta

Faço tudo de uma vez (grande PR, ~20-30 ficheiros) ou entrego **Fase 1 primeiro** para desbloquear a rejeição em massa e o filtro por cidade, e depois avanço fase a fase? Recomendo faseado — tu vês progresso e podemos ajustar prioridades no meio.
