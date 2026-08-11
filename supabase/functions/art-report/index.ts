import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// FLYWHEEL 3: ART Adherence — Monthly report generation
// Generates monthly adherence reports, auto-refers critical patients

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
      // Admin or country_manager can trigger reports
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

    // Generate reports for all patients or a specific one
    const { data, error } = await supabase.rpc('generate_art_monthly_report', {
      _patient_user_id: body?.patient_user_id || null
    });

    if (error) return json({ error: error.message }, 500);

    // Auto-referral: check for critical patients and create referrals
    if (data?.reports_generated && data.reports_generated > 0) {
      const { data: criticalReports } = await supabase
        .from('art_monthly_reports')
        .select('id, patient_user_id, adherence_pct, risk_level')
        .eq('report_month', new Date().toISOString().slice(0, 7) + '-01')
        .eq('risk_level', 'critical')
        .eq('referral_needed', true);

      for (const report of criticalReports || []) {
        // Queue high-priority notification for referral
        await supabase.from('automated_notifications').insert({
          user_id: report.patient_user_id,
          channel: 'whatsapp',
          title: 'Encaminhamento Necessario',
          body: 'O seu relatorio mensal indica adesao critica ao TARV. Por favor contacte a sua unidade de saude ou ligue para a linha de apoio.',
          vertical: 'art',
          priority: 'urgent',
          metadata: { report_id: report.id, adherence_pct: report.adherence_pct }
        });
      }

      data.critical_referrals_queued = (criticalReports || []).length;
    }

    return json(data);

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