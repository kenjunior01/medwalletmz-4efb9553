-- ============================================================================
-- Migration: medication_logs and emergency_alerts tables
-- Date: 2026-08-26
-- Purpose: Enable PillTracker persistence and EmergencySOS functionality
-- ============================================================================

-- ============================================================================
-- 1. medication_logs — tracks when a user takes a medication
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_item_id UUID,  -- FK to prescription_items (nullable for ad-hoc meds)
  medication_name TEXT,
  dosage TEXT,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  taken_at TIMESTAMPTZ,  -- null = unmarked, set when marked as taken
  skipped BOOLEAN DEFAULT FALSE,  -- track if user explicitly skipped
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One entry per (user, prescription_item, date) — overwrite on toggle
  CONSTRAINT medication_logs_unique UNIQUE (user_id, prescription_item_id, logged_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_date
  ON public.medication_logs (user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_item
  ON public.medication_logs (user_id, prescription_item_id);

-- Enable RLS
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and modify their own medication logs
DROP POLICY IF EXISTS "Users can view own medication logs" ON public.medication_logs;
CREATE POLICY "Users can view own medication logs"
  ON public.medication_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own medication logs" ON public.medication_logs;
CREATE POLICY "Users can insert own medication logs"
  ON public.medication_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own medication logs" ON public.medication_logs;
CREATE POLICY "Users can update own medication logs"
  ON public.medication_logs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own medication logs" ON public.medication_logs;
CREATE POLICY "Users can delete own medication logs"
  ON public.medication_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins to view all (for analytics)
DROP POLICY IF EXISTS "Admins can view all medication logs" ON public.medication_logs;
CREATE POLICY "Admins can view all medication logs"
  ON public.medication_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- ============================================================================
-- 2. emergency_alerts — stores SOS activations from EmergencySOS component
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Anonymous fallback if user is not logged in
  anonymous_phone TEXT,
  
  -- Location at time of alert
  location JSONB,  -- { latitude, longitude, accuracy }
  city TEXT,
  country_id TEXT,
  
  -- Medical summary for emergency responders
  blood_type TEXT,
  chronic_conditions JSONB,  -- array of strings
  allergies JSONB,  -- array of strings
  
  -- Alert state machine
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'acknowledged', 'resolved', 'cancelled', 'false_alarm')),
  
  -- Contact tracing: who was notified
  contacts_notified JSONB DEFAULT '[]'::jsonb,  -- [{type, name, phone, notified_at}]
  authorities_notified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Metadata
  source TEXT DEFAULT 'mobile_app',  -- 'mobile_app', 'web', 'api'
  device_info JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user
  ON public.emergency_alerts (user_id, activated_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status
  ON public.emergency_alerts (status, activated_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_city
  ON public.emergency_alerts (city, activated_at DESC);

-- Enable RLS
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own alerts
DROP POLICY IF EXISTS "Users can view own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can view own emergency alerts"
  ON public.emergency_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Anyone can create an emergency alert (even anonymous)
-- But must provide either user_id matching auth.uid() OR anonymous_phone
DROP POLICY IF EXISTS "Anyone can create emergency alert" ON public.emergency_alerts;
CREATE POLICY "Anyone can create emergency alert"
  ON public.emergency_alerts FOR INSERT
  WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

-- Policy: Users can update their own alerts (e.g., cancel false alarm)
DROP POLICY IF EXISTS "Users can update own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can update own emergency alerts"
  ON public.emergency_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Admins and emergency responders can view all alerts
DROP POLICY IF EXISTS "Admins can view all emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Admins can view all emergency alerts"
  ON public.emergency_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'emergency_responder')
    )
  );

-- Policy: Admins can update alert status
DROP POLICY IF EXISTS "Admins can update emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Admins can update emergency alerts"
  ON public.emergency_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'emergency_responder')
    )
  );

-- ============================================================================
-- 3. emergency_contacts — user-defined emergency contacts for SOS notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,  -- 'parent', 'spouse', 'sibling', 'friend', 'doctor', etc.
  is_primary BOOLEAN DEFAULT FALSE,
  notify_on_sos BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user
  ON public.emergency_contacts (user_id, is_primary DESC);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can view own emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can insert own emergency contacts"
  ON public.emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can update own emergency contacts"
  ON public.emergency_contacts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can delete own emergency contacts"
  ON public.emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Triggers — auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medication_logs_updated ON public.medication_logs;
CREATE TRIGGER trg_medication_logs_updated
  BEFORE UPDATE ON public.medication_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_emergency_alerts_updated ON public.emergency_alerts;
CREATE TRIGGER trg_emergency_alerts_updated
  BEFORE UPDATE ON public.emergency_alerts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_emergency_contacts_updated ON public.emergency_contacts;
CREATE TRIGGER trg_emergency_contacts_updated
  BEFORE UPDATE ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. Realtime — enable for instant updates
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.medication_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_contacts;

-- ============================================================================
-- 6. Helpful RPC functions
-- ============================================================================

-- Get today's medication logs for a user
CREATE OR REPLACE FUNCTION public.get_today_medication_logs(p_user_id UUID)
RETURNS TABLE (
  prescription_item_id UUID,
  taken_at TIMESTAMPTZ,
  skipped BOOLEAN
) AS $$
  SELECT prescription_item_id, taken_at, skipped
  FROM public.medication_logs
  WHERE user_id = p_user_id
    AND logged_date = CURRENT_DATE
    AND taken_at IS NOT NULL;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get active emergency alerts (for admin dashboard)
CREATE OR REPLACE FUNCTION public.get_active_emergency_alerts()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  location JSONB,
  city TEXT,
  blood_type TEXT,
  chronic_conditions JSONB,
  activated_at TIMESTAMPTZ
) AS $$
  SELECT id, user_id, location, city, blood_type, chronic_conditions, activated_at
  FROM public.emergency_alerts
  WHERE status = 'active'
  ORDER BY activated_at DESC;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- Done. Verify with:
-- SELECT * FROM information_schema.tables WHERE table_name IN ('medication_logs', 'emergency_alerts', 'emergency_contacts');
-- ============================================================================
