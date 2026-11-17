// ╔════════════════════════════════════════════════════════════════════════╗
// ║  embed-catalog (F50) — sincroniza embeddings do catálogo products      ║
// ║  Corre em lote via cron/curl: 1 invocação processa N produtos sem      ║
// ║  embedding e devolve remaining — repetir até remaining: 0.             ║
// ║  Protegido por header x-embed-secret === EMBED_SYNC_SECRET.            ║
// ╚════════════════════════════════════════════════════════════════════════╝

const NIM_EMBED_URL = "https://integrate.api.nvidia.com/v1/embeddings";
const EMBED_MODEL = "nvidia/nemotron-3.5-embed-8b";
const BATCH = 16;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-embed-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST obrigatório" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const secret = Deno.env.get("EMBED_SYNC_SECRET");
  if (!secret || req.headers.get("x-embed-secret") !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const apiKey = Deno.env.get("NVIDIA_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "no_key", detail: "NVIDIA_API_KEY não configurada" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Produtos do catálogo sem embedding (mPharma / lojas parceiras)
  const { data: pending, error: selError } = await admin
    .from("products")
    .select("id, name, description, category")
    .limit(BATCH);
  if (selError) {
    return new Response(JSON.stringify({ error: "db_error", detail: selError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Filtra os que já têm embedding (join manual — a view com left join não existe)
  const ids = (pending ?? []).map((p: { id: string }) => p.id);
  let todo = (pending ?? []) as Array<{ id: string; name: string; description: string | null; category: string | null }>;
  if (ids.length > 0) {
    const { data: have } = await admin.from("product_embeddings").select("product_id").in("product_id", ids);
    const haveSet = new Set((have ?? []).map((h: { product_id: string }) => h.product_id));
    todo = todo.filter((p) => !haveSet.has(p.id));
  }
  if (todo.length === 0) {
    const { count } = await admin.from("products").select("id", { count: "exact", head: true });
    const { count: embedded } = await admin.from("product_embeddings").select("product_id", { count: "exact", head: true });
    return new Response(JSON.stringify({
      processed: 0,
      remaining: Math.max(0, (count ?? 0) - (embedded ?? 0)),
      done: (count ?? 0) <= (embedded ?? 0),
      provider: "nemotron",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Texto por produto: nome — descrição (categoria). Curto e estável.
  const inputs = todo.map((p) =>
    `${p.name}${p.description ? ` — ${p.description}` : ''}${p.category ? ` (${p.category})` : ''} | medicamento, farmácia, Moçambique`.slice(0, 2000)
  );

  const embedResp = await fetch(NIM_EMBED_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: inputs,
      model: EMBED_MODEL,
      encoding_format: "float",
      input_type: "passage",
      truncate: "END",
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!embedResp.ok) {
    const detail = (await embedResp.text().catch(() => "")).slice(0, 200);
    return new Response(JSON.stringify({ error: "upstream_error", detail: `embed HTTP ${embedResp.status} ${detail}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const embedData = await embedResp.json();
  const vectors: number[][] = (embedData.data ?? []).map((d: { embedding: number[] }) => d.embedding);
  if (vectors.length !== todo.length) {
    return new Response(JSON.stringify({ error: "upstream_error", detail: `recebidos ${vectors.length} vectores para ${todo.length} produtos` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const rows = todo.map((p, i) => ({
    product_id: p.id,
    embedding: JSON.stringify(vectors[i]),
    embedded_at: new Date().toISOString(),
  }));
  const { error: upError } = await admin.from("product_embeddings").upsert(rows, { onConflict: "product_id" });
  if (upError) {
    return new Response(JSON.stringify({ error: "db_error", detail: upError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { count } = await admin.from("products").select("id", { count: "exact", head: true });
  const { count: embedded } = await admin.from("product_embeddings").select("product_id", { count: "exact", head: true });
  return new Response(JSON.stringify({
    processed: rows.length,
    remaining: Math.max(0, (count ?? 0) - (embedded ?? 0)),
    done: (count ?? 0) <= (embedded ?? 0),
    provider: "nemotron",
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
