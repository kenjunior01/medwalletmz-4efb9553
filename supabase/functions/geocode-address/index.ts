const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { address, city, name } = await req.json();
    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN');
    if (!MAPBOX_TOKEN) {
      return new Response(JSON.stringify({ error: 'missing_mapbox_token' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parts = [name, address, city, 'Moçambique'].filter(Boolean).join(', ');
    if (!parts.trim()) {
      return new Response(JSON.stringify({ error: 'empty_query' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mapbox Geocoding v6 — enviesado para Moçambique
    const url = `https://api.mapbox.com/search/geocode/v6/forward`
      + `?q=${encodeURIComponent(parts)}&country=mz&limit=1&language=pt`
      + `&access_token=${encodeURIComponent(MAPBOX_TOKEN)}`;

    const res = await fetch(url);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `mapbox_${res.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const g = await res.json();
    const hit = g.features?.[0];
    const coords = hit?.geometry?.coordinates;
    if (!coords || coords.length < 2) {
      return new Response(JSON.stringify({ error: 'no_results' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      source: 'mapbox',
      latitude: coords[1],
      longitude: coords[0],
      formatted_address: hit.properties?.full_address ?? hit.properties?.place_formatted ?? null,
      matched_name: hit.properties?.name ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});