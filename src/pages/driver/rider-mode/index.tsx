import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { logger } from '@/lib/logger';

import { Header } from './Header';
import { MapSection } from './MapSection';
import { OnlineTimer } from './OnlineTimer';
import { WalletCard } from './WalletCard';
import { StatsGrid } from './StatsGrid';
import { OfflineInfo } from './OfflineInfo';
import { OnlineToggle } from './OnlineToggle';
import { IncomingTripOverlay } from './IncomingTripOverlay';
import { TripRejectedFlash } from './TripRejectedFlash';

import {
  MIN_WALLET_BALANCE,
  COUNTDOWN_SECONDS,
  SIMULATED_TRIPS,
  randomBetween,
  type SimulatedTrip,
  type TodayStats,
} from './types';

/* ================================================================== */
/*  RIDER MODE — MAIN COMPONENT                                        */
/* ================================================================== */

export default function RiderMode() {
  const { user } = useAuth();
  const { country } = useCountry();
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
        .select('balance_mzn')
        .eq('user_id', user.id)
        .single();
      if (data && mountedRef.current) {
        setWalletBalance(data.balance_mzn ?? 0);
        setShowBalanceWarning((data.balance_mzn ?? 0) < MIN_WALLET_BALANCE);
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
      logger.error('Erro ao alterar disponibilidade:', { error: err });
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
        .catch((e) => { logger.warn('Rider mode cleanup failed', { error: e }); });
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
      <Header isOnline={isOnline} onBack={() => navigate('/driver')} />

      <MapSection isOnline={isOnline} />

      {/* ── Scrollable Content Area ─────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 pb-40 -mt-2 relative z-10">
        <div className="space-y-4 pt-3">
          <OnlineTimer isOnline={isOnline} elapsedSeconds={elapsedSeconds} />

          <WalletCard
            isOnline={isOnline}
            walletBalance={walletBalance}
            balanceLoading={balanceLoading}
            showBalanceWarning={showBalanceWarning}
            onTopUp={() => navigate('/wallet')}
          />

          <StatsGrid isOnline={isOnline} stats={stats} />

          <OfflineInfo
            isOnline={isOnline}
            onNavigateHistory={() => navigate('/driver/history')}
            onNavigateEarnings={() => navigate('/driver/earnings')}
            onNavigateDriver={() => navigate('/driver')}
          />
        </div>
      </main>

      <OnlineToggle
        isOnline={isOnline}
        toggling={toggling}
        onToggle={toggleOnline}
      />

      <IncomingTripOverlay
        incomingTrip={incomingTrip}
        countdown={countdown}
        onAccept={acceptTrip}
        onReject={rejectTrip}
      />

      <TripRejectedFlash show={tripRejected} />
    </div>
  );
}
