import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Flame, CalendarCheck, Check } from "@/components/icons/lucide-compat";
import { useGamification, type StreakDay } from '@/hooks/useGamification';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { useQueryClient } from '@tanstack/react-query';
import { getTheme } from '@/themes';
import { Button } from '@/components/ui/button';

const RADIUS = 54;
const STROKE = 6;
const NORMALIZED_RADIUS = (RADIUS - STROKE / 2) * 2 * Math.PI;

/** Bloco pixelado estilo Minecraft para cada dia da semana */
function DayBlock({ day, index, isToday }: { day: StreakDay; index: number; isToday: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1" key={day.date}>
      <motion.div
        className={`w-4 h-4 rounded-[3px] border border-black/25 relative overflow-hidden ${
          day.completed ? 'bg-gradient-to-b from-emerald-400 to-emerald-600' : 'bg-muted'
        }`}
        style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.22)' }}
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: index * 0.06, type: 'spring', stiffness: 400, damping: 18 }}
      >
        {day.completed && (
          <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/90 font-black">✓</span>
        )}
      </motion.div>
      {isToday && <span className="text-[9px] text-muted-foreground">hoje</span>}
    </div>
  );
}

export default function StreakTracker() {
  const { t, country } = useCountry();
  const { user } = useAuth();
  const { streak, streakDays, checkStreak } = useGamification();
  const queryClient = useQueryClient();
  const theme = getTheme(country?.id || 'MZ');
  const [checking, setChecking] = useState(false);
  const [checkedToday, setCheckedToday] = useState(false);

  const weekProgress = Math.min(streak / 7, 1);
  const strokeDashoffset = NORMALIZED_RADIUS * (1 - weekProgress);
  const circumference = NORMALIZED_RADIUS;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleCheckIn = async () => {
    if (!user || checking || checkedToday) return;
    setChecking(true);
    try {
      const result = await checkStreak();
      if (!result) {
        return;
      }
      if (result.already) {
        setCheckedToday(true);
        return;
      }
      setCheckedToday(true);
      confetti({
        particleCount: 70,
        spread: 70,
        shapes: ['square'],
        scalar: 0.85,
        colors: ['#10b981', '#34d399', '#fbbf24'],
        origin: { y: 0.4 },
      });
      queryClient.invalidateQueries({ queryKey: ['user-gamification-full'] });
      queryClient.invalidateQueries({ queryKey: ['joy-transactions'] });
    } finally {
      setChecking(false);
    }
  };

  return (
    <motion.div
      className="relative flex flex-col items-center p-5 rounded-3xl"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.primary}10, ${theme.colors.secondary}10)`,
        border: `1px solid ${theme.colors.primary}25`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative" style={{ width: RADIUS * 2, height: RADIUS * 2 }}>
        <svg width={RADIUS * 2} height={RADIUS * 2} className="-rotate-90">
          <circle
            cx={RADIUS}
            cy={RADIUS}
            r={RADIUS - STROKE / 2}
            fill="none"
            stroke={`${theme.colors.primary}15`}
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={RADIUS}
            cy={RADIUS}
            r={RADIUS - STROKE / 2}
            fill="none"
            stroke={theme.colors.primary}
            strokeLinecap="round"
            strokeWidth={STROKE}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-extrabold"
            style={{ color: theme.colors.primary }}
            key={streak}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {streak}
          </motion.span>
          <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>
            {t('gamification.streak_days', { days: String(streak) })}
          </span>
        </div>
        {/* Fogo animado quando streak ≥ 3 */}
        {streak >= 3 && (
          <motion.div
            className="absolute -top-1 -right-1 text-2xl"
            animate={{ scale: [1, 1.2, 1], rotate: [0, -6, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.1 }}
          >
            🔥
          </motion.div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Flame className="h-4 w-4" style={{ color: streak >= 7 ? '#f59e0b' : theme.colors.textMuted }} />
        <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
          {t('gamification.keep_going')}
        </span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        {streakDays.map((day, i) => (
          <DayBlock
            key={day.date}
            day={day}
            index={i}
            isToday={day.date === todayStr}
          />
        ))}
      </div>

      {/* Check-in diário — F42 */}
      {user && (
        <Button
          size="sm"
          className={`mt-4 w-full max-w-[240px] gap-2 font-bold ${
            checkedToday
              ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/15'
              : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20'
          }`}
          disabled={checking || checkedToday}
          onClick={handleCheckIn}
        >
          {checkedToday ? (
            <><Check className="h-4 w-4" /> Check-in feito hoje</>
          ) : (
            <><CalendarCheck className="h-4 w-4" /> {checking ? 'A marcar…' : 'Fazer check-in (+5 🪙 +15 XP)'}</>
          )}
        </Button>
      )}
    </motion.div>
  );
}
