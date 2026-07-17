-- Adicionar country_id às contas de pagamento da plataforma
ALTER TABLE public.platform_payment_accounts ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);

-- Atualizar contas existentes para Moçambique
UPDATE public.platform_payment_accounts SET country_id = 'MZ' WHERE country_id IS NULL;

-- Permitir que utilizadores vejam apenas contas do seu país
DROP POLICY IF EXISTS "Active accounts publicly readable" ON public.platform_payment_accounts;
CREATE POLICY "Active accounts publicly readable" ON public.platform_payment_accounts
FOR SELECT
USING (
    is_active = true
    AND (
        country_id IS NULL
        OR country_id = (SELECT country_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    )
);
