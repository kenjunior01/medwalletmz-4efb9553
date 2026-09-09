# Triagem IA — Arquitectura e Alternativas

## Arquitectura actual

1. **Primária**: edge function `ai-triage` (modelo Gemini 2.0 Flash via gateway de inferência; chave configurada como secret do Supabase).
2. **Fallback local**: `src/lib/triageFallback.ts` — corre no dispositivo:
   - Camada 1: base de regras (sintomas → especialidade + urgência + red flags)
   - Camada 2: respostas locais seguras (sem diagnóstico)
   - Camada 3: OpenRouter multi-modelo se existir chave

## Porquê este desenho

- A triagem nunca depende de um único fornecedor: se o gateway estiver indisponível, o utilizador recebe orientação local instantânea.
- Custos controlados: a camada local é gratuita; a IA só é chamada quando disponível.
- Privacidade: nenhuns dados de saúde saem do dispositivo no modo local.
