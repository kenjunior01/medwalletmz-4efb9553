-- ============================================================
-- P0 Critical Fixes Migration
-- Date: 2026-07-30
-- ============================================================

-- 1. Atomic rider stats increment RPC (fixes race condition in healthRiders.ts)
CREATE OR REPLACE FUNCTION increment_rider_stats(
  _rider_id UUID,
  _earnings NUMERIC DEFAULT 0,
  _distance NUMERIC DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE health_riders
  SET 
    total_deliveries = COALESCE(total_deliveries, 0) + 1,
    total_earnings_mzn = COALESCE(total_earnings_mzn, 0) + _earnings,
    total_distance_km = COALESCE(total_distance_km, 0) + _distance,
    updated_at = NOW()
  WHERE id = _rider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RLS: Prevent users from self-assigning privileged roles
-- Only admins can assign admin/country_manager/regional_manager roles
CREATE POLICY "no_self_assign_privileged_roles" ON user_roles
  FOR INSERT WITH CHECK (
    -- Allow inserting non-privileged roles freely (customer, driver, etc.)
    role NOT IN ('admin', 'country_manager', 'provincial_manager', 'regional_manager', 'regional_ceo')
    OR
    -- Only allow if the inserter has admin role (enforced via RLS on the session)
    current_setting('request.jwt.claims')::jsonb ->> 'user_role' = 'admin'
  );

-- Note: The above policy uses JWT claims. If roles aren't in JWT yet,
-- use a separate approach with a trigger or Edge Function.

-- 3. Unique constraint for deposit idempotency (prevents double-credit)
ALTER TABLE mpesa_manual_payments 
  ADD CONSTRAINT IF NOT EXISTS unique_user_reference 
  UNIQUE (user_id, reference);

-- 4. Add missing delivered_at column to delivery_assignments if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_assignments' AND column_name = 'delivered_at') THEN
    ALTER TABLE delivery_assignments ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
END $$;

-- 5. Ensure subscriptions table has expires_at column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'expires_at') THEN
    ALTER TABLE subscriptions ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- 6. Fix any existing subscriptions with NULL expires_at (set to 30 days from started_at)
UPDATE subscriptions 
SET expires_at = started_at + INTERVAL '30 days'
WHERE expires_at IS NULL AND started_at IS NOT NULL AND status = 'active';
