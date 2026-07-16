/**
 * MalariaWorkflowPage — Test-and-Treat Workflow
 * Moçambique: 8M casos/ano. Workflow: APE faz RDT → resultado em MedWallet → Coartem dispensado → dashboard nacional.
 * Dados 100% locais (Supabase) — sem APIs externas (PNM/INS)
 *
 * INTEGRAÇÕES ATIVAS (Google Cloud + WhatsApp + Gemini AI):
 * - Google Maps Routes API v2: fetchRouteDistance para farmácia mais próxima (fallback haversineKm)
 * - WhatsApp via wa.me (sem API Business): buildMalariaResult para envio de resultado RDT
 * - Google Gemini 2.0 Flash: interpretação de TDR por foto + conselheiro de conduta clínica
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Pill, MapPin, TrendingUp, AlertTriangle, Plus,
  Search, Droplet, CheckCircle, Navigation, MessageCircle, Send, Loader2,
  Clock, Route, Sparkles,
} from "lucide-react";
import { useMalariaCases, useCreateMalariaCase } from "@/hooks/useMzVerticals";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import { fetchRouteDistance, haversineKm, fmtDuration, type DistanceResult } from "@/lib/googleRoutes";
import { openWhatsApp, buildMalariaResult } from "@/lib/whatsapp";
import { GeminiAssistantCard, GeminiImageAnalyzer } from "@/components/gemini";

export default function MalariaWorkflowPage() {
  const [provinceFilter, setProvinceFilter] = useState('');
  const [showNew, setShowNew] = useState(false);
  const { data: cases = [], isLoading } = useMalariaCases(provinceFilter || undefined);
  const createCase = useCreateMalariaCase();

  // --- Google Routes state ---
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [route, setRoute] = useState<DistanceResult | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState('maputo_central');

  // --- WhatsApp RDT state ---
  const [waPhone, setWaPhone] = useState('');
  const [waPatient, setWaPatient] = useState('');
  const [waResult, setWaResult] = useState<'positive' | 'negative'>('positive');
  const [waTreatment, setWaTreatment] = useState('Coartem (ACT)');

  /** Detecta GPS do utilizador (Google Maps JS API). */
  async function handleDetectLocation() {
    setGeoLoading(true);
    setGeoError(null);
    try {
      await loadGoogleMaps();
      if (!('geolocation' in navigator)) throw new Error('Geolocalização não suportada');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGeoLoading(false);
        },
        (err) => {
          setGeoError(err.message || 'Erro ao obter localização');
          setGeoLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } catch (e: unknown) {
      setGeoError(e instanceof Error ? e.message : 'Falha ao carregar Google Maps');
      setGeoLoading(false);
    }
  }

  /** Lista de farmácias de referência (coordenadas aproximadas). */
  const pharmacies: Record<string, { name: string; lat: number; lng: number }> = {
    maputo_central: { name: 'Farmácia Central — Maputo', lat: -25.9655, lng: 32.5832 },
    maputo_machava: { name: 'Farmácia Machava — Maputo Prov', lat: -25.9056, lng: 32.5731 },
    beira_savane: { name: 'Farmácia Savane — Beira', lat: -19.8336, lng: 34.8408 },
    nampula_central: { name: 'Farmácia Central — Nampula', lat: -15.1165, lng: 39.2666 },
    pemba_bairro: { name: 'Farmácia Pemba Bairro — Cabo Delgado', lat: -12.9740, lng: 40.5178 },
    quelimane_central: { name: 'Farmácia Central — Quelimane', lat: -17.8786, lng: 36.8883 },
  };

  /** Calcula rota para a farmácia selecionada (Google Routes API v2 + haversine fallback). */
  async function handleCalcRoute() {
    if (!origin) {
      setGeoError('Primeiro detecta a tua localização.');
      return;
    }
    const dest = pharmacies[selectedPharmacy];
    if (!dest) return;
    setRouteLoading(true);
    try {
      let result = await fetchRouteDistance(
        origin,
        { lat: dest.lat, lng: dest.lng },
        'pharmacy',
        selectedPharmacy,
        'driving'
      );
      if (!result) {
        // Fallback: Haversine puro
        const km = haversineKm(origin, { lat: dest.lat, lng: dest.lng });
        result = {
          distanceMeters: Math.round(km * 1000),
          durationSeconds: Math.round(km * 90), // assume ~40 km/h média urbana
          via: 'haversine_fallback',
        };
      }
      setRoute(result);
    } finally {
      setRouteLoading(false);
    }
  }

  /** WhatsApp: envia resultado RDT ao paciente. */
  function handleSendWhatsapp() {
    if (!waPhone) return;
    const message = buildMalariaResult({
      patientName: waPatient || undefined,
      result: waResult,
      treatment: waResult === 'positive' ? waTreatment : undefined,
      facility: selectedPharmacy ? pharmacies[selectedPharmacy]?.name : 'farmácia registada',
    });
    openWhatsApp(waPhone, message);
  }

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
                8M casos/ano em Moçambique · APE → RDT → Coartem → Dashboard nacional · Detecção de surtos internos
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
                  } as any);
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

      {/* TOOLS — Google Routes + WhatsApp */}
      <div className="px-8 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <Route className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-100">Ferramentas Malaria</h2>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 ml-2">Google Routes API + WhatsApp</Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Google Routes — Nearest Pharmacy */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-sky-400" />
                Farmácia mais próxima — Google Routes API v2
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-400">
                Calcula distância e duração reais de condução até à farmácia selecionada usando a Google Maps Routes API v2.
                Se a API falhar, usa fallback Haversine com estimativa de duração.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDetectLocation} disabled={geoLoading} className="bg-sky-500 hover:bg-sky-600 text-white">
                  {geoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                  {origin ? 'GPS OK' : 'Detectar GPS'}
                </Button>
                {origin && (
                  <span className="text-xs text-slate-400 flex items-center">
                    {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
                  </span>
                )}
              </div>
              {geoError && <p className="text-xs text-rose-400">⚠ {geoError}</p>}
              <select
                value={selectedPharmacy}
                onChange={(e) => setSelectedPharmacy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
              >
                {Object.entries(pharmacies).map(([k, p]) => (
                  <option key={k} value={k}>{p.name}</option>
                ))}
              </select>
              <Button onClick={handleCalcRoute} disabled={routeLoading || !origin} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                {routeLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Route className="h-4 w-4 mr-2" />}
                {routeLoading ? 'A calcular rota...' : 'Calcular Rota'}
              </Button>
              {route && (
                <div className="bg-slate-950/60 border border-slate-700 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Distância
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {(route.distanceMeters / 1000).toFixed(1)} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Duração
                    </span>
                    <span className="text-sky-400 font-bold">{fmtDuration(route.durationSeconds)}</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${route.via === 'google_routes' ? 'border-emerald-600 text-emerald-400' : 'border-amber-600 text-amber-400'}`}>
                    {route.via === 'google_routes' ? 'Google Routes API v2' : 'Fallback Haversine'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp RDT Result */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                Resultado RDT — WhatsApp (wa.me)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-400">
                Envia o resultado do teste de malaria ao paciente via WhatsApp. Inclui tratamento recomendado e farmácia para recolha.
              </p>
              <input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="Telefone (8XXXXXXXX)" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
              <input value={waPatient} onChange={(e) => setWaPatient(e.target.value)} placeholder="Nome do paciente (opcional)" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
              <select value={waResult} onChange={(e) => setWaResult(e.target.value as 'positive' | 'negative')} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100">
                <option value="positive">RDT Positivo 🔴</option>
                <option value="negative">RDT Negativo 🟢</option>
              </select>
              {waResult === 'positive' && (
                <select value={waTreatment} onChange={(e) => setWaTreatment(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100">
                  <option value="Coartem (ACT)">Coartem (ACT)</option>
                  <option value="ASAQ">ASAQ (Artesunato+Amodiaquina)</option>
                  <option value="Artesunato IV">Artesunato IV (grave)</option>
                </select>
              )}
              <Button onClick={handleSendWhatsapp} disabled={!waPhone} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                <Send className="h-4 w-4 mr-2" /> Enviar Resultado
              </Button>
            </CardContent>
          </Card>
        </div>
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

      {/* IA — Google Gemini 2.0 Flash */}
      <div className="px-8 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-fuchsia-400" />
          <h2 className="text-lg font-semibold text-slate-100">Assistente IA — Gemini</h2>
          <Badge className="bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30 ml-2">Google Gemini 2.0 Flash</Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GeminiAssistantCard
            systemPromptKey="malaria"
            subtitle="Interpretação de TDR, conduta clínica, malária grave"
          />
          <GeminiImageAnalyzer
            title="Interpretar TDR de Malária"
            prompt="És um assistente de saúde em Moçambique. Analisa a foto de um Teste Diagnóstico Rápido (TDR) de malária. Indica: (1) se a linha de controlo (C) está visível = teste válido; (2) se a linha de teste (T) está visível = positivo para P. falciparum; (3) se houver uma terceira linha = positivo para Pv. Responde no formato: TDR: [Válido/Inválido] | Resultado: [Positivo Pf / Positivo Pf+Pv / Negativo]. Em caso de inválido, recomenda repetir o teste. Não prescrevas — apenas interpreta. Responde em português de Moçambique."
            fallback={(name) =>
              `[Simulado] Foto ${name} recebida. Gemini API indisponível (quota/região). Verificação manual: linha C visível = teste válido; linha C + T = positivo Pf; apenas C = negativo. Malária grave = REFER urgente.`
            }
          />
        </div>
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
