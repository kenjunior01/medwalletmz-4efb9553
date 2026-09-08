-- ============================================================================
-- RIDER MARKETPLACE VISIBILITY
-- Problema: os estafetas não conseguiam VER entregas pendentes sem estafeta
-- (as policies existentes só permitem ver entregas já atribuídas), o que
-- forçava as versões web e Flutter a mostrarem dados de demonstração.
-- Solução: estafetas registados (linha em health_riders com o seu user_id)
-- podem ver entregas 'pending' sem atribuição e podem ACEITÁ-LAS
-- (UPDATE para status='accepted' com o seu próprio rider_id).
-- 100% aditivo e idempotente.
-- ============================================================================

-- Ver: entregas pendentes sem estafeta (marketplace de entregas)
DROP POLICY IF EXISTS "Riders can view pending unassigned deliveries" ON public.health_deliveries;
CREATE POLICY "Riders can view pending unassigned deliveries"
  ON public.health_deliveries
  FOR SELECT
  USING (
    rider_id IS NULL
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.health_riders hr
      WHERE hr.user_id = auth.uid()
    )
  );

-- Aceitar: reivindicar uma entrega pendente (define rider_id + status='accepted')
DROP POLICY IF EXISTS "Riders can accept pending unassigned deliveries" ON public.health_deliveries;
CREATE POLICY "Riders can accept pending unassigned deliveries"
  ON public.health_deliveries
  FOR UPDATE
  USING (
    rider_id IS NULL
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.health_riders hr
      WHERE hr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'accepted'
    AND rider_id IN (
      SELECT id FROM public.health_riders WHERE user_id = auth.uid()
    )
  );

-- Índice parcial para a fila do marketplace (consulta por status + data)
CREATE INDEX IF NOT EXISTS idx_health_deliveries_pending_queue
  ON public.health_deliveries (country_code, created_at)
  WHERE status = 'pending' AND rider_id IS NULL;
