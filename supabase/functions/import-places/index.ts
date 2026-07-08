import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Entity = 'pharmacy' | 'clinic' | 'hospital' | 'laboratory';

const QUERIES: Record<Entity, string> = {
  pharmacy: 'farmácia',
  clinic: 'clínica médica',
  hospital: 'hospital',
  laboratory: 'laboratório de análises clínicas',
};

/**
 * Round 2 (curadoria Places):
 * Esta função agora grava em `place_proposals` (status='pending') em vez
 * de inserir directamente em stores/clinics. O admin revê/editar/aprova
 * na página /admin/curation antes de publicar.
 *
 * Comportamento mantido: deduplicação por external_id+city+entity_type.
 */
// Mapbox Search Box — devolve POIs. Normaliza para o mesmo shape usado abaixo.
async function searchText(query: string, city: string) {
  const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN');
  if (!MAPBOX_TOKEN) throw new Error('Missing MAPBOX_TOKEN');

  const q = `${query} ${city} Moçambique`;
  const url = `https://api.mapbox.com/search/searchbox/v1/forward`
    + `?q=${encodeURIComponent(q)}&country=mz&language=pt&limit=10`
    + `&access_token=${encodeURIComponent(MAPBOX_TOKEN)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox Search ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const feats = json.features ?? [];
  return feats.map((f: any) => ({
    id: f.properties?.mapbox_id ?? null,
    displayName: { text: f.properties?.name ?? f.properties?.name_preferred ?? 'Sem nome' },
    formattedAddress: f.properties?.full_address ?? f.properties?.place_formatted ?? null,
    location: f.geometry?.coordinates
      ? { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] }
      : null,
    internationalPhoneNumber: f.properties?.metadata?.phone ?? null,
    nationalPhoneNumber: null,
    rating: null,
    websiteUri: f.properties?.metadata?.website ?? null,
    photos: [],
  }));
}

function photoUrl(_: any) { return null; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const {
      cities = [
        // MASSIVE LIST OF MOZAMBIQUE CITIES AND DISTRICTS (Rural + Urban)
        'Maputo', 'Matola', 'Boane', 'Marracuene', 'Namaacha', 'Manhiça', 'Magude', 'Moamba', 'Xinavane',
        'Xai-Xai', 'Chókwè', 'Chibuto', 'Bilene', 'Mandlakazi', 'Mabalane', 'Guijá', 'Chigubo', 'Massangena', 'Chicualacuala',
        'Inhambane', 'Maxixe', 'Vilanculos', 'Massinga', 'Zavala', 'Inharrime', 'Jangamo', 'Homoíne', 'Morrumbene', 'Panda', 'Funhalouro', 'Mabote',
        'Beira', 'Dondo', 'Nhamatanda', 'Búzi', 'Gorongosa', 'Marromeu', 'Caia', 'Chemba', 'Cheringoma', 'Muanza', 'Machanga', 'Chibabava',
        'Chimoio', 'Manica', 'Gondola', 'Sussundenga', 'Catandica', 'Bárue', 'Mossurize', 'Machaze', 'Macate', 'Vanduzi',
        'Tete', 'Moatize', 'Angónia', 'Tsangano', 'Mutarara', 'Changara', 'Cahora Bassa', 'Songo', 'Mágoè', 'Zumbo', 'Marávia', 'Chifunde', 'Macanga',
        'Quelimane', 'Mocuba', 'Gurué', 'Alto Molócue', 'Milange', 'Nicoadala', 'Namacurra', 'Maganja da Costa', 'Pebane', 'Gilé', 'Ile', 'Lugela', 'Mocubela', 'Derre', 'Molumbo',
        'Nampula', 'Nacala', 'Angoche', 'Monapo', 'Ilha de Moçambique', 'Meconta', 'Mogovolas', 'Moma', 'Ribáuè', 'Malema', 'Lalaua', 'Mecubúri', 'Memba', 'Eráti', 'Nacarôa', 'Liupo', 'Larde',
        'Pemba', 'Montepuez', 'Mueda', 'Chiúre', 'Ancuabe', 'Balama', 'Namuno', 'Macomia', 'Mocímboa da Praia', 'Palma', 'Quissanga', 'Meluco', 'Ibo',
        'Lichinga', 'Cuamba', 'Mandimba', 'Marrupa', 'Maúa', 'Mecanhelas', 'Mecula', 'Metarica', 'Majune', 'Muembe', 'Ngauma', 'Nipepe', 'Sanga'
      ],
      entities = ['pharmacy', 'clinic', 'hospital', 'laboratory'],
      mode = 'draft',
    } = await req.json();

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Procurar admin existente para clinics.owner_id (legacy mode)
    const { data: adminRow } = await sb.from('user_roles').select('user_id').eq('role', 'admin').limit(1).maybeSingle();
    const ownerId = adminRow?.user_id;

    let createdStores = 0, createdClinics = 0, proposed = 0, skipped = 0;
    const log: string[] = [];
    const errors: string[] = [];

    for (const city of cities as string[]) {
      for (const entity of entities as Entity[]) {
        const places = await searchText(QUERIES[entity], city);
        for (const p of places) {
          const name = p.displayName?.text ?? 'Sem nome';
          const address = p.formattedAddress ?? null;
          const lat = p.location?.latitude ?? null;
          const lng = p.location?.longitude ?? null;
          const phone = p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null;
          const website = p.websiteUri ?? null;
          const image = photoUrl(p.photos?.[0]?.name);
          const externalId = p.id ?? null;

          // Deduplicação: procurar por (external_id OR name+city+entity_type) já existente
          let existingProposal: any = null;
          if (externalId) {
            const { data } = await sb.from('place_proposals')
              .select('id').eq('external_id', externalId).eq('source', 'google_places').maybeSingle();
            existingProposal = data;
          }
          if (!existingProposal) {
            const { data } = await sb.from('place_proposals')
              .select('id').eq('name', name).eq('city', city).eq('entity_type', entity)
              .maybeSingle();
            existingProposal = data;
          }
          // Também verifica se já está publicado (stores/clinics)
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
            // LEGACY: publicar direto (mantido para retro-compat)
            if (entity === 'pharmacy') {
              const { error } = await sb.from('stores').insert({
                name, type: 'pharmacy', city, address, image_url: image,
                latitude: lat, longitude: lng, is_active: true,
                description: phone ? `Tel: ${phone}` : null,
                delivery_fee: 50, delivery_time: '30-45 min', rating: p.rating ?? 0,
              });
              if (error) { errors.push(`stores ${name}: ${error.message}`); skipped++; }
              else createdStores++;
            } else {
              if (!ownerId) { skipped++; continue; }
              const { error } = await sb.from('clinics').insert({
                owner_id: ownerId, name, city, address, phone, logo_url: image,
                latitude: lat, longitude: lng, is_active: true, is_verified: false,
                description: entity === 'hospital' ? 'Hospital' : 'Clínica',
              });
              if (error) { errors.push(`clinics ${name}: ${error.message}`); skipped++; }
              else createdClinics++;
            }
          } else {
            // DEFAULT: gravar como proposta pendente para curadoria
            // Labs são armazenados como 'clinic' (mesma tabela final) mas com descrição "Laboratório"
            const proposalEntity = entity === 'laboratory' ? 'clinic' : entity;
            const descLabel = entity === 'laboratory'
              ? `Laboratório${phone ? ' · Tel: ' + phone : ''}`
              : (phone ? `Tel: ${phone}` : null);
            const { error } = await sb.from('place_proposals').insert({
              source: 'google_places',
              entity_type: proposalEntity,
              external_id: externalId,
              name, address, city,
              phone, website, image_url: image,
              latitude: lat, longitude: lng,
              description: descLabel,
              raw_payload: p,
              search_meta: { city, query: QUERIES[entity], original_entity: entity, imported_at: new Date().toISOString() },
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