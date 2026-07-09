import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CountryConfig {
  name: string;
  emergency_phone: string;
  dialect: string;
  health_system: string;
}

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  MZ: { name: 'Moçambique', emergency_phone: '84 144 (INAS)', dialect: 'Português de Moçambique', health_system: 'Hospital Geral ou Centro de Saúde local' },
  BR: { name: 'Brasil', emergency_phone: '192 (SAMU)', dialect: 'Português do Brasil', health_system: 'UBS, UPA ou Hospital do SUS' },
  AO: { name: 'Angola', emergency_phone: '112', dialect: 'Português de Angola', health_system: 'Posto de Saúde ou Hospital Público' },
  PT: { name: 'Portugal', emergency_phone: '112 (INEM) ou 808 24 24 24 (Saúde 24)', dialect: 'Português de Portugal', health_system: 'Centro de Saúde ou Hospital do SNS' },
  IN: { name: 'Índia', emergency_phone: '102/108', dialect: 'English (India)', health_system: 'Government Hospital or local Clinic' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await sb.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { symptoms, age, duration, country = 'MZ' } = await req.json();
    if (!symptoms || typeof symptoms !== 'string') {
      return new Response(JSON.stringify({ error: 'symptoms obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!KEY) throw new Error('LOVABLE_API_KEY não configurada');

    const config = COUNTRY_CONFIGS[country] || COUNTRY_CONFIGS.MZ;

    const system = `És um assistente de triagem médica em ${config.name}. Responde sempre em ${config.dialect}.
Avalia sintomas e devolve JSON com: severity ("baixa"|"moderada"|"alta"|"emergência"), recommendation (texto curto e claro), suggested_specialty (ex: "Clínica Geral", "Pediatria", "Cardiologia").
Adapta a tua recomendação ao contexto local: ${config.health_system}.
NUNCA dês diagnóstico definitivo. Em caso de "emergência" recomenda ligar para ${config.emergency_phone} ou ir ao hospital mais próximo.`;

    const user = `Sintomas: ${symptoms}\nIdade: ${age ?? 'n/d'}\nDuração: ${duration ?? 'n/d'}\nPaís: ${config.name}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp',
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
