import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/design-system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Navigation,
  MapPin,
  Package,
  Phone,
  MessageSquare,
  CheckCircle,
  Flag,
  Truck,
  User,
} from '@/components/icons/lucide-compat';
import { formatMZN } from '../types';
import type { SimulatedTrip } from '../types';

export function Step3GoingToCustomer({
  trip,
  onAction,
}: {
  trip: SimulatedTrip;
  onAction: () => void;
}) {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col gap-4"
    >
      {/* Step title */}
      <div className="text-center mb-1">
        <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/30 rounded-full px-4 py-1.5 mb-3">
          <Truck className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400 text-sm font-semibold">A CAMINHO PARA ENTREGA</span>
        </div>
      </div>

      {/* Customer info */}
      <GlassCard className="bg-zinc-900/80 border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base">{trip.customerName}</h3>
            <p className="text-zinc-500 text-xs mt-0.5">{trip.customerPhone}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-blue-300 text-sm font-medium leading-tight">
                {trip.customerAddress}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Action buttons row */}
      <div className="flex gap-2">
        <a
          href={`tel:${trip.customerPhone}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
          aria-label="Ligar ao cliente"
        >
          <Phone className="w-4 h-4 text-emerald-400" />
          <span className="text-zinc-300 text-sm font-medium">Ligar</span>
        </a>
        <a
          href={`sms:${trip.customerPhone}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors"
          aria-label="Enviar mensagem"
        >
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span className="text-zinc-300 text-sm font-medium">Mensagem</span>
        </a>
      </div>

      {/* ETA card */}
      <GlassCard className="bg-zinc-900/60 border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-400 text-sm">Tempo estimado</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold text-sm">{trip.estimatedTime}</span>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
              {trip.estimatedDistance}
            </Badge>
          </div>
        </div>
      </GlassCard>

      {/* Order summary */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
            Resumo da encomenda
          </span>
        </div>
        <GlassCard className="bg-zinc-900/60 border-zinc-800">
          <div className="flex flex-col gap-1.5">
            {trip.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-zinc-300 text-sm">{item.name}</span>
                  <span className="text-zinc-600 text-xs">×{item.quantity}</span>
                </div>
                <span className="text-zinc-400 text-sm">{formatMZN(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="h-px bg-zinc-800 my-1" />
            <div className="flex justify-between text-sm font-medium">
              <span className="text-zinc-400">Total</span>
              <span className="text-white">{formatMZN(trip.orderTotal + trip.deliveryFee)}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="h-4" />

      {/* Action button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={onAction}
          className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-base font-bold shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-transform"
        >
          <Flag className="w-5 h-5 mr-1" />
          CHEGUEI — ENTREGAR
        </Button>
      </motion.div>
    </motion.div>
  );
}
