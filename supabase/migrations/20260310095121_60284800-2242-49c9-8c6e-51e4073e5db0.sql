-- Add influencer_id to coupons
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS influencer_id uuid REFERENCES public.profiles(id);

-- Create influencer_picks table
CREATE TABLE IF NOT EXISTS public.influencer_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL REFERENCES public.profiles(id),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  featured_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.influencer_picks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'influencer_picks' AND policyname = 'Anyone can view influencer picks') THEN
    CREATE POLICY "Anyone can view influencer picks" ON public.influencer_picks FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'influencer_picks' AND policyname = 'Admins can manage influencer picks') THEN
    CREATE POLICY "Admins can manage influencer picks" ON public.influencer_picks FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;