
-- Fix: recreate view with SECURITY INVOKER to avoid security definer warning
DROP VIEW IF EXISTS public.weekly_leaderboard;

CREATE VIEW public.weekly_leaderboard 
WITH (security_invoker = true)
AS
SELECT 
  o.user_id,
  p.full_name,
  p.avatar_url,
  COUNT(o.id)::integer as weekly_orders,
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
