import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { GlassCard } from '@/components/ui/design-system';
import { Badge } from '@/components/ui/badge';
import {
  Power,
  MapPin,
  Navigation,
  Package,
  Wallet,
  Clock,
  TrendingUp,
  Star,
  Phone,
  Settings,
  Bell,
  ChevronRight,
  Zap,
  Target,
  Shield,
  AlertTriangle,
  Radio,
  Signal,
  Volume2,
  X,
  Check,
  ArrowRight,
} from '@/components/icons/lucide-compat';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SimulatedTrip {
  id: string;
  storeName: string;
  storeAddress: string;
  deliveryAddress: string;
  distance: number;
  estimatedTime: number;
  earnings: number;
}

interface TodayStats {
  deliveries: number;
  earnings: number;
  onlineMinutes: number;
  rating: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MIN_WALLET_BALANCE = 100;
const COUNTDOWN_SECONDS = 15;

const SIMULATED_TRIPS: SimulatedTrip[] = [
  {
    id: 'sim-001',
    storeName: 'Farmácia Central Maputo',
    storeAddress: 'Av. 24 de Julho, 123, Maputo',
    deliveryAddress: 'Bairro do Jardim, Rua 42, Maputo',
    distance: 3.2,
    estimatedTime: 12,
    earnings: 85,
  },
  {
    id: 'sim-002',
    storeName: 'LabeMoç - Laboratório',
    storeAddress: 'Av. Eduardo Mondlane, 567, Matola',
    deliveryAddress: 'Costa do Sol, Av. da Marginal, Maputo',
    distance: 5.8,
    estimatedTime: 18,
    earnings: 140,
  },
  {
    id: 'sim-003',
    storeName: 'MedStore - Fármacos e Suplementos',
    storeAddress: 'Rua da Resistência, 89, Maputo',
    deliveryAddress: 'Mavalane, Bairro C, Maputo',
    distance: 4.1,
    estimatedTime: 15,
    earnings: 110,
  },
  {
    id: 'sim-004',
    storeName: 'Clinica Saude+ Maputo',
    storeAddress: 'Av. Julius Nyerere, 210, Maputo',
    deliveryAddress: 'Alto Maé, Rua 17, Maputo',
    distance: 2.5,
    estimatedTime: 10,
    earnings: 75,
  },
  {
    id: 'sim-005',
    storeName: 'Droga Lda - Produtos Médicos',
    storeAddress: 'Rua Consiglieri Pedroso, 45, Maputo',
    deliveryAddress: 'Polana Caneco A, Av. Vladmir Lenin, Maputo',
    distance: 6.3,
    estimatedTime: 22,
    earnings: 165,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatMZN(amount: number): string {
  return `${amount.toLocaleString('pt-MZ')} MZN`;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ------------------------------------------------------------------ */
/*  Countdown Ring (SVG circular timer)                                */
/* ------------------------------------------------------------------ */

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 44;
  const stroke = 5;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (seconds / total) * circumference;
  const color = seconds <= 5 ? '#ef4444' : seconds <= 10 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative flex items-center justify-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="-rotate-90"
      >
        {/* Background ring */}
        <circle
          stroke="rgba(255,255,255,0.15)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress ring */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute text-xl font-bold text-white tabular-nums">
        {seconds}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Map Grid Dots (decorative background pattern)                      */
/* ------------------------------------------------------------------ */

function MapGridPattern({ online }: { online: boolean }) {
  const dots = useRef(
    Array.from({ length: 64 }, (_, i) => ({
      id: i,
      x: (i % 8) * 12.5 + 6.25,
      y: Math.floor(i / 8) * 12.5 + 6.25,
      delay: Math.random() * 3,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0%"
            y1={`${(i + 1) * 11.11}%`}
            x2="100%"
            y2={`${(i + 1) * 11.11}%`}
            stroke="white"
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={`${(i + 1) * 11.11}%`}
            y1="0%"
            x2={`${(i + 1) * 11.11}%`}
            y2="100%"
            stroke="white"
            strokeWidth="0.5"
          />
        ))}
      </svg>
      {/* Dots */}
      {dots.map((dot) => (
        <motion.div
          key={dot.id}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            backgroundColor: online ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.12)',
          }}
          animate={online ? { opacity: [0.2, 0.6, 0.2], scale: [1, 1.3, 1] } : {}}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: dot.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  RIDER MODE — MAIN COMPONENT                                        */
/* ================================================================== */

export default function RiderMode() {
  const { user } = useAuth();
  const { t, country } = useCountry();
  const navigate = useNavigate();

  /* ── State ─────────────────────────────────────────────────────── */
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [stats, setStats] = useState<TodayStats>({
    deliveries: 0,
    earnings: 0,
    onlineMinutes: 0,
    rating: 4.8,
  });
  const [incomingTrip, setIncomingTrip] = useState<SimulatedTrip | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);
  const [tripRejected, setTripRejected] = useState(false);

  /* ── Refs ──────────────────────────────────────────────────────── */
  const tripTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  /* ── Currency symbol ───────────────────────────────────────────── */
  const currencySymbol = country?.currency_symbol || 'MT';

  /* ── Fetch wallet balance ──────────────────────────────────────── */
  const fetchWalletBalance = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await (supabase as any)
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      if (data && mountedRef.current) {
        setWalletBalance(data.balance ?? 0);
        setShowBalanceWarning((data.balance ?? 0) < MIN_WALLET_BALANCE);
      }
    } catch {
      // wallet table might not exist — use 0
    } finally {
      if (mountedRef.current) setBalanceLoading(false);
    }
  }, [user]);

  /* ── Fetch today's stats ────────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: assignments } = await (supabase as any)
        .from('delivery_assignments')
        .select('id, picked_up_at, delivered_at, order(delivery_fee)')
        .eq('driver_id', user.id)
        .gte('assigned_at', today.toISOString());

      if (assignments && mountedRef.current) {
        const completed = assignments.filter(
          (a: any) => a.status === 'delivered' || a.delivered_at
        );
        const totalEarnings = completed.reduce(
          (sum: number, a: any) => sum + (a.order?.delivery_fee ?? 0),
          0
        );
        setStats((prev) => ({
          ...prev,
          deliveries: completed.length,
          earnings: totalEarnings,
        }));
      }
    } catch {
      // graceful fallback — simulated stats are fine
    }
  }, [user]);

  /* ── Toggle online/offline ──────────────────────────────────────── */
  const toggleOnline = useCallback(async () => {
    if (!user || toggling) return;

    /* Going online — check wallet first */
    if (!isOnline && walletBalance < MIN_WALLET_BALANCE) {
      setShowBalanceWarning(true);
      return;
    }

    setToggling(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ is_available: !isOnline })
        .eq('user_id', user.id);

      if (error) throw error;

      if (mountedRef.current) {
        const newOnline = !isOnline;
        setIsOnline(newOnline);

        if (newOnline) {
          setElapsedSeconds(0);
          // Simulate a trip request after 8-15 seconds
          const delay = randomBetween(8000, 15000);
          tripTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              const trip =
                SIMULATED_TRIPS[Math.floor(Math.random() * SIMULATED_TRIPS.length)];
              setIncomingTrip(trip);
              setCountdown(COUNTDOWN_SECONDS);
              setTripRejected(false);
            }
          }, delay);
        } else {
          // Going offline — clear timers and trip request
          if (tripTimerRef.current) clearTimeout(tripTimerRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setIncomingTrip(null);
          setElapsedSeconds(0);
        }
      }
    } catch (err) {
      console.error('Erro ao alterar disponibilidade:', err);
    } finally {
      if (mountedRef.current) setToggling(false);
    }
  }, [user, isOnline, walletBalance, toggling]);

  /* ── Accept trip ────────────────────────────────────────────────── */
  const acceptTrip = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (tripTimerRef.current) clearTimeout(tripTimerRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    navigate('/driver/active-trip', { state: { trip: incomingTrip } });
  }, [incomingTrip, navigate]);

  /* ── Reject trip ────────────────────────────────────────────────── */
  const rejectTrip = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTripRejected(true);
    setTimeout(() => {
      if (mountedRef.current) {
        setIncomingTrip(null);
        setTripRejected(false);
      }
    }, 600);
  }, []);

  /* ── Countdown timer effect ─────────────────────────────────────── */
  useEffect(() => {
    if (!incomingTrip) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          // Auto-reject
          if (mountedRef.current) {
            setTripRejected(true);
            setTimeout(() => {
              if (mountedRef.current) {
                setIncomingTrip(null);
                setTripRejected(false);
              }
            }, 600);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [incomingTrip]);

  /* ── Elapsed online time effect ─────────────────────────────────── */
  useEffect(() => {
    if (!isOnline) {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      return;
    }

    elapsedRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [isOnline]);

  /* ── Initial data fetch ─────────────────────────────────────────── */
  useEffect(() => {
    mountedRef.current = true;
    fetchWalletBalance();
    fetchStats();

    // Fetch initial availability from profile
    if (user) {
      (supabase as any)
        .from('profiles')
        .select('is_available, default_city')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data && mountedRef.current) {
            setIsOnline(data.is_available ?? false);
          }
        })
        .catch(() => {});
    }

    return () => {
      mountedRef.current = false;
      if (tripTimerRef.current) clearTimeout(tripTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  /* ================================================================== */
  /*  RENDER                                                             */
  /* ================================================================== */

  return (
    <div
      className={`relative min-h-screen flex flex-col transition-colors duration-700 ${
        isOnline
          ? 'bg-zinc-950 text-white'
          : 'bg-background text-foreground'
      }`}
    >
      {/* ── Top Header Bar ──────────────────────────────────────── */}
      <header
        className={`relative z-20 flex items-center justify-between px-4 py-3 ${
          isOnline
            ? 'bg-zinc-950/80 backdrop-blur-md border-b border-white/5'
            : 'bg-background/80 backdrop-blur-md border-b border-border'
        }`}
      >
        <button
          onClick={() => navigate('/driver')}
          className={`p-2 rounded-xl transition-colors ${
            isOnline
              ? 'hover:bg-white/10 active:bg-white/15'
              : 'hover:bg-accent active:bg-accent/80'
          }`}
          aria-label="Voltar"
        >
          <span className="rotate-180 inline-block">
            <ArrowRight className="w-5 h-5" />
          </span>
        </button>

        <div className="flex items-center gap-2">
          <Badge
            variant={isOnline ? 'default' : 'secondary'}
            className={
              isOnline
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs'
                : 'text-xs'
            }
          >
            {isOnline ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            ) : (
              'OFFLINE'
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <button
            className={`p-2 rounded-xl transition-colors ${
              isOnline
                ? 'hover:bg-white/10 text-white/70'
                : 'hover:bg-accent text-muted-foreground'
            }`}
            aria-label="Notificacoes"
          >
            <Bell className="w-5 h-5" />
          </button>
          <button
            className={`p-2 rounded-xl transition-colors ${
              isOnline
                ? 'hover:bg-white/10 text-white/70'
                : 'hover:bg-accent text-muted-foreground'
            }`}
            aria-label="Configuracoes"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Map Placeholder (top half) ──────────────────────────── */}
      <section
        className={`relative flex-shrink-0 ${
          isOnline ? 'h-[42vh]' : 'h-[38vh]'
        } transition-all duration-500`}
        aria-label="Mapa"
      >
        {/* Dark map background */}
        <div
          className={`absolute inset-0 ${
            isOnline
              ? 'bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900'
              : 'bg-gradient-to-b from-zinc-200 via-zinc-300 to-zinc-200'
          }`}
        >
          <MapGridPattern online={isOnline} />

          {/* Province/city overlay */}
          <div
            className={`absolute top-3 left-4 flex items-center gap-1.5 text-xs font-medium ${
              isOnline ? 'text-white/60' : 'text-zinc-500'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Maputo, Mocambique</span>
          </div>

          {/* Online signal indicator */}
          {isOnline && (
            <div className="absolute top-3 right-4 flex items-center gap-1.5">
              <Signal className="w-3.5 h-3.5 text-emerald-400" />
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          )}

          {/* Center pulsing dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isOnline ? (
              <>
                {/* Outer pulse ring 1 */}
                <motion.div
                  className="absolute w-40 h-40 rounded-full border-2 border-emerald-500/30"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Outer pulse ring 2 */}
                <motion.div
                  className="absolute w-28 h-28 rounded-full border border-emerald-500/40"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                  }}
                />
                {/* Inner glow ring */}
                <motion.div
                  className="absolute w-16 h-16 rounded-full bg-emerald-500/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.15, 0.4] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                {/* Core dot */}
                <div className="relative w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
              </>
            ) : (
              <div className="relative flex flex-col items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-zinc-400/60" />
              </div>
            )}
          </div>

          {/* Status text overlay */}
          <div className="absolute bottom-6 inset-x-0 flex flex-col items-center">
            {isOnline ? (
              <motion.div
                className="flex items-center gap-2 text-emerald-400 font-medium text-sm"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Procurando entregas...</span>
              </motion.div>
            ) : (
              <span className="text-zinc-400 text-sm font-medium">Offline</span>
            )}
          </div>
        </div>
      </section>

      {/* ── Scrollable Content Area ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 pb-40 -mt-2 relative z-10">
        <div className="space-y-4 pt-3">
          {/* ── Online Timer (when online) ─────────────────────── */}
          <AnimatePresence>
            {isOnline && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard
                  className={`border ${
                    isOnline
                      ? 'bg-zinc-900/80 border-emerald-500/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/15">
                        <Clock className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-sm text-white/70">Tempo online</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-400 tabular-nums font-mono">
                      {formatTime(elapsedSeconds)}
                    </span>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Wallet Balance Card ─────────────────────────────── */}
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
                onClick={() => navigate('/wallet')}
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

          {/* ── Today's Quick Stats ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Entregas hoje */}
            <GlassCard
              className={`border ${
                isOnline ? 'bg-zinc-900/80 border-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isOnline ? 'bg-blue-500/15' : 'bg-blue-50'
                  }`}
                >
                  <Package
                    className={`w-4 h-4 ${
                      isOnline ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  />
                </div>
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  isOnline ? 'text-white' : 'text-foreground'
                }`}
              >
                {stats.deliveries}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isOnline ? 'text-white/50' : 'text-muted-foreground'
                }`}
              >
                Entregas hoje
              </p>
            </GlassCard>

            {/* Ganho hoje */}
            <GlassCard
              className={`border ${
                isOnline ? 'bg-zinc-900/80 border-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isOnline ? 'bg-emerald-500/15' : 'bg-emerald-50'
                  }`}
                >
                  <TrendingUp
                    className={`w-4 h-4 ${
                      isOnline ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  />
                </div>
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  isOnline ? 'text-white' : 'text-foreground'
                }`}
              >
                {stats.earnings}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isOnline ? 'text-white/50' : 'text-muted-foreground'
                }`}
              >
                Ganho hoje (MZN)
              </p>
            </GlassCard>

            {/* Tempo online */}
            <GlassCard
              className={`border ${
                isOnline ? 'bg-zinc-900/80 border-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isOnline ? 'bg-purple-500/15' : 'bg-purple-50'
                  }`}
                >
                  <Clock
                    className={`w-4 h-4 ${
                      isOnline ? 'text-purple-400' : 'text-purple-600'
                    }`}
                  />
                </div>
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  isOnline ? 'text-white' : 'text-foreground'
                }`}
              >
                {stats.onlineMinutes}m
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isOnline ? 'text-white/50' : 'text-muted-foreground'
                }`}
              >
                Tempo online
              </p>
            </GlassCard>

            {/* Rating */}
            <GlassCard
              className={`border ${
                isOnline ? 'bg-zinc-900/80 border-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isOnline ? 'bg-amber-500/15' : 'bg-amber-50'
                  }`}
                >
                  <Star
                    className={`w-4 h-4 ${
                      isOnline ? 'text-amber-400' : 'text-amber-500'
                    }`}
                  />
                </div>
              </div>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  isOnline ? 'text-white' : 'text-foreground'
                }`}
              >
                {stats.rating.toFixed(1)}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  isOnline ? 'text-white/50' : 'text-muted-foreground'
                }`}
              >
                Rating
              </p>
            </GlassCard>
          </div>

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
                      onClick={() => navigate('/driver/history')}
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
                      onClick={() => navigate('/driver/earnings')}
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
                      onClick={() => navigate('/driver')}
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
        </div>
      </main>

      {/* ── BIG GO ONLINE / OFFLINE TOGGLE (bottom center) ─────── */}
      <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
        <div
          className="flex justify-center pb-6 pt-4 pointer-events-auto"
          style={{
            background: isOnline
              ? 'linear-gradient(to top, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.7) 60%, transparent 100%)'
              : 'linear-gradient(to top, var(--background) 0%, var(--background) 60%, transparent 100%)',
          }}
        >
          <button
            onClick={toggleOnline}
            disabled={toggling}
            className={`relative flex flex-col items-center justify-center transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isOnline ? 'w-[88px] h-[88px] rounded-full' : 'w-20 h-20 rounded-full'
            } ${toggling ? 'opacity-70 pointer-events-none' : ''}`}
            style={{
              backgroundColor: isOnline ? '#10b981' : '#3f3f46',
              boxShadow: isOnline
                ? '0 0 0 0 rgba(16,185,129,0.4), 0 0 30px rgba(16,185,129,0.3)'
                : 'none',
            }}
            aria-label={isOnline ? 'Ficar offline' : 'Ficar online'}
          >
            {/* Pulsing glow rings when online */}
            {isOnline && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border border-emerald-300/30"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.4,
                  }}
                />
              </>
            )}

            {/* Animated glow box-shadow when online */}
            {isOnline && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(16,185,129,0.4)',
                    '0 0 0 16px rgba(16,185,129,0)',
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            )}

            <Power
              className={`w-7 h-7 transition-colors duration-300 ${
                isOnline ? 'text-white' : 'text-white/80'
              }`}
            />
            <span
              className={`text-[10px] font-bold tracking-wide mt-1 transition-colors duration-300 ${
                isOnline ? 'text-white' : 'text-white/70'
              }`}
            >
              {isOnline ? 'ONLINE' : 'FICAR ONLINE'}
            </span>

            {/* Loading spinner while toggling */}
            {toggling && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ── INCOMING TRIP REQUEST OVERLAY ──────────────────────── */}
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
                      +{incomingTrip.earnings} MZN
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 px-6 pb-8">
                  {/* Reject */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={rejectTrip}
                    className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-base transition-colors hover:bg-red-500/25 active:bg-red-500/35"
                  >
                    <X className="w-5 h-5" />
                    REJEITAR
                  </motion.button>

                  {/* Accept */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={acceptTrip}
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

      {/* ── Trip rejected flash ────────────────────────────────── */}
      <AnimatePresence>
        {tripRejected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="px-6 py-4 rounded-2xl bg-red-500/90 backdrop-blur-md"
            >
              <p className="text-white font-bold text-center">Entrega rejeitada</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
