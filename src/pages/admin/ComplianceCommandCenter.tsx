// ============================================================
// Compliance Command Center · Painel dark executivo
// src/pages/admin/ComplianceCommandCenter.tsx
// ============================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  ShieldCheck, Globe2, AlertTriangle, FileCheck2, Award,
  ChevronRight, Activity, Lock, TrendingUp, TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  COUNTRY_FLAG_EMOJI, REGION_FLAGS, REGION_LABELS,
} from '@/integrations/supabase/compliance-types';
import { useComplianceOverview } from '@/hooks/useCompliance';

type Tab = 'overview' | 'partners' | 'documents' | 'audit' | 'insurance' | 'frameworks' | 'copilot';

export default function ComplianceCommandCenter() {
  const { user, hasRole } = useAuth();
  const { country: currentCountry } = useCountry();
  const isAdmin = hasRole('admin');
  const { data: overview, isLoading } = useComplianceOverview();

  // Para country_manager: mostrar apenas o seu país
  const visibleCountries = useMemo(() => {
    if (!overview) return [];
    if (isAdmin) return overview;
    if (currentCountry) return overview.filter((o) => o.country_id === currentCountry.id);
    return overview;
  }, [overview, isAdmin, currentCountry]);

  // Métricas globais agregadas
  const totals = useMemo(() => {
    return visibleCountries.reduce(
      (acc, c) => ({
        frameworks: acc.frameworks + c.total_frameworks,
        compliant: acc.compliant + c.compliant_frameworks,
        partners: acc.partners + c.total_partners_certified,
        verified: acc.verified + c.verified_partners,
        platinum: acc.platinum + c.platinum_partners,
        gold: acc.gold + c.gold_partners,
        silver: acc.silver + c.silver_partners,
        bronze: acc.bronze + c.bronze_partners,
        docs: acc.docs + c.total_documents,
        expiredDocs: acc.expiredDocs + c.expired_documents,
        expiring30: acc.expiring30 + c.expiring_30_days,
        expiring60: acc.expiring60 + c.expiring_60_days,
        auditEvents: acc.auditEvents + c.total_audit_events,
        scoreSum: acc.scoreSum + c.avg_compliance_score,
      }),
      {
        frameworks: 0, compliant: 0, partners: 0, verified: 0,
        platinum: 0, gold: 0, silver: 0, bronze: 0,
        docs: 0, expiredDocs: 0, expiring30: 0, expiring60: 0,
        auditEvents: 0, scoreSum: 0,
      }
    );
  }, [visibleCountries]);

  const avgScore = visibleCountries.length > 0
    ? Math.round(totals.scoreSum / visibleCountries.length)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] p-8">
        <Skeleton className="h-12 w-96 mb-8 bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 bg-slate-800/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-100">
      {/* Background grid effect */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header */}
      <header className="relative border-b border-slate-800/60 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
              <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Compliance Command Center
              </h1>
              <p className="text-xs text-slate-400">
                {isAdmin ? 'Vista global · todos os mercados' : `Vista regional · ${currentCountry?.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-mono">LIVE · {visibleCountries.length} mercados</span>
            </div>
            <Link to="/admin/compliance/copilot">
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
              >
                🤖 Meddy IA
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <nav className="px-6 flex gap-1 overflow-x-auto border-t border-slate-800/60">
          <TabLink to="/admin/compliance" icon={<Globe2 className="h-4 w-4" />} label="Visão Global" />
          <TabLink to="/admin/compliance/partners" icon={<Award className="h-4 w-4" />} label="Parceiros Verificados" />
          <TabLink to="/admin/compliance/documents" icon={<FileCheck2 className="h-4 w-4" />} label="Cofre Documental" />
          <TabLink to="/admin/compliance/audit" icon={<Activity className="h-4 w-4" />} label="Audit Trail" />
          <TabLink to="/admin/compliance/insurance" icon={<ShieldCheck className="h-4 w-4" />} label="Micro-Seguros" />
          <TabLink to="/admin/compliance/frameworks" icon={<Lock className="h-4 w-4" />} label="Frameworks Regulatórios" />
          <TabLink to="/admin/compliance/copilot" icon={<span className="text-sm">🤖</span>} label="Meddy IA Copilot" />
        </nav>
      </header>

      {/* Hero KPIs */}
      <section className="px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiCard
            label="Score Compliance"
            value={`${avgScore}%`}
            delta={avgScore >= 80 ? '+5%' : '-2%'}
            deltaUp={avgScore >= 80}
            icon={<ShieldCheck className="h-4 w-4" />}
            color="emerald"
          />
          <KpiCard
            label="Mercados Ativos"
            value={String(visibleCountries.length)}
            icon={<Globe2 className="h-4 w-4" />}
            color="cyan"
          />
          <KpiCard
            label="Parceiros Verificados"
            value={String(totals.verified)}
            sub={`${totals.partners} totais`}
            icon={<Award className="h-4 w-4" />}
            color="violet"
          />
          <KpiCard
            label="Parceiros Platina"
            value={String(totals.platinum)}
            sub={`🥇 ${totals.gold} ouro · 🥈 ${totals.silver} prata`}
            icon={<span className="text-sm">💎</span>}
            color="amber"
          />
          <KpiCard
            label="Frameworks Regulatórios"
            value={`${totals.compliant}/${totals.frameworks}`}
            sub="compliantes"
            icon={<Lock className="h-4 w-4" />}
            color="blue"
          />
          <KpiCard
            label="Documentos Expirados"
            value={String(totals.expiredDocs)}
            icon={<AlertTriangle className="h-4 w-4" />}
            color="red"
            pulse={totals.expiredDocs > 0}
          />
          <KpiCard
            label="A Expirar (30 dias)"
            value={String(totals.expiring30)}
            sub={`${totals.expiring60} em 60 dias`}
            icon={<FileCheck2 className="h-4 w-4" />}
            color="orange"
          />
          <KpiCard
            label="Eventos Auditados"
            value={totals.auditEvents.toLocaleString()}
            icon={<Activity className="h-4 w-4" />}
            color="slate"
          />
        </div>
      </section>

      {/* World Heatmap (visual card) */}
      <section className="px-6 pb-6">
        <Card className="bg-slate-900/60 border-slate-800 backdrop-blur">
          <CardHeader className="border-b border-slate-800/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Globe2 className="h-5 w-5 text-cyan-400" />
                Compliance Score por Mercado
              </CardTitle>
              <Badge variant="outline" className="bg-slate-800/50 border-slate-700 text-slate-300">
                {visibleCountries.length} jurisdições
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleCountries.map((c) => {
                const score = c.avg_compliance_score;
                const tier = score >= 90 ? 'emerald' : score >= 70 ? 'cyan' : score >= 50 ? 'amber' : 'red';
                const flag = COUNTRY_FLAG_EMOJI[c.country_id] || '🌐';
                return (
                  <Link key={c.country_id} to={`/admin/compliance/frameworks?country=${c.country_id}`}>
                    <div
                      className={`group relative p-4 rounded-xl border bg-slate-950/50 hover:bg-slate-900/70 transition-all cursor-pointer
                      ${tier === 'emerald' ? 'border-emerald-900/40 hover:border-emerald-700/60'
                        : tier === 'cyan' ? 'border-cyan-900/40 hover:border-cyan-700/60'
                        : tier === 'amber' ? 'border-amber-900/40 hover:border-amber-700/60'
                        : 'border-red-900/40 hover:border-red-700/60'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{flag}</span>
                            <h3 className="font-bold text-slate-100">{c.country_name}</h3>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{c.country_id}</p>
                        </div>
                        <div className={`text-2xl font-black
                          ${tier === 'emerald' ? 'text-emerald-400'
                            : tier === 'cyan' ? 'text-cyan-400'
                            : tier === 'amber' ? 'text-amber-400'
                            : 'text-red-400'}`}>
                          {score}
                          <span className="text-xs text-slate-500">/100</span>
                        </div>
                      </div>

                      <Progress
                        value={score}
                        className={`h-1.5 ${tier === 'emerald' ? '[&>div]:bg-emerald-500'
                          : tier === 'cyan' ? '[&>div]:bg-cyan-500'
                          : tier === 'amber' ? '[&>div]:bg-amber-500'
                          : '[&>div]:bg-red-500'}`}
                      />

                      <div className="mt-3 grid grid-cols-4 gap-2 text-[10px]">
                        <div>
                          <p className="text-slate-500">Parceiros</p>
                          <p className="font-bold text-slate-200">{c.verified_partners}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Docs</p>
                          <p className="font-bold text-slate-200">{c.total_documents}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Expirados</p>
                          <p className={`font-bold ${c.expired_documents > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                            {c.expired_documents}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Auditoria</p>
                          <p className="font-bold text-slate-200">{c.total_audit_events}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-1 flex-wrap">
                        {c.platinum_partners > 0 && <Badge className="bg-cyan-950/50 text-cyan-300 border-cyan-800/40 text-[9px]">💎 {c.platinum_partners}</Badge>}
                        {c.gold_partners > 0 && <Badge className="bg-yellow-950/50 text-yellow-300 border-yellow-800/40 text-[9px]">🥇 {c.gold_partners}</Badge>}
                        {c.silver_partners > 0 && <Badge className="bg-slate-700/50 text-slate-300 border-slate-600/40 text-[9px]">🥈 {c.silver_partners}</Badge>}
                        {c.bronze_partners > 0 && <Badge className="bg-amber-950/50 text-amber-400 border-amber-800/40 text-[9px]">🥉 {c.bronze_partners}</Badge>}
                      </div>

                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Regional breakdown */}
      <section className="px-6 pb-12">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Distribuição por Bloco Regional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(REGION_LABELS).map(([key, label]) => {
                const countriesInRegion = visibleCountries.filter((c) => {
                  // Approximation: based on country ID
                  const map: Record<string, string> = {
                    MZ: 'PALOP', AO: 'PALOP', CV: 'PALOP', ST: 'PALOP', GW: 'PALOP',
                    NG: 'SUB_SAHARAN_AFRICA', KE: 'SUB_SAHARAN_AFRICA', GH: 'SUB_SAHARAN_AFRICA', UG: 'SUB_SAHARAN_AFRICA', ZA: 'SUB_SAHARAN_AFRICA',
                    BR: 'LATAM', MX: 'LATAM', CO: 'LATAM', PE: 'LATAM', AR: 'LATAM',
                    ID: 'SEA', PH: 'SEA', VN: 'SEA',
                    AE: 'MENA', SA: 'MENA', QA: 'MENA',
                    PT: 'EUROPE', ES: 'EUROPE',
                  };
                  return map[c.country_id] === key;
                });
                const count = countriesInRegion.length;
                const avg = count > 0
                  ? Math.round(countriesInRegion.reduce((s, c) => s + c.avg_compliance_score, 0) / count)
                  : 0;
                return (
                  <div key={key} className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{REGION_FLAGS[key as keyof typeof REGION_FLAGS]}</span>
                      <span className="text-xs font-bold text-slate-300 truncate">{label.split(' ')[0]}</span>
                    </div>
                    <p className="text-2xl font-black text-slate-100">{avg}</p>
                    <p className="text-[10px] text-slate-500">{count} {count === 1 ? 'país' : 'países'}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ============================================================
// Sub-componentes
// ============================================================

function TabLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-100 border-b-2 border-transparent hover:border-cyan-500 transition-all whitespace-nowrap"
    >
      {icon}
      {label}
    </Link>
  );
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; glow?: string }> = {
  emerald: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-900/40' },
  cyan:    { bg: 'bg-cyan-950/40',    text: 'text-cyan-400',    border: 'border-cyan-900/40' },
  violet:  { bg: 'bg-violet-950/40',  text: 'text-violet-400',  border: 'border-violet-900/40' },
  amber:   { bg: 'bg-amber-950/40',   text: 'text-amber-400',   border: 'border-amber-900/40' },
  blue:    { bg: 'bg-blue-950/40',    text: 'text-blue-400',    border: 'border-blue-900/40' },
  red:     { bg: 'bg-red-950/40',     text: 'text-red-400',     border: 'border-red-900/40' },
  orange:  { bg: 'bg-orange-950/40',  text: 'text-orange-400',  border: 'border-orange-900/40' },
  slate:   { bg: 'bg-slate-800/40',   text: 'text-slate-300',   border: 'border-slate-700/40' },
};

function KpiCard({
  label, value, sub, delta, deltaUp, icon, color, pulse,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaUp?: boolean;
  icon: React.ReactNode;
  color: keyof typeof COLOR_CLASSES;
  pulse?: boolean;
}) {
  const c = COLOR_CLASSES[color];
  return (
    <div className={`relative p-4 rounded-xl border ${c.border} ${c.bg} backdrop-blur overflow-hidden`}>
      <div className="flex items-start justify-between mb-2">
        <span className={`text-[10px] uppercase tracking-wider font-bold ${c.text}`}>{label}</span>
        <div className={`${c.text} ${pulse ? 'animate-pulse' : ''}`}>{icon}</div>
      </div>
      <div className="text-2xl font-black text-slate-100">{value}</div>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
      {delta && (
        <div className="flex items-center gap-1 mt-1 text-[10px]">
          {deltaUp ? (
            <TrendingUp className="h-3 w-3 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-400" />
          )}
          <span className={deltaUp ? 'text-emerald-400' : 'text-red-400'}>{delta}</span>
          <span className="text-slate-500">vs mês anterior</span>
        </div>
      )}
    </div>
  );
}
