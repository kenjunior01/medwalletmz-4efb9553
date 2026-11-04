// Importa instituições de MZ via OpenStreetMap (Overpass) e persiste em clinics/stores.
// Sem chave de API — dados abertos do OpenStreetMap.
// Body: { city: string, types: string[], reset?: boolean }
// types: 'pharmacy' | 'hospital' | 'clinic' | 'laboratory' | 'veterinary'

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const USER_AGENT = 'MedWalletMZ/1.0 (contact: admin@medwalletmz.online)';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const OSM_FILTERS: Record<string, string> = {
  pharmacy: '["amenity"="pharmacy"]',
  hospital: '["amenity"="hospital"]',
  clinic: '["amenity"~"^(clinic|doctors|healthcare)$"]',
  laboratory: '["healthcare"="laboratory"]',
  veterinary: '["amenity"="veterinary"]',
};

interface OsmPlace {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function geocodeCity(city: string) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${city}, Moçambique`)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

async function overpassQuery(query: string): Promise<OsmPlace[] | null> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) continue;
      const json = await res.json();
      return json.elements ?? [];
    } catch (_) { /* tenta o próximo mirror */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { city, types = ['pharmacy', 'hospital', 'clinic', 'laboratory', 'veterinary'], reset = false } = await req.json();
    if (!city) throw new Error('city required');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (reset) {
      await supabase.from('clinics').delete().eq('country_id', 'MZ');
      await supabase.from('stores').delete().eq('country_id', 'MZ').eq('type', 'pharmacy');
    }

    const center = await geocodeCity(city);
    if (!center) throw new Error(`Cidade não encontrada no OpenStreetMap: ${city}`);

    const summary: Record<string, { inserted: number; skipped: number; errors: number }> = {};

    for (const type of types) {
      summary[type] = { inserted: 0, skipped: 0, errors: 0 };
      const filter = OSM_FILTERS[type];
      if (!filter) continue;

      const radius = 25000;
      const q = [
        '[out:json][timeout:50];(',
        `node${filter}(around:${radius},${center.lat},${center.lng});`,
        `way${filter}(around:${radius},${center.lat},${center.lng});`,
        ');out center tags 400;',
      ].join('');
      const places = await overpassQuery(q);
      if (places === null) { summary[type].errors++; continue; }

      const seen = new Set<number>();
      for (const p of places) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);

        const lat = p.lat ?? p.center?.lat;
        const lng = p.lon ?? p.center?.lon;
        if (lat == null || lng == null) { summary[type].skipped++; continue; }

        const tags = p.tags ?? {};
        const name = tags.name || tags['name:pt'] || tags['name:en'];
        if (!name) { summary[type].skipped++; continue; }
        const address = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || '';
        const phone = tags.phone || tags['contact:phone'] || '';
        const website = tags.website || tags['contact:website'] || null;
        const opening = tags.opening_hours || null;
        const externalId = `osm:${p.type}/${p.id}`;

        try {
          if (type === 'pharmacy') {
            const { error } = await supabase.from('stores').upsert({
              name, type: 'pharmacy', city, address,
              latitude: lat, longitude: lng,
              phone, image_url: null,
              description: opening ? `Aberto: ${opening}` : `Farmácia em ${city}`,
              is_active: true, country_id: 'MZ',
              delivery_fee: 50, delivery_time: '30-45 min',
              google_place_id: externalId,
            }, { onConflict: 'google_place_id' });
            if (error) { summary[type].errors++; console.error(error); }
            else summary[type].inserted++;
          } else {
            const desc =
              type === 'hospital' ? `Hospital em ${city}`
              : type === 'laboratory' ? `Laboratório em ${city}`
              : type === 'veterinary' ? `Clínica veterinária em ${city}`
              : `Clínica em ${city}`;
            const { error } = await supabase.from('clinics').upsert({
              name, type, city, address,
              latitude: lat, longitude: lng,
              phone, website,
              description: opening ? `${desc} · Aberto: ${opening}` : desc,
              is_active: true, is_verified: true, country_id: 'MZ',
              google_place_id: externalId,
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
