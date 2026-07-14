
-- Add country_id to place_proposals so import & curation can scope by country
ALTER TABLE public.place_proposals
  ADD COLUMN IF NOT EXISTS country_id text NOT NULL DEFAULT 'MZ';

CREATE INDEX IF NOT EXISTS idx_proposals_country_status
  ON public.place_proposals(country_id, status, created_at DESC);

-- Backfill existing rows based on search_meta if present
UPDATE public.place_proposals
   SET country_id = COALESCE(search_meta->>'country_id', country_id, 'MZ')
 WHERE country_id IS NULL OR country_id = 'MZ';
