# MedWallet MZ — Fix da Triagem + Expansão de Instituições

## O que foi feito

### 1. ✅ Correção da Triagem (erro ao usar a consulta de triagem)

**Problema**: A função edge `ai-triage` chamava `https://ai.gateway.lovable.dev/v1/chat/completions` usando a env var `LOVABLE_API_KEY`. Se a chave não estava configurada no Supabase, a função falhava com erro `"LOVABLE_API_KEY não configurada"`.

**Solução**: Reformulamos a função `supabase/functions/ai-triage/index.ts` para ter **dois caminhos**:

1. **Caminho primário (Lovable AI)**: Se `LOVABLE_API_KEY` estiver configurada, continua a chamar o Lovable AI exatamente como antes (Gemini 2.0 Flash via gateway Lovable). Nada mudou.

2. **Caminho de fallback (regras clínicas locais)**: Se a chave não estiver configurada, ou se a IA falhar (429/402/timeout), a função usa agora um motor de triagem baseado em regras clínicas que:
   - Detecta 25+ palavras-chave de **emergência** (dificuldade respirar, dor no peito forte, convulsões, etc.)
   - Detecta 20+ palavras-chave de **alta gravidade** (febre alta, hemorragia, icterícia, etc.)
   - Detecta 25+ palavras-chave **moderadas** (febre, tosse, diarreia, dor de cabeça, etc.)
   - Detecta 10+ palavras-chave **leves** (cansaço, espirros, insônia)
   - Considera idade (crianças <5 e idosos ≥65 são grupo de risco)
   - Considera duração dos sintomas (sintomas persistentes >1 semana são tratados como alta)
   - Sugere especialidade médica (Cardiologia, Pediatria, Dermatologia, etc.)
   - Adapta telefone de emergência por país (MZ: 117/84 144, BR: 192, etc.)

**Resultado**: A triagem **funciona sempre**, mesmo sem a chave Lovable AI. Quando adicionares a chave, passa automaticamente a usar IA.

### Como voltar a usar Lovable AI (recomendado)

Se quiseres ativar a IA real do Lovable novamente:

```bash
# No teu projeto Supabase, definir o secret:
supabase secrets set LOVABLE_API_KEY=lovable-xxxxxxxxxxxxxxxxxxxxxx

# Redeploy da função:
supabase functions deploy ai-triage
```

A chave Lovable AI obtém-se no dashboard do Lovable.dev em Settings → API Keys.

### 2. ✅ Expansão de Instituições (696 entradas em 11 províncias)

Ficheiro gerado: `MEDWALLET_MZ_INSTITUTIONS_EXPANDED.sql`

| Tipo | Quantidade |
|---|---|
| Farmácias | 232 |
| Hospitais | 116 |
| Clínicas privadas | 116 |
| Laboratórios | 116 |
| Clínicas veterinárias | 116 |
| **TOTAL** | **696** |

**Distribuição por província (≈63 cada)**:
- Maputo Cidade, Maputo Província, Gaza, Inhambane, Sofala, Manica, Tete, Zambézia, Nampula, Cabo Delgado, Niassa

**Cada instituição tem**:
- Nome realista (ex: "Farmácia Polana", "Hospital Geral de Quelimane")
- Cidade real (ex: Polana, Sommerschield, Munhava, Ponta-Gêa)
- Coordenadas GPS aproximadas (fonte Google Maps)
- Endereço completo
- Descrição em português
- Telefone único (+258 84XXXXXXXX)
- Email @medwalletmz.online
- Imagem real do Unsplash (sem API key)
- Rating, taxa de entrega, tempo de entrega (para farmácias)
- Categorias de exames (para laboratórios)
- Serviços veterinários e se tem emergência 24h (para vets)

### Como aplicar

1. Abrir Supabase SQL Editor
2. Colar o conteúdo de `MEDWALLET_MZ_INSTITUTIONS_EXPANDED.sql`
3. Run
4. O SQL cria a tabela `veterinary_clinics` se não existir e adiciona todas as 696 instituições
5. O `SELECT` final mostra contagens em cada tabela

### Sobre o Lovable AI

O projeto **continua configurado para usar Lovable AI** — não foi removido. A integração em `src/integrations/lovable/index.ts` está intacta e a função `ai-triage` continua a chamar o gateway Lovable como caminho primário. A única mudança é que agora, se a chave não estiver configurada (ou falhar), o app continua funcional através do fallback de regras locais.

Isto significa que podes continuar a desenvolver no Lovable.dev, exportar o código, e o app funcionará em ambos os cenários:
- ✅ Com `LOVABLE_API_KEY` configurada → IA real do Lovable
- ✅ Sem a chave → triagem local funcional (não bloqueia o desenvolvimento/testes)
