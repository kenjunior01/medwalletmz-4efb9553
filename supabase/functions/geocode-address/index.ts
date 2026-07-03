const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY = 'https://connector-gateway.lovable.dev/google_maps';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { address, city, name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'missing_credentials' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parts = [name, address, city, 'Moçambique'].filter(Boolean).join(', ');
    if (!parts.trim()) {
      return new Response(JSON.stringify({ error: 'empty_query' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Preferir Places API (New) — mais preciso para POIs; fallback Geocoding.
    const placesRes = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: parts, regionCode: 'MZ', pageSize: 1 }),
    });
    if (placesRes.ok) {
      const j = await placesRes.json();
      const p = j.places?.[0];
      if (p?.location?.latitude && p?.location?.longitude) {
        return new Response(JSON.stringify({
          source: 'places',
          latitude: p.location.latitude,
          longitude: p.location.longitude,
          formatted_address: p.formattedAddress ?? null,
          matched_name: p.displayName?.text ?? null,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const geoRes = await fetch(
      `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(parts)}&region=mz`,
      { headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY } },
    );
    if (!geoRes.ok) {
      return new Response(JSON.stringify({ error: `geocoding_${geoRes.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const g = await geoRes.json();
    const hit = g.results?.[0];
    if (!hit?.geometry?.location) {
      return new Response(JSON.stringify({ error: 'no_results' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      source: 'geocoding',
      latitude: hit.geometry.location.lat,
      longitude: hit.geometry.location.lng,
      formatted_address: hit.formatted_address ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});