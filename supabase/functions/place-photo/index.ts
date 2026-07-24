import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Proxy for Google Places photo. Query: ?name=<photoResourceName>&max=<px>
const GATEWAY = 'https://connector-gateway.lovable.dev/google_maps';
const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const MAPS_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const name = url.searchParams.get('name');
    const max = url.searchParams.get('max') || '600';
    if (!name) return new Response('missing name', { status: 400, headers: corsHeaders });

    // Ask Google for signed URL (skip redirect so we can cache)
    const resp = await fetch(
      `${GATEWAY}/places/v1/${encodeURI(name)}/media?maxHeightPx=${max}&skipHttpRedirect=true`,
      {
        headers: {
          'Authorization': `Bearer ${LOVABLE_KEY}`,
          'X-Connection-Api-Key': MAPS_KEY,
        },
      },
    );
    if (!resp.ok) {
      return new Response('photo unavailable', { status: 404, headers: corsHeaders });
    }
    const j = await resp.json();
    const photoUri: string | undefined = j.photoUri;
    if (!photoUri) return new Response('no uri', { status: 404, headers: corsHeaders });

    // Fetch the actual image and stream it (with cache headers)
    const img = await fetch(photoUri);
    if (!img.ok) return new Response('img fetch failed', { status: 502, headers: corsHeaders });
    const buf = await img.arrayBuffer();
    return new Response(buf, {
      headers: {
        ...corsHeaders,
        'Content-Type': img.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch (e) {
    return new Response((e as Error).message, { status: 500, headers: corsHeaders });
  }
});