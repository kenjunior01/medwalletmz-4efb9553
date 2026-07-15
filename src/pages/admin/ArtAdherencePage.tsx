/**
 * ArtAdherencePage — HIV ART Adherence Tracker
 * Moçambique: 1.6M moçambicanos em ARV. Workflow: lembrete WhatsApp, refill tracking, carga viral.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, TrendingUp, Pill, AlertTriangle, Heart, Droplet,
  Calendar, MessageCircle,
} from "lucide-react";
import { useArtAdherenceLogs } from "@/hooks/useMzVerticals";

export default function ArtAdherencePage() {
  const [provinceFilter, setProvinceFilter] = useState('');
  const { data: logs = [], isLoading } = useArtAdherenceLogs(provinceFilter || undefined);

  const stats = {
    total: logs.length,
    suppressed: logs.filter(l => (l.last_viral_load ?? 999999) < 1000).length,
    lowAdherence: logs.filter(l => (l.adherence_pct ?? 0) < 80).length,
    refillDue: logs.filter(l => {
      if (!l.refill_due_date) return false;
      const due = new Date(l.refill_due_date);
      const now = new Date();
      const diff = (due.getTime() - now.getTime()) / (1000*60*60*24);
      return diff <= 7;
    }).length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO */}
      <div className="relative overflow-hidden border-b border-purple-500/30">
        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-purple-600/30 via-rose-500/20 to-emerald-500/30" />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
        <div className="relative px-8 py-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Heart className="h-8 w-8 text-purple-400" />
            ART Adherence — Adesão ARV HIV
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            1.6M moçambicanos em ARV · Lembretes WhatsApp · Refill tracking · Carga viral monitoring
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">TLD — Primeira Linha (TDF+3TC+DTG)</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Carga Viral Suprimida {'<'}1000 cps/ml</Badge>
            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">CD4 monitoring</Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Refill Alert 7 dias</Badge>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-8 py-6">
        <StatCard label="Total Pacientes" value={stats.total} icon={Activity} color="#7c3aed" />
        <StatCard label="Carga Viral Suprimida" value={stats.suppressed} icon={Droplet} color="#10b981" />
        <StatCard label="Adesão Baixa ({'<'}80%)" value={stats.lowAdherence} icon={AlertTriangle} color="#dc2626" />
        <StatCard label="Refill Due ≤7 dias" value={stats.refillDue} icon={Calendar} color="#f59e0b" />
      </div>

      {/* FILTERS */}
      <div className="px-8 pb-4 flex items-center gap-3 flex-wrap">
        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          className="bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
        >
          <option value="">Todas as Províncias</option>
          {['Maputo Cidade','Maputo Província','Sofala','Nampula','Cabo Delgado','Zambézia','Tete','Manica','Gaza','Inhambane','Niassa'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <Badge variant="outline" className="border-slate-700 text-slate-300 ml-auto">
          {logs.length} pacientes
        </Badge>
      </div>

      {/* LOGS LIST */}
      <div className="px-8 pb-12">
        {isLoading ? (
          <div className="text-slate-400 text-sm">A carregar pacientes ARV...</div>
        ) : logs.length === 0 ? (
          <div className="text-slate-500 text-sm py-12 text-center">
            Nenhum paciente ARV registado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {logs.map((l) => {
              const suppressed = (l.last_viral_load ?? 999999) < 1000;
              const lowAdh = (l.adherence_pct ?? 0) < 80;
              const refillSoon = l.refill_due_date
                ? ((new Date(l.refill_due_date).getTime() - Date.now()) / (1000*60*60*24)) <= 7
                : false;
              return (
                <Card key={l.id} className="bg-slate-900/60 border-slate-800">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 mb-1">
                          <Pill className="h-3 w-3 mr-1" />
                          {l.art_regimen || 'ARV'}
                        </Badge>
                        <p className="text-xs text-slate-400">Província: {l.province || '—'}</p>
                        {l.art_start_date && (
                          <p className="text-xs text-slate-400">Início ARV: {new Date(l.art_start_date).toLocaleDateString('pt-PT')}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${lowAdh ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {Math.round(l.adherence_pct || 0)}%
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">adesão 30d</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-800/40 rounded p-2">
                        <div className="text-slate-500 uppercase text-[10px] flex items-center gap-1">
                          <Droplet className="h-3 w-3" /> Carga Viral
                        </div>
                        <div className={suppressed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {l.last_viral_load != null ? `${l.last_viral_load} cps/ml` : '—'}
                        </div>
                        {l.last_viral_load_date && (
                          <div className="text-[10px] text-slate-500">{new Date(l.last_viral_load_date).toLocaleDateString('pt-PT')}</div>
                        )}
                      </div>
                      <div className="bg-slate-800/40 rounded p-2">
                        <div className="text-slate-500 uppercase text-[10px] flex items-center gap-1">
                          <Activity className="h-3 w-3" /> CD4
                        </div>
                        <div className="text-slate-200 font-bold">{l.last_cd4_count || '—'}</div>
                        {l.last_cd4_date && (
                          <div className="text-[10px] text-slate-500">{new Date(l.last_cd4_date).toLocaleDateString('pt-PT')}</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-800/40 rounded p-2 text-xs">
                      <div className="text-slate-500 uppercase text-[10px]">Refill Due</div>
                      <div className={`font-bold ${refillSoon ? 'text-amber-400' : 'text-slate-200'}`}>
                        {l.refill_due_date ? new Date(l.refill_due_date).toLocaleDateString('pt-PT') : '—'}
                        {refillSoon && <span className="ml-2 text-amber-400">⚠ Em 7 dias</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Falhas 30d: <span className="text-rose-400 font-bold">{l.missed_doses_30d || 0}</span>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <MessageCircle className="h-3 w-3" /> WhatsApp ON
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* INFO */}
      <div className="px-8 pb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <MessageCircle className="h-5 w-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Lembretes WhatsApp</h3>
            <p className="text-xs text-slate-400">2 lembretes diários (manhã/noite) com voz em português moçambicano. Confirmação de toma via reply.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <Calendar className="h-5 w-5 text-amber-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Refill Automático</h3>
            <p className="text-xs text-slate-400">Alerta 7 dias antes de acabar. Pickup na farmácia mais próxima via geolocalização.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <Droplet className="h-5 w-5 text-purple-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Carga Viral Tracking</h3>
            <p className="text-xs text-slate-400">Lab → MedWallet → médico automaticamente. Alerta se carga viral detetável após supressão.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label:string; value:any; icon:any; color:string }) {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center gap-3"
      style={{ borderColor: `${color}40` }}
    >
      <div className="p-2 rounded-lg" style={{ background: `${color}20`, color }}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xl font-bold text-slate-50 leading-none">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-1">{label}</div>
      </div>
    </div>
  );
}
