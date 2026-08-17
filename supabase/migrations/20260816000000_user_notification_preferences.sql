-- ============================================================
-- User Notification Preferences
-- ============================================================
-- Allows per-user control over which daily notifications they receive.
-- Used by morning-health-vibe edge function to filter recipients.
--
-- Columns:
--   daily_health_checkin       - "Como te sentes hoje?" mood check-ins (default: true)
--   daily_health_recommendations - Daily health tips (default: true)
--   consultation_updates       - Consultation status changes (default: true)
--   order_updates              - Order/delivery status changes (default: true)
--   quiet_hours_start          - Hour (0-23) to start quiet hours (default: 22)
--   quiet_hours_end            - Hour (0-23) to end quiet hours (default: 7)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_health_checkin BOOLEAN NOT NULL DEFAULT true,
  daily_health_recommendations BOOLEAN NOT NULL DEFAULT true,
  consultation_updates BOOLEAN NOT NULL DEFAULT true,
  order_updates BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start INT NOT NULL DEFAULT 22 CHECK (quiet_hours_start BETWEEN 0 AND 23),
  quiet_hours_end INT NOT NULL DEFAULT 7 CHECK (quiet_hours_end BETWEEN 0 AND 23),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only read/write their own preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON public.user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for morning-health-vibe cron)
CREATE POLICY "Service role can read all preferences"
  ON public.user_notification_preferences FOR SELECT
  TO authenticated
  USING (true);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_notif_prefs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notif_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_notif_prefs_timestamp();

-- Index for batch lookups by the cron job
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user_id
  ON public.user_notification_preferences(user_id);

-- ============================================================
-- RPC: upsert_notification_preferences
-- ============================================================
-- Convenience function for the frontend to upsert preferences.
-- Creates the row if it doesn't exist, updates if it does.
CREATE OR REPLACE FUNCTION public.upsert_notification_preferences(
  p_user_id UUID,
  p_daily_health_checkin BOOLEAN DEFAULT true,
  p_daily_health_recommendations BOOLEAN DEFAULT true,
  p_consultation_updates BOOLEAN DEFAULT true,
  p_order_updates BOOLEAN DEFAULT true,
  p_quiet_hours_start INT DEFAULT 22,
  p_quiet_hours_end INT DEFAULT 7
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (
    user_id, daily_health_checkin, daily_health_recommendations,
    consultation_updates, order_updates, quiet_hours_start, quiet_hours_end
  ) VALUES (
    p_user_id, p_daily_health_checkin, p_daily_health_recommendations,
    p_consultation_updates, p_order_updates, p_quiet_hours_start, p_quiet_hours_end
  )
  ON CONFLICT (user_id) DO UPDATE SET
    daily_health_checkin = EXCLUDED.daily_health_checkin,
    daily_health_recommendations = EXCLUDED.daily_health_recommendations,
    consultation_updates = EXCLUDED.consultation_updates,
    order_updates = EXCLUDED.order_updates,
    quiet_hours_start = EXCLUDED.quiet_hours_start,
    quiet_hours_end = EXCLUDED.quiet_hours_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
