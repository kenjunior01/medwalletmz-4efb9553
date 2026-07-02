## Plano de Execução

### Fase 1 — Conectores adequados à plataforma
Adicionar (via `standard_connectors--connect`) apenas os que fazem sentido clínico/financeiro:
- **Resend** — envio transacional (receitas, lembretes, recibos da carteira).
- **Twilio** — SMS/WhatsApp para OTP, confirmações de consulta e status de entrega (crítico em MZ, onde SMS chega mais que push).
- **Stripe** — pagamentos internacionais como fallback ao M-Pesa/e-Mola (opcional, ativado só se o admin ligar).
- Manter **Google Maps** e **KLIPY** já ligados.

Não adicionar: HeyGen, Amplitude, Miro, Sanity, Shopify — nada disso encaixa numa carteira de saúde MZ.

### Fase 2 — Rebrand adaptativo do "Joy"
Substituir "Joy" por um sistema chamado **Pulse** que muda de identidade por role:
- Paciente → "Pulse Saúde" (progresso de bem-estar, medicação em dia)
- Médico → "Pulse Clínico" (consultas concluídas, avaliações)
- Farmácia → "Pulse Vendas" (pedidos entregues, tempo médio)
- Estafeta → "Pulse Entregas" (KM rodados, on-time rate)
- Admin → "Pulse Plataforma" (KPIs globais)

Implementação: um `usePulseIdentity()` hook que devolve `{ label, icon, unit, color, metric }` a partir do role. Renomear tabelas continua igual (mantém `joy_events`, `joy_coin_transactions` no BD — só muda a camada de UI/labels e um novo `PulseBadge` component). Zero migração destrutiva.

### Fase 3 — Homepage Bento Grid
Reescrita de `src/pages/Index.tsx` (ou `Home.tsx`) com layout Bento responsivo:

```text
┌─────────────────────┬──────────────┐
│  HERO (2col x 2row) │  Wallet MZN  │
│  CTA principal      │  NumberFlow  │
│  Meddy animado      ├──────────────┤
│                     │  Farmácia24h │
├──────────┬──────────┼──────────────┤
│ Próximo  │  Pulse   │  Consulta    │
│ lembrete │  do role │  agendada    │
├──────────┴──────────┴──────────────┤
│  Feed personalizado (role-aware)   │
└────────────────────────────────────┘
```

- Glassmorphism em cards (`backdrop-blur`, borders translúcidas, tokens semânticos existentes).
- Hover subtil (scale 1.01 + glow), sem "cards estranhos".
- `NumberFlow` (já instalado) para o saldo da carteira.
- `framer-motion` (já instalado) para entrada em stagger.
- Skeleton screens em vez de spinners.
- Micro-animação Meddy no hero (usar assets existentes).

### Fase 4 — Melhorias visuais transversais
- Confirmar Dark Mode nos tokens (navy profundo + esmeralda, sem preto puro) — ajustar `index.css` se necessário.
- Success feedback: micro-animação de check nos pagamentos concluídos.
- Skeleton screens em `Wallet`, `Orders`, `Consultations`.
- Checkout de farmácia: barra de progresso visual (Steps component) no topo.

### Fase 5 — Assistente IA (chat bubble)
Reaproveitar o `MeddyFloating` existente: transformar em chat expansível com Lovable AI Gateway (`google/gemini-2.5-flash`, sem key nova). Já tenho `ai_conversations` no BD.

### O que NÃO faço nesta fase
- Rive (biblioteca pesada, uso Lottie/PNG animado já existente).
- Apple Pay nativo (requer conta Apple Developer paga do utilizador).
- Vercel AI SDK (uso Lovable AI direto, mesmo resultado).

### Detalhes técnicos
- Sem migrações destrutivas; apenas UI + 1 hook novo (`usePulseIdentity`).
- Novos componentes: `BentoHome.tsx`, `PulseBadge.tsx`, `WalletBentoCard.tsx`, `PulseIdentity.ts` (config).
- Renomear labels "Joy"→"Pulse" em componentes visíveis; manter nomes de tabelas.
- Conectores: chamo `standard_connectors--connect` um a um após aprovação do plano.

Confirma para eu executar, ou diz-me se queres cortar/reordenar algo (ex: pular Stripe, pular Twilio, começar só pela homepage).