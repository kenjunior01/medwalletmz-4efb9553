/**
 * MaternalHealthPage — Maternal Health Vertical
 * Moçambique: 451 mortes maternas/100k nascimentos. Tracking gravidez + ANC + SOS obstétrico.
 * Dados 100% locais (Supabase) — sem APIs externas (WhatsApp/INE/INEM)
 *
 * INTEGRAÇÕES ATIVAS (Google Cloud + WhatsApp + Gemini AI):
 * - Google Maps Routes API v2: fetchRouteDistance para maternidade mais próxima (fallback haversineKm)
 * - WhatsApp via wa.me (sem API Business): buildSosObstetric + buildAncReminder
 * - Google Cloud Text-to-Speech: speakText(text, 'pt-PT') para lembretes por voz
 * - Google Gemini 2.0 Flash: conselheira pré-natal + identificação de sinais de perigo em fotos
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Baby, Heart, Activity, AlertTriangle, Calendar, Pill,
  Phone, Siren, Navigation, MessageCircle, Send, Loader2, Volume2,
  Clock, Route, MapPin, Sparkles,
} from "lucide-react";
import { useMaternalProfiles } from "@/hooks/useMzVerticals";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";
import { fetchRouteDistance, haversineKm, fmtDuration, type DistanceResult } from "@/lib/googleRoutes";
import { openWhatsApp, buildSosObstetric, buildAncReminder } from "@/lib/whatsapp";
import { speakText } from "@/lib/googleTTS";
import { GeminiAssistantCard, GeminiImageAnalyzer } from "@/components/gemini";

export default function MaternalHealthPage() {
  const [provinceFilter, setProvinceFilter] = useState('');
  const { data: profiles = [], isLoading } = useMaternalProfiles(provinceFilter || undefined);

  // --- SOS Obstétrico state ---
  const [sosPhone, setSosPhone] = useState(''); // Contacto de emergência (maternidade/equipa médica)

  // --- Google Routes state ---
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [route, setRoute] = useState<DistanceResult | null>(null);
  const [selectedMaternity, setSelectedMaternity] = useState('maputo_maternidade');

  // --- Per-patient TTS loading state ---
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);

  /** Maternidades de referência (coordenadas aproximadas). */
  const maternities: Record<string, { name: string; lat: number; lng: number }> = {
    maputo_maternidade: { name: 'Maternidade Central — Maputo', lat: -25.9701, lng: 32.5733 },
    machava_maternidade: { name: 'Maternidade Machava — Maputo Prov', lat: -25.9056, lng: 32.5731 },
    beira_maternidade: { name: 'Maternidade Central — Beira', lat: -19.8336, lng: 34.8408 },
    nampula_maternidade: { name: 'Maternidade Central — Nampula', lat: -15.1165, lng: 39.2666 },
    pemba_maternidade: { name: 'Maternidade Central — Pemba', lat: -12.9740, lng: 40.5178 },
    quelimane_maternidade: { name: 'Maternidade Central — Quelimane', lat: -17.8786, lng: 36.8883 },
  };

  /** SOS Obstétrico — alerta interno + WhatsApp para a equipa médica. */
  function handleSos() {
    const dest = maternities[selectedMaternity];
    if (!sosPhone) {
      alert('Indica primeiro o número de emergência (maternidade/equipa médica) no campo "Contacto SOS".');
      return;
    }
    const message = buildSosObstetric({
      facility: dest?.name,
      location: origin ? `${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}` : undefined,
    });
    openWhatsApp(sosPhone, message);
  }

  /** Detecta GPS do utilizador. */
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

  /** Calcula rota para a maternidade selecionada. */
  async function handleCalcRoute() {
    if (!origin) {
      setGeoError('Primeiro detecta a tua localização.');
      return;
    }
    const dest = maternities[selectedMaternity];
    if (!dest) return;
    setRouteLoading(true);
    try {
      let result = await fetchRouteDistance(
        origin,
        { lat: dest.lat, lng: dest.lng },
        'hospital',
        selectedMaternity,
        'driving'
      );
      if (!result) {
        const km = haversineKm(origin, { lat: dest.lat, lng: dest.lng });
        result = {
          distanceMeters: Math.round(km * 1000),
          durationSeconds: Math.round(km * 90),
          via: 'haversine_fallback',
        };
      }
      setRoute(result);
    } finally {
      setRouteLoading(false);
    }
  }

  /** WhatsApp per-patient: lembrete ANC. */
  function handleSendAncReminder(profile: any) {
    if (!profile.partner_phone) {
      alert('Paciente sem telefone de parceiro registado. Adiciona o telefone no perfil.');
      return;
    }
    const dueDate = profile.edd_date
      ? new Date(profile.edd_date).toLocaleDateString('pt-PT')
      : 'a combinar';
    const week = profile.edd_date
      ? Math.max(1, Math.round(40 - ((new Date(profile.edd_date).getTime() - Date.now()) / (1000*60*60*24*7))))
      : undefined;
    const message = buildAncReminder({
      visitNumber: (profile.anc_visits_done || 0) + 1,
      week,
      dueDate,
      facility: profile.preferred_facility || maternities[selectedMaternity]?.name,
    });
    openWhatsApp(profile.partner_phone, message);
  }

  /** Google TTS per-patient: lembrete ANC por voz. */
  async function handleSpeak(profile: any) {
    setTtsLoadingId(profile.id);
    try {
      const visitN = (profile.anc_visits_done || 0) + 1;
      const text = `Lembrete pré-natal. Está na altura da tua consulta ANC número ${visitN}. Por favor responde com SIM para confirmares a presença. Saúde é riqueza.`;
      await speakText(text, 'pt-PT');
    } finally {
      setTtsLoadingId(null);
    }
  }

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
            451 mortes maternas/100k · Tracking de gravidez · 4+ ANC reminders · SOS obstétrico registado internamente
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30">4+ ANC visits (WHO)</Badge>
            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">SOS Obstétrico WhatsApp</Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Planeamento Familiar</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Vacinação Infantil</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <input
              value={sosPhone}
              onChange={(e) => setSosPhone(e.target.value)}
              placeholder="Contacto SOS (maternidade/equipa 8XXXXXXXX)"
              className="bg-slate-950/70 border border-rose-700/60 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 w-72"
            />
            <select
              value={selectedMaternity}
              onChange={(e) => setSelectedMaternity(e.target.value)}
              className="bg-slate-950/70 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100"
            >
              {Object.entries(maternities).map(([k, m]) => (
                <option key={k} value={k}>{m.name}</option>
              ))}
            </select>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleSos}
              disabled={!sosPhone}
            >
              <Siren className="h-4 w-4 mr-2" />
              SOS Obstétrico (WhatsApp)
            </Button>
          </div>
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

                    {/* WhatsApp ANC reminder + Google TTS per patient */}
                    <div className="flex gap-2 pt-1 border-t border-slate-800">
                      <Button
                        onClick={() => handleSendAncReminder(p)}
                        size="sm"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs"
                      >
                        <Send className="h-3 w-3 mr-1" /> WhatsApp ANC
                      </Button>
                      <Button
                        onClick={() => handleSpeak(p)}
                        disabled={ttsLoadingId === p.id}
                        size="sm"
                        variant="outline"
                        className="flex-1 border-sky-700 text-sky-300 hover:bg-sky-950/30 h-8 text-xs"
                      >
                        {ttsLoadingId === p.id
                          ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          : <Volume2 className="h-3 w-3 mr-1" />}
                        Voz (TTS)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* TOOLS — Google Routes para Maternidade */}
      <div className="px-8 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <Route className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-100">Ferramentas Maternais</h2>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 ml-2">Google Routes API + WhatsApp + TTS</Badge>
        </div>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-sky-400" />
              Maternidade mais próxima — Google Routes API v2
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-400">
              Calcula distância e duração reais de condução até à maternidade selecionada. Crítico para gestantes em trabalho de parto.
              Fallback Haversine com estimativa de duração se a API falhar.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleDetectLocation} disabled={geoLoading} className="bg-sky-500 hover:bg-sky-600 text-white">
                {geoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                {origin ? 'GPS OK' : 'Detectar GPS'}
              </Button>
              {origin && (
                <span className="text-xs text-slate-400">
                  {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
                </span>
              )}
            </div>
            {geoError && <p className="text-xs text-rose-400">⚠ {geoError}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedMaternity}
                onChange={(e) => setSelectedMaternity(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 flex-1 min-w-64"
              >
                {Object.entries(maternities).map(([k, m]) => (
                  <option key={k} value={k}>{m.name}</option>
                ))}
              </select>
              <Button onClick={handleCalcRoute} disabled={routeLoading || !origin} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {routeLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Route className="h-4 w-4 mr-2" />}
                {routeLoading ? 'A calcular...' : 'Calcular Rota'}
              </Button>
            </div>
            {route && (
              <div className="bg-slate-950/60 border border-slate-700 rounded p-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-slate-500 uppercase text-[10px] flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Distância
                  </div>
                  <div className="text-emerald-400 font-bold text-lg">
                    {(route.distanceMeters / 1000).toFixed(1)} km
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 uppercase text-[10px] flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Duração
                  </div>
                  <div className="text-sky-400 font-bold text-lg">{fmtDuration(route.durationSeconds)}</div>
                </div>
                <div>
                  <div className="text-slate-500 uppercase text-[10px]">Fonte</div>
                  <Badge variant="outline" className={`text-[10px] ${route.via === 'google_routes' ? 'border-emerald-600 text-emerald-400' : 'border-amber-600 text-amber-400'}`}>
                    {route.via === 'google_routes' ? 'Google Routes v2' : 'Haversine'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* INFO */}
      <div className="px-8 pb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <Calendar className="h-5 w-5 text-pink-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">4+ ANC Reminders</h3>
            <p className="text-xs text-slate-400">Lembretes locais no app para 4+ visitas pré-natais (padrão WHO). Semana 12, 26, 32, 36.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <AlertTriangle className="h-5 w-5 text-rose-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Alerta de Risco</h3>
            <p className="text-xs text-slate-400">Pressão alta, edema, sangramento, febre → alerta interno para teleconsult com obstetra.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <Siren className="h-5 w-5 text-rose-600 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">SOS Obstétrico WhatsApp</h3>
            <p className="text-xs text-slate-400">Botão vermelho envia mensagem SOS via WhatsApp (wa.me) à equipa médica e maternidade preferida. Inclui localização GPS se disponível.</p>
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
            systemPromptKey="maternal"
            subtitle="Conselheira pré-natal, sinais de perigo obstétrico, planeamento familiar"
          />
          <GeminiImageAnalyzer
            title="Analisar Ecografia / Edema / Lesão"
            prompt="És uma assistente de saúde materna em Moçambique. Analisa esta imagem (ecografia obstétrica, foto de edema/pé inchado, ou lesão cutânea). Descreve o que observas: para ecografia, indica se vês batimento cardíaco fetal e idade gestacional aproximada; para edema, descreve localização e severidade aparente; para lesão, descreve cor, tamanho, características. Sinais de perigo obstétrico (sangramento, edema grave, cefaleia intensa) = REFER urgente à maternidade. Não diagnostiques. Responde em português de Moçambique."
            fallback={(name) =>
              `[Simulado] Imagem ${name} recebida. Gemini API indisponível (quota/região). Sinais de perigo obstétrico (REFER urgente): sangramento, cefaleia intensa, visão turva, convulsões, edema facial/mãos, febre alta, perda de líquido amniótico.`
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
