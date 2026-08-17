import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Package,
  Truck,
  Wallet,
  X,
} from '@/components/icons/lucide-compat';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

import { MOCK_TRIP } from './types';
import type { TripStep, SimulatedTrip } from './types';
import { StepProgressBar, TimerBar, CancelDialog } from './ui';
import { Step1GoingToStore } from './steps/Step1GoingToStore';
import { Step2AtStore } from './steps/Step2AtStore';
import { Step3GoingToCustomer } from './steps/Step3GoingToCustomer';
import { Step4ConfirmDelivery } from './steps/Step4ConfirmDelivery';
import { CompletionScreen } from './CompletionScreen';

// ─── Loading screen ───────────────────────────────────────────────

function LoadingScreen() {
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
          logger.error('Failed to persist delivery completion:', deliveryError);
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
            logger.warn('Failed to credit rider wallet (manual reconciliation needed):', creditError);
            // Non-blocking: delivery is already confirmed, earnings can be reconciled later
          }
        }
      } catch (e) {
        logger.error('Error completing delivery:', { error: e });
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
    return <LoadingScreen />;
  }

  // ─── Completion screen ─────────────────────────────────────────
  if (completed && trip) {
    return (
      <CompletionScreen
        trip={trip}
        elapsedSeconds={elapsedSeconds}
        onNavigateToDashboard={() => navigate('/driver')}
      />
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
            <Step1GoingToStore trip={trip} onAction={handleStepForward} />
          )}
          {step === 2 && (
            <Step2AtStore
              trip={trip}
              checkedItems={checkedItems}
              onToggleItem={handleToggleItem}
              onConfirm={handleStepForward}
            />
          )}
          {step === 3 && (
            <Step3GoingToCustomer trip={trip} onAction={handleStepForward} />
          )}
          {step === 4 && (
            <Step4ConfirmDelivery
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
