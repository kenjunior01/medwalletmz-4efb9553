-- Sistema de Gamificação Joy

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela de perfil de gamificação do utilizador
CREATE TABLE public.user_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  joy_coins INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  neighborhoods_explored TEXT[] DEFAULT '{}',
  current_level INTEGER NOT NULL DEFAULT 1,
  experience_points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_order_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de conquistas disponíveis
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  joy_coins_reward INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de conquistas do utilizador
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Tabela de transações de JoyCoins
CREATE TABLE public.joy_coin_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de referências de utilizadores
CREATE TABLE public.user_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de eventos Joy (Guia Maputo)
CREATE TABLE public.joy_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  location TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  event_date DATE,
  event_time TEXT,
  is_secret BOOLEAN DEFAULT false,
  joy_coins_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joy_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joy_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies para user_gamification
CREATE POLICY "Users can view own gamification" ON public.user_gamification FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own gamification" ON public.user_gamification FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gamification" ON public.user_gamification FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies para achievements (public read)
CREATE POLICY "Anyone can view active achievements" ON public.achievements FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para user_achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies para joy_coin_transactions
CREATE POLICY "Users can view own transactions" ON public.joy_coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.joy_coin_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies para user_referrals
CREATE POLICY "Users can view own referrals" ON public.user_referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can create referrals" ON public.user_referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- RLS Policies para joy_events (public read)
CREATE POLICY "Anyone can view active events" ON public.joy_events FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage events" ON public.joy_events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir conquistas iniciais
INSERT INTO public.achievements (code, name, description, icon, category, requirement_type, requirement_value, joy_coins_reward) VALUES
  ('first_order', 'Primeiro Pedido', 'Faça o seu primeiro pedido', '🎉', 'loyalty', 'orders', 1, 50),
  ('gourmet_5', 'Gourmet Iniciante', 'Complete 5 pedidos', '🍽️', 'gourmet', 'orders', 5, 100),
  ('gourmet_25', 'Gourmet Expert', 'Complete 25 pedidos', '👨‍🍳', 'gourmet', 'orders', 25, 500),
  ('gourmet_100', 'Mestre Culinário', 'Complete 100 pedidos', '🏆', 'gourmet', 'orders', 100, 2000),
  ('explorer_3', 'Explorador de Maputo', 'Peça em 3 bairros diferentes', '🗺️', 'explorer', 'neighborhoods', 3, 150),
  ('explorer_7', 'Aventureiro Urbano', 'Peça em 7 bairros diferentes', '🧭', 'explorer', 'neighborhoods', 7, 400),
  ('critic_5', 'Crítico Gastronómico', 'Faça 5 avaliações', '⭐', 'social', 'reviews', 5, 100),
  ('critic_20', 'Influenciador Local', 'Faça 20 avaliações', '📝', 'social', 'reviews', 20, 400),
  ('streak_7', 'Semana Joy', 'Peça 7 dias seguidos', '🔥', 'loyalty', 'streak', 7, 300),
  ('streak_30', 'Mês Joy', 'Peça 30 dias seguidos', '💎', 'loyalty', 'streak', 30, 1500),
  ('referral_3', 'Embaixador Joy', 'Indique 3 amigos', '🤝', 'social', 'referrals', 3, 500),
  ('referral_10', 'Super Embaixador', 'Indique 10 amigos', '👑', 'social', 'referrals', 10, 2000);

-- Inserir eventos Joy de exemplo
INSERT INTO public.joy_events (title, description, category, location, event_date, is_secret, joy_coins_reward) VALUES
  ('Festival Gastronómico de Maputo', 'Os melhores chefs da cidade num só lugar', 'gastronomia', 'Praça da Independência', '2026-03-15', false, 100),
  ('Mercado Secreto Polana', 'Artesanato e comida local escondidos', 'mercado', 'Bairro da Polana', '2026-02-20', true, 200),
  ('Sunset no Costa do Sol', 'Música ao vivo e petiscos na praia', 'evento', 'Praia Costa do Sol', '2026-02-14', false, 50),
  ('Tour Gastronómico Baixa', 'Descubra os sabores secretos do centro', 'tour', 'Baixa de Maputo', NULL, true, 150);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_gamification_updated_at
BEFORE UPDATE ON public.user_gamification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();