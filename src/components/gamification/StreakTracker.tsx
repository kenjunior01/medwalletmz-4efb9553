import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame } from "@/components/icons/lucide-compat";
import { useGamification, type StreakDay } from '@/hooks/useGamification';
import { useCountry } from '@/contexts/CountryContext';
import { getTheme } from '@/themes';

const RADIUS = 54;
const STROKE = 6;
const NORMALIZED_RADIUS = (RADIUS - STROKE / 2) * 2 * Math.PI;

function DayDot({ day, index, isToday }: { day: StreakDay; index: number; isToday: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1" key={day.date}>
      <motion.div
        className="w-3.5 h-3.5 rounded-full"
        style={{ backgroundColor: day.completed ? '#22c55e' : '#d1d5db' }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.06, type: 'spring', stiffness: 400 }}
      />
      {isToday && <span className="text-[9px] text-muted-foreground">today</span>}
    </div>
  );
}

export default function StreakTracker() {
  const { t, country } = useCountry();
  const { streak, streakDays } = useGamification();
  const theme = getTheme(country?.id || 'MZ');

  const weekProgress = Math.min(streak / 7, 1);
  const strokeDashoffset = NORMALIZED_RADIUS * (1 - weekProgress);
  const circumference = NORMALIZED_RADIUS;

  const dayLabel = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toLocaleDateString('pt-MZ', { weekday: 'short' });
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

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
            {t('gamification.streak_days')}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Flame className="h-4 w-4" style={{ color: streak >= 7 ? '#f59e0b' : theme.colors.textMuted }} />
        <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
          {t('gamification.keep_going')}
        </span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        {streakDays.map((day, i) => (
          <DayDot
            key={day.date}
            day={day}
            index={i}
            isToday={day.date === todayStr}
          />
        ))}
      </div>
    </motion.div>
  );
}
