// ============================================================
// Audit Trail · Log imutável com hash chain visualization
// src/pages/admin/AuditTrail.tsx
// ============================================================

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { useAuditTrail } from '@/hooks/useCompliance';
import {
  AUDIT_EVENT_LABELS, COUNTRY_FLAG_EMOJI,
  type AuditEventType,
} from '@/integrations/supabase/compliance-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, Search, Lock, ShieldCheck, Copy, Check, Link2,
  Filter,
} from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
  info: 'text-slate-400 border-slate-700 bg-slate-800/30',
  success: 'text-emerald-400 border-emerald-800 bg-emerald-950/30',
  warning: 'text-amber-400 border-amber-800 bg-amber-950/30',
  critical: 'text-red-400 border-red-800 bg-red-950/30',
};

export default function AuditTrail() {
  const { hasRole } = useAuth();
  const { country: currentCountry } = useCountry();
  const isAdmin = hasRole('admin');
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const { data: events = [], isLoading } = useAuditTrail(
    isAdmin ? undefined : currentCountry?.id,
    200
  );

  const filtered = useMemo(() => {
    let result = events;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.actor_name?.toLowerCase().includes(q) ||
        e.partner_name?.toLowerCase().includes(q) ||
        e.event_hash.toLowerCase().includes(q) ||
        JSON.stringify(e.event_metadata).toLowerCase().includes(q)
      );
    }
    if (eventTypeFilter !== 'all') {
      result = result.filter((e) => e.event_type === eventTypeFilter);
    }
    return result;
  }, [events, search, eventTypeFilter]);

  // Verify chain integrity (visual check)
  const chainValid = useMemo(() => {
    for (let i = 1; i < events.length; i++) {
      if (events[i].previous_hash !== events[i - 1].event_hash) {
        return false;
      }
    }
    return true;
  }, [events]);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-black">Audit Trail Imutável</h1>
              <p className="text-xs text-slate-400">
                {events.length} eventos · Hash chain SHA-256 · Append-only (UPDATE/DELETE bloqueados)
              </p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            chainValid ? 'border-emerald-800 bg-emerald-950/30 text-emerald-400' : 'border-red-800 bg-red-950/30 text-red-400'
          }`}>
            <Lock className="h-4 w-4" />
            <span className="text-xs font-mono">{chainValid ? 'Chain íntegra' : 'Chain comprometida!'}</span>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 space-y-6">
        {/* Chain visualization */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="h-4 w-4 text-cyan-400" />
              <h3 className="font-bold text-slate-100">Cadeia de Integridade (Blockchain-style)</h3>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {events.slice(0, 12).reverse().map((e, idx, arr) => (
                <div key={e.id} className="flex items-center gap-1 shrink-0">
                  <div className={`p-2 rounded-lg border ${SEVERITY_COLORS[AUDIT_EVENT_LABELS[e.event_type as AuditEventType].severity]}`}>
                    <div className="text-xs">{AUDIT_EVENT_LABELS[e.event_type as AuditEventType].icon}</div>
                    <div className="text-[8px] font-mono text-slate-500 mt-1">#{e.id}</div>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="text-slate-600 text-lg">→</div>
                  )}
                </div>
              ))}
              {events.length > 12 && (
                <span className="text-slate-500 text-xs ml-2">+{events.length - 12} eventos...</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Buscar por ator, parceiro, hash, metadata..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="bg-slate-950/50 border border-slate-700 text-slate-100 text-sm rounded-md px-3 py-2"
                >
                  <option value="all">Todos os eventos</option>
                  {Object.entries(AUDIT_EVENT_LABELS).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.icon} {meta.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events timeline */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="py-12 text-center text-slate-500">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum evento encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((e) => {
              const meta = AUDIT_EVENT_LABELS[e.event_type as AuditEventType];
              const severityClass = SEVERITY_COLORS[meta.severity];
              return (
                <Card key={e.id} className={`bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`h-10 w-10 rounded-lg border ${severityClass} flex items-center justify-center text-lg shrink-0`}>
                        {meta.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-100">{meta.label}</h3>
                          <Badge variant="outline" className={`${severityClass} text-[10px] border`}>
                            {meta.severity}
                          </Badge>
                          <span className="text-xs text-slate-500">#{e.id}</span>
                          {e.country_id && (
                            <span className="text-xs text-slate-500">
                              {COUNTRY_FLAG_EMOJI[e.country_id] || '🌐'} {e.country_id}
                            </span>
                          )}
                          <span className="text-xs text-slate-500 ml-auto">
                            {new Date(e.created_at).toLocaleString('pt-PT')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-2">
                          <div>
                            <span className="text-slate-500">Ator:</span>{' '}
                            <span className="text-slate-300">{e.actor_name || 'Sistema'}</span>
                          </div>
                          {e.partner_name && (
                            <div>
                              <span className="text-slate-500">Parceiro:</span>{' '}
                              <span className="text-slate-300">{e.partner_name}</span>
                            </div>
                          )}
                          {e.ip_address && (
                            <div>
                              <span className="text-slate-500">IP:</span>{' '}
                              <span className="text-slate-300 font-mono">{e.ip_address}</span>
                            </div>
                          )}
                        </div>

                        {Object.keys(e.event_metadata || {}).length > 0 && (
                          <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60 mb-2">
                            <p className="text-[10px] text-slate-500 uppercase mb-1">Metadata</p>
                            <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto">
                              {JSON.stringify(e.event_metadata, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Hash info */}
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <button
                            onClick={() => copyHash(e.event_hash)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950/60 border border-slate-800 hover:border-cyan-700/60 text-cyan-400 transition-colors"
                            title="Copiar hash"
                          >
                            {copiedHash === e.event_hash ? (
                              <><Check className="h-3 w-3" /> Copiado!</>
                            ) : (
                              <><Copy className="h-3 w-3" /> {e.event_hash.slice(0, 24)}…</>
                            )}
                          </button>
                          <span className="text-slate-500">
                            prev: {e.previous_hash ? e.previous_hash.slice(0, 16) + '…' : 'genesis'}
                          </span>
                        </div>
                      </div>
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
