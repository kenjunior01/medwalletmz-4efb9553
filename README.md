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

### 8. Integração Google Maps Máxima · `rec 1.2` ✅
- **Google Routes API (v2):** Cálculo de rotas reais com consciência de tráfego para rastreamento de entregas e cálculo de proximidade de médicos/farmácias.
- **Polylines Reais:** O mapa de rastreamento agora desenha o caminho exato da estrada em vez de uma linha reta, com ajuste automático de zoom.
- **Google Places Autocomplete:** Implementado em `Addresses.tsx`, `Checkout.tsx` e `SuggestPlace.tsx` para garantir endereços precisos e geocodificados.
- **Geocoding reverso:** Auto-detecção de bairro e cidade ao usar "Minha Localização".
- **Botão de Navegação Externa:** Atalho "Abrir no Google Maps" adicionado ao rastreamento para navegação GPS assistida.
- **Mapas Interativos Avançados:** Novo sistema em `SuggestPlace.tsx` permitindo arrastar pins e clicar no mapa para definir coordenadas exatas de novos estabelecimentos.
- **Static Maps:** Previsão visual ultra-rápida de mapas no histórico de pedidos em `Orders.tsx`.
- **Ordenação por Proximidade:** Filtro "Próximo" em farmácias e médicos usa cálculos geográficos em tempo real.

### 9. Ecossistema Completo (Sangue, Seguros & Parcerias) · `rec 5.3` ✅
- **Sangue (MedWallet Sangue):** Sistema completo de doação com mapa de campanhas, pedidos urgentes partilháveis via WhatsApp e incentivos (saldo + Pulse).
- **Seguros Localizados:** Integração de seguradoras locais com destaque para micro-seguros via M-Pesa. Badges informativos sobre cobertura (Consultas/Farmácia/Exames).
- **Classificados (Anúncios):** Marketplace de saúde e serviços com sistema de anúncios destacados (promovidos), contador de visualizações e integração direta WhatsApp.
- **Corporate & Governo:** Página de parcerias expandida com proposta de valor clara para o setor público (MISAU) e benefícios corporativos (redução de absentismo).
- **Gamificação Social:** Incentivos reais por doação de sangue e referências, convertíveis em serviços dentro da app.

### 10. Inovação Google Cloud IA & Saúde · `rec 1.2` ✅
- **Cloud Vision API (OCR):** Digitalização de receitas físicas e relatórios de exames via foto. A API extrai o texto automaticamente, preenchendo o histórico médico digital.
- **Cloud Document AI:** Processamento estruturado de documentos de identidade (BI) e cartões de seguros locais.
- **Cloud Speech-to-Text & Text-to-Speech:** Triagem por voz e leitura assistida de artigos de saúde para utilizadores com baixa literacia ou dificuldades visuais.
- **Google Cloud Healthcare API:** Armazenamento de dados médicos em conformidade com padrões globais (FHIR/HL7).
- **BigQuery API:** Análise agregada de dados de saúde para identificação de tendências epidemiológicas (parceria MISAU).

### 11. Otimização de Logística e Meio Ambiente ✅
- **Route Optimization API:** Sequenciamento inteligente de entregas para farmácias 24h, otimizando tempo e combustível para os estafetas.
- **Address Validation API:** Normalização de moradas em contextos urbanos complexos de Maputo, garantindo que o medicamento chega ao destino correto.
- **Air Quality & Weather API:** Alertas preventivos baseados na qualidade do ar e condições meteorológicas para pacientes com condições crónicas (asma, hipertensão).

### 12. Design Centrado no Utilizador Moçambicano ✅
- **Modo Data Saver:** Redução drástica do consumo de dados móveis (essencial para o mercado local).
- **VUI (Voice User Interface):** Interface adaptada para comandos de voz em todas as áreas críticas (triagem, pesquisa).
- **Notificações Adaptativas por Clima:** Sistema que correlaciona condições crónicas (asma, hipertensão) com dados de clima/ar em tempo real para avisos diários personalizados.
- **Offline-First UI:** Indicadores claros de funcionalidades disponíveis sem conexão à internet.
- **Foco em Emergência:** Reorganização da hierarquia visual para acesso imediato a "Triagem IA" e "Carteira M-Pesa".

### 13. Base de Dados de Saúde Moçambicana (Seeding & Import) ✅
- **Seed Inicial Massivo:** Inserção de +20 hospitais, clínicas e farmácias de referência em Maputo, Matola, Beira e Nampula com coordenadas reais e imagens de alta qualidade.
- **Auto-Importador de Alcance Nacional:** Ferramenta administrativa expandida para localizar estabelecimentos até nas zonas rurais (mais de 150 distritos e vilas mapeados via Google Places/Mapbox).
- **Curation Dashboard:** Painel `/admin/curation` para validar e aprovar submissões da comunidade e importações em massa.
- **Sistema de Avaliação Universal:** Utilizadores agora podem deixar comentários e classificações (estrelas) em qualquer farmácia, clínica ou hospital, promovendo a transparência e qualidade do serviço.
- **Renderização Segura de Imagens:** Componente `SafeImage` implementado em toda a app para garantir que nenhuma lista quebre por links de imagem offline (fallback automático).

### 14. Escalabilidade Global & Conversão Real-Time ✅
- **Google Finance (via SearchAPI):** Conversão de moeda em tempo real integrada em `currencyService.ts`. Permite visualizar preços em moedas globais (USD, EUR, ZAR) baseados em taxas de mercado atualizadas.
- **Motor Fiscal Dinâmico:** Cálculo de impostos (IVA, VAT, ISS) adaptativo por país e tipo de serviço em `taxEngine.ts`.
- **Interoperabilidade FHIR:** Exportação de registos médicos seguindo o padrão internacional HL7 FHIR para aceitação em hospitais globais.
- **Gestão Regional:** Nova role `country_manager` e dashboard administrativo dedicado para supervisão local por país.
- **Gateways Globais:** Integração de Stripe e PayPal como alternativas seguras para mercados internacionais fora de Moçambique.

---

## Schema (Supabase)

As alterações de schema estão na migration `supabase/migrations/20260630120000_strategic_recommendations_v1.sql`:

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
