// Importa estabelecimentos de saúde via OpenStreetMap (Overpass API) — gratuito, sem chave.
// Body: { cities: string[], country_id: string, entities: Entity[], mode: 'draft'|'commit' }
// types: 'pharmacy' | 'hospital' | 'clinic' | 'laboratory' | 'veterinary'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Entity = 'pharmacy' | 'hospital' | 'clinic' | 'laboratory' | 'veterinary';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const USER_AGENT = 'MedWalletMZ/1.0 (contact: admin@medwalletmz.online)';

// Filtros Overpass por categoria (tags do OpenStreetMap)
const OSM_FILTERS: Record<Entity, string> = {
  pharmacy: '["amenity"="pharmacy"]',
  hospital: '["amenity"="hospital"]',
  clinic: '["amenity"~"^(clinic|doctors)$"]',
  laboratory: '["healthcare"="laboratory"]',
  veterinary: '["amenity"="veterinary"]',
};

// Nome do país para geocodificar a cidade via Nominatim
const COUNTRY_NAMES: Record<string, string> = {
  MZ: 'Moçambique', BR: 'Brasil', PT: 'Portugal', AO: 'Angola', ZA: 'South Africa', IN: 'India',
};

interface OsmPlace {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function geocodeCity(city: string, countryId: string) {
  const q = `${city}, ${COUNTRY_NAMES[countryId.toUpperCase()] ?? ''}`.trim();
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    // Admin-only endpoint
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const adminCheckClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: roles } = await adminCheckClient
      .from('user_roles').select('role').eq('user_id', claims.claims.sub).eq('role', 'admin').maybeSingle();
    if (!roles) {
      return new Response(JSON.stringify({ error: 'forbidden: admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      cities = ['Maputo'],
      entities = ['pharmacy', 'clinic', 'hospital', 'laboratory', 'veterinary'],
      mode = 'draft',
      country_id = 'MZ',
    } = await req.json();

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: adminRow } = await sb.from('user_roles').select('user_id').eq('role', 'admin').limit(1).maybeSingle();
    const ownerId = adminRow?.user_id;

    let createdStores = 0, createdClinics = 0, proposed = 0, skipped = 0;
    const log: string[] = [];
    const errors: string[] = [];

    for (const city of cities as string[]) {
      const center = await geocodeCity(city, country_id);
      if (!center) {
        errors.push(`Cidade não encontrada no OpenStreetMap: ${city}`);
        continue;
      }

      for (const entity of entities as Entity[]) {
        const radius = 25000; // 25 km à volta do centro da cidade
        const q = [
          '[out:json][timeout:50];(',
          `node${OSM_FILTERS[entity]}(around:${radius},${center.lat},${center.lng});`,
          `way${OSM_FILTERS[entity]}(around:${radius},${center.lat},${center.lng});`,
          ');out center tags 400;',
        ].join('');
        const places = await overpassQuery(q);
        if (places === null) {
          errors.push(`Overpass indisponível: ${city}/${entity}`);
          continue;
        }

        for (const p of places) {
          const lat = p.lat ?? p.center?.lat ?? null;
          const lng = p.lon ?? p.center?.lon ?? null;
          if (lat == null || lng == null) { skipped++; continue; }

          const tags = p.tags ?? {};
          const name = tags.name || tags['name:pt'] || tags['name:en'] || 'Sem nome';
          if (name === 'Sem nome') { skipped++; continue; }

          const address = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ') || null;
          const phone = tags.phone || tags['contact:phone'] || null;
          const website = tags.website || tags['contact:website'] || null;
          const opening = tags.opening_hours || null;
          const externalId = `osm:${p.type}/${p.id}`;

          // Deduplicação: por external_id, nome+cidade, ou já publicado
          let existingProposal: any = null;
          const { data: dup1 } = await sb.from('place_proposals')
            .select('id').eq('external_id', externalId).maybeSingle();
          existingProposal = dup1;
          if (!existingProposal) {
            const { data: dup2 } = await sb.from('place_proposals')
              .select('id').eq('name', name).eq('city', city).eq('entity_type', entity)
              .maybeSingle();
            existingProposal = dup2;
          }
          const { data: existingStore } = await sb.from('stores')
            .select('id').eq('name', name).eq('city', city).maybeSingle();
          const { data: existingClinic } = await sb.from('clinics')
            .select('id').eq('name', name).eq('city', city).maybeSingle();

          if (existingProposal || existingStore || existingClinic) {
            skipped++;
            log.push(`dup: ${name} (${city})`);
            continue;
          }

          if (mode === 'commit') {
            if (entity === 'pharmacy') {
              const { error } = await sb.from('stores').insert({
                name, type: 'pharmacy', city, address, image_url: null,
                latitude: lat, longitude: lng, is_active: true,
                description: opening ? `Aberto: ${opening}` : (phone ? `Tel: ${phone}` : null),
                delivery_fee: 50, delivery_time: '30-45 min', rating: 0,
                country_id, google_place_id: externalId,
              });
              if (error) { errors.push(`stores ${name}: ${error.message}`); skipped++; }
              else createdStores++;
            } else {
              if (!ownerId) { skipped++; continue; }
              const { error } = await sb.from('clinics').insert({
                owner_id: ownerId, name, city, address, phone, website,
                latitude: lat, longitude: lng, is_active: true, is_verified: false,
                description: entity === 'hospital' ? 'Hospital' : entity === 'veterinary' ? 'Clínica veterinária' : entity === 'laboratory' ? 'Laboratório' : 'Clínica',
                country_id, google_place_id: externalId,
              });
              if (error) { errors.push(`clinics ${name}: ${error.message}`); skipped++; }
              else createdClinics++;
            }
          } else {
            const descLabel =
              entity === 'laboratory' ? `Laboratório de análises clínicas${phone ? ' · Tel: ' + phone : ''}`
              : entity === 'veterinary' ? `Clínica veterinária${phone ? ' · Tel: ' + phone : ''}`
              : (phone ? `Tel: ${phone}` : null);
            const { error } = await sb.from('place_proposals').insert({
              source: 'openstreetmap',
              entity_type: entity,
              external_id: externalId,
              name, address, city, country_id,
              phone, website, image_url: null,
              latitude: lat, longitude: lng,
              description: descLabel,
              raw_payload: { osm: { type: p.type, id: p.id, tags }, opening_hours: opening },
              search_meta: { city, country_id, provider: 'openstreetmap', original_entity: entity, imported_at: new Date().toISOString() },
              status: 'pending',
            });
            if (error) { errors.push(`proposal ${name}: ${error.message}`); skipped++; }
            else proposed++;
          }
        }
      }
    }

    return new Response(JSON.stringify({
      mode,
      proposed,
      createdStores,
      createdClinics,
      skipped,
      errors: errors.slice(0, 20),
      log: log.slice(0, 30),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
