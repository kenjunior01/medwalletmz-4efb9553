/**
 * TbDotPage — TB Directly Observed Treatment Digital
 * Moçambique é top-30 global em TB. Substituir caderno de papel por DOT digital.
 * First country in the world with DOT 100% digital.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Clock, AlertTriangle, TrendingUp, Pill, CheckCircle,
  XCircle, Video, MapPin,
} from "lucide-react";
import { useTbDotRecords, useLogTbDose } from "@/hooks/useMzVerticals";

export default function TbDotPage() {
  const [provinceFilter, setProvinceFilter] = useState('');
  const { data: records = [], isLoading } = useTbDotRecords(provinceFilter || undefined);
  const logDose = useLogTbDose();

  const stats = {
    total: records.length,
    active: records.filter(r => !r.end_date).length,
    highRisk: records.filter(r => r.abandonment_risk === 'high').length,
    avgAdherence: records.length
      ? Math.round(records.reduce((s,r) => s + (r.adherence_pct || 0), 0) / records.length)
      : 0,
  };

  const phaseColors: Record<string,string> = {
    intensive:    '#dc2626',
    continuation: '#f59e0b',
    follow_up:    '#10b981',
  };

  const riskColors: Record<string, {bg:string; text:string; border:string}> = {
    low:    { bg:'#10b98120', text:'#10b981', border:'#10b98160' },
    medium: { bg:'#f59e0b20', text:'#f59e0b', border:'#f59e0b60' },
    high:   { bg:'#dc262620', text:'#dc2626', border:'#dc262660' },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO */}
      <div className="relative overflow-hidden border-b border-rose-500/30">
        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-rose-600/30 via-amber-500/20 to-emerald-500/30" />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
        <div className="relative px-8 py-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-rose-400" />
            TB DOT Digital — Directly Observed Treatment
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Moçambique top-30 global em TB · Primeiro país do mundo com DOT 100% digital · Vídeo-observação via Daily.co
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">RHZE — Fase Intensiva 2 meses</Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">RH — Fase Continuação 4 meses</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Cura total 6 meses</Badge>
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30">PNCT — Reporte automático</Badge>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-8 py-6">
        <StatCard label="Casos Activos" value={stats.active} icon={Activity} color="#0ea5e9" />
        <StatCard label="Total Registados" value={stats.total} icon={Pill} color="#7c3aed" />
        <StatCard label="Risco Abandono Alto" value={stats.highRisk} icon={AlertTriangle} color="#dc2626" />
        <StatCard label="Adesão Média" value={`${stats.avgAdherence}%`} icon={TrendingUp} color="#10b981" />
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
          {records.length} casos
        </Badge>
      </div>

      {/* RECORDS GRID */}
      <div className="px-8 pb-12">
        {isLoading ? (
          <div className="text-slate-400 text-sm">A carregar casos TB...</div>
        ) : records.length === 0 ? (
          <div className="text-slate-500 text-sm py-12 text-center">
            Nenhum caso TB DOT registado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {records.map((r) => {
              const phaseColor = phaseColors[r.treatment_phase] || '#64748b';
              const risk = riskColors[r.abandonment_risk || 'low'];
              return (
                <Card key={r.id} className="bg-slate-900/60 border-slate-800">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge style={{ background:`${phaseColor}30`, color:phaseColor, border:`${phaseColor}60` }}>
                            {r.treatment_phase === 'intensive' ? 'Fase Intensiva' :
                             r.treatment_phase === 'continuation' ? 'Fase Continuação' : 'Follow-up'}
                          </Badge>
                          <Badge style={{ background:risk.bg, color:risk.text, border:risk.border }}>
                            Risco: {r.abandonment_risk || 'low'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-300">Caso: <span className="font-mono text-slate-100">{r.tb_case_id || r.id.slice(0,8)}</span></p>
                        <p className="text-xs text-slate-400">Província: {r.province || '—'}</p>
                        <p className="text-xs text-slate-400">Início: {r.start_date ? new Date(r.start_date).toLocaleDateString('pt-PT') : '—'}</p>
                        {r.end_date && (
                          <p className="text-xs text-emerald-400">Fim: {new Date(r.end_date).toLocaleDateString('pt-PT')}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-50">{Math.round(r.adherence_pct || 0)}%</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">adesão</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-800/40 rounded p-2">
                        <div className="text-slate-500 uppercase text-[10px]">Doses tomadas</div>
                        <div className="text-emerald-400 font-bold">{Array.isArray(r.daily_meds) ? r.daily_meds.filter((d:any)=>d.taken).length : 0}</div>
                      </div>
                      <div className="bg-slate-800/40 rounded p-2">
                        <div className="text-slate-500 uppercase text-[10px]">Falhadas</div>
                        <div className="text-rose-400 font-bold">{r.missed_doses || 0}</div>
                      </div>
                      <div className="bg-slate-800/40 rounded p-2">
                        <div className="text-slate-500 uppercase text-[10px]">Última toma</div>
                        <div className="text-slate-300 text-[10px]">
                          {r.last_taken_at
                            ? new Date(r.last_taken_at).toLocaleString('pt-PT', { day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit' })
                            : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => logDose.mutate({ recordId: r.id, taken: true })}
                        disabled={logDose.isPending}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Observar Toma (Vídeo)
                      </Button>
                      <Button
                        onClick={() => logDose.mutate({ recordId: r.id, taken: false })}
                        disabled={logDose.isPending}
                        variant="outline"
                        className="border-rose-700 text-rose-300 hover:bg-rose-950/30 flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Toma Falhada
                      </Button>
                    </div>
                    {r.notes && (
                      <p className="text-xs text-slate-400 border-t border-slate-800 pt-2">{r.notes}</p>
                    )}
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
            <Video className="h-5 w-5 text-sky-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Vídeo-Observed Therapy</h3>
            <p className="text-xs text-slate-400">Observação da toma via Daily.co. Geolocalização opcional. Reduz custos de deslocação.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <AlertTriangle className="h-5 w-5 text-amber-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Alerta de Abandono</h3>
            <p className="text-xs text-slate-400">Após 24h sem registo, alerta automático ao gestor regional. Após 7 dias, notificação ao PNCT.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <MapPin className="h-5 w-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">GPS Verification</h3>
            <p className="text-xs text-slate-400">Cada observação pode incluir coordenadas GPS para verificar local da toma.</p>
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
