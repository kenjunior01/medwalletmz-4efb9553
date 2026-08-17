import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from '@/components/icons/lucide-compat';
import { formatTimer } from './types';
import type { SimulatedTrip } from './types';

interface CompletionScreenProps {
  trip: SimulatedTrip;
  elapsedSeconds: number;
  onNavigateToDashboard: () => void;
}

export function CompletionScreen({ trip, elapsedSeconds, onNavigateToDashboard }: CompletionScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-zinc-950 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
          className="w-24 h-24 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center mb-6"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
          >
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </motion.div>
        </motion.div>

        <h1 className="text-2xl font-bold text-white mb-2">Entrega Concluída!</h1>
        <p className="text-zinc-400 text-sm mb-6">
          A encomenda {trip.orderNumber} foi entregue com sucesso.
        </p>

        {/* Earnings highlight */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 rounded-2xl p-6 w-full mb-8">
          <p className="text-emerald-400 text-sm font-medium mb-1">Ganhou nesta entrega</p>
          <div className="flex items-baseline gap-1 justify-center">
            <span className="text-4xl font-extrabold text-white">+{trip.driverEarnings}</span>
            <span className="text-emerald-400 font-bold text-xl">MZN</span>
          </div>
          <p className="text-zinc-500 text-xs mt-2">Tempo total: {formatTimer(elapsedSeconds)}</p>
        </div>

        <Button
          onClick={onNavigateToDashboard}
          className="w-full h-13 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30"
        >
          Voltar ao Painel
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
