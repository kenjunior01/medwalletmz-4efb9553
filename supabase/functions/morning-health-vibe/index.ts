import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// FLYWHEEL 4: Morning Health Vibe — Seasonal health tips + daily check-in for MZ users
// Generates personalized daily health notifications via automated_notifications
// SECURITY: service_role only (called by cron)

const SEASONAL_TIPS: Record<string, string[]> = {
  // Hot/wet season: Nov-Mar (malaria peak)
  'hot_wet': [
    'Tempo quente e chuvoso: use mosquiteiro tratado todas as noites.',
    'Epoca de malaria: elimine agua parada ao redor da casa.',
    'Beba pelo menos 2L de agua por dia neste calor.',
    'Consulte um APE se tiver febre - rastreio de malaria e gratuito.',
  ],
  // Cool/dry season: Apr-Aug
  'cool_dry': [
    'Tempo fresco: vista camadas de roupa para manter o corpo quente.',
    'Epoca seca: beba agua mesmo sem sede.',
    'Inverno em Mocambique: resfriados sao comuns. Lave as maos frequentemente.',
    'Bom momento para consultas de rotina e vacinacao.',
  ],
  // Hot/dry season: Sep-Oct
  'hot_dry': [
    'Calor intenso: evite exposicao solar entre 10h e 16h.',
    'Antes da estacao chuvosa: prepare o seu kit de primeiros socorros.',
    'Epoca de queimadas: proteja as vias respiratorias.',
  ],
}

const PROVINCE_TIPS: Record<string, string[]> = {
  'Maputo': ['Na cidade, evite acumulos de agua em pneus e latas. Dengue tambem e risco.'],
  'Gaza': ['Zona de alto risco malaria. Use repelente e mosquiteiro.'],
  'Inhambane': ['Proteja-se do sol. Hidracao e essencial na praia.'],
  'Beira': ['Beira: preste atencao a inundacoes. Mantenha medicamentos secos.'],
  'Quelimane': ['Quelimane: epoca de malaria critica. Va ao posto de saude ao primeiro sintoma.'],
  'Nampula': ['Nampula: mantenha-se hidratado. Frutas da estao sao baratas e nutritivas.'],
  'Pemba': ['Zona costeira: preste atencao a agua potavel. Ferva antes de beber.'],
  'Tete': ['Tete: muito quente. Evite trabalho pesado entre 11h e 15h.'],
  'Chimoio': ['Chimoio: epoca agricola. Cuide das costas ao carregar peso.'],
}

const CHECKIN_MESSAGES = [
  'Bom dia! Como te sentes hoje? Regista o teu estado de espirito em 30 segundos.',
  'Ola! Toma um momento para registar como te sentes. O Meddy quer saber!',
  'Como foi a tua noite? Regista o teu humor matinal e acompanha a tua saude mental.',
  'Bom dia! O teu check-in diario de saude esta pronto. Como te sentes?',
  'Novo dia, novo check-in! Regista como te sentes para acompanhar o teu bem-estar.',
];

function getSeason(month: number): string {
  if (month >= 11 || month <= 3) return 'hot_wet'
  if (month >= 4 && month <= 8) return 'cool_dry'
  return 'hot_dry'
}

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickTip(city: string | null | undefined, season: string): string {
  if (city) {
    for (const [prov, tips] of Object.entries(PROVINCE_TIPS)) {
      if (city.toLowerCase().includes(prov.toLowerCase())) {
        return pickRandom(tips)
      }
    }
  }
  return pickRandom(SEASONAL_TIPS[season] || SEASONAL_TIPS['hot_wet'])
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth check: service_role only
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Token obrigatorio' }, 401);

    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload?.role !== 'service_role') {
      return json({ error: 'Acesso negado: apenas service_role' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const month = new Date().getMonth() + 1;
    const season = getSeason(month);

    // Check if user_notification_preferences table exists before querying it
    const { data: prefColumns } = await supabase
      .from('user_notification_preferences')
      .select('user_id, daily_health_checkin, daily_health_recommendations')
      .limit(1);

    const hasPreferencesTable = prefColumns !== null;

    // Get all active MZ users
    const { data: users, error: usersErr } = await supabase
      .from('profiles')
      .select('user_id, full_name, default_city, country_id, phone')
      .eq('country_id', 'MZ')
      .limit(5000);

    if (usersErr) {
      console.error('Failed to fetch users:', usersErr.message);
      return json({ error: usersErr.message }, 500);
    }

    // Fetch user notification preferences (if table exists)
    let userPrefs: Record<string, { daily_health_checkin: boolean; daily_health_recommendations: boolean }> = {};
    if (hasPreferencesTable && users && users.length > 0) {
      const userIds = users.map(u => u.user_id);
      const { data: prefs } = await supabase
        .from('user_notification_preferences')
        .select('user_id, daily_health_checkin, daily_health_recommendations')
        .in('user_id', userIds);

      if (prefs) {
        for (const p of prefs) {
          userPrefs[p.user_id] = {
            daily_health_checkin: p.daily_health_checkin !== false,
            daily_health_recommendations: p.daily_health_recommendations !== false,
          };
        }
      }
    }

    let tipCount = 0;
    let checkinCount = 0;

    for (const user of users || []) {
      const prefs = userPrefs[user.user_id];

      // 1. Daily health recommendation
      const wantsTips = prefs ? prefs.daily_health_recommendations : true; // default ON
      if (wantsTips) {
        const recommendation = pickTip(user.default_city, season);

        const { error: tipErr } = await supabase
          .from('automated_notifications')
          .insert({
            user_id: user.user_id,
            phone: user.phone,
            channel: 'push',
            title: 'Recomendacao de saude diaria',
            body: recommendation,
            vertical: 'community',
            priority: 'normal',
            metadata: { season, city: user.default_city, content_type: 'morning_vibe' }
          });

        if (!tipErr) tipCount++;
      }

      // 2. Daily mood check-in ("Como te sentes hoje?")
      const wantsCheckin = prefs ? prefs.daily_health_checkin : true; // default ON
      if (wantsCheckin) {
        const checkinMsg = pickRandom(CHECKIN_MESSAGES);

        const { error: checkinErr } = await supabase
          .from('automated_notifications')
          .insert({
            user_id: user.user_id,
            phone: user.phone,
            channel: 'push',
            title: 'Como te sentes hoje?',
            body: checkinMsg,
            vertical: 'community',
            priority: 'low',
            metadata: { content_type: 'daily_checkin', action_url: '/health/journal' }
          });

        if (!checkinErr) checkinCount++;
      }
    }

    return json({
      ok: true,
      season,
      total_users: users?.length || 0,
      health_tips_sent: tipCount,
      checkins_sent: checkinCount,
      preferences_table_exists: hasPreferencesTable,
    });

  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}