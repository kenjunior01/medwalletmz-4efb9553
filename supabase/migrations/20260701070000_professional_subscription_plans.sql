-- Inserir Planos de Subscrição para Profissionais (Médicos)
INSERT INTO public.subscription_plans (name, description, price_mzn, billing_period, target_audience, features, is_active, badge, sort_order, slug)
VALUES
('Médico Starter', 'Para médicos em início de carreira no digital.', 1500, 'monthly', 'doctor', '["Perfil verificado", "Ate 10 teleconsultas/mês", "Receitas digitais ilimitadas"]'::jsonb, true, null, 1, 'doctor-starter'),
('Médico Pro', 'Aumente a sua visibilidade e agenda.', 3500, 'monthly', 'doctor', '["Destaque nas pesquisas", "Teleconsultas ilimitadas", "Suporte prioritário", "Relatórios de desempenho"]'::jsonb, true, 'Mais Popular', 2, 'doctor-pro'),
('Médico Elite', 'A solução completa para consultórios digitais.', 7500, 'monthly', 'doctor', '["Topo das pesquisas sempre", "Assistente Meddy AI dedicada", "Integração com seguros premium", "Dashboard avançado de faturação"]'::jsonb, true, 'Premium', 3, 'doctor-elite')
ON CONFLICT (slug) DO NOTHING;

-- Garantir que as tabelas de subscrição suportam múltiplas moedas se necessário,
-- mas por agora usamos price_mzn como base e convertemos na UI se necessário.
-- No futuro, podemos adicionar country_id aos planos para preços localizados.
