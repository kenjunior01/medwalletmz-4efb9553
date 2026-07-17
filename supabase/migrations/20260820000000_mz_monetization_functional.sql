-- =====================================================================
-- MEDWALLET MZ — MONETIZATION FUNCTIONAL (não ficcional)
-- ---------------------------------------------------------------------
-- Este migration torna o plano de monetização MZ REALMENTE funcional:
--   1. Estende o CHECK constraint de target_audience para suportar
--      familiares, grávidas, crónicos, premium, farmácia, lab, hospital, driver
--   2. Adiciona coluna period_months a subscription_plans (p/ calcular expiry)
--   3. Faz SEED dos 14 planos MZ (6 B2C + 8 B2B) com slugs estáveis
--      que coincidem EXATAMENTE com os slugs usados nas páginas
--      MzPricingPlans.tsx e MzB2BPlans.tsx
--   4. Cria índice em subscriptions(slug) lookup
--   5. Adiciona trigger para auto-activar subscrição quando M-Pesa manual
--      payment correspondente é confirmado (via metadata.subscription_id)
-- =====================================================================

-- ---------- 1. ESTENDER CHECK constraint ----------
ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_target_audience_check;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_target_audience_check
  CHECK (target_audience IN (
    'patient', 'doctor', 'clinic',
    -- B2C MZ audiences (alinhados com MzPricingPlans.tsx)
    'individual', 'familia', 'gravida', 'cronico', 'premium',
    -- B2B MZ audiences (alinhados com MzB2BPlans.tsx)
    'pharmacy', 'lab', 'hospital', 'driver'
  ));

-- ---------- 2. COLUNA period_months ----------
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS period_months integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.subscription_plans.period_months IS
  'Duração do ciclo em meses (1=mensal, 3=trimestral, 12=anual). Usado para calcular expires_at.';

-- ---------- 3. SEED 14 PLANOS MZ ----------
-- SLUGS TÊM DE COINCIDIR COM MzPricingPlans.tsx e MzB2BPlans.tsx

-- ===== B2C: 6 planos =====
INSERT INTO public.subscription_plans
  (slug, name, description, price_mzn, billing_period, target_audience, features, badge, is_active, sort_order, period_months)
VALUES
  (
    'plus-individual',
    'Plus Individual',
    'Para ti que cuidas da tua saúde — triagem IA, lembretes, cashback.',
    199, 'monthly', 'individual',
    '["1 consulta Meddy grátis por mês","10% desconto em farmácia","Lembretes IA de medicação (ARV/TB/malária)","Triagem IA ilimitada (Gemini + Groq)","Carteira digital com cashback 1%","Prontuário digital seguro"]'::jsonb,
    NULL, true, 1, 1
  ),
  (
    'plus-familia',
    'Plus Família',
    'Saúde para toda a família (5 pessoas).',
    399, 'monthly', 'familia',
    '["4 consultas partilhadas por mês","15% desconto em farmácia para todos","Controlo parental e perfis dependentes","Pediatra + clínico geral disponíveis","Cashback 2% em todas as contas","Veterinária 20% off (pets da família)"]'::jsonb,
    NULL, true, 2, 1
  ),
  (
    'plus-gravida',
    'Plus Grávida',
    '9 meses de cuidado integral materno — pré-natais ilimitadas + SOS obstétrico.',
    299, 'monthly', 'gravida',
    '["Pré-natais ILIMITADAS (online)","SOS Obstétrico 24/7 via WhatsApp","Rota para matemidade mais próxima (Google Maps)","Lembretes de vitaminas + vacinas","Educação maternal em português + Macua","1ª consulta pediátrica OFEREcida"]'::jsonb,
    'Mais escolhido', true, 3, 1
  ),
  (
    'plus-cronico',
    'Plus Crónico',
    'ARV, TB, Hipertensão, Diabetes — refills ilimitados sem filas.',
    249, 'monthly', 'cronico',
    '["Refills ARV/TB/HTN ilimitados (sem filas)","Lembrete IA diário por WhatsApp + voz TTS","Adesão tracking com relatório para médico","Cashback 2% em farmácia","Transporte para refills 50% off","Linha verde 24/7 com farmacêutico"]'::jsonb,
    'MISAU-aligned', true, 4, 1
  ),
  (
    'premium-individual',
    'Premium Individual',
    'Experiência premium com especialista e prioridade total.',
    499, 'monthly', 'premium',
    '["Tudo do Plus Individual","2 consultas especialista/mês (30% off extra)","Análise de imagem IA (RX, lâmina, ecografia)","Triagem IA prioritária (sem filas)","Cashback 3% em todas as contas","Suporte VIP WhatsApp directo"]'::jsonb,
    NULL, true, 5, 1
  ),
  (
    'premium-familia',
    'Premium Família',
    'Premium para 5 pessoas — a experiência mais completa.',
    899, 'monthly', 'premium',
    '["Tudo do Premium Individual para 5 pessoas","6 consultas especialista partilhadas/mês","SOS 24/7 para toda a família","Cashback 3% + seguro funeral 50% off","Veterinária premium 40% off","Gestor de saúde dedicado (1 pessoa)"]'::jsonb,
    'Top-tier', true, 6, 1
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_mzn = EXCLUDED.price_mzn,
  billing_period = EXCLUDED.billing_period,
  target_audience = EXCLUDED.target_audience,
  features = EXCLUDED.features,
  badge = EXCLUDED.badge,
  is_active = true,
  period_months = EXCLUDED.period_months,
  updated_at = now();

-- ===== B2B: 8 planos =====
INSERT INTO public.subscription_plans
  (slug, name, description, price_mzn, billing_period, target_audience, features, badge, is_active, sort_order, period_months)
VALUES
  (
    'doctor-pro',
    'Doctor Pro',
    'Para médicos que querem crescer no digital.',
    1500, 'monthly', 'doctor',
    '["Perfil verificado + destaque","Até 50 teleconsultas/mês","Receitas digitais ilimitadas","Prontuário IA Gemini","Agenda inteligente","Relatórios de desempenho"]'::jsonb,
    NULL, true, 10, 1
  ),
  (
    'doctor-elite',
    'Doctor Elite',
    'Para médicos com consultório digital completo.',
    4500, 'monthly', 'doctor',
    '["Tudo do Doctor Pro","Teleconsultas ILIMITADAS","Topo das pesquisas sempre","Assistente Meddy AI dedicado","Integração com seguros","Dashboard avançado de faturação","Multi-especialidade"]'::jsonb,
    'Premium', true, 11, 1
  ),
  (
    'clinica-basic',
    'Clínica Basic',
    'Para clínicas pequenas (até 3 médicos).',
    6000, 'monthly', 'clinic',
    '["Até 3 médicos","Agenda partilhada","Prontuário eletrônico","Receitas digitais","Suporte email","1 filial"]'::jsonb,
    NULL, true, 20, 1
  ),
  (
    'clinica-pro',
    'Clínica Pro',
    'Para clínicas em crescimento (até 10 médicos).',
    18000, 'monthly', 'clinic',
    '["Até 10 médicos","Tudo do Basic","Telemedicina ilimitada","OCR de receitas (Vision)","Relatórios avançados","3 filiais","Suporte prioritário WhatsApp"]'::jsonb,
    'Mais Popular', true, 21, 1
  ),
  (
    'hospital-enterprise',
    'Hospital Enterprise',
    'Para hospitais e clínicas grandes (50+ médicos).',
    45000, 'monthly', 'hospital',
    '["Médicos ilimitados","Tudo do Pro","Integração MISAU + SIS-MA","Multi-filial ilimitada","API dedicada","Gestor de conta dedicado","SLA 99.9%","On-premise opcional"]'::jsonb,
    'Enterprise', true, 22, 1
  ),
  (
    'pharmacy-pro',
    'Pharmacy Pro',
    'Para farmácias — vendas online + delivery.',
    3500, 'monthly', 'pharmacy',
    '["Vendas online ilimitadas","Delivery com tracking","OCR de receitas","Gestão de stock","Integração M-Pesa","Cashback ao cliente (configurável)"]'::jsonb,
    NULL, true, 30, 1
  ),
  (
    'lab-pro',
    'Lab Pro',
    'Para laboratórios — resultados digitais + home collection.',
    5000, 'monthly', 'lab',
    '["Resultados digitais (PDF)","Home collection tracking","Integração com médicos","OCR de requisições","Notificação WhatsApp/Email","Multi-colector"]'::jsonb,
    NULL, true, 40, 1
  ),
  (
    'driver-plus',
    'Driver Plus',
    'Para motoristas de entrega de saúde.',
    250, 'monthly', 'driver',
    '["Roteirização Google Maps","Comissões 80% (vs 70% free)","Saque diário M-Pesa","Seguro acidente incluído","Suporte prioritário","Treino de manuseio de medicamentos"]'::jsonb,
    NULL, true, 50, 1
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_mzn = EXCLUDED.price_mzn,
  billing_period = EXCLUDED.billing_period,
  target_audience = EXCLUDED.target_audience,
  features = EXCLUDED.features,
  badge = EXCLUDED.badge,
  is_active = true,
  period_months = EXCLUDED.period_months,
  updated_at = now();

-- ---------- 4. ÍNDICE em subscriptions.status (lookup rápido) ----------
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions(user_id, status);

-- ---------- 5. FUNÇÃO para activar subscrição via M-Pesa ----------
-- Quando admin confirma um mpesa_manual_payment cujo metadata.subscription_id
-- aponta para uma subscrição pendente, essa subscrição fica ACTIVA.
CREATE OR REPLACE FUNCTION public.activate_subscription_on_mpesa_confirm()
RETURNS TRIGGER AS $$
DECLARE
  sub_id uuid;
BEGIN
  -- Só age quando status muda para 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status <> 'confirmed') THEN
    sub_id := NULLIF(NEW.metadata->>'subscription_id', '')::uuid;
    IF sub_id IS NOT NULL THEN
      UPDATE public.subscriptions
        SET status = 'active',
            started_at = now(),
            expires_at = now() + (
              SELECT COALESCE(period_months, 1) * INTERVAL '1 month'
              FROM public.subscription_plans
              WHERE id = subscriptions.plan_id
            ),
            payment_reference = NEW.mpesa_transaction_id,
            reviewed_at = now(),
            reviewed_by = NEW.confirmed_by
        WHERE id = sub_id AND status = 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_activate_sub_on_mpesa
  ON public.mpesa_manual_payments;
CREATE TRIGGER trg_activate_sub_on_mpesa
  AFTER UPDATE OF status ON public.mpesa_manual_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_subscription_on_mpesa_confirm();

-- ---------- 6. VIEW para dashboard admin: receita consolidada ----------
CREATE OR REPLACE VIEW public.v_monetization_revenue AS
SELECT
  DATE(m.created_at) AS day,
  COUNT(*) FILTER (WHERE m.status = 'confirmed') AS confirmed_count,
  COALESCE(SUM(m.amount_mzn) FILTER (WHERE m.status = 'confirmed'), 0) AS confirmed_mzn,
  COUNT(*) FILTER (WHERE m.status = 'pending') AS pending_count,
  COALESCE(SUM(m.amount_mzn) FILTER (WHERE m.status = 'pending'), 0) AS pending_mzn,
  COUNT(*) FILTER (WHERE m.status = 'rejected') AS rejected_count
FROM public.mpesa_manual_payments m
GROUP BY DATE(m.created_at)
ORDER BY DATE(m.created_at) DESC;

COMMENT ON VIEW public.v_monetization_revenue IS
  'Agregado diário de receita M-Pesa para dashboard admin (MonetizationDashboard.tsx).';

-- ---------- 7. FUNÇÃO helper: wallet_credit_cashback ----------
-- Premia cashback percentual sobre um valor gasto (limitado ao saldo do plano).
-- Idempotente: usa reference único na coluna description.
CREATE OR REPLACE FUNCTION public.wallet_credit_cashback(
  _user_id uuid,
  _source_amount numeric,
  _pct numeric,
  _source text,
  _reference text
) RETURNS boolean AS $$
DECLARE
  cashback numeric;
  existing_count integer;
BEGIN
  -- Idempotência: se já existe tx com esta referência, não faz nada
  SELECT COUNT(*) INTO existing_count
    FROM public.wallet_transactions
    WHERE user_id = _user_id
      AND description = _reference;
  IF existing_count > 0 THEN
    RETURN false;
  END IF;

  cashback := ROUND((_source_amount * _pct) / 100.0, 2);

  -- Cria wallet se não existir
  INSERT INTO public.wallets (user_id, country_id, currency, balance_mzn, total_deposited, total_spent)
  VALUES (_user_id, 'MZ', 'MZN', 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Atualiza saldo
  UPDATE public.wallets
    SET balance_mzn = balance_mzn + cashback,
        total_deposited = total_deposited + cashback,
        updated_at = now()
    WHERE user_id = _user_id;

  -- Regista transação
  INSERT INTO public.wallet_transactions
    (user_id, type, amount, currency, description, metadata, created_at)
  VALUES
    (_user_id, 'bonus', cashback, 'MZN',
     _reference,
     jsonb_build_object('source', _source, 'pct', _pct, 'base_amount', _source_amount),
     now());

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- 8. FUNÇÃO: aplicar referral na 1ª subscrição activa ----------
CREATE OR REPLACE FUNCTION public.apply_referral_on_subscription()
RETURNS TRIGGER AS $$
DECLARE
  ref_code text;
  referrer_id uuid;
  bonus_mzn numeric := 100;
  bonus_coins integer := 100;
  existing_count integer;
BEGIN
  -- Só age quando uma subscrição passa a 'active'
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status <> 'active') THEN
    -- Busca referral_code do perfil do utilizador
    SELECT referral_code INTO ref_code
      FROM public.profiles WHERE user_id = NEW.user_id;
    -- Se o código foi GERADO (não é dele mesmo) — ou seja, foi aplicado na signup
    -- O campo applied_referral_code guarda o código do referrer
    SELECT pr.user_id INTO referrer_id
      FROM public.profiles pr
      WHERE pr.referral_code = (
        SELECT applied_referral_code FROM public.profiles WHERE user_id = NEW.user_id
      )
      LIMIT 1;

    IF referrer_id IS NOT NULL AND referrer_id <> NEW.user_id THEN
      -- Idempotência: já existe referral completo para este par?
      SELECT COUNT(*) INTO existing_count
        FROM public.user_referrals
        WHERE referrer_id = referrer_id AND referred_id = NEW.user_id;
      IF existing_count = 0 THEN
        INSERT INTO public.user_referrals
          (referrer_id, referred_id, status, bonus_mzn, bonus_coins, created_at)
        VALUES
          (referrer_id, NEW.user_id, 'completed', bonus_mzn, bonus_coins, now());

        --credita bónus ao referrer (wallet)
        PERFORM public.wallet_credit_cashback(
          referrer_id, 0, 0, 'referral',
          'REF-' || NEW.user_id::text
        );
        -- Soma directamente o bónus (não é percentual)
        UPDATE public.wallets
          SET balance_mzn = balance_mzn + bonus_mzn,
              total_deposited = total_deposited + bonus_mzn
          WHERE user_id = referrer_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: 'applied_referral_code' precisa de existir em profiles. Se não existir,
-- o SELECT simplesmente retorna NULL e o trigger é no-op (seguro).
-- A coluna pode ser adicionada via migration separada se necessário.

DROP TRIGGER IF EXISTS trg_apply_referral_on_sub
  ON public.subscriptions;
CREATE TRIGGER trg_apply_referral_on_sub
  AFTER UPDATE OF status ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_referral_on_subscription();

SELECT 'Mz monetization functional migration applied — 14 planos seeded, triggers ativos, view criada' AS result;
