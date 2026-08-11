import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// FLYWHEEL 3: ART Adherence — 1-touch check-in
// Patient taps "Tomei" → check-in recorded → joy coins → auto-alert if critical

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Token obrigatorio' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'Token invalido' }, 401);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'checkin';

    // ACTION: checkin — 1-touch ART medication check-in (POST)
    if (req.method === 'POST' && action === 'checkin') {
      const body = await req.json();
      if (!body.adherence_log_id) {
        return json({ error: 'adherence_log_id obrigatorio' }, 400);
      }

      const { data, error } = await supabase.rpc('process_art_checkin', {
        _patient_user_id: user.id,
        _adherence_log_id: body.adherence_log_id,
        _taken: body.taken !== false,
        _notes: body.notes || null,
        _gps_lat: body.gps_lat ?? null,
        _gps_lng: body.gps_lng ?? null
      });

      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // ACTION: history — Get check-in history for patient (GET)
    if (req.method === 'GET' && action === 'history') {
      const days = parseInt(url.searchParams.get('days') || '30');
      const { data, error } = await supabase
        .from('art_checkins')
        .select('*')
        .eq('patient_user_id', user.id)
        .gte('checkin_date', new Date(Date.now() - days * 86400000).toISOString())
        .order('checkin_date', { ascending: false });

      if (error) return json({ error: error.message }, 500);

      // Calculate streak
      let streak = 0;
      const today = new Date();
      for (const c of data || []) {
        const d = new Date(c.checkin_date);
        const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
        if (diff <= streak + 1 && c.taken) {
          streak++;
        } else break;
      }

      return json({ checkins: data, streak_days: streak });
    }

    // ACTION: status — Get current adherence status (GET)
    if (req.method === 'GET' && action === 'status') {
      const { data, error } = await supabase
        .from('art_adherence_logs')
        .select('*')
        .eq('patient_user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') return json({ error: error.message }, 500);

      // Get monthly reports
      const { data: reports } = await supabase
        .from('art_monthly_reports')
        .select('*')
        .eq('patient_user_id', user.id)
        .order('report_month', { ascending: false })
        .limit(6);

      return json({
        current: data,
        monthly_reports: reports,
        needs_attention: data ? (data.missed_doses_30d > 3 || data.adherence_pct < 80) : false
      });
    }

    return json({ error: 'Acao invalida. Use: checkin (POST), history (GET), status (GET)' }, 400);

  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}