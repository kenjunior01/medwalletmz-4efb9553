-- 1. Extend reviews to support clinics and hospitals
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id);

-- 2. Create a function to update average ratings automatically for clinics
CREATE OR REPLACE FUNCTION update_clinic_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.clinic_id IS NOT NULL) THEN
    UPDATE public.clinics
    SET rating = (
      SELECT AVG(rating)::numeric(2,1)
      FROM public.reviews
      WHERE clinic_id = NEW.clinic_id
    )
    WHERE id = NEW.clinic_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_added_clinic
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION update_clinic_rating();

-- 3. Ensure RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reviews are readable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
