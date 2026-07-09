-- Tabela para Termos e Condições Localizados
CREATE TABLE IF NOT EXISTS public.legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id TEXT REFERENCES public.countries(id),
    type TEXT NOT NULL, -- 'terms_of_service', 'privacy_policy'
    language_code TEXT NOT NULL, -- 'pt', 'en', 'hi', etc.
    content TEXT NOT NULL, -- Markdown ou HTML
    version TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(country_id, type, language_code, version)
);

-- Seed básico para Termos Globais
INSERT INTO public.legal_documents (country_id, type, language_code, content, version)
VALUES
('US', 'terms_of_service', 'en', '# Terms of Service (USA)\nCompliant with HIPAA...', '1.0'),
('PT', 'terms_of_service', 'pt', '# Termos de Serviço (Portugal)\nConforme RGPD...', '1.0'),
('MZ', 'terms_of_service', 'pt', '# Termos de Serviço (Moçambique)\nSaúde e Pagamentos Locais...', '1.0'),
('BR', 'terms_of_service', 'pt', '# Termos de Serviço (Brasil)\nConforme LGPD...', '1.0')
ON CONFLICT DO NOTHING;
