-- =====================================================================
-- MEDWALLET MZ — CRON JOBS DOS FLYWHEELS
-- =====================================================================
-- Execute ESTE ficheiro DEPOIS de FLYWHEELS_COMPLETE_SQL_EDITOR.sql
-- Requer: pg_cron habilitado no Supabase (project settings → Database → Extensions)
-- =====================================================================

-- Verifica se pg_cron esta disponivel
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_cron';

-- Se nao estiver habilitado, execute:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- NOTA: Supabase nao permite chamar edge functions directamente via pg_cron.
-- Em vez disso, usamos pg_cron para chamar as funcoes SQL directamente.
-- As edge functions que nao tem equivalente SQL (morning-health-vibe, dispatch)
-- devem ser configuradas como Supabase Edge Function Scheduled Tasks
-- no Dashboard → Edge Functions → Scheduled Tasks.

-- ──────────────────────────────────────────────────────────────────────
-- 1. MALARIA SURVEILLANCE — A cada 6 horas
-- ──────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('flywheel_malaria_surveillance');
SELECT cron.schedule(
  'flywheel_malaria_surveillance',
  '0 */6 * * *', -- a cada 6 horas
  $$SELECT public.run_malaria_surveillance();$$
);

-- ──────────────────────────────────────────────────────────────────────
-- 2. TARV REMINDERS — Diariamente as 7h00 (hora de Mocambique = UTC+2)
-- ──────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('flywheel_tarv_reminders');
SELECT cron.schedule(
  'flywheel_tarv_reminders',
  '0 5 * * *', -- UTC 05:00 = MZ 07:00
  $$SELECT public.generate_tarv_reminders();$$
);

-- ──────────────────────────────────────────────────────────────────────
-- 3. ADHERENCE CHECK — Diariamente as 9h00 MZ
-- ──────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('flywheel_adherence_check');
SELECT cron.schedule(
  'flywheel_adherence_check',
  '0 7 * * *', -- UTC 07:00 = MZ 09:00
  $$SELECT public.check_adherence_and_alert();$$
);

-- ──────────────────────────────────────────────────────────────────────
-- 4. WEEKLY CHALLENGE — Cada segunda-feira as 8h00 MZ
-- ──────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('flywheel_weekly_challenge');
SELECT cron.schedule(
  'flywheel_weekly_challenge',
  '0 6 * * 1', -- UTC 06:00 Monday = MZ 08:00 Monday
  $$SELECT public.generate_weekly_challenge();$$
);

-- ──────────────────────────────────────────────────────────────────────
-- 5. AUTO TOP-UPS — A cada 4 horas
-- ──────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('flywheel_auto_topups');
SELECT cron.schedule(
  'flywheel_auto_topups',
  '0 */4 * * *',
  $$SELECT public.process_auto_topups();$$
);

-- ──────────────────────────────────────────────────────────────────────
-- 6. RETRY PENDING COMPENSATIONS — A cada 2 horas
-- ──────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('flywheel_retry_compensations');
SELECT cron.schedule(
  'flywheel_retry_compensations',
  '0 */2 * * *',
  $$SELECT public.retry_pending_compensations();$$
);

-- ──────────────────────────────────────────────────────────────────────
-- 7. ART MONTHLY REPORT — Dia 1 de cada mes as 6h00 MZ
-- ──────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('flywheel_art_monthly_report');
SELECT cron.schedule(
  'flywheel_art_monthly_report',
  '0 4 1 * *', -- UTC 04:00 1st = MZ 06:00 1st
  $$SELECT public.generate_art_monthly_report(NULL::uuid);$$
);

-- ──────────────────────────────────────────────────────────────────────
-- 8. DISPATCH NOTIFICATIONS — A cada 5 minutos
-- (Edge Function Scheduled Task alternativa: configurar no Dashboard)
-- ──────────────────────────────────────────────────────────────────────
-- pg_cron nao chama edge functions. Configure no Supabase Dashboard:
--   Edge Functions → dispatch-automated-notifications → Scheduled Task
--   Cron: */5 * * * * (a cada 5 minutos)
--   Body: { "channels": ["push", "whatsapp", "in_app"], "limit": 50 }

-- ──────────────────────────────────────────────────────────────────────
-- 9. MORNING HEALTH VIBE — Diariamente as 6h00 MZ (Edge Function)
-- ──────────────────────────────────────────────────────────────────────
-- pg_cron nao chama edge functions. Configure no Supabase Dashboard:
--   Edge Functions → morning-health-vibe → Scheduled Task
--   Cron: 0 4 * * * (UTC 04:00 = MZ 06:00)
--   Body: {}

-- ──────────────────────────────────────────────────────────────────────
-- VERIFICACAO
-- ──────────────────────────────────────────────────────────────────────
SELECT jobid, schedule, command, nodename, nodeport, database, username, active, next_run
FROM cron.job
WHERE command LIKE '%flywheel%'
ORDER BY jobid;
