import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import { GlassCard, BentoCard, BentoGrid } from '@/components/ui/design-system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Navigation,
  MapPin,
  Package,
  Phone,
  Clock,
  CheckCircle,
  ChevronRight,
  ArrowRight,
  Store,
  User,
  Star,
  Wallet,
  AlertTriangle,
  Camera,
  MessageSquare,
  X,
  Truck,
  Flag,
} from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────

type TripStep = 1 | 2 | 3 | 4;

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  price: number;
}

interface SimulatedTrip {
  id: string;
  orderNumber: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  estimatedDistance: string;
  estimatedTime: string;
  items: OrderItem[];
  orderTotal: number;
  deliveryFee: number;
  driverEarnings: number;
  paymentMethod: string;
}

// ─── Simulated trip data ────────────────────────────────────────────

const MOCK_TRIP: SimulatedTrip = {
  id: 'trip-demo-001',
  orderNumber: '#MW-48721',
  storeName: 'Farmácia Central Maputo',
  storeAddress: 'Av. 24 de Julho, 1234, Maputo',
  storePhone: '+258 84 123 4567',
  customerName: 'Ana Machel',
  customerPhone: '+258 86 987 6543',
  customerAddress: 'Rua da Resistência, 56, Bairro do Jardim, Maputo',
  estimatedDistance: '3.2 km',
  estimatedTime: '12 min',
  items: [
    { id: 'i1', name: 'Paracetamol 500mg', quantity: 2, unit: 'cx', price: 85 },
    { id: 'i2', name: 'Amoxicilina 250mg', quantity: 1, unit: 'cx', price: 320 },
    { id: 'i3', name: 'Vitamina C 1000mg', quantity: 3, unit: 'un', price: 150 },
    { id: 'i4', name: 'Álcool 70%', quantity: 1, unit: 'fr', price: 120 },
  ],
  orderTotal: 675,
  deliveryFee: 75,
  driverEarnings: 52,
  paymentMethod: 'M-Pesa',
};

// ─── Helpers ───────────────────────────────────────────────────────

function formatMZN(value: number): string {
  return `${value.toLocaleString('pt-MZ')} MZN`;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Step labels for progress bar ──────────────────────────────────

const STEP_LABELS = ['Loja', 'Levantamento', 'Entrega'] as const;

// ─── Sub-components ────────────────────────────────────────────────

function StepProgressBar({ currentStep }: { currentStep: TripStep }) {
  // Map steps 1-4 to progress indices 0-2 (3 steps shown)
  const progressIndex = Math.min(currentStep - 1, 2) as 0 | 1 | 2;

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {STEP_LABELS.map((label, i) => {
        const isActive = i === progressIndex;
        const isCompleted = i < progressIndex;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors',
                  isActive && 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/40',
                  isCompleted && 'bg-emerald-600 border-emerald-500 text-white',
                  !isActive && !isCompleted && 'bg-zinc-800 border-zinc-600 text-zinc-500'
                )}
                animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span>{i + 1}</span>}
              </motion.div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[60px]',
                  isActive ? 'text-emerald-400' : isCompleted ? 'text-emerald-500' : 'text-zinc-600'
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEP_LABELS.length - 1 && (
              <div className="flex-1 mx-2 mb-5">
                <div className="h-0.5 w-full rounded-full bg-zinc-700 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimerBar({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Clock className="w-4 h-4 text-emerald-400" />
      <span className="text-emerald-400 font-mono text-lg font-semibold tracking-wider">
        {formatTimer(elapsedSeconds)}
      </span>
    </div>
  );
}

function CancelDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Cancelar Entrega?</h3>
        </div>
        <p className="text-zinc-400 text-sm mb-6">
          Se cancelar esta entrega, a encomenda será reencaminhada para outro motorista. Esta acção não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            onClick={onCancel}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
          >
            Cancelar Entrega
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PhotoProofStep({
  onCapture,
  captured,
}: {
  onCapture: () => void;
  captured: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3"
    >
      <div
        className={cn(
          'w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all',
          captured
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-zinc-600 bg-zinc-800/50 hover:border-emerald-400 hover:bg-emerald-500/5'
        )}
        onClick={onCapture}
        role="button"
        aria-label={captured ? 'Foto capturada' : 'Tirar foto da entrega'}
      >
        {captured ? (
          <>
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Foto adicionada</span>
          </>
        ) : (
          <>
            <Camera className="w-8 h-8 text-zinc-500" />
            <span className="text-xs text-zinc-500 font-medium">Tirar foto</span>
          </>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 text-center">
        Fotografia de comprovativo da entrega (opcional)
      </p>
    </motion.div>
  );
}

function RatingStars({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          whileTap={{ scale: 0.85 }}
          onClick={() => onRate(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`Avaliar ${star} estrelas`}
        >
          <Star
            className={cn(
              'w-8 h-8 transition-colors',
              (hovered || rating) >= star
                ? 'text-amber-400 fill-amber-400'
                : 'text-zinc-600'
            )}
          />
        </motion.button>
      ))}
    </div>
  );
}

// ─── Step renderers ────────────────────────────────────────────────

function Step1_GoingToStore({
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

function Step2_AtStore({
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

function Step3_GoingToCustomer({
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

function Step4_ConfirmDelivery({
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

// ─── Main component ────────────────────────────────────────────────

export default function ActiveTrip() {
  const { user } = useAuth();
  const { t } = useCountry();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Trip state
  const [trip, setTrip] = useState<SimulatedTrip | null>(null);
  const [step, setStep] = useState<TripStep>(1);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Step 2 state
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Step 4 state
  const [customerRating, setCustomerRating] = useState(0);
  const [photoCaptured, setPhotoCaptured] = useState(false);

  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Completion state
  const [completed, setCompleted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load trip data
  useEffect(() => {
    const tripId = searchParams.get('tripId');

    if (tripId) {
      // Try to fetch from supabase
      const fetchTrip = async () => {
        try {
          const { data } = await (supabase as any)
            .from('delivery_assignments')
            .select(`
              id, status, order_id, driver_earnings,
              orders (
                id, order_number, total_amount, delivery_fee, payment_method,
                delivery_address, customer_name, customer_phone,
                store:stores(name, address, phone)
              ),
              order_items (
                id, product_name, quantity, unit, unit_price
              )
            `)
            .eq('id', tripId)
            .eq('driver_id', user?.id)
            .single();

          if (data) {
            const order = data.orders;
            const store = order.store;
            setTrip({
              id: data.id,
              orderNumber: order.order_number,
              storeName: store.name,
              storeAddress: store.address,
              storePhone: store.phone,
              customerName: order.customer_name,
              customerPhone: order.customer_phone,
              customerAddress: order.delivery_address,
              estimatedDistance: '2.8 km',
              estimatedTime: '10 min',
              items: (data.order_items || []).map((oi: any) => ({
                id: oi.id,
                name: oi.product_name,
                quantity: oi.quantity,
                unit: oi.unit || 'un',
                price: oi.unit_price,
              })),
              orderTotal: order.total_amount,
              deliveryFee: order.delivery_fee,
              driverEarnings: data.driver_earnings || 50,
              paymentMethod: order.payment_method || 'M-Pesa',
            });
          } else {
            // Fallback to mock
            setTrip(MOCK_TRIP);
          }
        } catch {
          setTrip(MOCK_TRIP);
        } finally {
          setLoading(false);
        }
      };
      fetchTrip();
    } else {
      // No tripId — use simulated data
      setTrip(MOCK_TRIP);
      setLoading(false);
    }
  }, [searchParams, user?.id]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Step handlers
  const handleToggleItem = useCallback((id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStepForward = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, 4) as TripStep);
  }, []);

  const handleConfirmDelivery = useCallback(async () => {
    const tripId = searchParams.get('tripId');
    
    // Persist delivery completion to database
    if (tripId) {
      try {
        // 1. Update delivery assignment status
        const { error: deliveryError } = await (supabase as any)
          .from('delivery_assignments')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          })
          .eq('id', tripId)
          .eq('driver_id', user?.id);

        if (deliveryError) {
          console.error('Failed to persist delivery completion:', deliveryError);
          toast.error('Erro ao confirmar entrega na base de dados');
          return; // Don't proceed if DB update fails
        }

        // 2. Fetch delivery to get order_id and earnings for crediting
        const { data: deliveryData } = await (supabase as any)
          .from('delivery_assignments')
          .select('order_id, driver_earnings')
          .eq('id', tripId)
          .maybeSingle();

        if (deliveryData?.order_id) {
          // 3. Update the order status to delivered
          await (supabase as any)
            .from('orders')
            .update({ status: 'delivered', delivered_at: new Date().toISOString() })
            .eq('id', deliveryData.order_id);
        }

        // 4. Credit rider earnings to wallet using atomic RPC
        if (deliveryData?.driver_earnings && user?.id) {
          const { error: creditError } = await supabase.rpc('wallet_credit', {
            _user_id: user.id,
            _amount: deliveryData.driver_earnings,
            _type: 'credit',
            _ref_id: tripId,
            _description: `Ganhos de entrega - Ordem ${trip?.orderNumber || tripId}`,
          });
          if (creditError) {
            console.warn('Failed to credit rider wallet (manual reconciliation needed):', creditError);
            // Non-blocking: delivery is already confirmed, earnings can be reconciled later
          }
        }
      } catch (e) {
        console.error('Error completing delivery:', e);
        toast.error('Erro ao processar entrega. Tente novamente.');
        return;
      }
    }
    
    setCompleted(true);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [searchParams, user?.id, trip?.orderNumber]);

  const handleCancelTrip = useCallback(() => {
    setShowCancelDialog(false);
    navigate(-1);
  }, [navigate]);

  const handleCapturePhoto = useCallback(() => {
    // Simulate photo capture with a brief delay
    setPhotoCaptured(true);
  }, []);

  // ─── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-emerald-500"
          />
          <p className="text-zinc-500 text-sm">A carregar entrega...</p>
        </div>
      </div>
    );
  }

  // ─── Completion screen ─────────────────────────────────────────
  if (completed && trip) {
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
            onClick={() => navigate('/driver')}
            className="w-full h-13 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30"
          >
            Voltar ao Painel
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  // ─── Main trip screen ──────────────────────────────────────────
  if (!trip) return null;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Cancel dialog overlay */}
      <AnimatePresence>
        {showCancelDialog && (
          <CancelDialog
            open={showCancelDialog}
            onConfirm={handleCancelTrip}
            onCancel={() => setShowCancelDialog(false)}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowCancelDialog(true)}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            aria-label="Voltar / Cancelar"
          >
            <X className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Cancelar</span>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-white text-sm font-semibold">Entrega Activa</span>
            <span className="text-zinc-500 text-xs">{trip.orderNumber}</span>
          </div>

          <a
            href={`tel:${trip.storePhone}`}
            className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
            aria-label="Suporte"
          >
            <Phone className="w-4 h-4 text-zinc-400" />
          </a>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-4 pt-2">
        <StepProgressBar currentStep={step} />
      </div>

      {/* Timer */}
      <TimerBar elapsedSeconds={elapsedSeconds} />

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto px-4 pb-28">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step1_GoingToStore trip={trip} onAction={handleStepForward} />
          )}
          {step === 2 && (
            <Step2_AtStore
              trip={trip}
              checkedItems={checkedItems}
              onToggleItem={handleToggleItem}
              onConfirm={handleStepForward}
            />
          )}
          {step === 3 && (
            <Step3_GoingToCustomer trip={trip} onAction={handleStepForward} />
          )}
          {step === 4 && (
            <Step4_ConfirmDelivery
              trip={trip}
              customerRating={customerRating}
              onRate={setCustomerRating}
              photoCaptured={photoCaptured}
              onCapturePhoto={handleCapturePhoto}
              onConfirm={handleConfirmDelivery}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom trip info bar (non-intrusive) */}
      {step < 4 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800/50 px-4 py-3"
        >
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-400 text-xs">MedWallet Entregas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-zinc-500 text-xs">{trip.items.length} itens</span>
              </div>
              <div className="h-3 w-px bg-zinc-700" />
              <div className="flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-semibold">
                  +{trip.driverEarnings} MZN
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
