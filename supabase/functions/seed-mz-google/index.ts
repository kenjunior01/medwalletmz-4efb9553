import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Importa institui\u00e7\u00f5es de MZ via Google Places API (New) e persiste em clinics/stores.
// Body: { city: string, types: string[], reset?: boolean }
// types: 'pharmacy' | 'hospital' | 'clinic' | 'laboratory' | 'veterinary'

const GATEWAY = 'https://connector-gateway.lovable.dev/google_maps';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const MAPS_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;

const PHOTO_PROXY = `${SUPABASE_URL}/functions/v1/place-photo?name=`;

const TYPE_QUERIES: Record<string, string[]> = {
  pharmacy:   ['farmácia', 'farmacia'],
  hospital:   ['hospital'],
  clinic:     ['clínica médica', 'centro de saúde'],
  laboratory: ['laboratório de análises clínicas'],
  veterinary: ['clínica veterinária', 'veterinária'],
};

async function placesSearch(query: string, city: string) {
  const res = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_KEY}`,
      'X-Connection-Api-Key': MAPS_KEY,
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.photos,places.googleMapsUri',
    },
    body: JSON.stringify({
      textQuery: `${query} em ${city}, Moçambique`,
      regionCode: 'MZ',
      languageCode: 'pt-PT',
      pageSize: 20,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`Places search failed [${res.status}]: ${t}`);
    return [];
  }
  const data = await res.json();
  return data.places || [];
}

function photoUrl(photoName: string | undefined) {
  if (!photoName) return null;
  return `${PHOTO_PROXY}${encodeURIComponent(photoName)}&max=800`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { city, types = ['pharmacy','hospital','clinic','laboratory','veterinary'], reset = false } = await req.json();
    if (!city) throw new Error('city required');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (reset) {
      await supabase.from('clinics').delete().eq('country_id', 'MZ');
      await supabase.from('stores').delete().eq('country_id', 'MZ').eq('type', 'pharmacy');
    }

    const summary: Record<string, { inserted: number; skipped: number; errors: number }> = {};

    for (const type of types) {
      summary[type] = { inserted: 0, skipped: 0, errors: 0 };
      const queries = TYPE_QUERIES[type] || [type];
      const seen = new Set<string>();

      for (const q of queries) {
        const places = await placesSearch(q, city);
        for (const p of places) {
          if (!p.id || seen.has(p.id)) continue;
          seen.add(p.id);

          const name = p.displayName?.text || 'Sem nome';
          const address = p.formattedAddress || '';
          const lat = p.location?.latitude;
          const lng = p.location?.longitude;
          const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || '';
          const website = p.websiteUri || null;
          const rating = p.rating || 0;
          const photoName = p.photos?.[0]?.name;
          const image = photoUrl(photoName);

          try {
            if (type === 'pharmacy') {
              const { error } = await supabase.from('stores').upsert({
                name, type: 'pharmacy', city, address,
                latitude: lat, longitude: lng,
                phone, image_url: image,
                description: `Farmácia em ${city}`,
                is_active: true, country_id: 'MZ',
                delivery_fee: 50, delivery_time: '30-45 min',
                rating,
                google_place_id: p.id,
              }, { onConflict: 'google_place_id' });
              if (error) { summary[type].errors++; console.error(error); }
              else summary[type].inserted++;
            } else {
              const clinicType = type;
              const { error } = await supabase.from('clinics').upsert({
                name, type: clinicType, city, address,
                latitude: lat, longitude: lng,
                phone, website,
                image_url: image, logo_url: image,
                description: `${clinicType === 'hospital' ? 'Hospital' : clinicType === 'laboratory' ? 'Laboratório' : clinicType === 'veterinary' ? 'Clínica veterinária' : 'Clínica'} em ${city}`,
                is_active: true, is_verified: true, country_id: 'MZ',
                rating,
                google_place_id: p.id,
              }, { onConflict: 'google_place_id' });
              if (error) { summary[type].errors++; console.error(error); }
              else summary[type].inserted++;
            }
          } catch (e) {
            summary[type].errors++;
            console.error('upsert failed', e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, city, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});