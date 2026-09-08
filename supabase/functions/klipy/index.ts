// KLIPY proxy (GIFs/stickers/emojis) via gateway de conectores configurável.
// Usage: POST { kind: 'trending'|'search', media: 'gifs'|'stickers'|'emojis', query?, page?, customer_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = Deno.env.get("KLIPY_GATEWAY_URL") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Klipy é conteúdo público (GIFs/stickers). Auth é opcional — se houver JWT válido,
    // usamos user.id como customer_id; caso contrário, cai para 'guest' / body.customer_id.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        const token = authHeader.replace("Bearer ", "");
        const { data } = await sb.auth.getClaims(token);
        userId = data?.claims?.sub ?? null;
      } catch (_) {
        userId = null;
      }
    }

    const GATEWAY_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    const KLIPY_API_KEY = Deno.env.get("KLIPY_API_KEY");
    if (!GATEWAY || !GATEWAY_KEY || !KLIPY_API_KEY) {
      console.error("Missing credentials: KLIPY_GATEWAY_URL / AI_GATEWAY_API_KEY / KLIPY_API_KEY not set");
      return new Response(JSON.stringify({ error: "missing_credentials" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const kind = (body.kind ?? "trending") as string;
    const media = (body.media ?? "gifs") as string;
    const allowedMedia = ["gifs", "stickers", "clips", "emojis"];

    if (!allowedMedia.includes(media)) {
      return new Response(JSON.stringify({ error: "invalid_media" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const customer_id = String(body.customer_id || userId || "guest");
    const page = String(body.page || "1");
    const per_page = String(body.per_page || "24");
    const params = new URLSearchParams({ customer_id, page, per_page });
    let path = "trending";

    if (kind === "search") {
      const q = String(body.query || "").trim();
      if (!q) return new Response(JSON.stringify({ error: "missing_query" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      path = "search";
      params.set("q", q);
    }

    const url = `${GATEWAY}/${media}/${path}?${params.toString()}`;
    console.log(`Fetching Klipy: ${url}`);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GATEWAY_KEY}`,
        "X-Connection-Api-Key": KLIPY_API_KEY,
      },
    });

    const responseText = await res.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { error: "invalid_json", text: responseText.slice(0, 500) };
    }

    if (!res.ok) {
      console.error(`Klipy API failed with status ${res.status}:`, responseData);
      return new Response(JSON.stringify({ error: "klipy_failed", status: res.status, data: responseData }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Critical error in klipy function:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
