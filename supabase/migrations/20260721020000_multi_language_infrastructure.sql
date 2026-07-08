-- ============================================================
-- MedWallet Global — Infraestrutura de Multi-Idioma e IA
-- ============================================================

-- 1. Adicionar suporte a idiomas na tabela de países
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS default_locale TEXT DEFAULT 'pt';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS supported_locales TEXT[] DEFAULT ARRAY['pt', 'en'];

-- 2. Tabela de Traduções de Conteúdo (Managed Content)
-- Usado para artigos, nomes de categorias, descrições de planos, etc.
CREATE TABLE IF NOT EXISTS public.content_translations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id uuid NOT NULL,
    column_name TEXT NOT NULL,
    locale TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    is_auto_translated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(table_name, record_id, column_name, locale)
);

-- 3. Função para detecção automática de idioma do utilizador
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'pt';

-- 4. RLS para traduções
ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Traduções são legíveis por todos" ON public.content_translations FOR SELECT USING (true);

-- 5. Função de auxílio para o Frontend: Obter texto traduzido
CREATE OR REPLACE FUNCTION get_translated_content(
    p_table TEXT,
    p_id uuid,
    p_column TEXT,
    p_locale TEXT,
    p_fallback TEXT
) RETURNS TEXT AS $$
DECLARE
    v_translation TEXT;
BEGIN
    SELECT translated_text INTO v_translation
    FROM public.content_translations
    WHERE table_name = p_table
      AND record_id = p_id
      AND column_name = p_column
      AND locale = p_locale;

    RETURN COALESCE(v_translation, p_fallback);
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Configurar países com idiomas específicos
UPDATE public.countries SET default_locale = 'pt', supported_locales = ARRAY['pt', 'en'] WHERE id = 'MZ';
UPDATE public.countries SET default_locale = 'pt', supported_locales = ARRAY['pt', 'en'] WHERE id = 'AO';
UPDATE public.countries SET default_locale = 'en', supported_locales = ARRAY['en', 'pt', 'zu', 'xh'] WHERE id = 'ZA';
UPDATE public.countries SET default_locale = 'pt', supported_locales = ARRAY['pt', 'en', 'es', 'fr'] WHERE id = 'PT';

-- Inserir UK e Índia para expansão futura
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, default_locale, supported_locales, config)
VALUES
('GB', 'United Kingdom', 'GBP', '£', '+44', 'en', ARRAY['en'], '{
    "payment_methods": [{"id": "stripe", "name": "Stripe", "type": "card", "icon": "💳"}],
    "features": {"telemedicine": true, "e_pharmacy": true}
}'::jsonb),
('IN', 'India', 'INR', '₹', '+91', 'hi', ARRAY['hi', 'en', 'bn'], '{
    "payment_methods": [{"id": "upi", "name": "UPI", "type": "mobile_money", "icon": "📱"}],
    "features": {"telemedicine": true, "e_pharmacy": true}
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
