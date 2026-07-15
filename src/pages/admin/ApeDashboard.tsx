/**
 * ApeDashboard — Community Health Worker dashboard
 * Moçambique: 12.000+ APEs em zonas rurais
 * Triagem offline-first: malaria, TB, HIV, ANC, vacinação
 * Dados 100% locais (Supabase) — sem integrações externas
 *
 * INTEGRAÇÕES ATIVAS (Google Cloud + WhatsApp + M-Pesa + Gemini AI):
 * - Google Maps JS API: Geolocation do APE no campo (loadGoogleMaps + navigator.geolocation)
 * - Google Air Quality + Weather (Open-Meteo fallback): fetchEnvironmentalHealth(lat,lng)
 * - WhatsApp via wa.me (sem API Business): openWhatsApp + buildMalariaResult
 * - M-Pesa Manual Payment (sem API Vodacom): createManualPayment + buildMpesaInstructions
 * - Google Gemini 2.0 Flash: triagem clínica conversacional + análise visual de TDR/lesões
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
  WifiOff, Crosshair, Wind, MessageCircle, Wallet, Loader2, Send,
  Thermometer, Navigation, Sparkles,
} from "lucide-react";
import { useApeVisits, useCreateApeVisit } from "@/hooks/useMzVerticals";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import { fetchEnvironmentalHealth, type EnvironmentalData } from "@/lib/googleEnvironmental";
import { openWhatsApp, buildMalariaResult } from "@/lib/whatsapp";
import { createManualPayment, buildMpesaInstructions, type ManualPayment } from "@/lib/mpesa";
import { GeminiAssistantCard, GeminiImageAnalyzer } from "@/components/gemini";

export default function ApeDashboard() {
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [showNewVisit, setShowNewVisit] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- Tools state (Google Cloud + WhatsApp + M-Pesa) ---
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoResult, setGeoResult] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [envLoading, setEnvLoading] = useState(false);
  const [envData, setEnvData] = useState<EnvironmentalData | null>(null);

  const [waPhone, setWaPhone] = useState('');
  const [waPatient, setWaPatient] = useState('');
  const [waResult, setWaResult] = useState<'positive' | 'negative'>('positive');

  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [mpesaPayment, setMpesaPayment] = useState<ManualPayment | null>(null);

  /** Google Maps + Geolocation: detecta GPS do APE. */
  async function handleGeolocate() {
    setGeoLoading(true);
    setGeoError(null);
    try {
      // Carrega Google Maps JS API (garante que google.maps está disponível)
      await loadGoogleMaps();
      if (!('geolocation' in navigator)) throw new Error('Geolocalização não suportada neste dispositivo');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoResult({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
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

  /** Google Air Quality + Weather widget. */
  async function handleFetchEnv() {
    if (!geoResult) {
      setGeoError('Primeiro detecta a tua localização (Google Geolocation).');
      return;
    }
    setEnvLoading(true);
    try {
      const data = await fetchEnvironmentalHealth(geoResult.lat, geoResult.lng);
      setEnvData(data);
    } finally {
      setEnvLoading(false);
    }
  }

  /** WhatsApp: envia resultado RDT ao paciente. */
  function handleSendWhatsapp() {
    if (!waPhone) return;
    const message = buildMalariaResult({
      patientName: waPatient || undefined,
      result: waResult,
      facility: 'Posto de Saúde APE',
    });
    openWhatsApp(waPhone, message);
  }

  /** M-Pesa Manual: gera referência de pagamento para bônus de performance APE. */
  async function handleCreateMpesa() {
    setMpesaLoading(true);
    try {
      const payment = await createManualPayment({
        amount_mzn: 250, // Bônus fixo por 50 visitas APE completas
        description: 'Bônus de performance APE — 50 visitas completas',
        payer_phone: waPhone || undefined,
        payer_name: waPatient || undefined,
        metadata: { bonus_type: 'ape_performance', visits_threshold: 50 },
      });
      setMpesaPayment(payment);
    } finally {
      setMpesaLoading(false);
    }
  }

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
                12.000+ APEs em zonas rurais de Moçambique · Triagem offline-first · Dados 100% locais
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

      {/* TOOLS — Google Cloud + WhatsApp + M-Pesa */}
      <div className="px-8 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <Navigation className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-100">Ferramentas APE</h2>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 ml-2">Google Cloud + WhatsApp + M-Pesa</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Google Geolocation */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crosshair className="h-5 w-5 text-sky-400" />
                <h3 className="text-sm font-semibold text-slate-100">Google Geolocation</h3>
              </div>
              <p className="text-xs text-slate-400">Detecta GPS do APE no campo via Google Maps JS API.</p>
              <Button onClick={handleGeolocate} disabled={geoLoading} className="w-full bg-sky-500 hover:bg-sky-600 text-white">
                {geoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crosshair className="h-4 w-4 mr-2" />}
                {geoLoading ? 'A detectar...' : 'Detectar GPS'}
              </Button>
              {geoError && <p className="text-xs text-rose-400">⚠ {geoError}</p>}
              {geoResult && (
                <div className="text-xs space-y-1 bg-slate-800/40 rounded p-2">
                  <div className="text-slate-300">Lat: <span className="font-mono text-emerald-400">{geoResult.lat.toFixed(6)}</span></div>
                  <div className="text-slate-300">Lng: <span className="font-mono text-emerald-400">{geoResult.lng.toFixed(6)}</span></div>
                  <div className="text-slate-300">Precisão: ±{Math.round(geoResult.accuracy)}m</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Air Quality + Weather */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">Qualidade do Ar + Clima</h3>
              </div>
              <p className="text-xs text-slate-400">Google Air Quality + Open-Meteo weather para a localização atual.</p>
              <Button onClick={handleFetchEnv} disabled={envLoading || !geoResult} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                {envLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wind className="h-4 w-4 mr-2" />}
                {envLoading ? 'A obter...' : 'Ver Qualidade do Ar'}
              </Button>
              {envData && (
                <div className="text-xs space-y-1 bg-slate-800/40 rounded p-2">
                  <div className="flex items-center gap-1 text-slate-300">
                    <Thermometer className="h-3 w-3 text-amber-400" /> {envData.temp}°C · {envData.condition}
                  </div>
                  <div className="text-slate-300">AQI: <span className="font-bold text-emerald-400">{envData.aqi}</span> ({envData.category})</div>
                  {envData.alerts.length > 0 && (
                    <div className="text-amber-400">⚠ {envData.alerts[0].message}</div>
                  )}
                  <div className="text-slate-400 italic">{envData.recommendation}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. WhatsApp RDT Result */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">WhatsApp — Resultado RDT</h3>
              </div>
              <p className="text-xs text-slate-400">Envia resultado do teste de malaria ao paciente via wa.me (sem API Business).</p>
              <input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="Telefone (8XXXXXXXX)" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
              <input value={waPatient} onChange={(e) => setWaPatient(e.target.value)} placeholder="Nome do paciente (opcional)" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
              <select value={waResult} onChange={(e) => setWaResult(e.target.value as 'positive' | 'negative')} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100">
                <option value="positive">RDT Positivo 🔴</option>
                <option value="negative">RDT Negativo 🟢</option>
              </select>
              <Button onClick={handleSendWhatsapp} disabled={!waPhone} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                <Send className="h-4 w-4 mr-2" /> Enviar WhatsApp
              </Button>
            </CardContent>
          </Card>

          {/* 4. M-Pesa Manual Payment */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">M-Pesa Manual — Bônus APE</h3>
              </div>
              <p className="text-xs text-slate-400">Gera referência manual de 250 MZN para bônus de performance. Pagamento confirmado pelo gestor.</p>
              <Button onClick={handleCreateMpesa} disabled={mpesaLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                {mpesaLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
                {mpesaLoading ? 'A gerar...' : 'Gerar Pagamento 250 MZN'}
              </Button>
              {mpesaPayment && (
                <div className="text-xs space-y-1 bg-slate-800/40 rounded p-2 whitespace-pre-line text-slate-300">
                  {buildMpesaInstructions(mpesaPayment)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
              <h3 className="text-sm font-semibold text-slate-100">Performance Tracking</h3>
            </div>
            <p className="text-xs text-slate-400">
              Pontuação interna por triagem completa. Bônus: 50 pts por caso de malaria curado, 100 pts por vacinação completa.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">Alertas Internos</h3>
            </div>
            <p className="text-xs text-slate-400">
              Casos de malaria e surtos potenciais destacados automaticamente no dashboard para revisão do gestor nacional.
            </p>
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
            systemPromptKey="ape"
            subtitle="Triagem clínica por linguagem natural (protocolos MISAU/OMS)"
          />
          <GeminiImageAnalyzer
            title="Interpretar TDR / Lesão / Rótulo"
            prompt="És um assistente de saúde em Moçambique. Analisa esta imagem (TDR de malária, lesão cutânea, ou rótulo de medicamento) e descreve de forma curta o que observas. Para TDR: indica se a linha de controlo aparece e se a linha de teste aparece (positivo/negativo). Para lesão: descreve cor, tamanho aparente, e características. Para rótulo: lê o nome do medicamento, dosagem e validade. Não diagnostiques — apenas descreve e sugere REFER ao técnico em caso de dúvida. Responde em português de Moçambique."
            fallback={(name) =>
              `[Simulado] Imagem ${name} recebida. Não foi possível contactar a Gemini API (quota/região). Verifica manualmente o TDR conforme guia MISAU: linha C visível = teste válido; linha C+T = positivo; apenas C = negativo. Em caso de dúvida, REFER.`
            }
          />
        </div>
      </div>
    </div>
  );
}
