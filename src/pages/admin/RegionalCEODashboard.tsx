/**
 * RegionalCEODashboard — Executive dashboard for regional CEOs
 * Task #27
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, DollarSign, Building2, Calendar,
  Pill, Activity, Trophy, Target, AlertCircle, Loader2,
  RefreshCw, Crown, TrendingUp, TrendingDown, ChevronRight,
  Sparkles, Flag, Globe,
} from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  getKPIs, getGoals, getRanking, getActiveCampaigns, getPriorityActions,
  type RegionalKPI, type RegionalGoal, type RankingEntry, type ActiveCampaign, type PriorityAction,
} from '@/services/regionalDashboard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { logger } from '@/lib/logger';
const KPI_ICONS: Record<string, any> = {
  active_users: Users,
  revenue_mtd: DollarSign,
  partners_onboarded: Building2,
  consultations_booked: Calendar,
  prescriptions_filled: Pill,
  avg_response_time_sos: Activity,
};

const STATUS_COLORS: Record<string, string> = {
  on_track: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  at_risk: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  behind: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300 border-red-200 dark:border-red-800',
  achieved: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  exceeded: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

const SEVERITY_ICONS: Record<string, any> = {
  critical: AlertCircle,
  warning: Flag,
  info: Sparkles,
};

export default function RegionalCEODashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, country } = useCountry();
  const countryCode = country?.id || 'MZ';
  const currentQuarter = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<RegionalKPI[]>([]);
  const [goals, setGoals] = useState<RegionalGoal[]>([]);
  const [ranking, setRanking] = useState<RankingEntry | null>(null);
  const [campaigns, setCampaigns] = useState<ActiveCampaign[]>([]);
  const [priorityActions, setPriorityActions] = useState<PriorityAction[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [k, g, r, c, p] = await Promise.all([
        getKPIs(countryCode, currentQuarter).catch(() => []),
        getGoals(countryCode, currentQuarter).catch(() => []),
        getRanking(currentQuarter, countryCode).catch(() => null),
        getActiveCampaigns(countryCode).catch(() => []),
        getPriorityActions(countryCode).catch(() => []),
      ]);
      setKpis(k);
      setGoals(g);
      setRanking(r);
      setCampaigns(c);
      setPriorityActions(p);
    } catch (err) {
      logger.error('CEO dashboard load error:', { error: err });
      toast.error(t('regionalCEO.error_load'));
    } finally {
      setLoading(false);
    }
  }, [countryCode, currentQuarter, t]);

  useEffect(() => { void loadAll(); }, [loadAll]);

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
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" aria-hidden="true" />
            {t('regionalCEO.title')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {country?.name} · {currentQuarter}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void loadAll()}
          aria-label={t('common.refresh')}
          className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
        </Button>
      </header>

      <div className="p-4 space-y-6 max-w-6xl mx-auto" role="dashboard">
        {/* KPI Grid */}
        <section aria-labelledby="kpis-heading">
          <h2 id="kpis-heading" className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
            {t('regionalCEO.kpis_title')}
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
            </div>
          ) : kpis.length === 0 ? (
            <Card className="p-8 text-center border-2 border-dashed">
              <p className="text-sm text-muted-foreground">{t('regionalCEO.kpis_empty')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {kpis.map((kpi, i) => {
                const Icon = KPI_ICONS[kpi.kpi_key] || Activity;
                const trendUp = (kpi.previous_period ?? 0) > 0 && kpi.value >= (kpi.previous_period ?? 0);
                const trendDown = (kpi.previous_period ?? 0) > 0 && kpi.value < (kpi.previous_period ?? 0);
                const pctChange = kpi.previous_period ? ((kpi.value - kpi.previous_period) / kpi.previous_period * 100) : 0;
                return (
                  <motion.div
                    key={kpi.id || kpi.kpi_key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                          </div>
                          {trendUp && <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
                          {trendDown && <TrendingDown className="h-4 w-4 text-red-500" aria-hidden="true" />}
                        </div>
                        <p className="text-2xl font-black">
                          {kpi.value.toLocaleString()}
                          <span className="text-xs text-muted-foreground ml-1 font-normal">{kpi.unit}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">
                          {t(`regionalCEO.kpi_${kpi.kpi_key}`)}
                        </p>
                        {kpi.previous_period && (
                          <p className={cn('text-[10px] mt-1 font-bold', trendUp ? 'text-emerald-600' : trendDown ? 'text-red-600' : 'text-muted-foreground')}>
                            {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}% vs período anterior
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Goals + Ranking */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Goals */}
          <section aria-labelledby="goals-heading" className="md:col-span-2">
            <h2 id="goals-heading" className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
              {t('regionalCEO.goals_title')}
            </h2>
            {loading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : goals.length === 0 ? (
              <Card className="p-6 text-center border-2 border-dashed">
                <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t('regionalCEO.goals_empty')}</p>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-4">
                  {goals.map((goal, i) => {
                    const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value * 100) : 0;
                    return (
                      <motion.div
                        key={goal.id || goal.goal_key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold">{goal.goal_label}</p>
                          <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[goal.status])}>
                            {t(`regionalCEO.status_${goal.status}`)}
                          </Badge>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()} {goal.unit}
                          <span className="ml-2 font-bold">{progress.toFixed(0)}%</span>
                        </p>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Ranking */}
          <section aria-labelledby="ranking-heading">
            <h2 id="ranking-heading" className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
              {t('regionalCEO.ranking_title')}
            </h2>
            {loading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : !ranking ? (
              <Card className="p-6 text-center border-2 border-dashed">
                <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t('regionalCEO.ranking_empty')}</p>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="h-11 w-11 mx-auto mb-2 text-amber-500" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{t('regionalCEO.ranking_position')}</p>
                  <p className="text-4xl font-black my-1">#{ranking.rank}</p>
                  <p className="text-xs text-muted-foreground">{t('regionalCEO.ranking_of', { total: '9' })}</p>
                  {ranking.badges?.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mt-3">
                      {ranking.badges.map((b, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/30">
                          <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
                          {t(`regionalCEO.badge_${b}`)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        {/* Priority Actions + Campaigns */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Priority Actions */}
          <section aria-labelledby="priority-heading">
            <h2 id="priority-heading" className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
              {t('regionalCEO.priority_title')}
            </h2>
            {loading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : priorityActions.length === 0 ? (
              <Card className="p-6 text-center border-2 border-dashed">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-emerald-500" aria-hidden="true" />
                <p className="text-sm font-bold text-emerald-600">{t('regionalCEO.priority_empty_good')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('regionalCEO.priority_empty_good_desc')}</p>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y">
                  {priorityActions.slice(0, 5).map((action, i) => {
                    const Icon = SEVERITY_ICONS[action.severity] || Flag;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 flex items-start gap-3"
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          action.severity === 'critical' && 'bg-red-100 dark:bg-red-950/30 text-red-600',
                          (action.severity as any) === 'warning' && 'bg-amber-100 dark:bg-amber-950/30 text-amber-600',
                          (action.severity as any) === 'info' && 'bg-blue-100 dark:bg-blue-950/30 text-blue-600',
                        )}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{action.title}</p>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                          {action.link && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => navigate(action.link!)}
                              className="h-auto p-0 mt-1 text-xs min-h-[44px]"
                            >
                              {t('regionalCEO.action_view_details')}
                              <ChevronRight className="h-3 w-3 ml-1" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Active Campaigns */}
          <section aria-labelledby="campaigns-heading">
            <h2 id="campaigns-heading" className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
              {t('regionalCEO.campaigns_title')}
            </h2>
            {loading ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : campaigns.length === 0 ? (
              <Card className="p-6 text-center border-2 border-dashed">
                <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t('regionalCEO.campaigns_empty')}</p>
                <Button variant="outline" size="sm" className="mt-3 min-h-[44px]">
                  {t('regionalCEO.launch_campaign')}
                </Button>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y">
                  {campaigns.map((c, i) => (
                    <motion.div
                      key={c.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{c.type}</p>
                          {(c.impressions != null || c.clicks != null) && (
                            <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                              {c.impressions != null && <span>👁 {c.impressions.toLocaleString()}</span>}
                              {c.clicks != null && <span>👆 {c.clicks.toLocaleString()}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        {/* Quick Actions */}
        <section aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
            {t('regionalCEO.quick_actions_title')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="min-h-[80px] flex flex-col items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => navigate('/admin/regional-content')}
            >
              <Globe className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-bold">{t('regionalCEO.action_campaigns')}</span>
            </Button>
            <Button
              variant="outline"
              className="min-h-[80px] flex flex-col items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => navigate('/admin/regional-goals')}
            >
              <Target className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-bold">{t('regionalCEO.action_goals')}</span>
            </Button>
            <Button
              variant="outline"
              className="min-h-[80px] flex flex-col items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => navigate('/admin/global-metrics')}
            >
              <Trophy className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-bold">{t('regionalCEO.action_ranking')}</span>
            </Button>
            <Button
              variant="outline"
              className="min-h-[80px] flex flex-col items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => navigate('/admin/onboarding')}
            >
              <Flag className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-bold">{t('regionalCEO.action_onboard_country')}</span>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
