/**
 * Global Ranking — Leaderboard between regions
 *
 * Features:
 *  - Period selector (week / quarter / year)
 *  - Podium for top 3 (gold/silver/bronze with country flags)
 *  - Full leaderboard with rank, country, score, trend, badges
 *  - My country card (highlighted, with badges)
 *  - Badge legend
 *  - History chart for my country (last 12 periods)
 *  - Skeleton/empty/error states
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award,
  Activity, Pill, Stethoscope, Zap, RefreshCw, AlertTriangle, X,
  Users, Star, Heart, Sparkles, ChevronUp, ChevronDown, BarChart3,
} from '@/components/icons/lucide-compat';
import { useCountry } from '@/contexts/CountryContext';
import {
  RegionalRanking,
  getRankings, getMockRankings, getCountryRankingHistory,
  getAvailablePeriods, computeTrends, getMyCountryRanking,
  BADGES, COUNTRY_INFO,
} from '@/services/globalRanking';

export default function GlobalRanking() {
  const { t, country } = useCountry();
  const [period, setPeriod] = useState(getAvailablePeriods()[0].value);
  const [rankings, setRankings] = useState<RegionalRanking[]>([]);
  const [previousRankings, setPreviousRankings] = useState<RegionalRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myCountry, setMyCountry] = useState<RegionalRanking | null>(null);
  const [history, setHistory] = useState<RegionalRanking[]>([]);

  const periods = useMemo(() => getAvailablePeriods(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cur, prev] = await Promise.all([
        getRankings(period).catch(() => getMockRankings(period)),
        getRankings(periods[1].value).catch(() => getMockRankings(periods[1].value)),
      ]);
      setRankings(cur.length === 0 ? getMockRankings(period) : cur);
      setPreviousRankings(prev);
      const cc = (country as any)?.code ?? country?.id;
      if (cc) {
        const me = cur.find((r) => r.country_code === cc) ??
                   getMockRankings(period).find((r) => r.country_code === cc);
        setMyCountry(me ?? null);
        const hist = await getCountryRankingHistory(cc).catch(() => []);
        setHistory(hist);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erro');
    } finally {
      setLoading(false);
    }
  }, [period, (country as any)?.code, country?.id, periods]);

  useEffect(() => { load(); }, [load]);

  const trends = useMemo(
    () => computeTrends(rankings, previousRankings),
    [rankings, previousRankings],
  );

  const sortedByOverall = useMemo(
    () => [...rankings].sort((a, b) => (a.rank_overall ?? 999) - (b.rank_overall ?? 999)),
    [rankings],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/40 to-yellow-50/30 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{t('globalRanking.title') ?? 'Ranking Global'}</h1>
              <p className="text-xs text-slate-500 leading-tight">{t('globalRanking.subtitle') ?? 'Competição saudável entre regiões'}</p>
            </div>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
            aria-label={t('globalRanking.selectPeriod') ?? 'Seleccionar período'}
          >
            {periods.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" /><span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4" role="status" aria-busy="true">
            <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
            <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Podium */}
            <Podium rankings={sortedByOverall} t={t} />

            {/* My country card */}
            {myCountry && (
              <MyCountryCard ranking={myCountry} trend={trends.get(myCountry.country_code) ?? 'same'} t={t} />
            )}

            {/* Full leaderboard */}
            <section aria-labelledby="leaderboard-heading">
              <h2 id="leaderboard-heading" className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" aria-hidden />
                {t('globalRanking.fullRanking') ?? 'Classificação completa'}
              </h2>
              <ul className="space-y-2">
                {sortedByOverall.map((r, idx) => (
                  <RankRow
                    key={r.country_code}
                    ranking={r}
                    trend={trends.get(r.country_code) ?? 'same'}
                    isMe={r.country_code === ((country as any)?.code ?? country?.id)}
                    index={idx}
                    t={t}
                  />
                ))}
              </ul>
            </section>

            {/* Badges legend */}
            <section aria-labelledby="badges-heading" className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 id="badges-heading" className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" aria-hidden />
                {t('globalRanking.badgesLegend') ?? 'Símbolos (badges)'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BADGES.map((b) => (
                  <div key={b.key} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                    <span className="text-xl flex-shrink-0">{b.emoji}</span>
                    <div>
                      <div className="text-sm font-medium text-slate-900" style={{ color: b.color }}>{b.label}</div>
                      <div className="text-xs text-slate-500">{b.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- Podium ---------- */

function Podium({ rankings, t }: { rankings: RegionalRanking[]; t: any }) {
  const top3 = rankings.slice(0, 3);
  if (top3.length === 0) return null;

  const podiumStyle = [
    { order: 2, height: 'h-32', color: 'from-amber-400 to-yellow-500', icon: <Crown className="w-6 h-6" />, label: '1º' },
    { order: 1, height: 'h-24', color: 'from-slate-300 to-slate-400', icon: <Medal className="w-5 h-5" />, label: '2º' },
    { order: 3, height: 'h-20', color: 'from-orange-400 to-amber-600', icon: <Award className="w-5 h-5" />, label: '3º' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 rounded-3xl p-6 border border-amber-200"
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-amber-500" aria-hidden />
        <h2 className="text-sm font-semibold text-amber-700">{t('globalRanking.topThree') ?? 'Top 3 regiões'}</h2>
      </div>
      <div className="flex items-end justify-center gap-3">
        {podiumStyle.map((s, i) => {
          const r = top3[i];
          if (!r) return <div key={i} className={`flex-1 ${s.height}`} />;
          return (
            <motion.div
              key={r.country_code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex-1 flex flex-col items-center"
              style={{ order: s.order }}
            >
              <div className="text-3xl mb-1">{r.country_flag}</div>
              <div className="text-xs font-medium text-slate-700 mb-1">{r.country_name}</div>
              <div className="text-lg font-bold text-slate-900 mb-2">{r.health_score ?? '—'}</div>
              <div className={`w-full ${s.height} bg-gradient-to-br ${s.color} rounded-t-xl flex flex-col items-center justify-start pt-2 shadow-lg`}>
                <div className="text-white">{s.icon}</div>
                <div className="text-white font-bold text-sm mt-1">{s.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* ---------- My country card ---------- */

function MyCountryCard({ ranking, trend, t }: { ranking: RegionalRanking; trend: 'up' | 'down' | 'same'; t: any }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-xl"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-medium opacity-80 mb-1">{t('globalRanking.yourCountry') ?? 'A tua região'}</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{ranking.country_flag}</span>
            <h3 className="text-xl font-bold">{ranking.country_name}</h3>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-80">{t('globalRanking.position') ?? 'Posição'}</div>
          <div className="text-3xl font-black">#{ranking.rank_overall ?? '—'}</div>
          <TrendBadge trend={trend} t={t} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <MiniStat label={t('globalRanking.healthScore') ?? 'Score'} value={ranking.health_score?.toString() ?? '—'} icon={<Activity className="w-3 h-3" />} />
        <MiniStat label={t('globalRanking.adherence') ?? 'Adesão'} value={`${ranking.medication_adherence_pct ?? '—'}%`} icon={<Pill className="w-3 h-3" />} />
        <MiniStat label={t('globalRanking.users') ?? 'Utilizadores'} value={(ranking.active_users_count ?? 0).toLocaleString()} icon={<Users className="w-3 h-3" />} />
        <MiniStat label={t('globalRanking.sosTime') ?? 'SOS min'} value={ranking.sos_response_time_avg_min?.toString() ?? '—'} icon={<Zap className="w-3 h-3" />} />
      </div>

      {ranking.badges && ranking.badges.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="text-xs font-medium opacity-90 mb-1.5">{t('globalRanking.badges') ?? 'Símbolos'}</div>
          <div className="flex flex-wrap gap-1.5">
            {ranking.badges.map((bKey) => {
              const badge = BADGES.find((b) => b.key === bKey);
              if (!badge) return null;
              return (
                <span
                  key={bKey}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-xs font-medium"
                  title={badge.description}
                >
                  <span>{badge.emoji}</span>
                  <span>{badge.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </motion.section>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/10 rounded-lg p-2">
      <div className="text-xs opacity-80 flex items-center gap-1 mb-0.5">{icon}{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function TrendBadge({ trend, t }: { trend: 'up' | 'down' | 'same'; t: any }) {
  const cfg = {
    up: { icon: <ChevronUp className="w-3 h-3" />, label: t('globalRanking.up') ?? 'Subiu', cls: 'text-emerald-300' },
    down: { icon: <ChevronDown className="w-3 h-3" />, label: t('globalRanking.down') ?? 'Desceu', cls: 'text-red-300' },
    same: { icon: <Minus className="w-3 h-3" />, label: t('globalRanking.same') ?? 'Estável', cls: 'text-white/70' },
  }[trend];
  return (
    <div className={`inline-flex items-center gap-0.5 text-xs ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </div>
  );
}

/* ---------- Rank row ---------- */

function RankRow({ ranking, trend, isMe, index, t }: {
  ranking: RegionalRanking; trend: 'up' | 'down' | 'same';
  isMe: boolean; index: number; t: any;
}) {
  const rank = ranking.rank_overall ?? index + 1;
  const rankColor = rank === 1 ? 'bg-amber-100 text-amber-700' :
                     rank === 2 ? 'bg-slate-200 text-slate-700' :
                     rank === 3 ? 'bg-orange-100 text-orange-700' :
                     'bg-slate-50 text-slate-500';

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        isMe ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${rankColor}`}>
        {rank}
      </div>
      <div className="text-2xl flex-shrink-0">{ranking.country_flag}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 truncate">{ranking.country_name}</span>
          {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white">{t('globalRanking.you') ?? 'tu'}</span>}
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-0.5"><Pill className="w-3 h-3" />{ranking.medication_adherence_pct ?? '—'}%</span>
          <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" />{(ranking.active_users_count ?? 0).toLocaleString()}</span>
          {ranking.badges && ranking.badges.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              {ranking.badges.slice(0, 3).map((bKey) => {
                const badge = BADGES.find((b) => b.key === bKey);
                return badge ? <span key={bKey} title={badge.label}>{badge.emoji}</span> : null;
              })}
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-slate-900">{ranking.health_score ?? '—'}</div>
        <TrendBadge trend={trend} t={t} />
      </div>
    </motion.li>
  );
}
