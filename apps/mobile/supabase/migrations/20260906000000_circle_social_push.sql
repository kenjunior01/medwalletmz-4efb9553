-- ============================================================================
-- MedWallet — F8: interacção social nos círculos + push (FCM) + unread
-- 100% ADITIVO e IDEMPOTENTE — não altera nem remove nada existente.
--
-- 1) Reacções às mensagens dos círculos:
--    a tabela `support_circle_messages` só tinha políticas SELECT / INSERT /
--    DELETE. Sem UPDATE é impossível gravar o jsonb `reactions`. Adiciona-se
--    uma política de UPDATE para membros, com um TRIGGER que congela as
--    colunas de conteúdo — assim um membro só consegue alterar `reactions`
--    (e o estado de moderação, escrito pelo service_role), nunca o texto.
-- 2) Realtime: publica `support_circle_messages` na publicação
--    `supabase_realtime` (o chat de círculos passa de polling 4 s a realtime).
-- 3) Marca de leitura: política UPDATE na própria linha de
--    `support_circle_members` para gravar `last_read_at` / `is_muted`.
-- 4) `fcm_tokens`: o dispatch engine (RPC de médicos próximos) já faz
--    LEFT JOIN com esta tabela, mas ela não existe nas migrations. Criada
--    aqui com RLS própria (cada utilizador gere os seus tokens de push).
-- ============================================================================

-- ── 1a. Política de UPDATE para reacções ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_circle_messages'
      AND policyname = 'Members can react to messages'
  ) THEN
    CREATE POLICY "Members can react to messages"
      ON public.support_circle_messages
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.support_circle_members m
          WHERE m.circle_id = support_circle_messages.circle_id
            AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── 1b. Trigger que congela o conteúdo: só `reactions` muda num UPDATE ──────
CREATE OR REPLACE FUNCTION public.lock_circle_message_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.circle_id := OLD.circle_id;
  NEW.user_id := OLD.user_id;
  NEW.content := OLD.content;
  NEW.is_anonymous := OLD.is_anonymous;
  NEW.reply_to := OLD.reply_to;
  NEW.created_at := OLD.created_at;
  -- ai_moderation_status / ai_moderation_reason / ai_categories ficam
  -- livres para o service_role (moderação) — para authenticated o RLS
  -- continua a limitar as linhas visíveis.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_circle_messages_lock_content ON public.support_circle_messages;
CREATE TRIGGER trg_circle_messages_lock_content
  BEFORE UPDATE ON public.support_circle_messages
  FOR EACH ROW EXECUTE FUNCTION public.lock_circle_message_content();

-- ── 2. Realtime para as mensagens dos círculos ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_circle_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_circle_messages;
  END IF;
END $$;

-- ── 3. Marca de leitura / silenciar: UPDATE da própria adesão ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_circle_members'
      AND policyname = 'Users update own membership'
  ) THEN
    CREATE POLICY "Users update own membership"
      ON public.support_circle_members
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 4. Tokens de push FCM (a tabela que o dispatch engine já referencia) ────
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text DEFAULT 'android', -- android | ios | web
  app_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON public.fcm_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fcm_tokens_token ON public.fcm_tokens(token);

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fcm_tokens'
      AND policyname = 'User manages own fcm tokens'
  ) THEN
    CREATE POLICY "User manages own fcm tokens"
      ON public.fcm_tokens
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fcm_tokens TO authenticated;
