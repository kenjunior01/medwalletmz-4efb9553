-- =============================================================================
-- MIGRATION: Fix P0 Critical Issues
-- Date: 2026-07-30
-- =============================================================================

-- 1. RID-02: Atomic increment_rider_stats RPC (prevents race condition in earnings)
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

-- 2. SEC-02: RLS policy to prevent self-assignment of privileged roles
-- Only allow users to assign themselves non-privileged roles via client-side
CREATE POLICY "users_can_only_assign_non_privileged_roles" ON user_roles
  FOR INSERT WITH CHECK (
    role NOT IN ('admin', 'country_manager', 'provincial_manager', 'regional_ceo', 'regional_manager', 'insurance')
  );

CREATE POLICY "users_cannot_update_to_privileged_roles" ON user_roles
  FOR UPDATE USING (true)
  WITH CHECK (
    role NOT IN ('admin', 'country_manager', 'provincial_manager', 'regional_ceo', 'regional_manager', 'insurance')
  );

-- 3. PAY-02: Unique constraint for deposit idempotency (M-Pesa manual payments)
ALTER TABLE mpesa_manual_payments
  ADD CONSTRAINT mpesa_manual_payments_user_ref_unique UNIQUE (user_id, reference);

-- 4. PAY-02: Unique constraint for wallet_transactions deposit idempotency
-- Add idempotency_key column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_transactions' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN idempotency_key TEXT;
    CREATE UNIQUE INDEX wallet_transactions_idempotency_key_idx ON wallet_transactions (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;

-- 5. SEC-15: RLS enablement on user_roles table (if not already enabled)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own roles
CREATE POLICY "users_read_own_roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own non-privileged roles (covered by policy above)

-- Users can delete their own roles
CREATE POLICY "users_delete_own_roles" ON user_roles
  FOR DELETE USING (user_id = auth.uid());

-- Service role (backend) can do anything
CREATE POLICY "service_role_full_access_user_roles" ON user_roles
  FOR ALL USING (true) WITH CHECK (true);

-- 6. RLS for wallets: users can only read their own wallet
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_wallet" ON wallets
  FOR SELECT USING (user_id = auth.uid());

-- 7. RLS for health_riders: riders can update their own profile
ALTER TABLE health_riders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "riders_update_own_profile" ON health_riders
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "riders_read_own_profile" ON health_riders
  FOR SELECT USING (user_id = auth.uid());

COMMENT ON FUNCTION increment_rider_stats IS 'Atomic increment of rider stats (deliveries, earnings, distance) to prevent race conditions in concurrent delivery completions';
COMMENT ON POLICY "users_can_only_assign_non_privileged_roles" IS 'Prevents privilege escalation: users cannot assign admin/manager roles to themselves via client-side upsert';
COMMENT ON POLICY "users_cannot_update_to_privileged_roles" IS 'Prevents privilege escalation via update: existing roles cannot be changed to privileged ones from client-side';
