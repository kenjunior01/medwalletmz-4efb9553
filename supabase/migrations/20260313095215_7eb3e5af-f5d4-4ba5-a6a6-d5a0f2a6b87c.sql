
-- Permitir que utilizadores autenticados vejam perfis básicos (nome, telefone, veículo do motorista)
CREATE POLICY "Authenticated users can view basic profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
