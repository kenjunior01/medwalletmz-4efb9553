-- ============================================================
-- Fix: Daily Health Notifications Pipeline
-- ============================================================
-- Ensures the data layer for daily notifications works correctly.
--
-- ARCHITECTURE:
--   Edge Function (deno.json cron) → inserts into automated_notifications
--   → dispatch Edge Function marks as 'sent'
--   → Client Realtime subscription detects 'sent' status
--   → Shows local notification via NotificationService.showLocal()
--
-- IMPORTANT: Supabase Edge Function cron jobs are configured in
-- deno.json files, NOT in pg_cron. Make sure the Edge Functions
-- are DEPLOYED (supabase functions deploy) for the cron to activate.
-- ============================================================

-- ============================================================
-- 1. ENSURE automated_notifications TABLE EXISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.automated_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  channel TEXT NOT NULL DEFAULT 'push',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  vertical TEXT DEFAULT 'community',
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the cron pipeline
CREATE INDEX IF NOT EXISTS idx_anotif_status
  ON public.automated_notifications(status);
CREATE INDEX IF NOT EXISTS idx_anotif_scheduled
  ON public.automated_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_anotif_user
  ON public.automated_notifications(user_id);

-- RLS
DO $$ BEGIN
  ALTER TABLE public.automated_notifications ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop old policies if they exist (idempotent)
DO $$ BEGIN
  ALTER TABLE public.automated_notifications DROP POLICY IF EXISTS "anotif_user_read";
  ALTER TABLE public.automated_notifications DROP POLICY IF EXISTS "anotif_service_all";
  ALTER TABLE public.automated_notifications DROP POLICY IF EXISTS "anotif_select_own";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Users can read their own notifications
CREATE POLICY "anotif_user_read"
  ON public.automated_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for Edge Function cron jobs using service_role key)
CREATE POLICY "anotif_service_all"
  ON public.automated_notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also grant service_role directly (bypasses RLS)
GRANT ALL ON public.automated_notifications TO service_role;

-- ============================================================
-- 2. RPC: get_pending_notifications
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_pending_notifications(_limit INT DEFAULT 50)
RETURNS SETOF public.automated_notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.automated_notifications
  WHERE status = 'pending'
    AND scheduled_for <= now()
  ORDER BY priority DESC, scheduled_for ASC
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.get_pending_notifications(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_notifications(INT) TO authenticated, service_role;

-- ============================================================
-- 3. RPC: mark_notification_sent
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_notification_sent(
  _notification_id UUID,
  _status TEXT DEFAULT 'sent'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.automated_notifications
  SET status = _status,
      sent_at = now()
  WHERE id = _notification_id;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_sent(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_sent(UUID, TEXT) TO authenticated, service_role;

-- ============================================================
-- 4. FIX: Allow morning-health-vibe to insert without user_id
-- ============================================================
-- The morning-health-vibe function inserts rows where user_id IS set
-- but some notifications may not have a user_id (broadcast tips).
-- Ensure the foreign key allows NULL:
DO $$ BEGIN
  ALTER TABLE public.automated_notifications
    ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
