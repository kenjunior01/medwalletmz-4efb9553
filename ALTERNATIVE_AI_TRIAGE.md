# Alternativas FREE para substituir Lovable AI na Triagem

A função `supabase/functions/ai-triage/index.ts` agora suporta **3 camadas de fallback**:

1. **Google Gemini API** (primária, FREE)
2. **Lovable AI Gateway** (fallback 1, se configurado)
3. **Motor local de regras clínicas** (último recurso, sempre funciona)

---

## 🥇 Opção recomendada: Google Gemini API (FREE)

**Porquê?** É grátis, avançada, multilíngue, e o projeto já usa Google Cloud (Maps, Vision, Translation). A chave funciona para todos os serviços Google.

### Free tier
- **Gemini 2.0 Flash**: 1.500 requisições/dia grátis, 15 RPM
- **Gemini 1.5 Flash**: 1.500 req/dia, 15 RPM
- **Gemini 1.5 Pro**: 50 req/dia, 2 RPM

Para triagem, 1.500/dia é mais que suficiente para um país inteiro.

### Como configurar

1. **Obter chave gratuita** em https://aistudio.google.com/apikey
   - Clica em "Create API Key"
   - Aceita os termos
   - Copia a chave (formato: `AIzaSy...`)

2. **Configurar no Supabase**:
```bash
# No CLI do Supabase (instalado localmente)
supabase secrets set GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Redeploy da função
supabase functions deploy ai-triage
```

Ou pelo dashboard do Supabase:
- Project Settings → Edge Functions → Secrets
- Adicionar: `GEMINI_API_KEY` = `AIzaSy...`
- Deploy da função `ai-triage`

3. **Testar**:
```bash
curl -X POST https://[PROJECT].supabase.co/functions/v1/ai-triage \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"symptoms":"febre e tosse há 2 dias","age":30,"country":"MZ"}'
```

A resposta inclui `_provider: "gemini"` quando Gemini é usado.

---

## 🥈 Opção alternativa: Groq (FREE, ultra-rápido)

Groq oferece Llama 3.1 70B grátis, com latência muito baixa.

### Free tier
- 30 RPM
- 14.400 req/dia
- Modelos: `llama-3.1-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`

### Configurar
1. Criar conta em https://console.groq.com
2. API Keys → Create API Key
3. No Supabase:
```bash
supabase secrets set GROQ_API_KEY=gsk_XXXXXXXXXXXX
supabase functions deploy ai-triage
```

### Código a adicionar à função (opcional)
Se quiseres adicionar Groq como mais uma camada, insere antes do fallback local:

```typescript
async function triageWithGroq(symptoms, age, duration, config) {
  const KEY = Deno.env.get('GROQ_API_KEY');
  if (!KEY) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: `És assistente de triagem médica em ${config.name}. Responde em JSON com: severity, recommendation, suggested_specialty, red_flags.` },
          { role: 'user', content: `Sintomas: ${symptoms}, Idade: ${age}, Duração: ${duration}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    return parsed.severity ? { ...parsed, _provider: 'groq' } : null;
  } catch { return null; }
}
```

---

## 🥉 Opção alternativa: OpenRouter (tem modelos FREE)

OpenRouter agrega vários modelos, alguns grátis:
- `google/gemini-2.0-flash-exp:free`
- `meta-llama/llama-3.1-8b-instruct:free`
- `mistralai/mistral-7b-instruct:free`

### Configurar
1. Criar conta em https://openrouter.ai/keys
2. No Supabase:
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-XXXXXXXXXXXX
```

---

## 🛡️ Camada 3: Motor local (já incluído, sem configuração)

Mesmo sem qualquer chave API configurada, a triagem funciona com regras clínicas:
- 25+ palavras-chave de emergência
- 20+ de alta gravidade
- 25+ moderadas
- 10+ leves
- Considera idade (grupo de risco <5 e ≥65) e duração de sintomas
- Sugere especialidade médica (Cardiologia, Pediatria, etc.)

Quando este motor é usado, a resposta inclui `_provider: "local_rules"`.

---

## Comparação

| Provider | Free req/dia | Qualidade | Latência | Configuração |
|----------|--------------|-----------|----------|--------------|
| **Google Gemini 2.0 Flash** | 1.500 | ⭐⭐⭐⭐⭐ | ~1-3s | 1 chave |
| **Lovable AI Gateway** | Variável | ⭐⭐⭐⭐⭐ | ~2-5s | 1 chave |
| **Groq (Llama 3.1 70B)** | 14.400 | ⭐⭐⭐⭐ | ~0.3-1s | 1 chave |
| **OpenRouter (free models)** | Variável | ⭐⭐⭐⭐ | ~1-3s | 1 chave |
| **Motor local (regras)** | Ilimitado | ⭐⭐⭐ | <50ms | Nenhuma |

---

## Ordem de fallback atual na função `ai-triage`

```
1. GEMINI_API_KEY configurada? → chama Gemini
   ↓ falha/indisponível
2. LOVABLE_API_KEY configurada? → chama Lovable
   ↓ falha/indisponível
3. Motor local de regras (sempre)
```

**Recomendação**: Configura `GEMINI_API_KEY` em https://aistudio.google.com/apikey (é grátis e demora 30 segundos). Isto ativa IA avançada sem dependência do Lovable.

---

## Verificar qual provider está sendo usado

A resposta da função inclui o campo `_provider`:
- `"gemini"` — Google Gemini API
- `"lovable"` — Lovable AI Gateway
- `"local_rules"` — Motor local (IA indisponível)
