/**
 * HealthJournal — Daily wellness diary with AI insights
 * Task #25
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ArrowLeft, SmilePlus, Flame, Moon, Zap, Heart, FileText,
  Sparkles, Loader2, CalendarDays, Activity, SkipForward, ChevronRight,
  RefreshCw, AlertCircle,
} from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  addEntry, getEntry, getEntries, getWeeklyEntries, generateWeeklyInsight,
  getStreak, getStats, type JournalEntry,
} from '@/services/healthJournal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MOOD_EMOJIS = [
  { level: 1, emoji: '😞', labelKey: 'muitoMau' },
  { level: 2, emoji: '😕', labelKey: 'mau' },
  { level: 3, emoji: '😐', labelKey: 'normal' },
  { level: 4, emoji: '😊', labelKey: 'bom' },
  { level: 5, emoji: '😄', labelKey: 'muitoBom' },
];

const COMMON_SYMPTOMS_KEYS = ['headache', 'fatigue', 'cough', 'fever', 'musclePain', 'nausea', 'insomnia', 'anxiety', 'abdominalPain', 'dizziness'];

const SLEEP_QUALITY_KEYS = ['', 'veryBad', 'bad', 'normal', 'good', 'veryGood'];

function getMoodColor(mood?: number): string {
  if (!mood) return 'bg-muted/40';
  if (mood >= 4) return 'bg-emerald-400';
  if (mood === 3) return 'bg-yellow-400';
  return 'bg-red-400';
}

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export default function HealthJournal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, country } = useCountry();
  const locale = country?.id === 'BR' ? 'pt-BR' : 'pt-MZ';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [streak, setStreak] = useState(0);
  const [aiInsight, setAiInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [stats, setStats] = useState<{ avg_mood: number; avg_sleep_hours: number; avg_energy: number; total_entries: number } | null>(null);
  const [monthlyEntries, setMonthlyEntries] = useState<Record<string, JournalEntry>>({});
  const [showNotes, setShowNotes] = useState(false);
  const [hasEntryToday, setHasEntryToday] = useState(false);

  // Form state
  const [mood, setMood] = useState<number>(0);
  const [energy, setEnergy] = useState(3);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [painLevel, setPainLevel] = useState(0);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [gratitude, setGratitude] = useState('');
  const [notes, setNotes] = useState('');

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [entry, streakVal, weekly, statData, monthData] = await Promise.all([
        getEntry(user.id),
        getStreak(user.id),
        getWeeklyEntries(user.id),
        getStats(user.id, 30),
        getEntries(user.id, getLast30Days()[0], getLast30Days()[29]),
      ]);

      if (entry) {
        setMood(entry.mood);
        setEnergy(entry.energy);
        setSleepHours(entry.sleep_hours);
        setSleepQuality(entry.sleep_quality);
        setPainLevel(entry.pain_level);
        setSymptoms(entry.symptoms || []);
        setGratitude(entry.gratitude || '');
        setNotes(entry.notes || '');
        setHasEntryToday(true);
      }
      setStreak(streakVal);
      setStats(statData);
      const map: Record<string, JournalEntry> = {};
      monthData.forEach(e => { if (e.entry_date) map[e.entry_date] = e; });
      setMonthlyEntries(map);

      // AI insight (use existing if available)
      const existingInsight = weekly.find(e => e.ai_insight);
      if (existingInsight?.ai_insight) {
        setAiInsight(existingInsight.ai_insight);
      } else if (weekly.length >= 1) {
        // Generate async, don't await
        setInsightLoading(true);
        generateWeeklyInsight(user.id, country?.id === 'BR' ? 'pt' : 'pt')
          .then(insight => { if (insight) setAiInsight(insight); })
          .finally(() => setInsightLoading(false));
      }
    } catch (err) {
      console.error('HealthJournal load error:', err);
      toast.error(t('healthJournal.error_load'));
    } finally {
      setLoading(false);
    }
  }, [user, country, t]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const toggleSymptom = (symptomKey: string) => {
    setSymptoms(prev => prev.includes(symptomKey) ? prev.filter(s => s !== symptomKey) : [...prev, symptomKey]);
  };

  const handleSave = async () => {
    if (!user || !mood) return;
    setSaving(true);
    try {
      await addEntry(user.id, {
        mood, energy, sleep_hours: sleepHours, sleep_quality: sleepQuality,
        pain_level: painLevel, symptoms,
        notes: notes.trim() || undefined,
        gratitude: gratitude.trim() || undefined,
      });
      setSaved(true);
      setHasEntryToday(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success(t('healthJournal.saved_toast'));
      void loadAll(); // refresh streak + stats
    } catch (err) {
      console.error('Save error:', err);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshInsight = async () => {
    if (!user) return;
    setInsightLoading(true);
    try {
      const insight = await generateWeeklyInsight(user.id, 'pt');
      if (insight) {
        setAiInsight(insight);
        toast.success(t('healthJournal.insight_refreshed'));
      }
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setInsightLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return getLast30Days().slice(-14).map(d => ({
      date: new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      mood: monthlyEntries[d]?.mood ?? null,
      sleep: monthlyEntries[d]?.sleep_hours ?? null,
    }));
  }, [monthlyEntries, locale]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">{t('healthJournal.loading_aria')}</span>
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-6 w-40" />
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasEntries = stats?.total_entries ?? 0 > 0;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">{t('healthJournal.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('healthJournal.subtitle')}</p>
        </div>
      </header>

      <div className="p-4 space-y-5 max-w-2xl mx-auto">
        {/* Streak indicator */}
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 px-4 py-3 rounded-2xl text-sm font-bold"
            role="status"
          >
            <Flame className="h-5 w-5" aria-hidden="true" />
            <span>{streak} {t('healthJournal.streak_label')}</span>
            <span className="ml-auto text-xs opacity-70">{t('healthJournal.streak_keep_going')}</span>
          </motion.div>
        )}

        {/* Today's check-in */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border-2 p-5 space-y-5"
          role="form"
          aria-label={t('healthJournal.checkin_label')}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <SmilePlus className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              {t('healthJournal.today_checkin')}
            </h2>
            {saved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-emerald-600 font-bold"
              >
                ✓ {t('healthJournal.saved')}
              </motion.span>
            )}
            {hasEntryToday && !saved && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('healthJournal.already_filled_today')}</span>
            )}
          </div>

          {/* Mood picker */}
          <fieldset>
            <legend className="text-sm font-bold mb-2">{t('healthJournal.how_feeling')}</legend>
            <div className="flex justify-between gap-1" role="radiogroup" aria-label={t('healthJournal.mood')}>
              {MOOD_EMOJIS.map(m => (
                <button
                  key={m.level}
                  type="button"
                  role="radio"
                  aria-checked={mood === m.level}
                  aria-label={t(`healthJournal.mood_${m.labelKey}`)}
                  onClick={() => setMood(m.level)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 min-h-[44px] min-w-[44px] rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    mood === m.level ? 'bg-emerald-50 dark:bg-emerald-950/30 scale-110' : 'hover:bg-muted'
                  )}
                >
                  <motion.span
                    key={mood === m.level ? 'selected' : 'unselected'}
                    animate={mood === m.level ? { scale: [1, 1.3, 1] } : {}}
                    className="text-2xl"
                  >
                    {m.emoji}
                  </motion.span>
                  <span className="text-[10px] text-muted-foreground">{t(`healthJournal.mood_${m.labelKey}`)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {/* Energy */}
          <div>
            <Label htmlFor="energy-slider" className="flex items-center gap-1 mb-2">
              <Zap className="h-4 w-4 text-yellow-500" aria-hidden="true" />
              {t('healthJournal.energy')}: <strong>{energy}/5</strong>
            </Label>
            <input
              id="energy-slider"
              type="range" min={1} max={5} step={1}
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`${t('healthJournal.energy')}: ${energy}/5`}
            />
          </div>

          {/* Sleep + Pain */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sleep-hours" className="flex items-center gap-1 mb-2">
                <Moon className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                {t('healthJournal.sleep_hours')}
              </Label>
              <Input
                id="sleep-hours" type="number" min={0} max={24} step={0.5}
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="text-center text-lg font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div>
              <Label htmlFor="sleep-quality" className="mb-2 block">{t('healthJournal.sleep_quality')}</Label>
              <select
                id="sleep-quality"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {[1, 2, 3, 4, 5].map(q => (
                  <option key={q} value={q}>{q}/5 — {t(`healthJournal.sleep_quality_${SLEEP_QUALITY_KEYS[q]}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pain */}
          <div>
            <Label htmlFor="pain-level" className="flex items-center gap-1 mb-2">
              <Heart className="h-4 w-4 text-red-400" aria-hidden="true" />
              {t('healthJournal.pain_level')}: <strong>{painLevel}/10</strong>
            </Label>
            <input
              id="pain-level" type="range" min={0} max={10} step={1}
              value={painLevel}
              onChange={(e) => setPainLevel(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-400 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          {/* Symptoms */}
          {!showNotes && (
            <div>
              <p className="text-sm font-bold mb-2">{t('healthJournal.symptoms')}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('healthJournal.symptoms')}>
                {COMMON_SYMPTOMS_KEYS.map(s => {
                  const active = symptoms.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSymptom(s)}
                      aria-pressed={active}
                      className={cn(
                        'px-3 py-2 min-h-[44px] text-xs font-bold rounded-full border transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        active
                          ? 'bg-emerald-100 dark:bg-emerald-950/30 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                          : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {t(`healthJournal.symptom_${s}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gratitude */}
          {!showNotes && (
            <div>
              <Label htmlFor="gratitude" className="flex items-center gap-1 mb-2">
                ❤️ {t('healthJournal.gratitude')}
              </Label>
              <Textarea
                id="gratitude"
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                rows={2}
                placeholder={t('healthJournal.gratitude_placeholder')}
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          )}

          {/* Notes (expandable) */}
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Label htmlFor="journal-notes" className="flex items-center gap-1 mb-2">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t('healthJournal.notes')}
                </Label>
                <Textarea
                  id="journal-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={t('healthJournal.notes_placeholder')}
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowNotes(!showNotes)}
              className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <SkipForward className="h-4 w-4 mr-1" aria-hidden="true" />
              {showNotes ? t('healthJournal.back_to_checkin') : t('healthJournal.skip_to_notes')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!mood || saving}
              className="flex-1 min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" /> : null}
              {saving ? t('healthJournal.saving') : t('healthJournal.save')}
            </Button>
          </div>
        </motion.div>

        {/* Empty state */}
        {!hasEntries && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-border"
          >
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-bold mb-1">{t('healthJournal.empty_title')}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{t('healthJournal.empty_desc')}</p>
          </motion.div>
        )}

        {/* Weekly AI Insight */}
        {hasEntries && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-2xl border-2 border-violet-100 dark:border-violet-800 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-violet-500" aria-hidden="true" />
              <h3 className="font-bold">{t('healthJournal.weekly_insight')}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshInsight}
                disabled={insightLoading}
                aria-label={t('healthJournal.refresh_insight')}
                className="ml-auto h-8 w-8 min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <RefreshCw className={cn('h-4 w-4', insightLoading && 'animate-spin')} aria-hidden="true" />
              </Button>
            </div>
            {insightLoading ? (
              <div className="space-y-2" aria-live="polite">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : aiInsight ? (
              <p className="text-sm leading-relaxed">{aiInsight}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t('healthJournal.no_insight_yet')}</p>
            )}
          </motion.div>
        )}

        {/* 30-day calendar */}
        {hasEntries && (
          <div className="bg-card rounded-2xl border-2 p-5">
            <h3 className="font-bold flex items-center gap-2 mb-3">
              <CalendarDays className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              {t('healthJournal.last_30_days')}
            </h3>
            <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={t('healthJournal.mood_calendar')}>
              {getLast30Days().map(d => {
                const entry = monthlyEntries[d];
                const dayNum = d.split('-')[2];
                const isToday = d === new Date().toISOString().split('T')[0];
                return (
                  <div
                    key={d}
                    role="gridcell"
                    aria-label={`${d}: ${entry ? `${t('healthJournal.mood')}: ${entry.mood}/5` : t('healthJournal.no_entry')}`}
                    className={cn(
                      'aspect-square rounded-lg flex flex-col items-center justify-center text-xs',
                      getMoodColor(entry?.mood),
                      isToday && 'ring-2 ring-primary ring-offset-1'
                    )}
                  >
                    <span className="font-bold">{dayNum}</span>
                    {entry?.mood ? <span className="text-[10px] leading-none mt-0.5">{MOOD_EMOJIS[entry.mood - 1]?.emoji}</span> : null}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400" aria-hidden="true" /> {t('healthJournal.legend_good')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400" aria-hidden="true" /> {t('healthJournal.legend_neutral')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" aria-hidden="true" /> {t('healthJournal.legend_bad')}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/40" aria-hidden="true" /> {t('healthJournal.legend_none')}</span>
            </div>
          </div>
        )}

        {/* Trends chart */}
        {hasEntries && stats && stats.total_entries >= 3 && (
          <div className="bg-card rounded-2xl border-2 p-5">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              {t('healthJournal.trends')}
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-2">{t('healthJournal.mood_trend')}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="mood" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-2">{t('healthJournal.sleep_trend')}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 12]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="sleep" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Quick stats */}
        {hasEntries && stats && stats.total_entries > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border-2 p-3 text-center">
              <p className="text-2xl font-black text-emerald-600">{stats.avg_mood}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('healthJournal.avg_mood')}</p>
            </div>
            <div className="bg-card rounded-xl border-2 p-3 text-center">
              <p className="text-2xl font-black text-indigo-600">{stats.avg_sleep_hours}h</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('healthJournal.avg_sleep')}</p>
            </div>
            <div className="bg-card rounded-xl border-2 p-3 text-center">
              <p className="text-2xl font-black text-yellow-600">{stats.avg_energy}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t('healthJournal.avg_energy')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
