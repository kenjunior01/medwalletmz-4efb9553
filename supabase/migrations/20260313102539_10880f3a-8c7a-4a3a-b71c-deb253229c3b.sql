
-- Tabela de desafios semanais
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  challenge_type text NOT NULL DEFAULT 'orders',
  target_value integer NOT NULL DEFAULT 1,
  joy_coins_reward integer NOT NULL DEFAULT 50,
  xp_reward integer NOT NULL DEFAULT 100,
  icon text NOT NULL DEFAULT '🎯',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
  ON public.challenges FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage challenges"
  ON public.challenges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Tabela de progresso dos utilizadores nos desafios
CREATE TABLE public.user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  current_value integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge progress"
  ON public.user_challenges FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can join challenges"
  ON public.user_challenges FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own challenge progress"
  ON public.user_challenges FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Tabela de destaques diários (restaurante/prato do dia)
CREATE TABLE public.daily_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_type text NOT NULL DEFAULT 'store',
  store_id uuid REFERENCES public.stores(id),
  product_id uuid REFERENCES public.products(id),
  title text NOT NULL,
  subtitle text,
  highlight_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(highlight_type, highlight_date)
);

ALTER TABLE public.daily_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active highlights"
  ON public.daily_highlights FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage highlights"
  ON public.daily_highlights FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- View de leaderboard semanal (top users por pedidos esta semana)
CREATE OR REPLACE VIEW public.weekly_leaderboard AS
SELECT 
  o.user_id,
  p.full_name,
  p.avatar_url,
  COUNT(o.id) as weekly_orders,
  COALESCE(g.current_level, 1) as user_level,
  COALESCE(g.joy_coins, 0) as joy_coins
FROM public.orders o
JOIN public.profiles p ON p.user_id = o.user_id
LEFT JOIN public.user_gamification g ON g.user_id = o.user_id
WHERE o.created_at >= date_trunc('week', now())
  AND o.status NOT IN ('cancelled')
GROUP BY o.user_id, p.full_name, p.avatar_url, g.current_level, g.joy_coins
ORDER BY weekly_orders DESC
LIMIT 20;

-- Inserir desafios de exemplo
INSERT INTO public.challenges (title, description, category, challenge_type, target_value, joy_coins_reward, xp_reward, icon, starts_at, ends_at) VALUES
('Explorador da Semana', 'Faça pedidos em 3 restaurantes diferentes', 'explorer', 'unique_stores', 3, 100, 200, '🗺️', date_trunc('week', now()), date_trunc('week', now()) + interval '7 days'),
('Foodie Dedicado', 'Faça 5 pedidos esta semana', 'loyalty', 'orders', 5, 75, 150, '🍽️', date_trunc('week', now()), date_trunc('week', now()) + interval '7 days'),
('Crítico Gastronômico', 'Deixe 3 avaliações esta semana', 'social', 'reviews', 3, 50, 100, '⭐', date_trunc('week', now()), date_trunc('week', now()) + interval '7 days'),
('Madrugador', 'Faça um pedido antes das 10h', 'general', 'early_order', 1, 30, 50, '🌅', date_trunc('week', now()), date_trunc('week', now()) + interval '7 days');
