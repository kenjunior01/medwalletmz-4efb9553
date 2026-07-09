-- Habilitar RLS em tabelas críticas se ainda não estiverem
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Política para Gestores de País verem as carteiras APENAS do seu país
CREATE POLICY "Country Managers can view wallets in their country"
ON public.wallets
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.country_management cm
        WHERE cm.user_id = auth.uid() AND cm.country_id = public.wallets.country_id
    ) OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- Política para Gestores de País gerirem ordens no seu país
CREATE POLICY "Country Managers can manage orders in their country"
ON public.orders
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.country_management cm
        WHERE cm.user_id = auth.uid() AND cm.country_id = public.orders.country_id
    ) OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- Política para evitar que utilizadores de um país vejam médicos de outro por padrão (Otimização)
CREATE POLICY "Users see doctors from their country"
ON public.doctor_profiles
FOR SELECT
USING (
    country_id = (SELECT country_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('admin', 'country_manager')
);
