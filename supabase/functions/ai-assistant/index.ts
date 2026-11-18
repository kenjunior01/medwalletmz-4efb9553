// supabase/functions/ai-assistant/index.ts — MedWallet MZ (versão Lovable)
// Ação: chat (streaming com "pensamento") · embed · vision · ping
// A chave NVIDIA lê PRIMEIRO o secret NVIDIA_API_KEY; se não existir, usa
// o FALLBACK abaixo → funciona já, sem configurar secrets.
// ⚠️ QUANDO O SECRET ESTIVER DEFINIDO: apaga a linha FALLBACK_NVIDIA_KEY
//    e roda a chave em build.nvidia.com (ficou exposta numa conversa).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// FALLBACK TEMPORÁRIO da chave (último recurso para funcionar
// sem secrets). Apagar esta linha assim que o secret existir.
// ============================================================
const FALLBACK_NVIDIA_KEY = "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";

const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";
const CHAT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
const EMBED_MODEL = "nvidia/nemotron-3.5-embed-8b"; // 4096 dims (validado)
const VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
const DAILY_LIMIT = 60;

const SYSTEM_PROMPT = `És o Assistente de Saúde do MedWallet MZ (Moçambique).
- Responde SEMPRE em português de Moçambique, com frases curtas e práticas.
- Ajudas com: medicamentos (para quê serve, como tomar, dose usual em adultos), interações medicamentosas, bulas, sintomas comuns e prevenção (malária, VIH/SIDA, cólera, tuberculose, hipertensão, diabetes).
- Nunca inventes doses personalizadas; dá informação geral e diz sempre para confirmar com o farmacêutico ou médico.
- Em emergência (dor no peito, dificuldade em respirar, convulsões, hemorragia, perda de consciência): diz para procurar de imediato o serviço de saúde mais próximo.
- Não substituis um profissional de saúde; no fim de respostas clínicas acrescenta um aviso curto.`;

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Usa POST" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Falta o token de autenticação." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Sessão inválida. Entra de novo na app." }, 401);
    const userId = userData.user.id;

    const apiKey = Deno.env.get("NVIDIA_API_KEY") || FALLBACK_NVIDIA_KEY;

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "chat";

    if (action === "ping") return await ping(apiKey);
    if (action === "chat") return await chat(supabase, userId, apiKey, body);
    if (action === "embed") return await embed(apiKey, body);
    if (action === "vision") return await vision(supabase, userId, apiKey, body);
    return json({ error: `Ação desconhecida: ${action}. Usa ping | chat | embed | vision.` }, 400);
  } catch (e) {
    return json({ error: "Erro interno: " + String(e?.message ?? e) }, 500);
  }
});

// ---------- PING: testar se a chave NVIDIA funciona ----------
async function ping(apiKey: string): Promise<Response> {
  try {
    const r = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [{ role: "user", content: "Responde apenas com a palavra OK" }],
        max_tokens: 512,
        temperature: 0,
        stream: false,
      }),
    });
    const txt = await r.text();
    if (!r.ok) return json({ ok: false, http_status: r.status, detalhe: txt.slice(0, 500) });
    const j = JSON.parse(txt);
    const content = j.choices?.[0]?.message?.content ?? "";
    return json({ ok: true, modelo: j.model ?? CHAT_MODEL, resposta: content.slice(0, 200) });
  } catch (e) {
    return json({ ok: false, erro: String(e) });
  }
}

// ---------- CHAT com streaming (reasoning + resposta) ----------
async function chat(supabase: any, userId: string, apiKey: string, body: any): Promise<Response> {
  // 1) Quota diária (não fatal se o RPC falhar)
  try {
    const { data: used } = await supabase.rpc("ai_chat_usage_today");
    if (typeof used === "number" && used >= DAILY_LIMIT) {
      return json({ error: "Limite diário de mensagens atingido. Tenta amanhã." }, 429);
    }
  } catch { /* segue sem quota */ }

  const message = String(body.message ?? "").trim();
  if (!message) return json({ error: "Mensagem vazia." }, 400);

  // 2) Sessão: valida a recebida ou cria nova (não fatal)
  let sid: string | null = body.sessionId ?? null;
  if (sid) {
    const { data: s } = await supabase
      .from("ai_chat_sessions").select("id")
      .eq("id", sid).eq("user_id", userId).maybeSingle();
    if (!s) sid = null;
  }
  if (!sid) {
    const { data: s } = await supabase
      .from("ai_chat_sessions")
      .insert({ user_id: userId, title: message.slice(0, 60) })
      .select("id").single();
    sid = s?.id ?? null;
  }

  // 3) Histórico recente (últimas 10 mensagens)
  let history: { role: string; content: string }[] = [];
  if (sid) {
    const { data: msgs } = await supabase
      .from("ai_chat_messages").select("role, content")
      .eq("session_id", sid)
      .order("created_at", { ascending: false }).limit(10);
    history = (msgs ?? []).reverse().map((m: any) => ({ role: m.role, content: m.content }));
  }

  // 4) Guardar pergunta do utilizador (não fatal)
  if (sid) {
    try {
      await supabase.from("ai_chat_messages")
        .insert({ session_id: sid, user_id: userId, role: "user", content: message });
    } catch { /* segue */ }
  }

  // 5) Chamar a NVIDIA NIM com streaming (reasoning_budget top-level = padrão validado)
  const nvidiaResp = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message },
      ],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 16384,
      reasoning_budget: Math.min(Number(body.reasoningBudget ?? 2048), 32768),
      stream: true,
    }),
  });

  if (!nvidiaResp.ok || !nvidiaResp.body) {
    const errText = await nvidiaResp.text().catch(() => "");
    return json({
      error: `NVIDIA ${nvidiaResp.status}: ${errText.slice(0, 400)}`,
      dica: "401 = chave errada/revogada · 404 = modelo indisponível na conta",
    }, 502);
  }

  // 6) Reencaminhar o stream num formato simples para o frontend
  const nvidiaBody = nvidiaResp.body;
  const sessionIdAtStart = sid;
  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      let buf = "", content = "", reasoning = "";
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "meta", sessionId: sessionIdAtStart })}\n\n`));
      try {
        for await (const chunk of nvidiaBody) {
          buf += dec.decode(chunk, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const data = t.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const j = JSON.parse(data);
              const d = j.choices?.[0]?.delta ?? {};
              if (d.reasoning_content) {
                reasoning += d.reasoning_content;
                controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "reasoning", text: d.reasoning_content })}\n\n`));
              }
              if (d.content) {
                content += d.content;
                controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "content", text: d.content })}\n\n`));
              }
            } catch { /* linha parcial, ignora */ }
          }
        }
      } catch (e) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "error", text: String(e) })}\n\n`));
      }
      // 7) Guardar resposta (não fatal)
      if (sessionIdAtStart && (content || reasoning)) {
        try {
          await supabase.from("ai_chat_messages").insert({
            session_id: sessionIdAtStart, user_id: userId,
            role: "assistant", content: content || reasoning,
          });
        } catch { /* segue */ }
      }
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "done", sessionId: sessionIdAtStart })}\n\n`));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

// ---------- EMBEDDINGS (devolve dimensão real, esperado 4096) ----------
async function embed(apiKey: string, body: any): Promise<Response> {
  const inputs: string[] = Array.isArray(body.texts)
    ? body.texts.map((t: any) => String(t))
    : body.text ? [String(body.text)] : [];
  if (!inputs.length) return json({ error: 'Envia "text" ou "texts[]"' }, 400);

  const inputType = body.inputType === "query" ? "query" : "passage";
  const r = await fetch(`${NVIDIA_BASE}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: inputs,
      input_type: inputType,
      encoding_format: "float",
      truncate: "END",
    }),
  });
  const txt = await r.text();
  if (!r.ok) return json({ error: `NVIDIA ${r.status}: ${txt.slice(0, 400)}` }, 502);
  const j = JSON.parse(txt);
  const dims = j.data?.[0]?.embedding?.length ?? null;
  return json({ dimensions: dims, comparar_com: 4096, data: j.data });
}

// ---------- VISÃO (analisar imagem: bula, embalagem, receita) ----------
async function vision(supabase: any, userId: string, apiKey: string, body: any): Promise<Response> {
  const imageUrl: string = body.imageUrl; // data URI base64 ou URL pública
  const prompt = String(body.prompt ?? "Analisa esta imagem relacionada com saúde/medicamentos e explica em português de Moçambique.");
  if (!imageUrl) return json({ error: 'Envia "imageUrl" (data URI base64 ou URL)' }, 400);

  const r = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
      max_tokens: 16384,
      temperature: 0.2,
      stream: false,
      reasoning_budget: 16384,
    }),
  });
  const txt = await r.text();
  if (!r.ok) return json({ error: `NVIDIA ${r.status}: ${txt.slice(0, 500)}` }, 502);
  const j = JSON.parse(txt);
  const result = j.choices?.[0]?.message?.content ?? "";
  try {
    await supabase.from("ai_vision_logs").insert({ user_id: userId, model: VISION_MODEL, prompt, result });
  } catch { /* persistência não fatal */ }
  return json({ result });
}
