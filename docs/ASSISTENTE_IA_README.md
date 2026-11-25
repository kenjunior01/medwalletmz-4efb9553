# Assistente IA — MedWallet MZ (NVIDIA NIM)

Documentação completa da integração de IA do MedWallet MZ.

## 1. Visão geral

```
Frontend (/assistente-ia)          Supabase Edge Function              NVIDIA NIM
┌─────────────────────────┐  POST  ┌──────────────────────┐   HTTPS   ┌──────────────────────┐
│ src/pages/AiAssistant   │ ─────► │ supabase/functions/  │ ────────► │ integrate.api.nvidia │
│ · regras urgência (L1)  │  SSE   │ ai-assistant         │  streaming│ .com/v1              │
│ · stream reasoning+resp │ ◄───── │ · regras urgência(L2)│ ◄──────── │ · chat (nemotron)    │
│ · diagnóst. sem login   │        │ · quota · RAG · logs │           │ · embed (4096)       │
└─────────────────────────┘        └──────────────────────┘           │ · vision (omni)      │
                                                                      └──────────────────────┘
```

- **Rota:** `/assistente-ia` (registo em `src/App.tsx`, lazy import)
- **Função:** `supabase/functions/ai-assistant/index.ts` (4 ações)
- **SQL:** `database/AI_ASSISTANT_SETUP.sql` (tabelas, RPCs, RLS, bucket)

## 2. Ações da API (Edge Function)

Todas via `POST {SUPABASE_URL}/functions/v1/ai-assistant`, header `Authorization: Bearer <token>`.

| Ação | Login? | Corpo | Resposta |
|---|---|---|---|
| `ping` | Não (v2) | `{ "action": "ping" }` | `{ ok, modelo, resposta }` — testa a chave NVIDIA |
| `chat` | Sim | `{ "action": "chat", "message": "...", "sessionId": null, "context": ["..."], "reasoningBudget": 2048 }` | SSE: `meta` → `reasoning`* → `content`* → `done` (ou `emergency`) |
| `embed` | Sim | `{ "action": "embed", "texts": ["..."], "inputType": "query\|passage" }` | `{ dimensions }` — esperado **4096** |
| `vision` | Sim | `{ "action": "vision", "imageUrl": "data:image/jpeg;base64,...", "prompt": "..." }` | `{ result }` — apoio informativo, nunca diagnóstico |

Exemplo rápido (diagnóstico):

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ai-assistant" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"ping"}'
```

## 3. Segurança clínica (o mais importante)

1. **Triagem, nunca diagnóstico** — o system prompt proíbe diagnósticos definitivos;
   hipóteses apenas educativas + orientação para o centro de saúde.
2. **Urgência fora da IA (decisão determinística)** — 19 categorias de sinais
   (respirar, dor no peito, AVC, hemorragia, convulsões, parto, suicídio, envenenamento…):
   - **Camada 1 (cliente):** `REGRAS_URGENCIA_CLIENTE` em `AiAssistant.tsx` interrompe ANTES de chamar a IA;
   - **Camada 2 (servidor):** `EMERGENCY_RULES` na Edge Function é a fonte de verdade;
   - Detetado → resposta fixa `URGENCY_TEXT` (119 + centro de saúde), sem passar pelo modelo.
3. **Disclaimer fixo** no topo e rodapé da página.
4. **Quota:** 60 mensagens/dia/utilizador (`ai_chat_usage_today` + `DAILY_LIMIT`).
5. **Vision** sempre com prompt de apoio informativo + verificação de urgência no pedido.

## 4. RAG — contexto aprovado

O chat injeta no system prompt:
1. `body.context` — chunks aprovados enviados pela app;
2. Se vazio → embedding da pergunta (`nemotron-3.5-embed-8b`, `input_type: query`)
   → RPC `match_ai_meds` (cosine, threshold 0.25, top 4) → medicamentos aprovados da tabela `ai_med_embeddings`.

Povoar a base de embeddings: usar a função `embed-catalog` (input_type `passage`)
ou inserir via service_role. Sem RAG disponível o chat segue com degradação elegante.

## 5. Base de dados

| Objecto | Papel |
|---|---|
| `ai_chat_sessions` | sessões do utilizador (título = 1ª pergunta) |
| `ai_chat_messages` | histórico (histórico recente = últimas 10 p/ o modelo) |
| `ai_med_embeddings` | catálogo aprovado + `vector(4096)` |
| `ai_vision_logs` | registo best-effort das análises de imagem |
| RPC `match_ai_meds(vector(4096), int, double precision)` | busca semântica |
| RPC `ai_chat_usage_today()` | quota diária |
| Bucket `med-images` | privado, pasta por `user_id` |

RLS: tudo isolado por `auth.uid()`. Escrita em `ai_med_embeddings` só via service_role.

## 6. Deploy e configuração

1. **SQL:** rodar `database/AI_ASSISTANT_SETUP.sql` no SQL Editor (idempotente).
2. **Edge Function:** o push em `main` sincroniza via Lovable; manual:
   `supabase functions deploy ai-assistant`.
3. **Secret NVIDIA (recomendado):**
   ```bash
   supabase secrets set NVIDIA_API_KEY=nvapi-...
   ```
   Depois de o secret existir, **apagar** a constante `FALLBACK_NVIDIA_KEY` da
   Edge Function. ⚠️ A chave atual ficou exposta numa conversa — **roda-a** em
   [build.nvidia.com](https://build.nvidia.com) assim que possível.
4. **Testar:** na app → `/assistente-ia` → «Diagnóstico da API» deve responder OK;
   «Validar embeddings (4096)» deve confirmar 4096.

## 7. Testes rápidos

| Escrever no chat | Resultado esperado |
|---|---|
| `não consigo respirar` | banner vermelho URGENTE (camada 1, sem chamar a IA) |
| `para que serve o paracetamol?` | resposta com reasoning + conteúdo, streaming |
| `quero morrer` | emergência + botão 119 |
| Sem login + pergunta normal | caixa amarela com link «Entrar na app» |
| 61.ª mensagem do dia | erro de limite diário (429) |

## 8. Roadmap

- [ ] Povoar `ai_med_embeddings` com guias MISAU aprovados
- [ ] Vision com revisão por profissional antes de qualquer uso clínico
- [ ] Conformidade: consentimento explícito, encriptação at-rest, regulação MZ
- [ ] Métricas de uso no painel admin (satisfação, sinais urgentes detetados)
