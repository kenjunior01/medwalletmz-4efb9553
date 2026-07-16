
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS description text;

CREATE UNIQUE INDEX IF NOT EXISTS clinics_google_place_id_key
  ON public.clinics(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stores_google_place_id_key
  ON public.stores(google_place_id) WHERE google_place_id IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='veterinary_clinics' AND column_name='country_id'
  ) THEN
    ALTER TABLE public.veterinary_clinics ADD COLUMN country_id text DEFAULT 'MZ';
  END IF;
END $$;
