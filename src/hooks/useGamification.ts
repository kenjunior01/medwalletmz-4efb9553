import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Challenge {
  id: string;
  type: 'medication_streak' | 'consultation_count' | 'province_explorer' | 'wellness_check';
 titleKey: string;
  descriptionKey: string;
  icon: string;
  target: number;
  current: number;
  points: number;
  deadline?: string;
  completed: boolean;
  category: 'daily' | 'weekly' | 'monthly';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  rarity: 'common' | 'rare' | 'legendary';
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  avatar_url: string | null;
  points: number;
  streak: number;
  level: number;
}

export interface StreakDay {
  date: string;
  completed: boolean;
}

interface GamificationRow {
  user_id: string;
  joy_coins: number;
  experience_points: number;
 current_level: number;
  streak_days: number;
  last_activity_at?: string | null;
}

interface UserChallengeRow {
  user_id: string;
  challenge_id: string;
  current_value: number;
 completed_at: string | null;
  challenge: {
    id: string;
    title: string;
    description: string;
    icon: string;
    type?: string;
    challenge_type?: string;
    target_value: number;
    joy_coins_reward: number;
    category: string;
    ends_at: string | null;
  };
}

interface UserAchievementRow {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
}

function mapChallengeType(type: string): Challenge['type'] {
  const map: Record<string, Challenge['type']> = {
    medication: 'medication_streak',
    consultation: 'consultation_count',
    province: 'province_explorer',
    wellness: 'wellness_check',
  };
  return map[type] || 'wellness_check';
}

function mapCategory(cat: string): Challenge['category'] {
  if (cat === 'daily' || cat === 'weekly' || cat === 'monthly') return cat;
  return 'daily';
}

function mapRarity(desc: string): Badge['rarity'] {
  const lower = desc.toLowerCase();
  if (lower.includes('legendary')) return 'legendary';
  if (lower.includes('rare') || lower.includes('epic')) return 'rare';
  return 'common';
}

const DEFAULT_CHALLENGES: Challenge[] = [
  { id: 'c1', type: 'medication_streak', titleKey: 'gamification.challenges.med_streak.title', descriptionKey: 'gamification.challenges.med_streak.description', icon: 'pill', target: 7, current: 3, points: 50, category: 'weekly', completed: false },
  { id: 'c2', type: 'consultation_count', titleKey: 'gamification.challenges.consultation.title', descriptionKey: 'gamification.challenges.consultation.description', icon: 'video', target: 3, current: 1, points: 30, category: 'weekly', completed: false },
  { id: 'c3', type: 'province_explorer', titleKey: 'gamification.challenges.explorer.title', descriptionKey: 'gamification.challenges.explorer.description', icon: 'map', target: 5, current: 2, points: 75, category: 'monthly', completed: false },
  { id: 'c4', type: 'wellness_check', titleKey: 'gamification.challenges.wellness.title', descriptionKey: 'gamification.challenges.wellness.description', icon: 'heart', target: 30, current: 18, points: 40, category: 'daily', completed: false },
];

const DEFAULT_BADGES: Badge[] = [
  { id: 'b1', name: 'First Steps', description: 'gamification.badges.first_steps', icon: 'shoe-prints', earned: true, rarity: 'common' },
  { id: 'b2', name: 'Streak Master', description: 'gamification.badges.streak_master', icon: 'flame', earned: false, rarity: 'rare' },
  { id: 'b3', name: 'Health Champion', description: 'gamification.badges.health_champion', icon: 'trophy', earned: false, rarity: 'legendary' },
  { id: 'b4', name: 'Province Pioneer', description: 'gamification.badges.province_pioneer', icon: 'map-pin', earned: true, rarity: 'rare' },
  { id: 'b5', name: 'Wellness Warrior', description: 'gamification.badges.wellness_warrior', icon: 'heart', earned: true, rarity: 'common' },
  { id: 'b6', name: 'Consultation Pro', description: 'gamification.badges.consultation_pro', icon: 'activity', earned: false, rarity: 'rare' },
  { id: 'b7', name: 'Legendary Healer', description: 'gamification.badges.legendary_healer', icon: 'crown', earned: false, rarity: 'legendary' },
  { id: 'b8', name: 'Point King', description: 'gamification.badges.point_king', icon: 'star', earned: true, rarity: 'common' },
];

export function useGamification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: gamificationRow, isLoading: gamLoading } = useQuery({
    queryKey: ['user-gamification', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data as unknown as GamificationRow | null;
    },
    enabled: !!user,
  });

  const { data: userChallenges = [] } = useQuery({
    queryKey: ['user-challenges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_challenges')
        .select('*, challenge:challenges(*)')
        .eq('user_id', user.id);
      return (data ?? []) as unknown as UserChallengeRow[];
    },
    enabled: !!user,
  });

  const { data: userAchievements = [] } = useQuery({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from('userachievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });
      return (data ?? []) as unknown as UserAchievementRow[];
    },
    enabled: !!user,
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['gamification-leaderboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_gamification')
        .select('user_id, joy_coins, experience_points, current_level, streak_days, profiles!user_id(full_name, avatar_url)')
        .order('joy_coins', { ascending: false })
        .limit(20);
      return (data ?? []).map((row: any, idx: number) => ({
        id: row.user_id,
        rank: idx + 1,
        name: row.profiles?.full_name ?? 'Anônimo',
        avatar_url: row.profiles?.avatar_url ?? null,
        points: row.joy_coins ?? 0,
        streak: row.streak_days ?? 0,
        level: row.current_level ?? 1,
      }));
    },
  });

  const challenges: Challenge[] = userChallenges.length > 0
    ? userChallenges.map((uc) => ({
        id: uc.challenge_id,
        type: mapChallengeType(uc.challenge?.type ?? uc.challenge?.challenge_type ?? ''),
        titleKey: `gamification.challenges.${mapChallengeType(uc.challenge?.type ?? uc.challenge?.challenge_type ?? '')}.title`,
        descriptionKey: `gamification.challenges.${mapChallengeType(uc.challenge?.type ?? uc.challenge?.challenge_type ?? '')}.description`,
        icon: uc.challenge?.icon ?? 'target',
        target: uc.challenge?.target_value ?? 1,
        current: uc.current_value ?? 0,
        points: uc.challenge?.joy_coins_reward ?? 0,
        deadline: uc.challenge?.ends_at ?? undefined,
        completed: uc.completed_at !== null,
        category: mapCategory(uc.challenge?.category ?? 'daily'),
      }))
    : DEFAULT_CHALLENGES;

  const badges: Badge[] = userAchievements.length > 0
    ? userAchievements.map((ua) => ({
        id: ua.achievement_id,
        name: ua.achievement?.name ?? '',
        description: ua.achievement?.description ?? '',
        icon: ua.achievement?.icon ?? 'award',
        earned: true,
        rarity: mapRarity(ua.achievement?.description ?? ''),
      }))
    : DEFAULT_BADGES;

  const totalPoints = gamificationRow?.joy_coins ?? 0;
  const level = gamificationRow?.current_level ?? 1;
  const streak = gamificationRow?.streak_days ?? 0;

  const streakDays: StreakDay[] = (() => {
    const days: StreakDay[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, completed: i < streak });
    }
    return days;
  })();

  const claimReward = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any).rpc('claim_challenge_reward', {
        p_user_id: user.id,
        p_challenge_id: challengeId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-gamification'] });
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
    },
  });

  const checkStreak = useCallback(async () => {
    if (!user) return false;
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRecord } = await (supabase as any)
      .from('streak_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('activity_date', today)
      .single();
    if (todayRecord) return true;
    const { error: insertError } = await (supabase as any)
      .from('streak_log')
      .insert({ user_id: user.id, activity_date: today });
    if (insertError) {
      console.error('Failed to record streak:', insertError.message);
      return false;
    }
    queryClient.invalidateQueries({ queryKey: ['user-gamification'] });
    return true;
  }, [user, queryClient]);

  return {
    challenges, badges, totalPoints, level, streak, streakDays, leaderboard,
    isLoading: gamLoading, claimReward, checkStreak,
  };
}
