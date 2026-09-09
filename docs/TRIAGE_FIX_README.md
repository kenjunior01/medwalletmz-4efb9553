# Correcção da Triagem IA

**Problema**: A função edge `ai-triage` falhava por completo quando a chave do gateway de IA não estava configurada no Supabase, deixando o utilizador sem triagem.

## Solução (em produção)

1. **Caminho primário (IA real)**: se a chave do gateway estiver configurada como secret da edge function, a função chama o modelo Gemini 2.0 Flash exactamente como antes. Nada mudou no caminho feliz.
2. **Fallback local seguro**: se a chave não estiver configurada (ou falhar), a app mantém-se funcional através do fallback de regras locais (`src/lib/triageFallback.ts`), que analisa os sintomas no dispositivo e devolve orientação + nível de urgência, sem nunca diagnosticar.

## Camadas do fallback (src/lib/triageFallback.ts)

- **Camada 1**: base de regras local (sintomas → especialidade, urgência, red flags)
- **Camada 2**: modelo local fallback (mesma lógica, respostas pré-escritas)
- **Camada 3**: OpenRouter (gateway multi-modelo) quando existe chave configurada

## Verificação

- Com IA configurada → triagem com IA real (mensagens naturais, acções sugeridas)
- Sem IA → triagem local instantânea, com aviso claro de que é orientação geral
- O app nunca fica bloqueado: timeout agressivo na camada cloud e degradação silenciosa
