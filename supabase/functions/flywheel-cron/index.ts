import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// FLYWHEEL CRON — Single entry point for all scheduled flywheel tasks
// Called by pg_cron or Supabase scheduled edge functions
// Actions: run_all, malaria, tarv_reminders, adherence_check, weekly_challenge, auto_topups, retry_compensations

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
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

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'run_all';
    const results: Record<string, unknown> = {};

    // --- TASK 1: Malaria Surveillance ---
    if (action === 'run_all' || action === 'malaria') {
      const { data } = await supabase.rpc('run_malaria_surveillance');
      results.malaria_surveillance = data;
    }

    // --- TASK 2: TARV Reminders ---
    if (action === 'run_all' || action === 'tarv_reminders') {
      const { data } = await supabase.rpc('generate_tarv_reminders');
      results.tarv_reminders = data;
    }

    // --- TASK 3: Adherence Check ---
    if (action === 'run_all' || action === 'adherence_check') {
      const { data } = await supabase.rpc('check_adherence_and_alert');
      results.adherence_check = data;
    }

    // --- TASK 4: Weekly Challenge ---
    if (action === 'run_all' || action === 'weekly_challenge') {
      const { data } = await supabase.rpc('generate_weekly_challenge');
      results.weekly_challenge = data;
    }

    // --- TASK 5: Auto Top-ups ---
    if (action === 'run_all' || action === 'auto_topups') {
      const { data } = await supabase.rpc('process_auto_topups');
      results.auto_topups = data;
    }

    // --- TASK 6: Retry Pending Compensations ---
    if (action === 'run_all' || action === 'retry_compensations') {
      const { data } = await supabase.rpc('retry_pending_compensations');
      results.retry_compensations = data;
    }

    // --- TASK 7: Dispatch pending notifications ---
    if (action === 'run_all' || action === 'dispatch') {
      // Call the dispatch function internally via fetch
      try {
        const dispatchUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/dispatch-automated-notifications`;
        const resp = await fetch(dispatchUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ channels: ['push', 'whatsapp', 'sms'], limit: 100 })
        });
        results.dispatch = await resp.json();
      } catch (e) {
        results.dispatch = { error: (e as Error).message };
      }
    }

    // --- TASK 8: ART Monthly Report (1st of month only) ---
    if (action === 'run_all' || action === 'art_report') {
      const dayOfMonth = new Date().getDate();
      if (action === 'art_report' || dayOfMonth === 1) {
        const { data } = await supabase.rpc('generate_art_monthly_report', { _patient_user_id: null });
        results.art_monthly_report = data;
      } else {
        results.art_monthly_report = { skipped: true, reason: 'not_first_of_month' };
      }
    }

    // --- TASK 9: Morning Health Vibe (daily health tips + mood check-in) ---
    if (action === 'run_all' || action === 'morning_health_vibe') {
      try {
        const vibeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/morning-health-vibe`;
        const resp = await fetch(vibeUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        results.morning_health_vibe = await resp.json();
      } catch (e) {
        results.morning_health_vibe = { error: (e as Error).message };
      }
    }

    return json({
      success: true,
      action,
      ran_at: new Date().toISOString(),
      results
    });

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