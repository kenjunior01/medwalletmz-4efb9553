import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  MapPin,
  Navigation,
  Clock,
  Target,
  Zap,
  Volume2,
  X,
  Check,
} from '@/components/icons/lucide-compat';
import { CountdownRing } from './CountdownRing';
import type { SimulatedTrip } from './types';
import { COUNTDOWN_SECONDS, BONUS_PER_DELIVERY } from './types';

interface IncomingTripOverlayProps {
  incomingTrip: SimulatedTrip | null;
  countdown: number;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingTripOverlay({
  incomingTrip,
  countdown,
  onAccept,
  onReject,
}: IncomingTripOverlayProps) {
  return (
    <AnimatePresence>
      {incomingTrip && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-50 flex flex-col"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Trip card */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280, delay: 0.05 }}
            className="relative z-10 mt-auto w-full max-w-lg mx-auto"
          >
            <div className="bg-zinc-900 rounded-t-3xl overflow-hidden shadow-2xl">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="px-6 pt-2 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      <Package className="w-5 h-5 text-emerald-400" />
                    </motion.div>
                    <h2 className="text-lg font-bold text-white">Nova Entrega</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Vibration indicator */}
                    <div className="flex items-center gap-1 text-white/40">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    {/* Countdown ring */}
                    <CountdownRing seconds={countdown} total={COUNTDOWN_SECONDS} />
                  </div>
                </div>
              </div>

              {/* Trip details */}
              <div className="px-6 pb-4 space-y-4">
                {/* Pickup */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-0.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <div className="w-0.5 h-10 bg-white/10 my-1" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wider">
                      Levantar em
                    </p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {incomingTrip.storeName}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {incomingTrip.storeAddress}
                    </p>
                  </div>
                </div>

                {/* Delivery */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-0.5">
                    <div className="w-3 h-3 rounded-sm bg-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-white/50 font-medium uppercase tracking-wider">
                      Entregar em
                    </p>
                    <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {incomingTrip.deliveryAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trip meta info */}
              <div className="px-6 pb-4">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-white/60">Distancia</span>
                    <span className="text-sm font-semibold text-white">
                      {incomingTrip.distance} km
                    </span>
                  </div>
                  <div className="w-px h-4 bg-white/10" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-white/60">Tempo est.</span>
                    <span className="text-sm font-semibold text-white">
                      {incomingTrip.estimatedTime} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Earnings highlight */}
              <div className="px-6 pb-5">
                <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-emerald-300 font-medium">
                    Ganho nesta entrega
                  </span>
                  <span className="text-xl font-bold text-emerald-400">
                    +{incomingTrip.earnings + BONUS_PER_DELIVERY} MZN
                  </span>
                  <span className="text-xs text-emerald-300/70 ml-1">incl. bónus</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 px-6 pb-8">
                {/* Reject */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onReject}
                  className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-base transition-colors hover:bg-red-500/25 active:bg-red-500/35"
                >
                  <X className="w-5 h-5" />
                  REJEITAR
                </motion.button>

                {/* Accept */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onAccept}
                  className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-emerald-500 text-white font-bold text-base shadow-[0_4px_20px_rgba(16,185,129,0.4)] transition-colors hover:bg-emerald-400 active:bg-emerald-600"
                >
                  <Check className="w-5 h-5" />
                  ACEITAR
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
