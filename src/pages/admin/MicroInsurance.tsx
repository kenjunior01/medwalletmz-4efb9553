// ============================================================
// Micro Insurance · Seguros paramétricos por país
// src/pages/admin/MicroInsurance.tsx
// ============================================================

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  useMicroInsuranceProducts,
  useMicroInsuranceClaims,
  useApproveClaim,
} from '@/hooks/useCompliance';
import {
  TRIGGER_LABELS, COUNTRY_FLAG_EMOJI,
} from '@/integrations/supabase/compliance-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldCheck, Zap, CheckCircle2, XCircle, Clock, DollarSign,
  Activity, TrendingUp, Filter,
} from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'auto_approved' | 'approved' | 'rejected' | 'paid';

export default function MicroInsurance() {
  const { hasRole } = useAuth();
  const { country: currentCountry } = useCountry();
  const isAdmin = hasRole('admin');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const approveMutation = useApproveClaim();

  const { data: products = [], isLoading: loadingProducts } = useMicroInsuranceProducts(
    isAdmin ? undefined : currentCountry?.id
  );
  const { data: claims = [], isLoading: loadingClaims } = useMicroInsuranceClaims(
    isAdmin ? undefined : currentCountry?.id,
    100
  );

  const filteredClaims = useMemo(() => {
    if (statusFilter === 'all') return claims;
    return claims.filter((c) => c.status === statusFilter);
  }, [claims, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    return claims.reduce((acc, c) => {
      acc.total++;
      if (c.status === 'paid' || c.status === 'approved' || c.status === 'auto_approved') {
        acc.paid++;
        acc.totalPaid += Number(c.amount_paid || c.amount_requested);
      }
      if (c.status === 'pending') acc.pending++;
      if (c.status === 'auto_approved') acc.autoApproved++;
      if (c.status === 'rejected') acc.rejected++;
      return acc;
    }, { total: 0, paid: 0, pending: 0, autoApproved: 0, rejected: 0, totalPaid: 0 });
  }, [claims]);

  const isLoading = loadingProducts || loadingClaims;

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
          <ShieldCheck className="h-7 w-7 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-black">Micro-Seguros Paramétricos</h1>
            <p className="text-xs text-slate-400">
              {products.length} produtos ativos · {stats.total} sinistros · {stats.autoApproved} auto-aprovados · ${stats.totalPaid.toFixed(2)} pagos
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total Sinistros" value={stats.total} icon={<Activity className="h-4 w-4" />} color="cyan" />
          <StatCard label="Auto-aprovados" value={stats.autoApproved} icon={<Zap className="h-4 w-4" />} color="emerald" />
          <StatCard label="Pendentes" value={stats.pending} icon={<Clock className="h-4 w-4" />} color="amber" />
          <StatCard label="Rejeitados" value={stats.rejected} icon={<XCircle className="h-4 w-4" />} color="red" />
          <StatCard label="Total Pago" value={`$${stats.totalPaid.toFixed(0)}`} icon={<DollarSign className="h-4 w-4" />} color="emerald" />
        </div>

        {/* Products grid */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Produtos Disponíveis por País
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((p) => {
                const trigger = TRIGGER_LABELS[p.trigger_type];
                return (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-emerald-700/40 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{COUNTRY_FLAG_EMOJI[p.country_id] || '🌐'}</span>
                          <h3 className="font-bold text-slate-100">{p.product_name}</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">{p.country_id} · {p.product_code}</p>
                      </div>
                      {p.payout_auto && (
                        <Badge className="bg-emerald-950/50 text-emerald-300 border-emerald-800/40 text-[9px]">
                          <Zap className="h-3 w-3 mr-1" /> Auto-payout
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded bg-slate-950/60">
                        <span className="text-slate-500">Trigger:</span>
                        <span className="text-slate-200 flex items-center gap-1">
                          <span>{trigger.icon}</span>
                          {trigger.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-950/60">
                        <span className="text-slate-500">Prémio:</span>
                        <span className="text-amber-400 font-bold">
                          {p.premium_amount.toLocaleString()} {p.premium_currency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-950/60">
                        <span className="text-slate-500">Cobertura:</span>
                        <span className="text-emerald-400 font-bold">
                          {p.coverage_amount.toLocaleString()} {p.premium_currency}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-950/60">
                        <span className="text-slate-500">Seguradora:</span>
                        <span className="text-slate-300">{p.insurer_name}</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-3 italic">{trigger.description}</p>

                    {Object.keys(p.trigger_threshold || {}).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60">
                        <p className="text-[9px] text-slate-500 uppercase mb-1">Parâmetros do trigger</p>
                        <pre className="text-[10px] text-cyan-400 font-mono">
                          {JSON.stringify(p.trigger_threshold, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Claims */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                Sinistros Recentes
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="bg-slate-950/50 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-1.5"
                >
                  <option value="all">Todos os estados</option>
                  <option value="pending">⏳ Pendentes</option>
                  <option value="auto_approved">⚡ Auto-aprovados</option>
                  <option value="approved">✅ Aprovados</option>
                  <option value="rejected">❌ Rejeitados</option>
                  <option value="paid">💸 Pagos</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredClaims.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum sinistro encontrado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredClaims.map((c) => {
                  const trigger = TRIGGER_LABELS[c.claim_type as keyof typeof TRIGGER_LABELS] || { label: c.claim_type, icon: '❓', description: '' };
                  const statusBadge = (() => {
                    switch (c.status) {
                      case 'pending': return <Badge className="bg-amber-950/50 text-amber-300 border-amber-800/40"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
                      case 'auto_approved': return <Badge className="bg-emerald-950/50 text-emerald-300 border-emerald-800/40"><Zap className="h-3 w-3 mr-1" /> Auto-aprovado</Badge>;
                      case 'approved': return <Badge className="bg-emerald-950/50 text-emerald-300 border-emerald-800/40"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprovado</Badge>;
                      case 'rejected': return <Badge className="bg-red-950/50 text-red-300 border-red-800/40"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
                      case 'paid': return <Badge className="bg-cyan-950/50 text-cyan-300 border-cyan-800/40"><DollarSign className="h-3 w-3 mr-1" /> Pago</Badge>;
                      default: return null;
                    }
                  })();

                  return (
                    <div key={c.id} className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-slate-700 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg shrink-0">
                            {trigger.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-100">{trigger.label}</h4>
                              {statusBadge}
                              <span className="text-xs text-slate-500">{COUNTRY_FLAG_EMOJI[c.country_id] || '🌐'} {c.country_id}</span>
                            </div>
                            <p className="text-xs text-slate-400">
                              Apólice: <span className="font-mono text-slate-300">{c.policy?.policy_number}</span> · Segurado: <span className="text-slate-300">{c.user_name}</span>
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(c.created_at).toLocaleString('pt-PT')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase">Solicitado</p>
                            <p className="font-bold text-amber-400">${Number(c.amount_requested).toFixed(2)}</p>
                          </div>
                          {c.amount_paid && (
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500 uppercase">Pago</p>
                              <p className="font-bold text-emerald-400">${Number(c.amount_paid).toFixed(2)}</p>
                            </div>
                          )}
                          {c.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                disabled={approveMutation.isPending}
                                onClick={() => approveMutation.mutate({ claimId: c.id, action: 'approve' })}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-800 text-red-400 hover:bg-red-950/30"
                                disabled={approveMutation.isPending}
                                onClick={() => {
                                  const reason = prompt('Motivo da rejeição:');
                                  if (reason) approveMutation.mutate({ claimId: c.id, action: 'reject', reason });
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {c.rejection_reason && (
                        <div className="mt-2 pt-2 border-t border-slate-800/60 text-xs text-red-300">
                          <strong>Rejeitado:</strong> {c.rejection_reason}
                        </div>
                      )}

                      {Object.keys(c.trigger_data || {}).length > 0 && (
                        <div className="mt-2 text-[10px] text-slate-500">
                          <strong>Dados do trigger:</strong>{' '}
                          <code className="text-cyan-400 font-mono">{JSON.stringify(c.trigger_data)}</code>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: any; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 border-emerald-900/40 bg-emerald-950/40',
    amber: 'text-amber-400 border-amber-900/40 bg-amber-950/40',
    red: 'text-red-400 border-red-900/40 bg-red-950/40',
    cyan: 'text-cyan-400 border-cyan-900/40 bg-cyan-950/40',
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
