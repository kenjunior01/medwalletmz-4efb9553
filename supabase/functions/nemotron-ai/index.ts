// ╔════════════════════════════════════════════════════════════════════════╗
// ║  nemotron-ai — gateway único de IA do MedWallet (F49→F52)              ║
// ║  NVIDIA NIM: texto (ultra→lightning) · visão (VL→omni) · áudio (omni)  ║
// ║  embeddings (embed-8b 4096d) · reasoning_budget · rotação de keys      ║
// ║  A key NUNCA chega ao cliente — tudo passa por aqui (RLS no cliente).  ║
// ╚════════════════════════════════════════════════════════════════════════╝

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";
const TIMEOUT_MS = 45_000;

const DEFAULT_MODEL = Deno.env.get("NVIDIA_MODEL") || "nvidia/nemotron-3-ultra-550b-a55b";
const FALLBACK_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
const VL_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b"; // visão (receitas/laboratório/rótulos)
const OMNI_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"; // omni: ÁUDIO (wav/mp3) + visão fallback
const EMBED_MODEL = "nvidia/nemotron-3.5-embed-8b"; // embeddings multimodais (4096 dims) — pesquisa semântica

const NVIDIA_KEYS = [
  Deno.env.get("NVIDIA_API_KEY"),
  Deno.env.get("NVIDIA_API_KEY_2"),
  Deno.env.get("NVIDIA_API_KEY_3"),
].filter((k): k is string => !!k);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RETRYABLE = new Set([401, 403, 429, 500, 502, 503, 504]);

/* ── Rate limit simples por IP (30/min, janela deslizante em memória) ── */
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= 30) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

/* ── Personas por modo (português de Moçambique, segurança clínica) ── */
const MODES: Record<string, string> = {
  chat: `És o Meddy, assistente de saúde do MedWallet MZ. Falas português de Moçambique, tom caloroso e directo.
Regras: nunca dás diagnóstico fechado nem substituis médico; em sinais de alarme (dor no peito, falta de ar súbita, febre alta persistente, convulsões) diz IMEDIATAMENTE para procurar o serviço de emergência (Linha Verde 119 / hospital mais próximo).
Contexto útil: M-Pesa/e-Mola, farmácias mPharma em Maputo/Beira/Nampula, metical (MT). Respostas curtas e práticas.`,
  triage: `És o motor de triagem do MedWallet MZ. Recebes sintomas e devolves avaliação de urgência.
Responde APENAS com JSON: {"urgency": "emergency|urgent|soon|selfcare", "reason": "...", "advice": ["..."], "red_flags": ["..."]}.
emergency = emergência já (119/hospital). urgent = hoje no centro de saúde. soon = consulta nos próximos dias. selfcare = cuidados em casa + quando agravar.`,
  explain_rx: `És o farmacêutico do MedWallet MZ. Explicas um medicamento em linguagem simples (nível de leitura baixo):
para que serve, como tomar, efeitos comuns, avisos graves, e o que NÃO fazer. Nunca dás conselho fora do medicamento dado.`,
  interactions: `És o farmacêutico clínico do MedWallet MZ. Recebes uma lista de medicamentos e devolves interações relevantes.
Responde APENAS com JSON: {"risk": "none|low|moderate|high", "pairs": [{"a":"","b":"","severity":"","note":""}], "note": "..."}.
Só interações clinicamente relevantes; se nada relevante, risk "none". NÃO inventes interações raras.`,
  health_insights: `És o analista de saúde do MedWallet MZ. Recebes dados reais do utilizador (adesão, sintomas, diários).
Encontras 2-3 padrões úteis e devolves APENAS JSON: {"summary": "...", "insights": [{"title":"","body":"","action":""}], "tone": "positive|neutral|attention"}.
Sé concreto, baseado só nos dados dados; sem inventar números.`,
  price_insights: `És o analista de preços de farmácias do MedWallet MZ. Recebes ofertas reais (loja, preço, distância, stock).
Devolves análise curta: onde compensa, diferença de preço e 1 dica prática (entrega/reserva). Máx 90 palavras.`,
  raw: "",
};

interface ChatMsg { role: "system" | "user" | "assistant"; content: unknown }

async function fetchAudioB64(url: string): Promise<string> {
  const resp = await fetch(url, { signal: AbortSignal.timeout(45_000) });
  if (!resp.ok) throw new Error(`audio_fetch_${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) throw new Error("audio_too_large");
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

async function buildMessages(body: {
  mode?: string; systemPrompt?: string; context?: string;
  userMessage?: string; messages?: ChatMsg[];
  history?: Array<{ role: string; content: string }>; language?: string;
  images?: Array<{ mime?: string; b64: string }>;
  audio?: { url?: string; b64?: string; format?: string };
}): Promise<ChatMsg[]> {
  const mode = body.mode && MODES[body.mode] ? body.mode : "raw";
  let sys = MODES[mode] ?? "";
  if (body.systemPrompt) sys = sys ? `${sys}\n\n${body.systemPrompt}` : body.systemPrompt;
  if (body.language && body.language !== "pt" && mode !== "raw") {
    sys += `\n\nResponde em ${body.language}.`;
  }
  if (body.context) sys += `\n\nCONTEXTO ACTUAL DO UTILIZADOR (dados reais da app):\n${body.context}`;

  const msgs: ChatMsg[] = [{ role: "system", content: sys }];
  const hist = Array.isArray(body.history) ? body.history.slice(-12) : [];
  for (const h of hist) {
    const role = h.role === "assistant" ? "assistant" : "user";
    msgs.push({ role, content: String(h.content ?? "").slice(0, 4000) });
  }
  if (body.messages) for (const m of body.messages.slice(-16)) msgs.push(m);
  if (body.userMessage) msgs.push({ role: "user", content: String(body.userMessage).slice(0, 8000) });

  // Multimodal: o último turno passa a content parts OpenAI-style.
  const images = Array.isArray(body.images) ? body.images.filter((im) => im?.b64).slice(0, 3) : [];
  const audio = body.audio?.url || body.audio?.b64 ? body.audio : null;

  if (images.length > 0 || audio) {
    if (!body.userMessage) msgs.push({ role: "user", content: "Analisa o conteúdo enviado e responde conforme as instruções." });
    const last = msgs[msgs.length - 1];
    if (last.role === "user") {
      const parts: Record<string, unknown>[] = [{
        type: "text",
        text: typeof last.content === "string" && last.content ? last.content : "Analisa o conteúdo enviado.",
      }];
      for (const im of images) {
        parts.push({ type: "image_url", image_url: { url: `data:${im.mime || "image/jpeg"};base64,${im.b64}` } });
      }
      if (audio) {
        const b64 = audio.b64 ?? await fetchAudioB64(audio.url!);
        parts.push({ type: "input_audio", input_audio: { data: b64, format: audio.format || "wav" } });
      }
      last.content = parts;
    }
  }
  return msgs;
}

async function callNim(model: string, msgs: ChatMsg[], body: {
  temperature?: number; max_tokens?: number; stream?: boolean; images?: Array<{ mime?: string; b64: string }>;
  reasoning_budget?: number;
}, key: string): Promise<Response> {
  const hasMedia = (Array.isArray(body.images) && body.images.length > 0) || !!body.audio?.url || !!body.audio?.b64;
  return await fetch(NIM_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: msgs,
      temperature: body.temperature ?? 0.7,
      top_p: 0.95,
      // vision/áudio: reasoning consome ~500 tokens antes do conteúdo → default maior
      max_tokens: Math.min(body.max_tokens ?? (hasMedia ? 1500 : 1024), 4096),
      // F51: limita o reasoning (testado: flagship 4.3s → 0.6-0.8s com budget curto)
      ...(body.reasoning_budget ? { reasoning_budget: Math.min(body.reasoning_budget, 32768) } : {}),
      stream: body.stream === true,
      chat_template_kwargs: { enable_thinking: true },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST obrigatório" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited", detail: "Muitos pedidos — espera um minuto." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (NVIDIA_KEYS.length === 0) {
    return new Response(JSON.stringify({ error: "no_key", detail: "NVIDIA_API_KEY não configurada nos secrets" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: Parameters<typeof buildMessages>[0] & {
    stream?: boolean; temperature?: number; max_tokens?: number; reasoning_budget?: number;
    op?: string; input?: unknown[]; input_type?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  /* ── Operação de embeddings (F50): texto e/ou imagem data-URI → vector 4096 ── */
  if (body.op === "embed") {
    const inputs: string[] = (Array.isArray(body.input) ? body.input : [body.input])
      .filter((s): s is string => typeof s === "string" && s.length > 0);
    if (inputs.length === 0) {
      return new Response(JSON.stringify({ error: "bad_request", detail: "input vazio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const hasImage = inputs.some((s) => s.includes("data:"));
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch(EMBED_URL, {
          method: "POST",
          headers: { "Authorization": `Bearer ${NVIDIA_KEYS[0]}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            input: inputs,
            model: EMBED_MODEL,
            encoding_format: "float",
            input_type: body.input_type === "query" ? "query" : "passage",
            ...(hasImage ? { modality: ["text_image"] } : {}),
            truncate: "END",
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!resp.ok) {
          if (attempt === 0 && RETRYABLE.has(resp.status)) { await new Promise((r) => setTimeout(r, 900)); continue; }
          return new Response(JSON.stringify({ error: "upstream_error", detail: `embed HTTP ${resp.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const data = await resp.json();
        const embeddings: number[][] = (data.data ?? []).map((d: { embedding: number[] }) => d.embedding);
        return new Response(JSON.stringify({ embeddings, model: EMBED_MODEL, provider: "nemotron" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        if (attempt === 0) { await new Promise((r) => setTimeout(r, 500)); continue; }
        return new Response(JSON.stringify({ error: "upstream_error", detail: String(e).slice(0, 300) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
  }

  const msgs = await buildMessages(body);
  const stream = body.stream === true;
  const hasImages = Array.isArray(body.images) && body.images.length > 0;
  const hasAudio = !!(body.audio?.url || body.audio?.b64);
  // Visão: VL → omni (ambos aceitam data-URI). Áudio: só o omni. Texto: flagship → lightning
  const textPrimary = Deno.env.get("NVIDIA_MODEL") || DEFAULT_MODEL;
  const models = hasImages
    ? [VL_MODEL, OMNI_MODEL]
    : hasAudio
      ? [OMNI_MODEL]
      : [textPrimary, ...(textPrimary !== FALLBACK_MODEL ? [FALLBACK_MODEL] : [])];

  let lastErr = "";
  for (const model of models) {
    for (const key of NVIDIA_KEYS) {
      try {
        const resp = await callNim(model, msgs, body, key);
        if (resp.ok) {
          if (stream) {
            // SSE do NIM passa directo ao cliente
            return new Response(resp.body, {
              headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Nemotron-Model": model },
            });
          }
          const data = await resp.json();
          const msg = data?.choices?.[0]?.message ?? {};
          return new Response(JSON.stringify({
            text: msg.content ?? "",
            reasoning: msg.reasoning_content ?? undefined,
            model,
            provider: "nemotron",
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        lastErr = `HTTP ${resp.status}: ${(await resp.text().catch(() => "")).slice(0, 200)}`;
        if (!RETRYABLE.has(resp.status)) break; // erro definitivo deste modelo → tenta próximo modelo
      } catch (e) {
        lastErr = String(e).slice(0, 300);
      }
    }
  }
  return new Response(JSON.stringify({ error: "upstream_error", detail: lastErr || "todos os modelos falharam" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
