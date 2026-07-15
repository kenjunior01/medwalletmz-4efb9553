-- =====================================================================
-- M-PESA MANUAL PAYMENTS — fluxo sem API
-- =====================================================================
-- Tabela para suportar o fluxo manual de M-Pesa:
--   1. Sistema gera referência (MW-XXXXXX)
--   2. Cliente paga via M-Pesa no telemódel
--   3. Admin confirma manualmente com o ID de transação M-Pesa
--   4. Status → confirmed dispara ações (libertar pedido, pagar APE, etc.)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.mpesa_manual_payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference            TEXT UNIQUE NOT NULL,
  amount_mzn           NUMERIC(10,2) NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','confirmed','rejected','expired')),
  payer_phone          TEXT,
  payer_name           TEXT,
  mpesa_transaction_id TEXT,
  destination_number   TEXT NOT NULL DEFAULT '+258840000000',
  confirmed_at         TIMESTAMPTZ,
  confirmed_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mpesa_status     ON public.mpesa_manual_payments(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_reference  ON public.mpesa_manual_payments(reference);
CREATE INDEX IF NOT EXISTS idx_mpesa_created    ON public.mpesa_manual_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mpesa_payer      ON public.mpesa_manual_payments(payer_phone);

ALTER TABLE public.mpesa_manual_payments ENABLE ROW LEVEL SECURITY;

-- Admin pode ver tudo
CREATE POLICY "mpesa admin read"   ON public.mpesa_manual_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
CREATE POLICY "mpesa admin write"  ON public.mpesa_manual_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));

-- Cliente pode ver os seus próprios pagamentos (via payer_phone match)
CREATE POLICY "mpesa owner read"   ON public.mpesa_manual_payments FOR SELECT TO authenticated
  USING (payer_phone IS NOT NULL AND payer_phone = (
    SELECT phone FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Qualquer utilizador autenticado pode criar pagamento (fluxo de checkout)
CREATE POLICY "mpesa insert"       ON public.mpesa_manual_payments FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT SELECT ON public.mpesa_manual_payments TO anon, authenticated;
GRANT INSERT, UPDATE ON public.mpesa_manual_payments TO authenticated;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mpesa_touch ON public.mpesa_manual_payments;
CREATE TRIGGER trg_mpesa_touch
  BEFORE UPDATE ON public.mpesa_manual_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

SELECT 'M-Pesa manual payments table created — fluxo sem API ativo' as result;
