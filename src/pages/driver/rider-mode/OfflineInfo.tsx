import { AnimatePresence, motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/design-system';
import {
  Package,
  TrendingUp,
  Shield,
  ChevronRight,
} from '@/components/icons/lucide-compat';

interface OfflineInfoProps {
  isOnline: boolean;
  onNavigateHistory: () => void;
  onNavigateEarnings: () => void;
  onNavigateDriver: () => void;
}

export function OfflineInfo({
  isOnline,
  onNavigateHistory,
  onNavigateEarnings,
  onNavigateDriver,
}: OfflineInfoProps) {
  return (
    <>
      {/* ── Ganhos Garantidos Info Box (when offline) ──────── */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard className="border bg-emerald-50/50 border-emerald-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Ganhos Garantidos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ganhos melhores que Yango: bónus por entrega + garantia semanal de 2.500 MZN + bónus de indicação de 200 MZN
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick Actions (when offline) ────────────────────── */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <GlassCard className="border">
              <div className="space-y-1">
                <button
                  onClick={onNavigateHistory}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 active:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Historico de Entregas</p>
                      <p className="text-xs text-muted-foreground">
                        Ver entregas anteriores
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <button
                  onClick={onNavigateEarnings}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 active:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Meus Ganhos</p>
                      <p className="text-xs text-muted-foreground">
                        Relatorios de ganhos
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <button
                  onClick={onNavigateDriver}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 active:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-50">
                      <Shield className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Seguro & Assistencia</p>
                      <p className="text-xs text-muted-foreground">
                        Protecao durante entregas
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
