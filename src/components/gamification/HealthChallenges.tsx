/**
 * HealthChallenges — Gamification dashboard for health engagement
 * Tabs: Challenges | Achievements | Leaderboard
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountry } from '@/contexts/CountryContext';
import { getTheme } from '@/themes';
import confetti from 'canvas-confetti';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Trophy, Flame, Heart, MapPin, Star, Medal, Crown,
  Target, Award, Zap, Pill, Activity, CheckCircle,
} from "@/components/icons/lucide-compat";
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────
interface Challenge {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  target: number;
  current: number;
  points: number;
  completed: boolean;
  category: 'daily' | 'weekly' | 'monthly';
}

interface Badge {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  earned: boolean;
  rarity: 'common' | 'rare' | 'legendary';
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  avatar?: string;
  isCurrentUser?: boolean;
}

// ── Icon map ───────────────────────────────────────────────────────
const iconMap: Record<string, React.ElementType> = {
  Trophy, Flame, Heart, MapPin, Star, Medal, Crown, Target, Award, Zap, Pill, Activity,
};

// ── Mock Data ──────────────────────────────────────────────────────
const mockChallenges: Challenge[] = [
  { id: 'c1', titleKey: 'gamification.weekly_challenge', descriptionKey: 'gamification.medication_streak', icon: 'Pill', target: 7, current: 5, points: 100, completed: false, category: 'weekly' },
  { id: 'c2', titleKey: 'gamification.consultation_badge', descriptionKey: 'gamification.points', icon: 'Heart', target: 3, current: 2, points: 150, completed: false, category: 'monthly' },
  { id: 'c3', titleKey: 'gamification.province_explorer', descriptionKey: 'gamification.achievements', icon: 'MapPin', target: 5, current: 3, points: 200, completed: false, category: 'monthly' },
  { id: 'c4', titleKey: 'gamification.weekly_challenge', descriptionKey: 'gamification.medication_streak', icon: 'Activity', target: 10, current: 10, points: 75, completed: true, category: 'daily' },
  { id: 'c5', titleKey: 'gamification.consultation_badge', descriptionKey: 'gamification.points', icon: 'Zap', target: 5, current: 1, points: 120, completed: false, category: 'weekly' },
];

const mockBadges: Badge[] = [
  { id: 'b1', nameKey: 'gamification.earned_badge', descriptionKey: 'gamification.medication_streak', icon: 'Pill', earned: true, rarity: 'common' },
  { id: 'b2', nameKey: 'gamification.consultation_badge', descriptionKey: 'gamification.achievements', icon: 'Heart', earned: true, rarity: 'rare' },
  { id: 'b3', nameKey: 'gamification.province_explorer', descriptionKey: 'gamification.achievements', icon: 'MapPin', earned: false, rarity: 'rare' },
  { id: 'b4', nameKey: 'gamification.weekly_challenge', descriptionKey: 'gamification.points', icon: 'Flame', earned: true, rarity: 'common' },
  { id: 'b5', nameKey: 'gamification.earned_badge', descriptionKey: 'gamification.streak_days', icon: 'Crown', earned: false, rarity: 'legendary' },
  { id: 'b6', nameKey: 'gamification.consultation_badge', descriptionKey: 'gamification.achievements', icon: 'Trophy', earned: false, rarity: 'legendary' },
  { id: 'b7', nameKey: 'gamification.weekly_challenge', descriptionKey: 'gamification.points', icon: 'Star', earned: true, rarity: 'common' },
  { id: 'b8', nameKey: 'gamification.province_explorer', descriptionKey: 'gamification.achievements', icon: 'Award', earned: false, rarity: 'rare' },
];

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Dr. Amália Sitoe', points: 4850 },
  { rank: 2, name: 'Carlos Mondlane', points: 4320 },
  { rank: 3, name: 'Maria Nhaca', points: 3890 },
  { rank: 4, name: 'João Macamo', points: 3560, isCurrentUser: true },
  { rank: 5, name: 'Ana Tembe', points: 3210 },
  { rank: 6, name: 'Pedro Cossa', points: 2980 },
  { rank: 7, name: 'Fátima Mabunda', points: 2750 },
];

const rarityColors = {
  common: 'border-gray-300 bg-gray-50 dark:bg-gray-900',
  rare: 'border-purple-400 bg-purple-50 dark:bg-purple-950',
  legendary: 'border-amber-400 bg-amber-50 dark:bg-amber-950',
};

const rarityGlow = {
  common: '',
  rare: 'shadow-purple-200/50 dark:shadow-purple-800/30',
  legendary: 'shadow-amber-200/60 dark:shadow-amber-800/40',
};

// ── Component ───────────────────────────────────────────────────────
export function HealthChallenges({ className = '' }: { className?: string }) {
  const { country } = useCountry();
  const { t } = useCountry();
  const theme = getTheme(country?.id || 'MZ');
  const [activeTab, setActiveTab] = useState('challenges');

  const handleBadgeClick = (badge: Badge) => {
    if (badge.earned) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: [theme.colors.primary, theme.colors.secondary, theme.logo.accent],
      });
    }
  };

  const challengeVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
    }),
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1, scale: 1,
      transition: { delay: i * 0.06, duration: 0.3, ease: 'back.out(1.2)' },
    }),
  };

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: theme.colors.primary }}>
            4
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: theme.colors.text }}>
              {t('gamification.level')} 4
            </p>
            <p className="text-xs" style={{ color: theme.colors.textMuted }}>
              {t('gamification.next_level', { points: '350' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span style={{ color: theme.colors.text }}>{t('gamification.streak_days', { days: '12' })}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4" style={{ color: theme.colors.primary }} />
            <span style={{ color: theme.colors.text }}>1,450 {t('gamification.points')}</span>
          </div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1" style={{ color: theme.colors.textMuted }}>
          <span>{t('gamification.level')} 4</span>
          <span>{t('gamification.level')} 5</span>
        </div>
        <Progress value={68} className="h-2" />
        <p className="text-xs mt-1 text-right" style={{ color: theme.colors.textMuted }}>
          1,450 / 1,800 {t('gamification.points')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="challenges" className="text-xs">
            <Target className="w-3.5 h-3.5 mr-1" />
            {t('gamification.title')}
          </TabsTrigger>
          <TabsTrigger value="achievements" className="text-xs">
            <Award className="w-3.5 h-3.5 mr-1" />
            {t('gamification.achievements')}
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs">
            <Crown className="w-3.5 h-3.5 mr-1" />
            {t('gamification.leaderboard')}
          </TabsTrigger>
        </TabsList>

        {/* ── Challenges Tab ──────────────────────────────────── */}
        <TabsContent value="challenges">
          <AnimatePresence mode="wait">
            <motion.div
              key="challenges"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Featured weekly challenge */}
              {mockChallenges.filter(c => c.category === 'weekly' && !c.completed).map((challenge, i) => {
                const Icon = iconMap[challenge.icon] || Target;
                const pct = Math.min(100, (challenge.current / challenge.target) * 100);
                return (
                  <motion.div key={challenge.id} custom={i} variants={challengeVariants} initial="hidden" animate="visible">
                    <Card className={cn('overflow-hidden', challenge.completed && 'opacity-60')}>
                      <div className="h-1" style={{ background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary})` }} />
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-sm truncate" style={{ color: theme.colors.text }}>
                                {t(challenge.titleKey)}
                              </p>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                                +{challenge.points}
                              </span>
                            </div>
                            <p className="text-xs mb-2" style={{ color: theme.colors.textMuted }}>
                              {challenge.current}/{challenge.target} {t('gamification.points')}
                            </p>
                            <Progress value={pct} className="h-1.5" />
                          </div>
                        </div>
                        {challenge.completed && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{t('gamification.earned_badge')}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {/* Other challenges */}
              {mockChallenges.filter(c => c.category !== 'weekly' || c.completed).map((challenge, i) => {
                const Icon = iconMap[challenge.icon] || Target;
                const pct = Math.min(100, (challenge.current / challenge.target) * 100);
                return (
                  <motion.div key={challenge.id} custom={i + 3} variants={challengeVariants} initial="hidden" animate="visible">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate" style={{ color: theme.colors.text }}>
                            {t(challenge.titleKey)}
                          </p>
                          <span className="text-xs font-bold" style={{ color: theme.colors.primary }}>
                            +{challenge.points}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1 mt-1" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ── Achievements Tab ─────────────────────────────────── */}
        <TabsContent value="achievements">
          <AnimatePresence mode="wait">
            <motion.div
              key="achievements"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-3"
            >
              {mockBadges.map((badge, i) => {
                const Icon = iconMap[badge.icon] || Star;
                return (
                  <motion.button
                    key={badge.id}
                    custom={i}
                    variants={badgeVariants}
                    initial="hidden"
                    animate="visible"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBadgeClick(badge)}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center',
                      rarityColors[badge.rarity],
                      badge.earned ? 'shadow-md ' + rarityGlow[badge.rarity] : 'opacity-40 grayscale',
                    )}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center mb-1.5',
                      badge.earned ? 'text-white' : 'text-gray-400',
                    )} style={{ backgroundColor: badge.earned ? theme.colors.primary : undefined }}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: badge.earned ? theme.colors.text : theme.colors.textMuted }}>
                      {t(badge.nameKey)}
                    </p>
                    <span className={cn(
                      'text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full',
                      badge.rarity === 'common' && 'bg-gray-200 text-gray-600',
                      badge.rarity === 'rare' && 'bg-purple-100 text-purple-700',
                      badge.rarity === 'legendary' && 'bg-amber-100 text-amber-700',
                    )}>
                      {badge.rarity}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ── Leaderboard Tab ──────────────────────────────────── */}
        <TabsContent value="leaderboard">
          <AnimatePresence mode="wait">
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {mockLeaderboard.map((entry, i) => (
                <motion.div
                  key={entry.rank}
                  custom={i}
                  variants={challengeVariants}
                  initial="hidden"
                  animate="visible"
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl transition-all',
                    entry.isCurrentUser
                      ? 'border-2 shadow-md'
                      : 'border border-border/50',
                  )}
                  style={entry.isCurrentUser ? {
                    borderColor: theme.colors.primary,
                    backgroundColor: `${theme.colors.primary}08`,
                  } : undefined}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                    entry.rank === 1 && 'bg-amber-400 text-amber-900',
                    entry.rank === 2 && 'bg-gray-300 text-gray-700',
                    entry.rank === 3 && 'bg-amber-600 text-amber-100',
                    entry.rank > 3 && 'bg-muted text-muted-foreground',
                  )}>
                    {entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      entry.isCurrentUser ? 'font-bold' : '',
                    )} style={{ color: theme.colors.text }}>
                      {entry.name}
                      {entry.isCurrentUser && (
                        <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                          Você
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                    <span className="text-sm font-bold" style={{ color: theme.colors.text }}>
                      {entry.points.toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HealthChallenges;
