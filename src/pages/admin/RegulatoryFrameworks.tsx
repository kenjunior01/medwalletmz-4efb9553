// ============================================================
// Regulatory Frameworks · Cards por país (ANVISA/SADC/GDPR/PDPA/etc)
// src/pages/admin/RegulatoryFrameworks.tsx
// ============================================================

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { useRegulatoryFrameworks } from '@/hooks/useCompliance';
import {
  REGION_LABELS, REGION_FLAGS, COUNTRY_FLAG_EMOJI,
  type RegionGroup,
} from '@/integrations/supabase/compliance-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Lock, Globe2, ExternalLink, AlertTriangle, CheckCircle2, XCircle,
  Building2, Scale, ShieldAlert, Filter,
} from 'lucide-react';

export default function RegulatoryFrameworks() {
  const { hasRole } = useAuth();
  const { country: currentCountry } = useCountry();
  const isAdmin = hasRole('admin');
  const [regionFilter, setRegionFilter] = useState<RegionGroup | 'all'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  // Detect ?country=MZ na URL
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('country');
    if (c) setCountryFilter(c);
  });

  const { data: frameworks = [], isLoading } = useRegulatoryFrameworks(
    isAdmin && countryFilter === 'all' ? undefined : (countryFilter !== 'all' ? countryFilter : currentCountry?.id)
  );

  const filtered = useMemo(() => {
    let result = frameworks;
    if (regionFilter !== 'all') {
      result = result.filter((f) => f.region_group === regionFilter);
    }
    return result;
  }, [frameworks, regionFilter]);

  // Group by country
  const byCountry = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const f of filtered) {
      if (!map.has(f.country_id)) map.set(f.country_id, []);
      map.get(f.country_id)!.push(f);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // Aggregate stats
  const stats = useMemo(() => {
    return frameworks.reduce((acc, f) => {
      acc.total++;
      acc.scoreSum += f.compliance_score;
      if (f.compliance_score >= 80) acc.compliant++;
      else if (f.compliance_score >= 50) acc.partial++;
      else acc.nonCompliant++;
      if (f.mandatory) acc.mandatory++;
      return acc;
    }, { total: 0, compliant: 0, partial: 0, nonCompliant: 0, mandatory: 0, scoreSum: 0 });
  }, [frameworks]);

  const avgScore = stats.total > 0 ? Math.round(stats.scoreSum / stats.total) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] p-8">
        <Skeleton className="h-12 w-96 mb-8 bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <Lock className="h-7 w-7 text-blue-400" />
          <div>
            <h1 className="text-2xl font-black">Frameworks Regulatórios</h1>
            <p className="text-xs text-slate-400">
              {stats.total} frameworks · {stats.compliant} compliantes · {stats.nonCompliant} não-complientes · Score médio: {avgScore}%
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total Frameworks" value={stats.total} icon={<Lock className="h-4 w-4" />} color="blue" />
          <StatCard label="Compliantes" value={stats.compliant} icon={<CheckCircle2 className="h-4 w-4" />} color="emerald" />
          <StatCard label="Parciais" value={stats.partial} icon={<AlertTriangle className="h-4 w-4" />} color="amber" />
          <StatCard label="Não-Complientes" value={stats.nonCompliant} icon={<XCircle className="h-4 w-4" />} color="red" />
          <StatCard label="Obrigatórios" value={stats.mandatory} icon={<Scale className="h-4 w-4" />} color="violet" />
        </div>

        {/* Region filter */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="h-4 w-4 text-slate-500" />
              <button
                onClick={() => setRegionFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  regionFilter === 'all'
                    ? 'bg-cyan-950/50 border-cyan-700/60 text-cyan-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                🌐 Todas as regiões
              </button>
              {Object.entries(REGION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setRegionFilter(key as RegionGroup)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    regionFilter === key
                      ? 'bg-cyan-950/50 border-cyan-700/60 text-cyan-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {REGION_FLAGS[key as RegionGroup]} {label.split(' ')[0]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Country sections */}
        <div className="space-y-6">
          {byCountry.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="py-12 text-center text-slate-500">
                <Lock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum framework encontrado para os filtros.</p>
              </CardContent>
            </Card>
          ) : (
            byCountry.map(([countryId, fwList]) => {
              const flag = COUNTRY_FLAG_EMOJI[countryId] || '🌐';
              const countryScore = Math.round(
                fwList.reduce((s, f) => s + f.compliance_score, 0) / fwList.length
              );
              const region = fwList[0]?.region_group;
              return (
                <Card key={countryId} className="bg-slate-900/60 border-slate-800">
                  <CardHeader className="border-b border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{flag}</span>
                        <div>
                          <CardTitle className="text-slate-100">{countryId}</CardTitle>
                          <p className="text-[10px] text-slate-500">
                            {region && `${REGION_FLAGS[region]} ${REGION_LABELS[region]} · `}
                            {fwList.length} frameworks
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase">Score País</p>
                        <p className={`text-3xl font-black ${
                          countryScore >= 80 ? 'text-emerald-400'
                          : countryScore >= 50 ? 'text-amber-400' : 'text-red-400'
                        }`}>{countryScore}<span className="text-sm text-slate-500">/100</span></p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fwList.map((f) => {
                        const score = f.compliance_score;
                        const tier = score >= 80 ? 'emerald' : score >= 50 ? 'amber' : 'red';
                        const reqItems = f.requirements?.items || [];
                        const compliantCount = reqItems.filter((r) => r.status === 'compliant').length;
                        const partialCount = reqItems.filter((r) => r.status === 'partial').length;
                        const missingCount = reqItems.filter((r) => r.status === 'missing').length;

                        return (
                          <div key={f.id} className={`p-4 rounded-xl border ${
                            tier === 'emerald' ? 'border-emerald-900/40 bg-emerald-950/10'
                            : tier === 'amber' ? 'border-amber-900/40 bg-amber-950/10'
                            : 'border-red-900/40 bg-red-950/10'
                          }`}>
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Building2 className="h-4 w-4 text-slate-400" />
                                  <h3 className="font-bold text-slate-100">{f.framework_name}</h3>
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono">{f.framework_code}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className={`text-[10px] ${
                                  tier === 'emerald' ? 'border-emerald-800 text-emerald-400 bg-emerald-950/30'
                                  : tier === 'amber' ? 'border-amber-800 text-amber-400 bg-amber-950/30'
                                  : 'border-red-800 text-red-400 bg-red-950/30'
                                }`}>
                                  {score}%
                                </Badge>
                                {f.mandatory && (
                                  <Badge className="bg-violet-950/50 text-violet-300 border-violet-800/40 text-[9px]">
                                    Obrigatório
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Authority */}
                            <div className="mb-3 text-xs">
                              <p className="text-slate-500 mb-1">Autoridade:</p>
                              <div className="flex items-center gap-2">
                                <p className="text-slate-300">{f.authority}</p>
                                {f.authority_url && (
                                  <a
                                    href={f.authority_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            {f.description && (
                              <p className="text-xs text-slate-400 mb-3 italic">{f.description}</p>
                            )}

                            {/* Progress */}
                            <div className="mb-3">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>Compliance Score</span>
                                <span>{score}%</span>
                              </div>
                              <Progress
                                value={score}
                                className={`h-1.5 ${tier === 'emerald' ? '[&>div]:bg-emerald-500'
                                  : tier === 'amber' ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
                              />
                            </div>

                            {/* Requirements */}
                            {reqItems.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[10px] text-slate-500 uppercase mb-2">Requisitos ({compliantCount}/{reqItems.length} compliantes)</p>
                                <div className="space-y-1">
                                  {reqItems.map((r) => (
                                    <div key={r.code} className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        {r.status === 'compliant' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                                        {r.status === 'partial' && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                                        {r.status === 'missing' && <XCircle className="h-3 w-3 text-red-400" />}
                                        <span className="text-slate-300">{r.label}</span>
                                      </div>
                                      <span className={`text-[10px] ${
                                        r.status === 'compliant' ? 'text-emerald-400'
                                        : r.status === 'partial' ? 'text-amber-400' : 'text-red-400'
                                      }`}>
                                        {r.status === 'compliant' ? 'OK' : r.status === 'partial' ? 'Parcial' : 'Falta'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Penalties */}
                            {f.penalties && Object.keys(f.penalties).length > 0 && (
                              <div className="pt-3 border-t border-slate-800/60">
                                <p className="text-[10px] text-slate-500 uppercase mb-2 flex items-center gap-1">
                                  <ShieldAlert className="h-3 w-3" /> Penalidades
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {f.penalties.max_fine_usd && (
                                    <Badge variant="outline" className="border-red-800/40 text-red-400 text-[10px]">
                                      Multa até ${(f.penalties.max_fine_usd / 1000000).toFixed(1)}M
                                    </Badge>
                                  )}
                                  {f.penalties.license_revocation && (
                                    <Badge variant="outline" className="border-red-800/40 text-red-400 text-[10px]">
                                      Revogação de licença
                                    </Badge>
                                  )}
                                  {f.penalties.criminal_liability && (
                                    <Badge variant="outline" className="border-red-800/40 text-red-400 text-[10px]">
                                      Responsabilidade criminal
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Audit dates */}
                            <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                              {f.last_audit_date && (
                                <span>Última auditoria: {new Date(f.last_audit_date).toLocaleDateString('pt-PT')}</span>
                              )}
                              {f.next_audit_date && (
                                <span>Próxima: {new Date(f.next_audit_date).toLocaleDateString('pt-PT')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
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

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 border-emerald-900/40 bg-emerald-950/40',
    amber: 'text-amber-400 border-amber-900/40 bg-amber-950/40',
    red: 'text-red-400 border-red-900/40 bg-red-950/40',
    blue: 'text-blue-400 border-blue-900/40 bg-blue-950/40',
    violet: 'text-violet-400 border-violet-900/40 bg-violet-950/40',
  };
  return (
    <div className={`p-3 rounded-lg border ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase text-slate-400 font-bold">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-100">{value}</p>
    </div>
  );
}
