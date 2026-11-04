import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
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
    const { data: c, error: cErr } = await sb.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (cErr || !c?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { address, city, name } = await req.json();
    // Nominatim (OpenStreetMap) — geocoding gratuito, sem chave
    const url = `https://nominatim.openstreetmap.org/search`
      + `?q=${encodeURIComponent(parts)}&format=jsonv2&addressdetails=1&limit=1`
      + `&countrycodes=mz`;
    const res = await fetch(url, { headers: { 'User-Agent': 'MedWalletMZ/1.0 (contact: admin@medwalletmz.online)' } });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `nominatim_${res.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const results = await res.json();
    const hit = Array.isArray(results) ? results[0] : null;
    if (!hit) {
      return new Response(JSON.stringify({ error: 'no_results' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      source: 'openstreetmap',
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
      formatted_address: hit.display_name ?? null,
      matched_name: hit.name ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});