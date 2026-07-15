/**
 * ApeDashboard — Community Health Worker dashboard
 * Moçambique: 12.000+ APEs em zonas rurais
 * Triagem offline-first: malaria, TB, HIV, ANC, vacinação
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, MapPin, Users, Heart, Pill, Microscope, Baby,
  ClipboardList, TrendingUp, AlertTriangle, Plus, Search, Wifi,
  WifiOff,
} from "lucide-react";
import { useApeVisits, useCreateApeVisit } from "@/hooks/useMzVerticals";

export default function ApeDashboard() {
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [showNewVisit, setShowNewVisit] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { data: visits = [], isLoading } = useApeVisits(provinceFilter || undefined);
  const createVisit = useCreateApeVisit();

  const { data: stats } = useQuery({
    queryKey: ['ape-stats'],
    queryFn: async () => {
      const { count: total } = await (supabase as any).from('ape_visits').select('id', { count: 'exact', head: true });
      const { count: malaria } = await (supabase as any).from('ape_visits').select('id', { count: 'exact', head: true }).eq('visit_type','malaria');
      const { count: anc } = await (supabase as any).from('ape_visits').select('id', { count: 'exact', head: true }).eq('visit_type','anc');
      const { count: vacc } = await (supabase as any).from('ape_visits').select('id', { count: 'exact', head: true }).eq('visit_type','vaccination');
      return { total: total || 0, malaria: malaria || 0, anc: anc || 0, vacc: vacc || 0 };
    },
  });

  const statsCards = [
    { label: 'Visitas Totais', value: stats?.total || 0, icon: Activity, color: '#0ea5e9' },
    { label: 'Triagem Malaria', value: stats?.malaria || 0, icon: Pill, color: '#dc2626' },
    { label: 'Pré-Natal (ANC)', value: stats?.anc || 0, icon: Baby, color: '#7c3aed' },
    { label: 'Vacinação', value: stats?.vacc || 0, icon: Heart, color: '#10b981' },
  ];

  const visitTypeLabels: Record<string, {label:string; color:string}> = {
    malaria:     { label: 'Malaria',       color: '#dc2626' },
    tb_screen:   { label: 'TB Screen',     color: '#f59e0b' },
    hiv_test:    { label: 'HIV Test',      color: '#7c3aed' },
    anc:         { label: 'Pré-Natal',     color: '#ec4899' },
    pnc:         { label: 'Pós-Parto',     color: '#0ea5e9' },
    vaccination: { label: 'Vacinação',     color: '#10b981' },
    general:     { label: 'Geral',         color: '#64748b' },
    referral:    { label: 'Referência',    color: '#9333ea' },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO */}
      <div className="relative overflow-hidden border-b border-emerald-500/30">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(135deg,#007a5e 0%,#ce1126 33%,#fcd116 66%,#007a5e 100%)',
            backgroundSize: 'cover',
          }}
        />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
        <div className="relative px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Users className="h-8 w-8 text-emerald-400" />
                APE Digital — Agentes Polivalentes Elementares
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                12.000+ APEs em zonas rurais de Moçambique · Triagem offline-first · Pagamento M-Pesa por performance
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`${isOnline ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {isOnline ? 'Online — Sync ativo' : 'Offline — Sync pendente'}
              </Badge>
              <Button onClick={() => setShowNewVisit(!showNewVisit)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Registar Visita APE
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-8 py-6">
        {statsCards.map(s => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center gap-3"
            style={{ borderColor: `${s.color}40` }}
          >
            <div className="p-2 rounded-lg" style={{ background: `${s.color}20`, color: s.color }}>
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-50 leading-none">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* NEW VISIT FORM */}
      {showNewVisit && (
        <div className="px-8 pb-4">
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Nova Visita APE</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  createVisit.mutate({
                    visit_type: (fd.get('visit_type') as string) as any,
                    province: fd.get('province') as string,
                    district: fd.get('district') as string,
                    village: fd.get('village') as string,
                    rdt_result: fd.get('rdt_result') as any,
                    diagnosis: fd.get('diagnosis') as string,
                    referral_to: fd.get('referral_to') as string,
                    notes: fd.get('notes') as string,
                    country_id: 'MZ',
                    offline_synced: isOnline,
                  });
                  setShowNewVisit(false);
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              >
                <select name="visit_type" required className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100">
                  {Object.entries(visitTypeLabels).map(([k,v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <input name="province" placeholder="Província" required className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
                <input name="district" placeholder="Distrito" required className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
                <input name="village" placeholder="Aldeia" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
                <select name="rdt_result" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 col-span-2">
                  <option value="not_tested">Não testado</option>
                  <option value="positive">RDT Positivo</option>
                  <option value="negative">RDT Negativo</option>
                </select>
                <input name="diagnosis" placeholder="Diagnóstico" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 col-span-2" />
                <input name="referral_to" placeholder="Referência para" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 col-span-2" />
                <textarea name="notes" placeholder="Notas" rows={2} className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 col-span-4" />
                <div className="col-span-4 flex gap-2">
                  <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    {createVisit.isPending ? 'A registar...' : 'Registar Visita'}
                  </Button>
                  <Button type="button" variant="outline" className="border-slate-700 text-slate-200" onClick={() => setShowNewVisit(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FILTERS */}
      <div className="px-8 pb-4 flex items-center gap-3 flex-wrap">
        <Search className="h-4 w-4 text-slate-400" />
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
          {visits.length} visitas
        </Badge>
      </div>

      {/* VISITS LIST */}
      <div className="px-8 pb-12">
        {isLoading ? (
          <div className="text-slate-400 text-sm">A carregar visitas APE...</div>
        ) : visits.length === 0 ? (
          <div className="text-slate-500 text-sm py-12 text-center">
            Nenhuma visita registada. Clica em "Registar Visita APE" para começar.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Província</th>
                  <th className="text-left px-4 py-3">Distrito</th>
                  <th className="text-left px-4 py-3">RDT</th>
                  <th className="text-left px-4 py-3">Diagnóstico</th>
                  <th className="text-left px-4 py-3">Referência</th>
                  <th className="text-left px-4 py-3">Sync</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => {
                  const meta = visitTypeLabels[v.visit_type] || visitTypeLabels.general;
                  return (
                    <tr key={v.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                      <td className="px-4 py-3 text-slate-300">{new Date(v.visit_date).toLocaleDateString('pt-PT')}</td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: `${meta.color}30`, color: meta.color, border: `${meta.color}60` }}>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{v.province || '-'}</td>
                      <td className="px-4 py-3 text-slate-400">{v.district || '-'}</td>
                      <td className="px-4 py-3">
                        {v.rdt_result === 'positive' ? (
                          <span className="text-rose-400 font-bold">POSITIVO</span>
                        ) : v.rdt_result === 'negative' ? (
                          <span className="text-emerald-400">Negativo</span>
                        ) : (
                          <span className="text-slate-500">N/T</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{v.diagnosis || '-'}</td>
                      <td className="px-4 py-3 text-slate-400">{v.referral_to || '-'}</td>
                      <td className="px-4 py-3">
                        {v.offline_synced ? (
                          <Wifi className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-rose-400" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INFO FOOTER */}
      <div className="px-8 pb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">Triagem Offline-First</h3>
            </div>
            <p className="text-xs text-slate-400">
              APEs em zonas sem internet podem registar visitas. Sync automático quando conectado.
              Queue persistente em IndexedDB.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-slate-100">Pagamento M-Pesa</h3>
            </div>
            <p className="text-xs text-slate-400">
              5 MZN por triagem completa. Bônus: 50 MZN por caso de malaria curado, 100 MZN por vacinação completa.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">Reporte MISAU/INS</h3>
            </div>
            <p className="text-xs text-slate-400">
              Push automático para SIS-MA. Casos de malaria reportados ao PNM. Surto de cólera alerta ao INS em 24h.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
