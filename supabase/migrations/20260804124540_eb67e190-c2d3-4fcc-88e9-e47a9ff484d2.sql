-- 1. Restore Data API grants on profiles (policies exist, grants were missing)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2. Add country scoping to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS country_id TEXT;

UPDATE public.orders o
SET country_id = s.country_id
FROM public.stores s
WHERE o.store_id = s.id AND o.country_id IS NULL;

UPDATE public.orders SET country_id = 'MZ' WHERE country_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_country_id ON public.orders(country_id);

CREATE OR REPLACE FUNCTION public.set_order_country()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.country_id IS NULL THEN
    SELECT s.country_id INTO NEW.country_id FROM public.stores s WHERE s.id = NEW.store_id;
    IF NEW.country_id IS NULL THEN
      SELECT p.country_id INTO NEW.country_id FROM public.profiles p WHERE p.user_id = NEW.user_id;
    END IF;
    NEW.country_id := COALESCE(NEW.country_id, 'MZ');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_country ON public.orders;
CREATE TRIGGER trg_set_order_country
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_country();