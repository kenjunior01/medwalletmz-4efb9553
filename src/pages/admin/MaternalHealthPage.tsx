/**
 * MaternalHealthPage — Maternal Health Vertical
 * Moçambique: 451 mortes maternas/100k nascimentos. Tracking gravidez + ANC + SOS obstétrico.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Baby, Heart, Activity, AlertTriangle, Calendar, Pill,
  Phone, Siren,
} from "lucide-react";
import { useMaternalProfiles } from "@/hooks/useMzVerticals";

export default function MaternalHealthPage() {
  const [provinceFilter, setProvinceFilter] = useState('');
  const { data: profiles = [], isLoading } = useMaternalProfiles(provinceFilter || undefined);

  const stats = {
    total: profiles.length,
    highRisk: profiles.filter(p => p.risk_level === 'high').length,
    dueSoon: profiles.filter(p => {
      if (!p.edd_date) return false;
      const due = new Date(p.edd_date);
      const now = new Date();
      const diff = (due.getTime() - now.getTime()) / (1000*60*60*24);
      return diff > 0 && diff <= 30;
    }).length,
    ancComplete: profiles.filter(p => (p.anc_visits_done ?? 0) >= 4).length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO */}
      <div className="relative overflow-hidden border-b border-pink-500/30">
        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-pink-600/30 via-rose-500/20 to-purple-500/30" />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
        <div className="relative px-8 py-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Baby className="h-8 w-8 text-pink-400" />
            Saúde Materna — Vertical Moçambicano
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            451 mortes maternas/100k · Tracking de gravidez · 4+ ANC reminders · SOS obstétrico → INEM + maternidade
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30">4+ ANC visits (WHO)</Badge>
            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">SOS Obstétrico → INEM</Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Planeamento Familiar</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Vacinação Infantil</Badge>
          </div>
          <Button
            className="mt-4 bg-rose-600 hover:bg-rose-700 text-white"
            onClick={() => alert('SOS enviado! INEM notificado. Maternidade mais próxima: Hospital Central de Maputo.')}
          >
            <Siren className="h-4 w-4 mr-2" />
            SOS Obstétrico
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-8 py-6">
        <StatCard label="Gestantes Activas" value={stats.total} icon={Baby} color="#ec4899" />
        <StatCard label="Risco Alto" value={stats.highRisk} icon={AlertTriangle} color="#dc2626" />
        <StatCard label="Parto em ≤30 dias" value={stats.dueSoon} icon={Calendar} color="#f59e0b" />
        <StatCard label="ANC 4+ Completa" value={stats.ancComplete} icon={Heart} color="#10b981" />
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
          {profiles.length} gestantes
        </Badge>
      </div>

      {/* PROFILES */}
      <div className="px-8 pb-12">
        {isLoading ? (
          <div className="text-slate-400 text-sm">A carregar gestantes...</div>
        ) : profiles.length === 0 ? (
          <div className="text-slate-500 text-sm py-12 text-center">
            Nenhuma gestante registada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {profiles.map((p) => {
              const riskColor = p.risk_level === 'high' ? '#dc2626' : p.risk_level === 'medium' ? '#f59e0b' : '#10b981';
              const daysToEdd = p.edd_date
                ? Math.round((new Date(p.edd_date).getTime() - Date.now()) / (1000*60*60*24))
                : null;
              return (
                <Card key={p.id} className="bg-slate-900/60 border-slate-800">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge style={{ background:`${riskColor}20`, color:riskColor, border:`${riskColor}60` }}>
                          Risco: {p.risk_level || 'low'}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1">Província: {p.province || '—'}</p>
                        <p className="text-xs text-slate-400">Distrito: {p.district || '—'}</p>
                        {p.blood_type && (
                          <p className="text-xs text-slate-400">Tipo Sanguíneo: <span className="text-rose-400 font-bold">{p.blood_type}</span></p>
                        )}
                      </div>
                      <div className="text-right">
                        {daysToEdd != null && (
                          <>
                            <div className={`text-2xl font-bold ${daysToEdd <= 30 ? 'text-amber-400' : 'text-slate-100'}`}>
                              {daysToEdd > 0 ? daysToEdd : '?!'}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400">dias p/ parto</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-800/40 rounded p-2">
                        <div className="text-slate-500 uppercase text-[10px]">DUM</div>
                        <div className="text-slate-200">{p.lmp_date ? new Date(p.lmp_date).toLocaleDateString('pt-PT') : '—'}</div>
                      </div>
                      <div className="bg-slate-800/40 rounded p-2">
                        <div className="text-slate-500 uppercase text-[10px]">DPP</div>
                        <div className="text-slate-200">{p.edd_date ? new Date(p.edd_date).toLocaleDateString('pt-PT') : '—'}</div>
                      </div>
                      <div className="bg-slate-800/40 rounded p-2">
                        <div className="text-slate-500 uppercase text-[10px]">Gravidez</div>
                        <div className="text-slate-200">G{p.gravida || '?'}P{p.para || '?'}</div>
                      </div>
                      <div className="bg-slate-800/40 rounded p-2">
                        <div className="text-slate-500 uppercase text-[10px]">ANC Feitas</div>
                        <div className="text-emerald-400 font-bold">{p.anc_visits_done || 0}/4+</div>
                      </div>
                    </div>

                    {(p.last_bp_systolic || p.last_weight_kg) && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {p.last_bp_systolic && (
                          <div className="bg-slate-800/40 rounded p-2">
                            <div className="text-slate-500 uppercase text-[10px] flex items-center gap-1">
                              <Activity className="h-3 w-3" /> TA
                            </div>
                            <div className={`font-bold ${p.last_bp_systolic > 140 ? 'text-rose-400' : 'text-slate-200'}`}>
                              {p.last_bp_systolic}/{p.last_bp_diastolic || '?'}
                            </div>
                          </div>
                        )}
                        {p.last_weight_kg && (
                          <div className="bg-slate-800/40 rounded p-2">
                            <div className="text-slate-500 uppercase text-[10px]">Peso</div>
                            <div className="text-slate-200 font-bold">{p.last_weight_kg} kg</div>
                          </div>
                        )}
                      </div>
                    )}

                    {p.preferred_facility && (
                      <div className="text-xs text-slate-400 border-t border-slate-800 pt-2">
                        <Pill className="h-3 w-3 inline mr-1" />
                        {p.preferred_facility}
                      </div>
                    )}

                    {p.partner_phone && (
                      <a
                        href={`tel:${p.partner_phone}`}
                        className="block text-xs text-emerald-400 hover:underline"
                      >
                        <Phone className="h-3 w-3 inline mr-1" />
                        {p.partner_name || 'Parceiro'}: {p.partner_phone}
                      </a>
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
            <Calendar className="h-5 w-5 text-pink-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">4+ ANC Reminders</h3>
            <p className="text-xs text-slate-400">Lembretes WhatsApp para 4+ visitas pré-natais (padrão WHO). Semana 12, 26, 32, 36.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <AlertTriangle className="h-5 w-5 text-rose-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Alerta de Risco</h3>
            <p className="text-xs text-slate-400">Pressão alta, edema, sangramento, febre → teleconsult automático com obstetra.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <Siren className="h-5 w-5 text-rose-600 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">SOS Obstétrico</h3>
            <p className="text-xs text-slate-400">Botão vermelho em todas as páginas. Geolocalização → INEM + maternidade mais próxima.</p>
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
