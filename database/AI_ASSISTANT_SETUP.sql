-- =============================================================================
-- MedWallet MZ — ASSISTENTE IA (NVIDIA NIM) — Setup completo da base de dados
-- Ficheiro: database/AI_ASSISTANT_SETUP.sql
--
-- ONDE EXECUTAR: Supabase Dashboard → SQL Editor → New query → colar tudo → Run.
-- IDEMPOTENTE: pode ser executado N vezes sem duplicar objectos.
--
-- O que cria:
--   1. Extensão pgvector (vector)
--   2. Tabelas: ai_chat_sessions · ai_chat_messages · ai_med_embeddings · ai_vision_logs
--   3. RPCs:    match_ai_meds (busca semântica, cosine) · ai_chat_usage_today (quota 60/dia)
--   4. RLS:     políticas por utilizador (dados médicos isolados por auth.uid())
--   5. Storage: bucket privado «med-images» (receitas/exames para o vision)
--   6. GRANTs explícitos dos RPCs para authenticated
--   7. Smoke tests no fim (opcional)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTENSÃO PGVECTOR
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 2. TABELAS
-- ---------------------------------------------------------------------------

-- Sessões de chat do assistente
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Mensagens (pergunta + resposta + raciocínio guardado como assistant)
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_chat_sessions (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session
  ON public.ai_chat_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_day
  ON public.ai_chat_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user
  ON public.ai_chat_sessions (user_id, updated_at DESC);

-- Catálogo de medicamentos APROVADOS com embeddings (RAG do assistente)
-- NOTA: vector(4096) — dimensão validada do modelo nvidia/nemotron-3.5-embed-8b.
-- Sem índice HNSW/IVFFlat: o pgvector só indexa até 2000 dims. Para um
-- catálogo curado (poucas centenas de linhas) a varredura sequencial é rápida.
CREATE TABLE IF NOT EXISTS public.ai_med_embeddings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  descricao  text,
  content    text,
  embedding  vector(4096) NOT NULL,
  fonte      text NOT NULL DEFAULT 'manual', -- manual | embed-catalog | misau
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Registo de análises de imagem (vision) — best-effort, não clínico
CREATE TABLE IF NOT EXISTS public.ai_vision_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  model      text,
  prompt     text,
  result     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. RPCs
-- ---------------------------------------------------------------------------

-- Busca semântica de medicamentos aprovados (usada pelo RAG do chat).
-- Assinatura TEM de ser exactamente esta (a Edge Function chama com estes nomes):
--   supabase.rpc("match_ai_meds", { query_embedding, match_count })
CREATE OR REPLACE FUNCTION public.match_ai_meds(
  query_embedding  vector(4096),
  match_count      int              DEFAULT 5,
  match_threshold  double precision DEFAULT 0.25
)
RETURNS TABLE (
  id         uuid,
  nome       text,
  descricao  text,
  similarity double precision
)
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT e.id,
         e.nome,
         e.descricao,
         1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.ai_med_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding ASC
  LIMIT LEAST(GREATEST(match_count, 1), 20);
$$;

-- Quota diária do chat (limite 60/dia — constante DAILY_LIMIT na Edge Function).
-- Conta apenas mensagens ENVIADAS pelo utilizador no dia corrente.
CREATE OR REPLACE FUNCTION public.ai_chat_usage_today()
RETURNS int
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.ai_chat_messages
  WHERE user_id = auth.uid()
    AND role = 'user'
    AND created_at >= date_trunc('day', now());
$$;

-- GRANTs explícitos (executar sempre após CREATE OR REPLACE FUNCTION)
GRANT EXECUTE ON FUNCTION public.match_ai_meds(vector(4096), int, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_chat_usage_today() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS — Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_med_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_vision_logs    ENABLE ROW LEVEL SECURITY;

-- ai_chat_sessions: só o dono vê/cria/apaga as suas sessões
DROP POLICY IF EXISTS "dono ve as suas sessoes"       ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "dono cria as suas sessoes"     ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "dono apaga as suas sessoes"    ON public.ai_chat_sessions;
CREATE POLICY "dono ve as suas sessoes"    ON public.ai_chat_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "dono cria as suas sessoes"  ON public.ai_chat_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "dono apaga as suas sessoes" ON public.ai_chat_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ai_chat_messages: só o dono vê/insere as suas mensagens
-- (a Edge Function actualiza nothing — respostas são INSERT com role assistant
--  feitas pelo próprio utilizador autenticado via client anon + token do user)
DROP POLICY IF EXISTS "dono ve as suas mensagens"     ON public.ai_chat_messages;
DROP POLICY IF EXISTS "dono insere as suas mensagens" ON public.ai_chat_messages;
CREATE POLICY "dono ve as suas mensagens"     ON public.ai_chat_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "dono insere as suas mensagens" ON public.ai_chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ai_med_embeddings: conteúdo APROVADO — leitura para todos autenticados;
-- escrita apenas via service_role (RLS bloqueia authenticated — correto).
DROP POLICY IF EXISTS "leitura para autenticados" ON public.ai_med_embeddings;
CREATE POLICY "leitura para autenticados" ON public.ai_med_embeddings FOR SELECT TO authenticated USING (true);

-- ai_vision_logs: o utilizador vê os seus registos; a Edge Function insere
-- com o token do próprio utilizador → precisa de INSERT com check.
DROP POLICY IF EXISTS "dono ve os seus logs vision"   ON public.ai_vision_logs;
DROP POLICY IF EXISTS "dono insere os seus logs"      ON public.ai_vision_logs;
CREATE POLICY "dono ve os seus logs vision" ON public.ai_vision_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "dono insere os seus logs"    ON public.ai_vision_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. STORAGE — bucket privado «med-images» (imagens p/ vision)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('med-images', 'med-images', false)
ON CONFLICT (id) DO NOTHING;

-- Cada utilizador só acede à SUA pasta: med-images/<user_id>/ficheiro
DROP POLICY IF EXISTS "med-images le propria pasta"  ON storage.objects;
DROP POLICY IF EXISTS "med-images insere propria pasta" ON storage.objects;
DROP POLICY IF EXISTS "med-images apaga propria pasta"  ON storage.objects;
CREATE POLICY "med-images le propria pasta" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'med-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "med-images insere propria pasta" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'med-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "med-images apaga propria pasta" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'med-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 6. SMOKE TESTS (resultado no output do SQL Editor)
-- ---------------------------------------------------------------------------
SELECT 'sessoes' AS tabela, count(*) FROM public.ai_chat_sessions
UNION ALL SELECT 'mensagens',  count(*) FROM public.ai_chat_messages
UNION ALL SELECT 'embeddings', count(*) FROM public.ai_med_embeddings
UNION ALL SELECT 'vision_logs',count(*) FROM public.ai_vision_logs;

-- Testar o RPC com um vector aleatório (só valida que executa; similaridade ~ 0):
SELECT public.match_ai_meds(
  (SELECT ('[' || array_to_string(array_fill(0.0, ARRAY[4096]), ',') || ']')::vector(4096)),
  5, 0.25
);
