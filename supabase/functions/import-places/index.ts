import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY = 'https://connector-gateway.lovable.dev/google_maps';

type Entity = 'pharmacy' | 'clinic' | 'hospital';

const QUERIES: Record<Entity, string> = {
  pharmacy: 'farmácia',
  clinic: 'clínica médica',
  hospital: 'hospital',
};

async function searchText(query: string, city: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) throw new Error('Missing Google Maps connector credentials');

  const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
      'Content-Type': 'application/json',
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber,places.nationalPhoneNumber,places.rating,places.websiteUri,places.photos',
    },
    body: JSON.stringify({ textQuery: `${query} em ${city}, Moçambique`, regionCode: 'MZ', pageSize: 20 }),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`);
  return (await res.json()).places ?? [];
}

function photoUrl(photoName?: string) {
  if (!photoName) return null;
  const KEY = Deno.env.get('GOOGLE_MAPS_BROWSER_KEY') ?? Deno.env.get('GOOGLE_MAPS_API_KEY');
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${KEY}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { cities = ['Maputo'], entities = ['pharmacy', 'clinic', 'hospital'] } = await req.json();

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // find an admin owner for clinics (owner_id NOT NULL)
    const { data: adminRow } = await sb.from('user_roles').select('user_id').eq('role', 'admin').limit(1).maybeSingle();
    const ownerId = adminRow?.user_id;

    let createdStores = 0, createdClinics = 0, skipped = 0;
    const log: string[] = [];

    for (const city of cities as string[]) {
      for (const entity of entities as Entity[]) {
        const places = await searchText(QUERIES[entity], city);
        for (const p of places) {
          const name = p.displayName?.text ?? 'Sem nome';
          const address = p.formattedAddress ?? null;
          const lat = p.location?.latitude ?? null;
          const lng = p.location?.longitude ?? null;
          const phone = p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null;
          const image = photoUrl(p.photos?.[0]?.name);

          if (entity === 'pharmacy') {
            // dedupe by name + city
            const { data: existing } = await sb.from('stores').select('id').eq('name', name).eq('city', city).maybeSingle();
            if (existing) { skipped++; continue; }
            const { error } = await sb.from('stores').insert({
              name, type: 'pharmacy', city, address, image_url: image,
              latitude: lat, longitude: lng, is_active: true,
              description: phone ? `Tel: ${phone}` : null,
              delivery_fee: 50, delivery_time: '30-45 min', rating: p.rating ?? 0,
            });
            if (error) { log.push(`stores ${name}: ${error.message}`); skipped++; } else createdStores++;
          } else {
            if (!ownerId) { skipped++; continue; }
            const { data: existing } = await sb.from('clinics').select('id').eq('name', name).eq('city', city).maybeSingle();
            if (existing) { skipped++; continue; }
            const { error } = await sb.from('clinics').insert({
              owner_id: ownerId, name, city, address, phone, logo_url: image,
              latitude: lat, longitude: lng, is_active: true, is_verified: false,
              description: entity === 'hospital' ? 'Hospital' : 'Clínica',
            });
            if (error) { log.push(`clinics ${name}: ${error.message}`); skipped++; } else createdClinics++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ createdStores, createdClinics, skipped, log }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});