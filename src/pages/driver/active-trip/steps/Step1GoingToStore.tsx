import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/design-system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Navigation,
  MapPin,
  Package,
  Phone,
  Clock,
  Store,
  User,
  Flag,
} from '@/components/icons/lucide-compat';
import { formatMZN } from '../types';
import type { SimulatedTrip } from '../types';

export function Step1GoingToStore({
  trip,
  onAction,
}: {
  trip: SimulatedTrip;
  onAction: () => void;
}) {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col gap-4"
    >
      {/* Step title */}
      <div className="text-center mb-1">
        <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-4 py-1.5 mb-3">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 text-sm font-semibold">A CAMINHO PARA LOJA</span>
        </div>
      </div>

      {/* Store info card */}
      <GlassCard className="bg-zinc-900/80 border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base truncate">{trip.storeName}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-400 text-sm leading-tight">{trip.storeAddress}</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-zinc-500 text-xs">
                <Flag className="w-3 h-3" />
                <span>{trip.estimatedDistance}</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-500 text-xs">
                <Clock className="w-3 h-3" />
                <span>{trip.estimatedTime}</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Items to pick up */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
            Artigos a levantar
          </span>
        </div>
        <GlassCard className="bg-zinc-900/60 border-zinc-800">
          <div className="flex flex-col divide-y divide-zinc-800/60">
            {trip.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300 text-sm">{item.name}</span>
                </div>
                <span className="text-zinc-500 text-sm">
                  {item.quantity}{item.unit || 'un'} × {formatMZN(item.price)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Customer info */}
      <GlassCard className="bg-zinc-900/60 border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">{trip.customerName}</p>
              <p className="text-zinc-500 text-xs">{trip.customerPhone}</p>
            </div>
          </div>
          <a
            href={`tel:${trip.customerPhone}`}
            className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center hover:bg-emerald-500/25 transition-colors"
            aria-label="Ligar ao cliente"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
          </a>
        </div>
      </GlassCard>

      {/* Order totals */}
      <GlassCard className="bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Total da encomenda</span>
            <span className="text-white font-medium">{formatMZN(trip.orderTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Taxa de entrega</span>
            <span className="text-emerald-400 font-medium">{formatMZN(trip.deliveryFee)}</span>
          </div>
          <div className="h-px bg-zinc-800 my-1" />
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Pagamento</span>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs">
              {trip.paymentMethod}
            </Badge>
          </div>
        </div>
      </GlassCard>

      {/* Spacer for bottom button */}
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
          <Store className="w-5 h-5 mr-1" />
          CHEGUEI À LOJA
        </Button>
      </motion.div>
    </motion.div>
  );
}
