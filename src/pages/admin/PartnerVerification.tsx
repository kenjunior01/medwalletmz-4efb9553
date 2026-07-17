// ============================================================
// Partner Verification · Tiers Bronze→Platina + verificação
// src/pages/admin/PartnerVerification.tsx
// ============================================================

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  usePartnerCertifications,
  useUpgradePartnerTier,
} from '@/hooks/useCompliance';
import {
  TIER_META, COUNTRY_FLAG_EMOJI,
  type CertificationTier, type PartnerType,
} from '@/integrations/supabase/compliance-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award, Search, Filter, ShieldCheck, Star, Activity, TrendingUp,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Phone,
} from 'lucide-react';

const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  store: 'Farmácia',
  clinic: 'Clínica',
  hospital: 'Hospital',
  lab: 'Laboratório',
  doctor: 'Médico',
  veterinary: 'Veterinário',
  insurance: 'Seguradora',
};

export default function PartnerVerification() {
  const { hasRole } = useAuth();
  const { country: currentCountry } = useCountry();
  const isAdmin = hasRole('admin');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<CertificationTier | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const upgradeMutation = useUpgradePartnerTier();

  const { data: partners = [], isLoading } = usePartnerCertifications(
    isAdmin ? undefined : currentCountry?.id,
    { tier: tierFilter === 'all' ? undefined : tierFilter, status: statusFilter === 'all' ? undefined : statusFilter }
  );

  const filtered = useMemo(() => {
    if (!search) return partners;
    const q = search.toLowerCase();
    return partners.filter((p) =>
      p.partner_name?.toLowerCase().includes(q) ||
      p.partner_phone?.toLowerCase().includes(q) ||
      p.partner_type.toLowerCase().includes(q)
    );
  }, [partners, search]);

  // Stats
  const stats = useMemo(() => {
    return partners.reduce((acc, p) => {
      acc[p.certification_tier] = (acc[p.certification_tier] || 0) + 1;
      if (p.status === 'verified') acc.verified++;
      if (p.status === 'suspended') acc.suspended++;
      if (p.iso_certified) acc.iso++;
      if (p.jci_accredited) acc.jci++;
      return acc;
    }, { bronze: 0, silver: 0, gold: 0, platinum: 0, verified: 0, suspended: 0, iso: 0, jci: 0 } as Record<string, number>);
  }, [partners]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] p-8">
        <Skeleton className="h-12 w-96 mb-8 bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 bg-slate-800/50" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/50 px-6 py-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Award className="h-7 w-7 text-violet-400" />
            <div>
              <h1 className="text-2xl font-black">Parceiros Verificados</h1>
              <p className="text-xs text-slate-400">
                Sistema de tiers Bronze→Platina · {partners.length} parceiros · {stats.verified} verificados
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
        {/* Tier distribution cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['bronze', 'silver', 'gold', 'platinum'] as CertificationTier[]).map((tier) => {
            const meta = TIER_META[tier];
            const count = stats[tier] || 0;
            return (
              <div
                key={tier}
                className={`p-4 rounded-xl border ${meta.borderClass} ${meta.bgClass} relative overflow-hidden`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{meta.icon}</span>
                  <Badge variant="outline" className={`${meta.borderClass} ${meta.textClass} bg-transparent`}>
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-3xl font-black text-slate-100">{count}</p>
                <p className="text-[10px] text-slate-400 mt-1">parceiros neste tier</p>
                <div className="mt-2 pt-2 border-t border-slate-800/40 text-[10px] text-slate-500 space-y-0.5">
                  <p>≥ {meta.min_transactions} transações</p>
                  <p>≥ {meta.min_rating}★ rating · ≥ {meta.min_sla}% SLA</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compliance stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox label="ISO 9001" value={stats.iso} icon={<ShieldCheck className="h-4 w-4" />} color="emerald" />
          <StatBox label="JCI Acreditado" value={stats.jci} icon={<Award className="h-4 w-4" />} color="cyan" />
          <StatBox label="Verificados" value={stats.verified} icon={<CheckCircle2 className="h-4 w-4" />} color="violet" />
          <StatBox label="Suspensos" value={stats.suspended} icon={<XCircle className="h-4 w-4" />} color="red" />
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Buscar por nome, telefone, tipo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className="bg-slate-950/50 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-2"
                >
                  <option value="all">Todos os tiers</option>
                  <option value="bronze">🥉 Bronze</option>
                  <option value="silver">🥈 Prata</option>
                  <option value="gold">🥇 Ouro</option>
                  <option value="platinum">💎 Platina</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950/50 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-2"
                >
                  <option value="all">Todos os estados</option>
                  <option value="pending">Pendente</option>
                  <option value="verified">Verificado</option>
                  <option value="suspended">Suspenso</option>
                  <option value="revoked">Revogado</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partners list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="py-12 text-center text-slate-500">
                <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum parceiro encontrado com os filtros selecionados.</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((p) => {
              const meta = TIER_META[p.certification_tier];
              const flag = COUNTRY_FLAG_EMOJI[p.country_id] || '🌐';
              const canUpgrade = ['bronze', 'silver', 'gold'].includes(p.certification_tier);
              const nextTier: CertificationTier | null = canUpgrade
                ? p.certification_tier === 'bronze' ? 'silver'
                  : p.certification_tier === 'silver' ? 'gold' : 'platinum'
                : null;

              return (
                <Card key={p.id} className={`bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Identity */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`h-12 w-12 rounded-xl ${meta.bgClass} border ${meta.borderClass} flex items-center justify-center text-2xl shrink-0`}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-slate-100 truncate">{p.partner_name || 'Sem nome'}</h3>
                            <Badge variant="outline" className={`${meta.borderClass} ${meta.textClass} bg-transparent text-[10px]`}>
                              {meta.label}
                            </Badge>
                            {p.status === 'verified' && (
                              <Badge className="bg-emerald-950/50 text-emerald-300 border-emerald-800/40 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Verificado
                              </Badge>
                            )}
                            {p.status === 'suspended' && (
                              <Badge className="bg-red-950/50 text-red-300 border-red-800/40 text-[10px]">Suspenso</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <span>{flag}</span>
                              {p.country_id} · {PARTNER_TYPE_LABELS[p.partner_type]}
                            </span>
                            {p.partner_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {p.partner_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-4 gap-4 text-center min-w-fit">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Transações</p>
                          <p className="font-bold text-slate-100 flex items-center justify-center gap-1">
                            <Activity className="h-3 w-3 text-slate-500" />
                            {p.total_transactions}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Rating</p>
                          <p className="font-bold text-slate-100 flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-amber-400" />
                            {Number(p.avg_rating).toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">SLA</p>
                          <p className={`font-bold ${p.sla_compliance >= 95 ? 'text-emerald-400' : p.sla_compliance >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                            {Number(p.sla_compliance).toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Certificações</p>
                          <div className="flex gap-1 justify-center">
                            {p.iso_certified && <span title="ISO 9001" className="text-emerald-400">📋</span>}
                            {p.jci_accredited && <span title="JCI" className="text-cyan-400">🏆</span>}
                            {!p.iso_certified && !p.jci_accredited && <span className="text-slate-600">—</span>}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 min-w-48">
                        {nextTier && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-slate-950/50 border-slate-700 text-slate-200 hover:bg-slate-800"
                            disabled={upgradeMutation.isPending}
                            onClick={() => {
                              if (confirm(`Confirmar upgrade de ${p.partner_name} para ${TIER_META[nextTier].label}?`)) {
                                upgradeMutation.mutate({
                                  partnerUserId: p.partner_user_id,
                                  newTier: nextTier,
                                  countryId: p.country_id,
                                  reason: 'Manual upgrade by manager',
                                });
                              }
                            }}
                          >
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                            Upgrade para {TIER_META[nextTier].label}
                          </Button>
                        )}
                        {p.certification_tier !== 'bronze' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                            disabled={upgradeMutation.isPending}
                            onClick={() => {
                              const newTier = p.certification_tier === 'platinum' ? 'gold'
                                : p.certification_tier === 'gold' ? 'silver' : 'bronze';
                              if (confirm(`Confirmar downgrade de ${p.partner_name} para ${TIER_META[newTier].label}?`)) {
                                upgradeMutation.mutate({
                                  partnerUserId: p.partner_user_id,
                                  newTier,
                                  countryId: p.country_id,
                                  reason: 'Manual downgrade by manager',
                                });
                              }
                            }}
                          >
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                            Downgrade
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Tier progress bar */}
                    <div className="mt-4 pt-4 border-t border-slate-800/60">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-3 w-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Progresso para próximo tier</span>
                      </div>
                      <TierProgressBar current={p.certification_tier} transactions={p.total_transactions} rating={p.avg_rating} sla={p.sla_compliance} />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 border-emerald-900/40 bg-emerald-950/40',
    cyan: 'text-cyan-400 border-cyan-900/40 bg-cyan-950/40',
    violet: 'text-violet-400 border-violet-900/40 bg-violet-950/40',
    red: 'text-red-400 border-red-900/40 bg-red-950/40',
  };
  return (
    <div className={`p-3 rounded-lg border ${colors[color]} flex items-center gap-3`}>
      {icon}
      <div>
        <p className="text-xl font-black text-slate-100">{value}</p>
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function TierProgressBar({ current, transactions, rating, sla }: {
  current: CertificationTier;
  transactions: number;
  rating: number;
  sla: number;
}) {
  const order: CertificationTier[] = ['bronze', 'silver', 'gold', 'platinum'];
  const nextIdx = order.indexOf(current) + 1;
  if (nextIdx >= order.length) {
    return <p className="text-[11px] text-cyan-400">💎 Platina atingido — máximo tier</p>;
  }
  const next = order[nextIdx];
  const nextMeta = TIER_META[next];

  const txPct = Math.min(100, (transactions / nextMeta.min_transactions) * 100);
  const ratingPct = Math.min(100, (rating / nextMeta.min_rating) * 100);
  const slaPct = Math.min(100, (sla / nextMeta.min_sla) * 100);
  const overall = Math.round((txPct + ratingPct + slaPct) / 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400">Próximo: <strong className={nextMeta.textClass}>{nextMeta.label} {nextMeta.icon}</strong></span>
        <span className="text-slate-300 font-bold">{overall}%</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <ProgressMini label="Transações" pct={txPct} current={transactions} target={nextMeta.min_transactions} />
        <ProgressMini label="Rating" pct={ratingPct} current={Number(rating).toFixed(1)} target={nextMeta.min_rating} />
        <ProgressMini label="SLA" pct={slaPct} current={`${sla.toFixed(0)}%`} target={`${nextMeta.min_sla}%`} />
      </div>
    </div>
  );
}

function ProgressMini({ label, pct, current, target }: { label: string; pct: number; current: any; target: any }) {
  return (
    <div>
      <div className="flex justify-between text-[9px] text-slate-500 mb-1">
        <span>{label}</span>
        <span className="text-slate-400">{current}/{target}</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-slate-600'}`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
    </div>
  );
}
