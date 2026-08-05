import { requireUser, authCorsHeaders as corsHeaders } from '../_shared/auth.ts';

const PROMPTS: Record<string, string> = {
  prescription: `Analisa esta imagem de receita médica e responde APENAS com JSON:
{"medications":[{"name":"","dosage":"","frequency":"","duration":"","notes":""}],"doctor_name":"","facility":"","date":"YYYY-MM-DD","next_appointment":"YYYY-MM-DD","confidence":0.0}
Se um campo não for legível usa null. Não inventes dados.`,
  lab_result: `Analisa esta imagem de resultado laboratorial e responde APENAS com JSON:
{"test_name":"","results":[{"parameter":"","value":"","unit":"","reference_range":"","status":"normal|high|low|critical"}],"date":"YYYY-MM-DD","lab_name":"","confidence":0.0}
Se um campo não for legível usa null. Não inventes dados.`,
  medicine_label: `Analisa esta imagem de rótulo de medicamento e responde APENAS com JSON:
{"name":"","active_ingredient":"","dosage":"","manufacturer":"","expiry_date":"YYYY-MM-DD","batch_number":"","instructions":"","confidence":0.0}
Se um campo não for legível usa null. Não inventes dados.`,
  doctor_note: `Analisa esta nota médica e responde APENAS com JSON:
{"doctor_name":"","facility":"","date":"YYYY-MM-DD","summary":"","medications":[{"name":"","dosage":"","frequency":""}],"next_appointment":"YYYY-MM-DD","confidence":0.0}
Se um campo não for legível usa null. Não inventes dados.`,
  vaccine_card: `Analisa este cartão de vacinas e responde APENAS com JSON:
{"patient_name":"","facility":"","results":[{"parameter":"nome da vacina","value":"dose","unit":"","reference_range":"","status":"normal"}],"date":"YYYY-MM-DD","next_appointment":"YYYY-MM-DD","confidence":0.0}
Se um campo não for legível usa null. Não inventes dados.`,
  other: `Descreve o documento de saúde nesta imagem e responde APENAS com JSON:
{"summary":"","text":"todo o texto legível","date":"YYYY-MM-DD","confidence":0.0}`,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return json({ error: 'AI não configurada' }, 500);

  let payload: { image?: string; mimeType?: string; scanType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const image = payload.image;
  if (typeof image !== 'string' || image.length < 100) return json({ error: 'Imagem em falta' }, 400);
  if (image.length > 15_000_000) return json({ error: 'Imagem demasiado grande' }, 413);

  const prompt = PROMPTS[payload.scanType ?? 'other'] ?? PROMPTS.other;
  const mime = (payload.mimeType || 'image/jpeg').split(';')[0];
  const dataUrl = image.startsWith('data:') ? image : `data:${mime};base64,${image}`;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Lovable-API-Key': LOVABLE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error('vision-scan gateway error', res.status, details);
      if (res.status === 429) return json({ error: 'Muitos pedidos. Tenta novamente em instantes.' }, 429);
      if (res.status === 402) return json({ error: 'Créditos de IA esgotados.' }, 402);
      return json({ error: 'Erro no serviço de IA', details }, res.status);
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: 'Resposta da IA sem JSON' }, 502);
    return json(JSON.parse(match[0]));
  } catch (e) {
    console.error('vision-scan error', e);
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});