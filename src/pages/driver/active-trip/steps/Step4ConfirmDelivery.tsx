import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/design-system';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  CheckCircle,
  Wallet,
} from '@/components/icons/lucide-compat';
import { PhotoProofStep, RatingStars } from '../ui';
import type { SimulatedTrip } from '../types';

export function Step4ConfirmDelivery({
  trip,
  customerRating,
  onRate,
  photoCaptured,
  onCapturePhoto,
  onConfirm,
}: {
  trip: SimulatedTrip;
  customerRating: number;
  onRate: (v: number) => void;
  photoCaptured: boolean;
  onCapturePhoto: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col gap-5"
    >
      {/* Step title */}
      <div className="text-center mb-1">
        <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-3">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-sm font-semibold">CONFIRMAR ENTREGA</span>
        </div>
      </div>

      {/* Delivery location confirmation */}
      <GlassCard className="bg-zinc-900/80 border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base">{trip.customerName}</h3>
            <p className="text-zinc-400 text-sm mt-1 leading-tight">{trip.customerAddress}</p>
          </div>
          <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
        </div>
      </GlassCard>

      {/* Photo proof */}
      <div className="flex flex-col items-center">
        <PhotoProofStep captured={photoCaptured} onCapture={onCapturePhoto} />
      </div>

      {/* Customer rating */}
      <GlassCard className="bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col items-center gap-3 py-2">
          <span className="text-zinc-400 text-sm">Como foi a entrega?</span>
          <RatingStars rating={customerRating} onRate={onRate} />
          {customerRating > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-amber-400 text-sm font-medium"
            >
              {customerRating <= 2 ? 'Poderia ser melhor' : customerRating <= 4 ? 'Boa entrega!' : 'Excelente! 🎉'}
            </motion.p>
          )}
        </div>
      </GlassCard>

      {/* Earnings card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent border border-emerald-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold">Ganhos desta entrega</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-white">
              +{trip.driverEarnings}
            </span>
            <span className="text-emerald-400 font-semibold text-lg">MZN</span>
          </div>
          <p className="text-zinc-500 text-xs mt-2">
            Ordem {trip.orderNumber} • {trip.paymentMethod}
          </p>
        </div>
      </motion.div>

      <div className="h-4" />

      {/* Confirm button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={onConfirm}
          className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-base font-bold shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform"
        >
          <CheckCircle className="w-5 h-5 mr-1" />
          CONFIRMAR ENTREGA
        </Button>
      </motion.div>
    </motion.div>
  );
}
