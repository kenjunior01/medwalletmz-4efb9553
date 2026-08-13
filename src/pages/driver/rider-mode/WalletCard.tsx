import { AnimatePresence, motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/design-system';
import {
  Wallet,
  ChevronRight,
  AlertTriangle,
} from '@/components/icons/lucide-compat';
import { formatMZN, MIN_WALLET_BALANCE } from './types';

interface WalletCardProps {
  isOnline: boolean;
  walletBalance: number;
  balanceLoading: boolean;
  showBalanceWarning: boolean;
  onTopUp: () => void;
}

export function WalletCard({
  isOnline,
  walletBalance,
  balanceLoading,
  showBalanceWarning,
  onTopUp,
}: WalletCardProps) {
  return (
    <GlassCard
      className={`border ${
        isOnline
          ? 'bg-zinc-900/80 border-white/5'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              isOnline
                ? 'bg-emerald-500/15'
                : 'bg-primary/10'
            }`}
          >
            <Wallet
              className={`w-5 h-5 ${
                isOnline ? 'text-emerald-400' : 'text-primary'
              }`}
            />
          </div>
          <div>
            <p
              className={`text-xs ${
                isOnline ? 'text-white/50' : 'text-muted-foreground'
              }`}
            >
              Saldo da Carteira
            </p>
            {balanceLoading ? (
              <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mt-0.5" />
            ) : (
              <p
                className={`text-xl font-bold tabular-nums ${
                  walletBalance < MIN_WALLET_BALANCE
                    ? 'text-amber-500'
                    : isOnline
                    ? 'text-white'
                    : 'text-foreground'
                }`}
              >
                {formatMZN(walletBalance)}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onTopUp}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
            isOnline
              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 active:bg-emerald-500/30'
              : 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25'
          }`}
        >
          Carregar
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Balance warning */}
      <AnimatePresence>
        {showBalanceWarning && !balanceLoading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className={`mt-3 flex items-start gap-2 p-2.5 rounded-lg ${
                isOnline
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  isOnline ? 'text-amber-400' : 'text-amber-600'
                }`}
              />
              <div>
                <p
                  className={`text-xs font-medium ${
                    isOnline ? 'text-amber-300' : 'text-amber-800'
                  }`}
                >
                  Saldo minimo necessario: {MIN_WALLET_BALANCE} MZN
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    isOnline ? 'text-amber-400/70' : 'text-amber-700'
                  }`}
                >
                  Carregue a sua carteira para ficar online e receber entregas.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
