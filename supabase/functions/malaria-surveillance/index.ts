import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Token obrigatorio' }, 401);

    const payload = JSON.parse(atob(token.split('.')[1]));
    const isServiceRole = payload?.role === 'service_role';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    if (!isServiceRole) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return json({ error: 'Token invalido' }, 401);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const roleNames = (roles || []).map((r: { role: string }) => r.role);
      if (!roleNames.includes('admin') && !roleNames.includes('country_manager')) {
        return json({ error: 'Acesso negado' }, 403);
      }
    }

    const body = await req.json().catch(() => ({}));

    // Option A: Run full surveillance (triggered by cron)
    if (body?.action === 'run') {
      const { data: result, error } = await supabase.rpc('run_malaria_surveillance');
      if (error) return json({ error: error.message }, 500);
      return json(result);
    }

    // Option B: Get current alerts (for dashboard)
    if (body?.action === 'alerts') {
      const province = body?.province as string | undefined;
      const level = body?.alert_level as string | undefined;

      let query = supabase
        .from('malaria_surveillance_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (province) query = query.eq('province_id', province);
      if (level) query = query.eq('alert_level', level);

      const { data: alerts, error } = await query;
      if (error) return json({ error: error.message }, 500);

      // Summary counts
      const { count: activeWatch } = await supabase
        .from('malaria_surveillance_alerts')
        .select('*', { count: 'exact', head: true })
        .is('resolved_at', null).eq('alert_level', 'watch');

      const { count: activeWarning } = await supabase
        .from('malaria_surveillance_alerts')
        .select('*', { count: 'exact', head: true })
        .is('resolved_at', null).eq('alert_level', 'warning');

      const { count: activeEmergency } = await supabase
        .from('malaria_surveillance_alerts')
        .select('*', { count: 'exact', head: true })
        .is('resolved_at', null).eq('alert_level', 'emergency');

      return json({
        alerts,
        summary: {
          active_watch: activeWatch || 0,
          active_warning: activeWarning || 0,
          active_emergency: activeEmergency || 0,
          total_active: (activeWatch || 0) + (activeWarning || 0) + (activeEmergency || 0)
        }
      });
    }

    // Option C: Get province data for chart
    if (body?.action === 'province_data') {
      const province = body?.province as string;
      if (!province) return json({ error: 'province obrigatoria' }, 400);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: cases } = await supabase
        .from('malaria_cases')
        .select('case_date, district, rdt_result, severity')
        .eq('province', province)
        .gte('case_date', thirtyDaysAgo)
        .order('case_date', { ascending: true });

      // Aggregate by day
      const dailyCounts: Record<string, { positive: number; negative: number; severe: number }> = {};
      for (const c of cases || []) {
        const day = c.case_date;
        if (!day) continue;
        if (!dailyCounts[day]) dailyCounts[day] = { positive: 0, negative: 0, severe: 0 };
        if (c.rdt_result === 'positive') dailyCounts[day].positive++;
        if (c.rdt_result === 'negative') dailyCounts[day].negative++;
        if (c.severity === 'severe') dailyCounts[day].severe++;
      }

      return json({
        province,
        period_days: 30,
        total_cases: cases?.length || 0,
        positive: (cases || []).filter(c => c.rdt_result === 'positive').length,
        daily_counts: dailyCounts,
        districts: [...new Set((cases || []).map(c => c.district).filter(Boolean))]
      });
    }

    return json({ error: 'Acao invalida. Use: run, alerts, province_data' }, 400);

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