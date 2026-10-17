-- ═══════════════════════════════════════════════════════════════════════════
-- F43 — Remoção completa dos jogos da plataforma (decisão do proprietário)
-- ═══════════════════════════════════════════════════════════════════════════
-- "Não quero nenhum jogo nesta plataforma."
-- Remove o RPC e o livro diário do jogo de mineração SaúdeCraft criados na
-- migração 20261006000000_saudecraft_mine_rpc.sql, e elimina todos os pontos
-- de entrada nos clientes (web e APK):
--   • Web: página /game (SaudeCraftGame), rota e cartão dourado nos Recompensas
--   • APK: features/game (game_screen + game_repository), rota /game e botão ⛏️
--
-- NÃO são jogos e portanto PERMANECEM intactos:
--   • Quiz educacional do hub de educação (award_pulse_points)
--   • Desafios semanais de saúde (claim_challenge_reward)
--   • Check-in diário, vouchers de saúde e poupança (F42)
--   • Joy Coins / XP / níveis usados por essas funcionalidades de saúde
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. RPC do jogo de mineração (já sem chamadores nos clientes)
DROP FUNCTION IF EXISTS public.submit_mine_session(integer);

-- 2. Livro diário de mineração (quota + auditoria) — dados do jogo deixam
--    de ser relevantes
DROP TABLE IF EXISTS public.game_mine_daily;
