# MedWallet Global · Ecossistema Digital de Saúde

> **Saúde, Farmácia e Veterinária numa só carteira** — Uma plataforma multi-região (Moçambique, Brasil, Índia, etc.) com triagem IA, pagamentos localizados e segurança backend-first.

Plataforma mobile-first construída com **React 18 + Vite 5 + Supabase**, focada em acessibilidade, confiança e conformidade regional.

---

## Visão Geral

A MedWallet evoluiu de uma solução local para um ecossistema global estruturado em quatro pilares:

1. **Acesso Total** — Teleconsultas (vídeo/chat), Triagem com IA, Farmácia 24h, Laboratórios e **Saúde Veterinária**.
2. **Confiança & Verificação** — Profissionais verificados, avaliações reais e partilha segura de registos médicos (FHIR/HL7).
3. **Identidade Regional** — Branding dinâmico e interface adaptada automaticamente ao país (Cores, Moeda, Métodos de Pagamento).
4. **Segurança "Backend-First"** — Lógica de carteira e permissões processada no servidor (PostgreSQL RLS + Stored Procedures) para prevenir fraudes.

---

## Estrutura Multi-Região e Segurança

### 1. Gestão Regional Isolada ✅
- **Regional Manager Dashboard:** Painel exclusivo para gestores locais. Filtra métricas, usuários e estabelecimentos apenas da sua jurisdição.
- **Isolamento de Dados:** As políticas de **Row Level Security (RLS)** garantem que um gestor de Moçambique nunca aceda a dados do Brasil.

### 2. Branding & Identidade Dinâmica ✅
- O sistema detecta a localização (ou escolha) do utilizador e altera instantaneamente:
    - **Cores:** Verde/Vermelho para MZ, Verde/Amarelo para BR.
    - **Moeda:** MZN, BRL, INR, ZAR, EUR, etc.
    - **Pagamentos:** M-Pesa/e-Mola (MZ), PIX (BR), UPI (IN), MB Way (PT).

### 3. Saúde Veterinária (MedWallet Pet & Agro) ✅
- Expansão para clínicas veterinárias e médicos de animais de grande porte (essencial para zonas rurais).
- Rota dedicada: `/health/veterinary`.

### 4. Segurança Anti-Hacker (Server-Side) ✅
- **Wallet Protection:** O saldo não pode ser alterado via frontend. Toda a transação é validada por funções PL/pgSQL com `FOR UPDATE` para evitar Race Conditions.
- **Audit Logs:** Cada movimentação financeira e aprovação de parceiro gera um rastro imutável no banco de dados.

---

## Funcionalidades Premium

### Social Auth & Login Rápido
- **Google Login:** Integração completa para registo e autenticação num clique.
- **VUI (Voice User Interface):** Triagem e navegação por voz para acessibilidade.

### Inteligência Artificial & OCR
- **Cloud Vision API:** Digitalização automática de receitas físicas.
- **Document AI:** Validação automática de identidades e cédulas profissionais.
- **AI Triage:** Algoritmo de gravidade baseado em sintomas com encaminhamento para especialidades.

### Logística e Proximidade
- **Google Routes v2:** Cálculo de rotas reais e polylines para entregas de medicamentos.
- **Offline-First:** Funcionalidades críticas (como histórico médico) funcionam sem conexão.

---

## Schema & Tabelas (Resumo)

| Tabela | Finalidade |
|---|---|
| `countries` | Configurações globais, branding e gateways por região. |
| `wallets` | Saldos protegidos com RLS por `country_id`. |
| `medical_records` | Registos encriptados com partilha controlada via `medical_record_shares`. |
| `place_proposals` | Sistema de curadoria para novos estabelecimentos (Farmácia/Vet/Clinic). |

---

## Como Correr

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente (.env)
- `VITE_SUPABASE_URL`: Endpoint do projeto.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Chave anónima.
- `VITE_GOOGLE_CLIENT_ID`: Para autenticação social.

---

## Roadmap
- Expansão para Micro-seguros de saúde integrados com M-Pesa.
- Telemetria de saúde preventiva via Wearables.
- Dashboard para Micro-influenciadores de saúde.

---

## Licença
Proprietário · © MedWallet Global Group.
