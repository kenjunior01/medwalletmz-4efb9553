import { requireUser, authCorsHeaders as corsHeaders } from '../_shared/auth.ts';

const PROMPT = `Estás a ouvir um diário de voz pessoal sobre saúde e bem-estar.
Analisa o áudio e responde APENAS com JSON válido (sem markdown) neste formato:
{
  "transcript": "transcrição completa palavra-a-palavra na língua falada",
  "language": "código ISO 639-1 (pt, en, es, fr, sw, etc.)",
  "confidence": 0.0,
  "mood": "happy | calm | sad | anxious | angry | neutral | tired",
  "symptoms": ["sintomas mencionados"],
  "keywords": ["tópicos principais"],
  "summary": "resumo em 1 frase",
  "insight": "insight empático e prático em 2-3 frases, sem conselho médico"
}
Se não ouvires claramente, usa confidence baixo e transcreve o que entenderes.`;

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

  let payload: { audio?: string; mimeType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const audio = payload.audio;
  if (typeof audio !== 'string' || audio.length < 100) {
    return json({ error: 'Áudio em falta ou demasiado curto' }, 400);
  }
  if (audio.length > 20_000_000) return json({ error: 'Áudio demasiado grande' }, 413);

  const raw = (payload.mimeType || 'audio/webm').split(';')[0];
  const format = ({
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
  } as Record<string, string>)[raw] ?? 'webm';

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
              { type: 'text', text: PROMPT },
              { type: 'input_audio', input_audio: { data: audio, format } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error('voice-analyze gateway error', res.status, details);
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
    console.error('voice-analyze error', e);
    return json({ error: e instanceof Error ? e.message : 'Erro desconhecido' }, 500);
  }
});