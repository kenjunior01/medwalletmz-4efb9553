
-- Phase 3: Smart logistics for health orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS requires_cold_chain boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority_level integer NOT NULL DEFAULT 0;

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS requires_cold_chain boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified_driver boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS health_certified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Index to speed up priority queue ordering
CREATE INDEX IF NOT EXISTS idx_orders_priority_queue 
  ON public.orders (priority_level DESC, created_at ASC) 
  WHERE status IN ('pending','confirmed','preparing','ready');
