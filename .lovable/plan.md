## Plano de execução — Relatório MoçambiApp

Vou implementar em **4 fases sequenciais**, com check de qualidade entre cada uma. Estilo: subtil e premium (sem peso de dados). Foco contexto-MZ.

---

### Fase 1 — Estabilizar navegação (crítico, rápido)
**Objetivo:** zero 404 + confiança imediata.

- Auditar todas as rotas em `App.tsx` vs links em `Home.tsx`, `BottomNav`, `Header`.
- Rotas com página existente mas link partido → corrigir path.
- Funcionalidades sem página pronta (ex.: Exames) → criar **stub "Em Breve"** elegante (`ComingSoon.tsx`) com CTA de notificação, em vez de remover.
- Confirmar: Triagem IA (`/health/triage`), Planos (`/health/plans`), Receitas, Pedidos, Carteira, Convites todos acessíveis.

### Fase 2 — Design refinado (subtil e premium)
**Objetivo:** elevar percepção sem mudar identidade Ocean Trust.

- **Cards:** micro-interações (hover-lift, gradiente sutil no border, ícone com leve scale, shimmer no skeleton). Sem vídeos nem carrosséis pesados.
- **Desktop (≥1024px):** Home Bento passa a usar largura real (max-w-7xl), grid de 12 colunas, coluna lateral com widget de carteira + atividade + convites sticky. Mobile permanece intocado.
- **Profile/Wallet/Admin:** aplicar `bento-card`, espaçamento consistente, tipografia Outfit já definida.
- **Tema:** botão toggle claro/escuro no Header (dark já existe em CSS).

### Fase 3 — Contexto Moçambique
**Objetivo:** leve, local, offline-tolerante.

- **Imagens:** substituir Unsplash por `<img loading="lazy" decoding="async">` + `srcset` quando possível; placeholders blur. Configurar `vite-imagetools` para conversão WebP nos assets bundled.
- **Modo baixo consumo:** toggle em Profile que: desativa imagens decorativas, usa `prefers-reduced-data`, persiste em localStorage, expõe via Context.
- **Bairros Maputo:** adicionar lista (Polana, Sommerschield, Alto-Maé, Coop, Malhangalene, Costa do Sol, Maxaquene, Mafalala, Chamanculo, Magoanine, Zimpeto, Matola-A/B/C, Machava, Infulene) ao formulário de Address e ao filtro de busca. Tipo `MaputoNeighborhood`.
- **Offline-first:** revisar `vite.config.ts` Workbox — `NetworkFirst` para HTML; `CacheFirst` p/ assets hashed; cache runtime para `GET /rest/v1/doctor_profiles`, `prescriptions`, `orders` (StaleWhileRevalidate, 24h). Banner "Está offline — a mostrar dados em cache".
- **Linguagem PT-MZ:** rever microcopy ("Manda mensagem", "Já tens", "Bué", saudações com hora do dia).

### Fase 4 — Pagamentos + tracking visual
**Objetivo:** tornar fluxo M-Pesa/e-Mola confiável e o tracking vivo.

- **Checkout:** stepper visual (Método → Confirmar telefone → STK Push → Estado). Componentes `PaymentMethodCard` para M-Pesa, e-Mola, Mkesh, Carteira. Texto de ajuda contextual + número de suporte.
- **Order tracking:** timeline animada (placed → confirmed → preparing → on_the_way → delivered) com pulse no estado atual, ETA, botão WhatsApp p/ motorista. Leaflet já existente integrado com refresh realtime.
- **Push notifications** nos eventos-chave de pedido (já há subscription table).

---

### Detalhes técnicos
- Novos componentes: `ComingSoon.tsx`, `ThemeToggle.tsx`, `LowDataToggle.tsx`, `NeighborhoodSelect.tsx`, `OfflineBanner.tsx`, `PaymentStepper.tsx`, `OrderTimeline.tsx`.
- Novo context: `DataSaverContext`.
- Hook: `useOnlineStatus`.
- Migração SQL: adicionar coluna `neighborhood text` em `addresses` (+ index).
- Sem mudanças destrutivas em tabelas existentes.

### Ordem & validação
1. Fase 1 (sem build pesado) → smoke test rotas.
2. Fase 2 → screenshot desktop+mobile.
3. Fase 3 → testar offline no preview publicado.
4. Fase 4 → fluxo end-to-end de pedido.

Aprovas? Posso começar pela **Fase 1** imediatamente após o "sim".