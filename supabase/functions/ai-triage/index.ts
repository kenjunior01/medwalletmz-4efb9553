import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { symptoms, age, duration } = await req.json();
    if (!symptoms || typeof symptoms !== 'string') {
      return new Response(JSON.stringify({ error: 'symptoms obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const system = `És um assistente de triagem médica em Moçambique. Responde sempre em português de Moçambique.
Avalia sintomas e devolve JSON com: severity ("baixa"|"moderada"|"alta"|"emergência"), recommendation (texto curto e claro), suggested_specialty (ex: "Clínica Geral", "Pediatria", "Cardiologia").
NUNCA dês diagnóstico definitivo. Em caso de "emergência" recomenda ligar 84 144 (INAS) ou ir ao hospital mais próximo.`;
    const user = `Sintomas: ${symptoms}\nIdade: ${age ?? 'n/d'}\nDuração: ${duration ?? 'n/d'}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        tools: [{
          type: 'function',
          function: {
            name: 'triage_result',
            description: 'Resultado de triagem',
            parameters: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['baixa', 'moderada', 'alta', 'emergência'] },
                recommendation: { type: 'string' },
                suggested_specialty: { type: 'string' },
                red_flags: { type: 'array', items: { type: 'string' } },
              },
              required: ['severity', 'recommendation', 'suggested_specialty'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'triage_result' } },
      }),
    });
    if (aiRes.status === 429) return new Response(JSON.stringify({ error: 'Limite atingido, tenta mais tarde.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: 'Sem créditos de IA. Contacte suporte.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error('AI error', aiRes.status, t);
      return new Response(JSON.stringify({ error: 'Erro do serviço IA' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const data = await aiRes.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    if (!parsed) throw new Error('Resposta IA inválida');
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('triage err', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});