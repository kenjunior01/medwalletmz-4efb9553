// ============================================================
// Document Vault · Cofre documental com alertas de expiração
// src/pages/admin/DocumentVault.tsx
// ============================================================

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  useComplianceDocuments,
  useVerifyDocument,
} from '@/hooks/useCompliance';
import {
  DOCUMENT_TYPE_LABELS, COUNTRY_FLAG_EMOJI,
  type ComplianceDocument,
} from '@/integrations/supabase/compliance-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileCheck2, Search, AlertTriangle, Clock, CheckCircle2, XCircle,
  Calendar, Building2, FileText, ExternalLink, Filter,
} from 'lucide-react';

type ExpiryFilter = 'all' | 'expired' | '30' | '60' | '90' | 'verified';

export default function DocumentVault() {
  const { hasRole } = useAuth();
  const { country: currentCountry } = useCountry();
  const isAdmin = hasRole('admin');
  const [search, setSearch] = useState('');
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all');
  const verifyMutation = useVerifyDocument();

  const { data: docs = [], isLoading } = useComplianceDocuments(
    isAdmin ? undefined : currentCountry?.id
  );

  const filtered = useMemo(() => {
    let result = docs;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((d) =>
        d.partner_name?.toLowerCase().includes(q) ||
        d.document_number?.toLowerCase().includes(q) ||
        d.issuing_authority.toLowerCase().includes(q) ||
        DOCUMENT_TYPE_LABELS[d.document_type].toLowerCase().includes(q)
      );
    }
    if (expiryFilter === 'expired') {
      result = result.filter((d) => (d.days_to_expiry ?? 0) < 0 || d.verification_status === 'expired');
    } else if (expiryFilter === '30') {
      result = result.filter((d) => (d.days_to_expiry ?? 0) >= 0 && (d.days_to_expiry ?? 0) <= 30);
    } else if (expiryFilter === '60') {
      result = result.filter((d) => (d.days_to_expiry ?? 0) > 30 && (d.days_to_expiry ?? 0) <= 60);
    } else if (expiryFilter === '90') {
      result = result.filter((d) => (d.days_to_expiry ?? 0) > 60 && (d.days_to_expiry ?? 0) <= 90);
    } else if (expiryFilter === 'verified') {
      result = result.filter((d) => d.verification_status === 'verified');
    }
    return result;
  }, [docs, search, expiryFilter]);

  // Stats
  const stats = useMemo(() => {
    return docs.reduce((acc, d) => {
      if (d.verification_status === 'verified') acc.verified++;
      else if (d.verification_status === 'pending') acc.pending++;
      else if (d.verification_status === 'rejected') acc.rejected++;
      else if (d.verification_status === 'expired') acc.expired++;

      const days = d.days_to_expiry ?? 0;
      if (days < 0) acc.expiredCount++;
      else if (days <= 30) acc.expiring30++;
      else if (days <= 60) acc.expiring60++;
      else if (days <= 90) acc.expiring90++;

      return acc;
    }, { verified: 0, pending: 0, rejected: 0, expired: 0, expiredCount: 0, expiring30: 0, expiring60: 0, expiring90: 0 } as Record<string, number>);
  }, [docs]);

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
          <FileCheck2 className="h-7 w-7 text-amber-400" />
          <div>
            <h1 className="text-2xl font-black">Cofre Documental</h1>
            <p className="text-xs text-slate-400">
              {docs.length} documentos · {stats.expiredCount} expirados · {stats.expiring30 + stats.expiring60 + stats.expiring90} a expirar em 90 dias
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Verificados" value={stats.verified} icon={<CheckCircle2 className="h-4 w-4" />} color="emerald" />
          <StatCard label="Pendentes" value={stats.pending} icon={<Clock className="h-4 w-4" />} color="amber" />
          <StatCard label="Rejeitados" value={stats.rejected} icon={<XCircle className="h-4 w-4" />} color="red" />
          <StatCard label="Expirados" value={stats.expiredCount} icon={<AlertTriangle className="h-4 w-4" />} color="red" pulse={stats.expiredCount > 0} />
          <StatCard label="Expiram 30d" value={stats.expiring30} icon={<Clock className="h-4 w-4" />} color="orange" />
          <StatCard label="Expiram 60d" value={stats.expiring60} icon={<Clock className="h-4 w-4" />} color="yellow" />
          <StatCard label="Expiram 90d" value={stats.expiring90} icon={<Calendar className="h-4 w-4" />} color="cyan" />
          <StatCard label="Total" value={docs.length} icon={<FileText className="h-4 w-4" />} color="slate" />
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Buscar por parceiro, número, autoridade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value as ExpiryFilter)}
                  className="bg-slate-950/50 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-2"
                >
                  <option value="all">Todos os documentos</option>
                  <option value="expired">🚨 Expirados</option>
                  <option value="30">⏰ Expiram em 30 dias</option>
                  <option value="60">⏰ Expiram em 60 dias</option>
                  <option value="90">⏰ Expiram em 90 dias</option>
                  <option value="verified">✅ Verificados</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents table */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <FileCheck2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum documento encontrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((doc) => <DocumentRow key={doc.id} doc={doc} isPending={verifyMutation.isPending} onVerify={(action, reason) =>
                  verifyMutation.mutate({ documentId: doc.id, action, reason })
                } />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DocumentRow({ doc, onVerify, isPending }: { doc: ComplianceDocument; onVerify: (action: 'verify' | 'reject', reason?: string) => void; isPending: boolean }) {
  const days = doc.days_to_expiry ?? 0;
  const isExpired = days < 0 || doc.verification_status === 'expired';
  const isCritical = days >= 0 && days <= 30;
  const isWarning = days > 30 && days <= 60;

  const statusBadge = (() => {
    if (doc.verification_status === 'verified') return <Badge className="bg-emerald-950/50 text-emerald-300 border-emerald-800/40"><CheckCircle2 className="h-3 w-3 mr-1" /> Verificado</Badge>;
    if (doc.verification_status === 'pending') return <Badge className="bg-amber-950/50 text-amber-300 border-amber-800/40"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
    if (doc.verification_status === 'rejected') return <Badge className="bg-red-950/50 text-red-300 border-red-800/40"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
    if (doc.verification_status === 'expired') return <Badge className="bg-red-950/50 text-red-300 border-red-800/40"><AlertTriangle className="h-3 w-3 mr-1" /> Expirado</Badge>;
    return null;
  })();

  const expiryColor = isExpired ? 'text-red-400' : isCritical ? 'text-orange-400' : isWarning ? 'text-amber-400' : 'text-slate-300';

  return (
    <div className={`p-4 rounded-lg border ${isExpired ? 'border-red-900/40 bg-red-950/10' : isCritical ? 'border-orange-900/40 bg-orange-950/10' : 'border-slate-800 bg-slate-950/40'} hover:border-slate-700 transition-colors`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: identity */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
            isExpired ? 'bg-red-950/50 text-red-400' : isCritical ? 'bg-orange-950/50 text-orange-400' : 'bg-slate-800 text-slate-400'
          }`}>
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-100">{DOCUMENT_TYPE_LABELS[doc.document_type]}</h3>
              {statusBadge}
              <span className="text-xs text-slate-500">{COUNTRY_FLAG_EMOJI[doc.country_id] || '🌐'} {doc.country_id}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {doc.partner_name || 'Desconhecido'}</span>
              {doc.document_number && <span className="font-mono">№ {doc.document_number}</span>}
              <span>{doc.issuing_authority}</span>
              {doc.file_hash && (
                <span className="font-mono text-[10px] text-slate-500" title="SHA-256 hash">
                  🔐 {doc.file_hash.slice(0, 12)}…
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Middle: dates */}
        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase">Emitido</p>
            <p className="text-slate-300">{new Date(doc.issue_date).toLocaleDateString('pt-PT')}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase">Expira</p>
            <p className={`font-bold ${expiryColor}`}>
              {new Date(doc.expiry_date).toLocaleDateString('pt-PT')}
            </p>
            <p className={`text-[10px] ${expiryColor}`}>
              {isExpired ? `há ${Math.abs(days)} dias` : `em ${days} dias`}
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex gap-2">
          {doc.file_url && (
            <Button
              size="sm"
              variant="outline"
              className="bg-slate-950/50 border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => window.open(doc.file_url!, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Ver
            </Button>
          )}
          {doc.verification_status === 'pending' && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                disabled={isPending}
                onClick={() => onVerify('verify')}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-800 text-red-400 hover:bg-red-950/30"
                disabled={isPending}
                onClick={() => {
                  const reason = prompt('Motivo da rejeição:');
                  if (reason) onVerify('reject', reason);
                }}
              >
                <XCircle className="h-4 w-4 mr-1" /> Rejeitar
              </Button>
            </>
          )}
        </div>
      </div>

      {doc.rejection_reason && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-red-300">
          <strong>Motivo da rejeição:</strong> {doc.rejection_reason}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, pulse }: { label: string; value: number; icon: React.ReactNode; color: string; pulse?: boolean }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 border-emerald-900/40 bg-emerald-950/40',
    amber: 'text-amber-400 border-amber-900/40 bg-amber-950/40',
    red: 'text-red-400 border-red-900/40 bg-red-950/40',
    orange: 'text-orange-400 border-orange-900/40 bg-orange-950/40',
    yellow: 'text-yellow-400 border-yellow-900/40 bg-yellow-950/40',
    cyan: 'text-cyan-400 border-cyan-900/40 bg-cyan-950/40',
    slate: 'text-slate-300 border-slate-700/40 bg-slate-800/40',
  };
  return (
    <div className={`p-3 rounded-lg border ${colors[color]} ${pulse ? 'animate-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase text-slate-400 font-bold">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-100">{value}</p>
    </div>
  );
}
