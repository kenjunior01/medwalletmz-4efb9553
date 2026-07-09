-- Tabela de Pedidos em Tempo Real (Uber Style)
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    country_id TEXT REFERENCES public.countries(id),
    service_type TEXT NOT NULL, -- 'urgent_consultation', 'medicine_delivery'
    status TEXT NOT NULL DEFAULT 'searching', -- 'searching', 'accepted', 'arrived', 'completed', 'cancelled'

    -- Localização do Pedido
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address_text TEXT,

    -- Profissional que aceitou
    provider_id UUID REFERENCES auth.users(id),

    -- Detalhes adicionais
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Realtime para esta tabela
ALTER publication supabase_realtime ADD TABLE service_requests;

-- Função para encontrar médicos num raio de X km
CREATE OR REPLACE FUNCTION get_nearby_providers(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION,
    p_service_type TEXT
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    distance DOUBLE PRECISION,
    token TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.user_id as id,
        p.full_name,
        (6371 * acos(cos(radians(user_lat)) * cos(radians(dp.latitude)) * cos(radians(dp.longitude) - radians(user_lng)) + sin(radians(user_lat)) * sin(radians(dp.latitude)))) AS distance,
        ft.token
    FROM
        doctor_profiles dp
    JOIN
        profiles p ON dp.user_id = p.user_id
    LEFT JOIN
        fcm_tokens ft ON p.user_id = ft.user_id
    WHERE
        dp.is_available = true
        AND (6371 * acos(cos(radians(user_lat)) * cos(radians(dp.latitude)) * cos(radians(dp.longitude) - radians(user_lng)) + sin(radians(user_lat)) * sin(radians(dp.latitude)))) < radius_km
    ORDER BY
        distance ASC;
END;
$$ LANGUAGE plpgsql;
