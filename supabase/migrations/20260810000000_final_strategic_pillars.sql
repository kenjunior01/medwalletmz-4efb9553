-- ============================================================
-- MedWallet Global — Consolidação Estratégica
-- ============================================================

-- 1. Adicionar Role Veterinário ao Enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'veterinary';

-- 2. Reforço da Segurança do Chat (Backend-First)
-- Garante que anexos só possam ser inseridos se o sender for participante da consulta
CREATE OR REPLACE FUNCTION public.validate_chat_participant()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.consultations c
        WHERE c.id = NEW.consultation_id
        AND (c.doctor_id = NEW.sender_id OR c.patient_id = NEW.sender_id)
    ) THEN
        RAISE EXCEPTION 'Acesso negado: O remetente não é participante desta consulta.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_validate_chat_participant ON public.consultation_messages;
CREATE TRIGGER tr_validate_chat_participant
BEFORE INSERT ON public.consultation_messages
FOR EACH ROW EXECUTE FUNCTION public.validate_chat_participant();

-- 3. Identidade Visual moçambicana por padrão no banco
UPDATE public.countries
SET branding_config = '{
    "primary_color": "#009739",
    "secondary_color": "#FFD100",
    "accent_color": "#D40000"
}'::jsonb
WHERE id = 'MZ';

-- 4. Audit Log para Transações de Wallet (Anti-Hacker)
CREATE TABLE IF NOT EXISTS public.wallet_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    old_balance decimal,
    new_balance decimal,
    action_type text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.wallet_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins only audit view" ON public.wallet_audit_logs FOR SELECT USING (public.is_global_admin());

-- Trigger para logar automaticamente qualquer mudança no saldo
CREATE OR REPLACE FUNCTION public.log_wallet_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallet_audit_logs (user_id, old_balance, new_balance, action_type)
    VALUES (NEW.user_id, OLD.balance_mzn, NEW.balance_mzn, 'update');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_wallet_change ON public.wallets;
CREATE TRIGGER tr_log_wallet_change
AFTER UPDATE OF balance_mzn ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.log_wallet_change();
