ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_target_audience_check;
ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_target_audience_check
  CHECK (target_audience = ANY (ARRAY['patient','doctor','clinic','hospital','pharmacy','lab','driver']));