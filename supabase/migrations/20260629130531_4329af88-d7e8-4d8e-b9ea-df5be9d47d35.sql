ALTER TABLE public.platform_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
INSERT INTO public.platform_settings (key, value) VALUES
  ('nearby_radius_km', '25'::jsonb),
  ('nearby_ranking', '"distance"'::jsonb)
ON CONFLICT (key) DO NOTHING;