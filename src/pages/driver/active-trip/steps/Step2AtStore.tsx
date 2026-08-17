import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/design-system';
import { Button } from '@/components/ui/button';
import {
  Package,
  Phone,
  Store,
  CheckCircle,
} from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';
import { formatMZN } from '../types';
import type { SimulatedTrip } from '../types';

export function Step2AtStore({
  trip,
  checkedItems,
  onToggleItem,
  onConfirm,
}: {
  trip: SimulatedTrip;
  checkedItems: Set<string>;
  onToggleItem: (id: string) => void;
  onConfirm: () => void;
}) {
  const allChecked = trip.items.every((item) => checkedItems.has(item.id));

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col gap-4"
    >
      {/* Step title */}
      <div className="text-center mb-1">
        <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-4 py-1.5 mb-3">
          <Package className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 text-sm font-semibold">NA LOJA — CONFIRMAR LEVANTAMENTO</span>
        </div>
      </div>

      {/* Store info mini */}
      <GlassCard className="bg-zinc-900/80 border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Store className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{trip.storeName}</p>
              <p className="text-zinc-500 text-xs">{trip.storeAddress}</p>
            </div>
          </div>
          <a
            href={`tel:${trip.storePhone}`}
            className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
            aria-label="Ligar à loja"
          >
            <Phone className="w-4 h-4 text-zinc-400" />
          </a>
        </div>
      </GlassCard>

      {/* Checklist progress */}
      <div className="flex items-center justify-between px-1">
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
          Lista de artigos
        </span>
        <span className={cn('text-xs font-bold', allChecked ? 'text-emerald-400' : 'text-zinc-500')}>
          {checkedItems.size}/{trip.items.length} {allChecked ? '✓ Todos confirmados' : 'confirmados'}
        </span>
      </div>

      {/* Items checklist */}
      <div className="flex flex-col gap-2">
        {trip.items.map((item, index) => {
          const isChecked = checkedItems.has(item.id);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => onToggleItem(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.99]',
                  isChecked
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all',
                    isChecked
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-zinc-600'
                  )}
                >
                  {isChecked && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 text-left">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isChecked ? 'text-emerald-400 line-through opacity-70' : 'text-zinc-200'
                    )}
                  >
                    {item.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {item.quantity}{item.unit || 'un'} — {formatMZN(item.price)}
                  </p>
                </div>
                {isChecked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-emerald-400 text-xs font-bold"
                  >
                    ✓
                  </motion.div>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="h-4" />

      {/* Confirm button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={onConfirm}
          disabled={!allChecked}
          className={cn(
            'w-full h-14 rounded-2xl text-base font-bold shadow-lg active:scale-[0.98] transition-all',
            allChecked
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
              : 'bg-zinc-800 text-zinc-500 shadow-none cursor-not-allowed'
          )}
        >
          <Package className="w-5 h-5 mr-1" />
          {allChecked ? 'CONFIRMAR LEVANTAMENTO' : `CONFIRMAR (${checkedItems.size}/${trip.items.length})`}
        </Button>
      </motion.div>
    </motion.div>
  );
}
