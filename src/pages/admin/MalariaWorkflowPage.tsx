/**
 * MalariaWorkflowPage — Test-and-Treat Workflow
 * Moçambique: 8M casos/ano. Workflow: APE faz RDT → resultado em MedWallet → Coartem dispensado → reporte PNM.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Pill, MapPin, TrendingUp, AlertTriangle, Plus,
  Search, Droplet, CheckCircle,
} from "lucide-react";
import { useMalariaCases, useCreateMalariaCase } from "@/hooks/useMzVerticals";

export default function MalariaWorkflowPage() {
  const [provinceFilter, setProvinceFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const { data: cases = [], isLoading } = useMalariaCases(provinceFilter || undefined);
  const createCase = useCreateMalariaCase();

  const stats = {
    total: cases.length,
    positive: cases.filter(c => c.rdt_result === 'positive').length,
    severe: cases.filter(c => c.severity === 'severe').length,
    cured: cases.filter(c => c.outcome === 'cured').length,
    pctPositive: cases.length
      ? Math.round((cases.filter(c => c.rdt_result === 'positive').length / cases.length) * 100)
      : 0,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO */}
      <div className="relative overflow-hidden border-b border-rose-500/30">
        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-rose-600/30 via-amber-500/20 to-emerald-500/30" />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
        <div className="relative px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Droplet className="h-8 w-8 text-rose-400" />
                Malaria Test-and-Treat Workflow
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                8M casos/ano em Moçambique · APE → RDT → Coartem → Reporte PNM automático · Geofencing de surtos
              </p>
            </div>
            <Button onClick={() => setShowNew(!showNew)} className="bg-rose-500 hover:bg-rose-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> Novo Caso
            </Button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-8 py-6">
        <StatCard label="Total Casos" value={stats.total} icon={Activity} color="#0ea5e9" />
        <StatCard label="RDT Positivos" value={stats.positive} icon={Droplet} color="#dc2626" />
        <StatCard label="% Positividade" value={`${stats.pctPositive}%`} icon={TrendingUp} color="#f59e0b" />
        <StatCard label="Graves" value={stats.severe} icon={AlertTriangle} color="#9333ea" />
        <StatCard label="Curados" value={stats.cured} icon={CheckCircle} color="#10b981" />
      </div>

      {/* NEW CASE FORM */}
      {showNew && (
        <div className="px-8 pb-4">
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Registar Caso de Malaria</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  createCase.mutate({
                    province: fd.get('province') as string,
                    district: fd.get('district') as string,
                    village: fd.get('village') as string,
                    age_years: Number(fd.get('age_years')) || null,
                    sex: fd.get('sex') as any,
                    pregnant: fd.get('pregnant') === 'on',
                    rdt_result: fd.get('rdt_result') as any,
                    severity: fd.get('severity') as any,
                    treatment_given: fd.get('treatment_given') as string,
                    country_id: 'MZ',
                  });
                  setShowNew(false);
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              >
                <input name="province" placeholder="Província" required className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
                <input name="district" placeholder="Distrito" required className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
                <input name="village" placeholder="Aldeia" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
                <input name="age_years" type="number" placeholder="Idade" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
                <select name="sex" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100">
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" name="pregnant" /> Gestante
                </label>
                <select name="rdt_result" required className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100">
                  <option value="positive">RDT Positivo</option>
                  <option value="negative">RDT Negativo</option>
                </select>
                <select name="severity" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100">
                  <option value="uncomplicated">Não complicada</option>
                  <option value="severe">Grave</option>
                </select>
                <select name="treatment_given" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 col-span-2">
                  <option value="Coartem">Coartem (ACT)</option>
                  <option value="ASAQ">ASAQ (Artesunato+Amodiaquina)</option>
                  <option value="Artesunato IV">Artesunato IV (grave)</option>
                  <option value="Quinina IV">Quinina IV (segunda linha)</option>
                </select>
                <div className="col-span-4 flex gap-2">
                  <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white">
                    {createCase.isPending ? 'A registar...' : 'Registar Caso + Dispensar Tratamento'}
                  </Button>
                  <Button type="button" variant="outline" className="border-slate-700 text-slate-200" onClick={() => setShowNew(false)}>
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
          {cases.length} casos
        </Badge>
      </div>

      {/* CASES TABLE */}
      <div className="px-8 pb-12">
        {isLoading ? (
          <div className="text-slate-400 text-sm">A carregar casos de malaria...</div>
        ) : cases.length === 0 ? (
          <div className="text-slate-500 text-sm py-12 text-center">
            Nenhum caso registado. Clica em "Novo Caso" para começar.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Província</th>
                  <th className="text-left px-4 py-3">Distrito</th>
                  <th className="text-left px-4 py-3">Idade/Sexo</th>
                  <th className="text-left px-4 py-3">RDT</th>
                  <th className="text-left px-4 py-3">Gravidade</th>
                  <th className="text-left px-4 py-3">Tratamento</th>
                  <th className="text-left px-4 py-3">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800 hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-slate-300">{new Date(c.case_date).toLocaleDateString('pt-PT')}</td>
                    <td className="px-4 py-3 text-slate-300">{c.province || '-'}</td>
                    <td className="px-4 py-3 text-slate-400">{c.district || '-'}</td>
                    <td className="px-4 py-3 text-slate-300">{c.age_years || '?'} / {c.sex || '?'}</td>
                    <td className="px-4 py-3">
                      {c.rdt_result === 'positive' ? (
                        <span className="text-rose-400 font-bold">POS</span>
                      ) : (
                        <span className="text-emerald-400">NEG</span>
                      )}
                      {c.pregnant && <Badge className="ml-2 bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">Gestante</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {c.severity === 'severe'
                        ? <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Grave</Badge>
                        : <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30">Não compl.</Badge>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.treatment_given || '-'}</td>
                    <td className="px-4 py-3">
                      {c.outcome === 'cured' && <span className="text-emerald-400">Curado</span>}
                      {c.outcome === 'recovering' && <span className="text-sky-400">Recuperando</span>}
                      {c.outcome === 'referred' && <span className="text-amber-400">Referido</span>}
                      {!c.outcome && <span className="text-slate-500">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INFO */}
      <div className="px-8 pb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <Pill className="h-5 w-5 text-rose-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Dispensa Automática Coartem</h3>
            <p className="text-xs text-slate-400">Se RDT positivo e não complicado, Coartem é dispensado automaticamente pela farmácia mais próxima.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <MapPin className="h-5 w-5 text-amber-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Geofencing de Surtos</h3>
            <p className="text-xs text-slate-400">Detecta clusters (&gt;5 casos/km²/semana). Alerta automático ao INS e PNM em tempo real.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <Activity className="h-5 w-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Reporte PNM Automático</h3>
            <p className="text-xs text-slate-400">Push diário ao Programa Nacional de Malária. Inclui caso, tratamento, desfecho, GPS.</p>
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
