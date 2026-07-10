// KLIPY proxy via Lovable Connector Gateway.
// Usage: POST { kind: 'trending'|'search', media: 'gifs'|'stickers'|'emojis', query?, page?, customer_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/klipy";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from JWT safely
    const { data, error: userErr } = await supabaseClient.auth.getUser();
    const user = data?.user;

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", details: userErr }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const KLIPY_API_KEY = Deno.env.get("KLIPY_API_KEY");
    if (!LOVABLE_API_KEY || !KLIPY_API_KEY) {
      console.error("Missing credentials: LOVABLE_API_KEY or KLIPY_API_KEY not set");
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

    const customer_id = String(body.customer_id || user.id || "anon");
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
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
