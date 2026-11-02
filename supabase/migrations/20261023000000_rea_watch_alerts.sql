-- ═════════════════════════════════════════════════════════════════════════
-- F48 — ALERTAS DE PREÇO + LEMBRETES DE RESERVA (fecha o circuito mPharma)
-- Padrão GoodRx Price Alert + lembrete de levantamento (padrão farmácia)
--
-- Motor de alertas LAZY (sem cron): corre quando o utilizador abre as abas
-- "Vigiar preço" / "Reservas" (web e APK chamam run_watch_checks() no load).
--
--  (a) ALERTA DE PREÇO — quando o melhor preço de um medicamento vigiado
--      desce OU atinge o alvo. Anti-spam 12h via price_watch.last_notified_*
--      (só re-avisa se o preço baixar mais, ou após 12h).
--  (b) LEMBRETE DE RESERVA — aviso ÚNICO quando uma reserva aberta expira
--      em menos de 3h (dedupe por metadata->>'res_id').
--
-- As notificações são escritas em automated_notifications com status='sent'
-- e metadata.action_url='/health/meds-availability' — o catchup existente
-- do app (useNotifications) entrega-as como notificação local com deep-link.
--
-- Idempotente: seguro para correr N vezes.
-- ═════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. price_watch: memória de notificação (anti-spam 12h)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.price_watch
  ADD COLUMN IF NOT EXISTS last_notified_price numeric(12,2);
ALTER TABLE public.price_watch
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. run_watch_checks() — motor de alertas lazy (por utilizador)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_watch_checks()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user        uuid := auth.uid();
  v_price_alerts integer := 0;
  v_reminders    integer := 0;
  w              record;
  r              record;
  v_lowest       numeric;
  v_already      boolean;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- ══ (a) Vigias de preço activos ══
  FOR w IN
    SELECT id, query, target_price, country_id, last_notified_price, last_notified_at
      FROM public.price_watch
     WHERE user_id = v_user
       AND active
     ORDER BY created_at DESC
  LOOP
    -- melhor preço actual (mesma lógica de my_price_watches())
    SELECT MIN(p.price) INTO v_lowest
      FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
     WHERE s.type = 'pharmacy'
       AND COALESCE(s.is_active, true)
       AND COALESCE(p.is_available, true)
       AND (p.name ILIKE '%' || w.query || '%'
            OR COALESCE(p.description, '') ILIKE '%' || w.query || '%'
            OR COALESCE(p.category, '') ILIKE '%' || w.query || '%')
       AND (w.country_id IS NULL OR s.country_id = w.country_id);

    -- actualiza histórico do vigia (mesmo sem alvo)
    UPDATE public.price_watch
       SET last_lowest_price = v_lowest,
           last_checked_at   = now()
     WHERE id = w.id;

    -- dispara alerta? alvo atingido/descido + anti-spam 12h
    IF w.target_price IS NOT NULL AND v_lowest IS NOT NULL
       AND v_lowest <= w.target_price
       AND ( w.last_notified_price IS NULL
          OR v_lowest < w.last_notified_price
          OR w.last_notified_at IS NULL
          OR w.last_notified_at < now() - interval '12 hours' ) THEN

      INSERT INTO public.automated_notifications
        (user_id, channel, title, body, vertical, priority,
         status, scheduled_for, sent_at, metadata)
      VALUES
        (v_user, 'push',
         '💊 ' || w.query || ': preço em baixa!',
         'Melhor preço agora: ' || trim(to_char(v_lowest, '999999999999')) || ' MT'
           || ' (alvo ' || trim(to_char(w.target_price, '999999999999')) || ' MT).'
           || ' Reserve e levante em «Onde há stock?».',
         'pharmacy', 'normal',
         'sent', now(), now(),
         jsonb_build_object(
           'action_url', '/health/meds-availability',
           'content_type', 'price_alert',
           'query', w.query,
           'best_price', v_lowest,
           'target_price', w.target_price
         ));

      UPDATE public.price_watch
         SET last_notified_price = v_lowest,
             last_notified_at    = now()
       WHERE id = w.id;

      v_price_alerts := v_price_alerts + 1;
    END IF;
  END LOOP;

  -- ══ (b) Reservas abertas a expirar em <3h — lembrete único ══
  FOR r IN
    SELECT res.id, res.pickup_code, res.expires_at, res.quantity,
           res.product_id, res.store_id,
           p.name AS product_name, s.name AS store_name
      FROM public.med_reservations res
      JOIN public.products p ON p.id = res.product_id
      JOIN public.stores   s ON s.id = res.store_id
     WHERE res.user_id = v_user
       AND res.status IN ('reserved', 'ready')
       AND res.expires_at >  now()
       AND res.expires_at <  now() + interval '3 hours'
  LOOP
    -- dedupe: já existe lembrete para esta reserva?
    SELECT EXISTS (
      SELECT 1 FROM public.automated_notifications a
       WHERE a.user_id = v_user
         AND a.metadata->>'res_id' = r.id::text
    ) INTO v_already;

    IF NOT v_already THEN
      INSERT INTO public.automated_notifications
        (user_id, channel, title, body, vertical, priority,
         status, scheduled_for, sent_at, metadata)
      VALUES
        (v_user, 'push',
         '⏰ A reserva expira em breve',
         'Levante ' || r.product_name || ' × ' || r.quantity
           || ' na ' || r.store_name
           || ' com o código ' || r.pickup_code
           || ' — expira às ' || to_char(r.expires_at AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC.',
         'pharmacy', 'high',
         'sent', now(), now(),
         jsonb_build_object(
           'action_url', '/health/meds-availability',
           'content_type', 'reservation_reminder',
           'res_id', r.id,
           'pickup_code', r.pickup_code
         ));
      v_reminders := v_reminders + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'price_alerts', v_price_alerts,
    'reservation_reminders', v_reminders
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. GRANTs (assinaturas completas — lição 42883)
-- ─────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.run_watch_checks() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Índices de suporte
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_anotif_metadata_res
  ON public.automated_notifications ((metadata->>'res_id'))
  WHERE metadata ? 'res_id';

CREATE INDEX IF NOT EXISTS idx_anotif_user_sent
  ON public.automated_notifications(user_id, sent_at DESC);
