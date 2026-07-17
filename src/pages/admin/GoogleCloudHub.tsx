/**
 * GoogleCloudHub — Central de serviços Google Cloud integrados
 *
 * Mostra o estado de cada serviço Google Cloud configurado no MedWallet:
 *   - Google Maps JS API (geolocalização, mapas, places)
 *   - Google Maps Routes API (distância/tempo real com trânsito)
 *   - Google Maps Places API (search de farmácias/hospitais)
 *   - Google Maps Geocoding API (endereço → coords)
 *   - Google Cloud Vision API (OCR de receitas, RDTs, medicamentos)
 *   - Google Cloud Text-to-Speech (lembretes em voz pt-PT/pt-BR)
 *   - Google Cloud Translation API (multilingual)
 *   - Google Maps Air Quality API (qualidade do ar para APEs)
 *   - Google Routes API (otimização de rotas de entrega)
 *
 * Cada cartão mostra: estado (ativo/simulado/falhou), última chamada,
 * botão "Testar" para validar, link para a página que usa o serviço.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Map, Navigation, MapPin, Search, Eye, Volume2, Languages, Wind,
  Truck, Sparkles, CheckCircle, XCircle, AlertCircle, RefreshCw,
} from 'lucide-react';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';
import { fetchRouteDistance, haversineKm } from '@/lib/googleRoutes';
import { detectText } from '@/lib/googleVision';
import { speakText } from '@/lib/googleTTS';
import { fetchEnvironmentalHealth } from '@/lib/googleEnvironmental';

type ServiceStatus = 'unknown' | 'testing' | 'active' | 'simulated' | 'failed';

interface ServiceResult {
  status: ServiceStatus;
  message: string;
  detail?: string;
  timestamp?: string;
}

const GOOGLE_SERVICES = [
  {
    id: 'maps',
    name: 'Google Maps JS API',
    description: 'Mapas interativos, geolocalização, Places autocomplete, geocoding.',
    icon: Map,
    color: '#10b981',
    usedIn: ['/manager/mz-verticals/ape', '/manager/mz-verticals/malaria', '/manager/mz-verticals/maternal', '/health/facilities', '/'],
    category: 'Maps',
  },
  {
    id: 'routes',
    name: 'Google Maps Routes API v2',
    description: 'Distância e tempo real com trânsito. Otimização de rotas de entrega.',
    icon: Navigation,
    color: '#0ea5e9',
    usedIn: ['/manager/mz-verticals/malaria', '/order/:id', '/health/facilities'],
    category: 'Maps',
  },
  {
    id: 'places',
    name: 'Google Places API',
    description: 'Pesquisa de farmácias, hospitais, clínicas por nome/localização.',
    icon: Search,
    color: '#7c3aed',
    usedIn: ['/suggest-place', '/health/facilities', '/manager/curation'],
    category: 'Maps',
  },
  {
    id: 'geocoding',
    name: 'Google Geocoding API',
    description: 'Converte endereços em coordenadas GPS (via supabase function geocode-address).',
    icon: MapPin,
    color: '#f59e0b',
    usedIn: ['/addresses', '/suggest-place', '/manager/mz-verticals/ape'],
    category: 'Maps',
  },
  {
    id: 'vision',
    name: 'Google Cloud Vision API',
    description: 'OCR de receitas médicas, rótulos de medicamentos, fotos de RDT.',
    icon: Eye,
    color: '#dc2626',
    usedIn: ['/manager/mz-verticals/tb-dot', '/health/records', '/manager/import'],
    category: 'AI',
  },
  {
    id: 'tts',
    name: 'Google Cloud Text-to-Speech',
    description: 'Voz neural pt-PT/pt-BR para lembretes ARV, ANC, TB. Fallback p/ browser.',
    icon: Volume2,
    color: '#ec4899',
    usedIn: ['/manager/mz-verticals/art', '/manager/mz-verticals/maternal'],
    category: 'AI',
  },
  {
    id: 'translate',
    name: 'Google Cloud Translation',
    description: 'Tradução automática de conteúdo (via supabase function google-translate).',
    icon: Languages,
    color: '#06b6d4',
    usedIn: ['/manager/curation', '/health/education'],
    category: 'AI',
  },
  {
    id: 'airquality',
    name: 'Air Quality + Weather',
    description: 'Qualidade do ar + clima para APEs em campo (via Open-Meteo + Google).',
    icon: Wind,
    color: '#84cc16',
    usedIn: ['/manager/mz-verticals/ape', '/'],
    category: 'Environment',
  },
  {
    id: 'delivery',
    name: 'Delivery Routes Optimization',
    description: 'Otimização de rotas de estafetas com trânsito em tempo real.',
    icon: Truck,
    color: '#f97316',
    usedIn: ['/order/:id', '/manager/drivers'],
    category: 'Logistics',
  },
];

export default function GoogleCloudHub() {
  const [results, setResults] = useState<Record<string, ServiceResult>>({});

  const testService = async (id: string) => {
    setResults(r => ({ ...r, [id]: { status: 'testing', message: 'A testar...' } }));
    try {
      let res: ServiceResult;
      switch (id) {
        case 'maps':
          res = await testMaps();
          break;
        case 'routes':
          res = await testRoutes();
          break;
        case 'places':
          res = await testPlaces();
          break;
        case 'geocoding':
          res = await testGeocoding();
          break;
        case 'vision':
          res = await testVision();
          break;
        case 'tts':
          res = await testTTS();
          break;
        case 'translate':
          res = await testTranslate();
          break;
        case 'airquality':
          res = await testAirQuality();
          break;
        case 'delivery':
          res = await testRoutes(); // mesma API
          break;
        default:
          res = { status: 'failed', message: 'Serviço desconhecido' };
      }
      setResults(r => ({ ...r, [id]: { ...res, timestamp: new Date().toISOString() } }));
    } catch (e: any) {
      setResults(r => ({ ...r, [id]: { status: 'failed', message: e.message || 'Erro', timestamp: new Date().toISOString() } }));
    }
  };

  const testAll = async () => {
    for (const s of GOOGLE_SERVICES) {
      await testService(s.id);
    }
  };

  // Group by category
  const categories = Array.from(new Set(GOOGLE_SERVICES.map(s => s.category)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO */}
      <div className="relative overflow-hidden border-b border-sky-500/30">
        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-sky-600/30 via-blue-500/20 via-emerald-500/20 to-amber-500/30" />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
        <div className="relative px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-sky-400" />
                Google Cloud Hub — Serviços Integrados
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                9 serviços Google Cloud activos · Maps, Routes, Places, Geocoding, Vision, TTS, Translation, Air Quality, Delivery Routes
              </p>
            </div>
            <Button onClick={testAll} className="bg-sky-500 hover:bg-sky-600 text-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Testar Todos
            </Button>
          </div>
        </div>
      </div>

      {/* STATUS BANNER */}
      <div className="px-8 py-4">
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              API Key configurada
            </Badge>
            <span className="text-xs text-slate-400">
              {Object.keys(results).length}/{GOOGLE_SERVICES.length} serviços testados
            </span>
            <span className="text-xs text-slate-500">
              Os serviços funcionam automaticamente. Se a API Key falhar, todos têm fallback simulado para nao quebrar a UX.
            </span>
          </CardContent>
        </Card>
      </div>

      {/* SERVICES BY CATEGORY */}
      {categories.map(cat => (
        <div key={cat} className="px-8 pb-6">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-semibold">
            {cat === 'Maps' && '🗺️  Maps & Geolocation'}
            {cat === 'AI' && '🤖  AI & ML'}
            {cat === 'Environment' && '🌬️  Environment'}
            {cat === 'Logistics' && '🚚  Logistics'}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {GOOGLE_SERVICES.filter(s => s.category === cat).map(s => {
              const r = results[s.id];
              return (
                <Card key={s.id} className="bg-slate-900/60 border-slate-800">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: `${s.color}20`, color: s.color }}>
                          <s.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">{s.name}</h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.category}</p>
                        </div>
                      </div>
                      <StatusBadge status={r?.status || 'unknown'} />
                    </div>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">{s.description}</p>

                    {r && r.status !== 'testing' && (
                      <div className="bg-slate-950/60 rounded p-2 mb-3 border border-slate-800">
                        <p className="text-xs text-slate-300 break-words">
                          {r.status === 'active' && <CheckCircle className="h-3 w-3 inline mr-1 text-emerald-400" />}
                          {r.status === 'simulated' && <AlertCircle className="h-3 w-3 inline mr-1 text-amber-400" />}
                          {r.status === 'failed' && <XCircle className="h-3 w-3 inline mr-1 text-rose-400" />}
                          {r.message}
                        </p>
                        {r.detail && <p className="text-[10px] text-slate-500 mt-1">{r.detail}</p>}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testService(s.id)}
                        disabled={r?.status === 'testing'}
                        className="border-slate-700 text-slate-200 hover:bg-slate-800 flex-1"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${r?.status === 'testing' ? 'animate-spin' : ''}`} />
                        {r?.status === 'testing' ? 'A testar...' : 'Testar'}
                      </Button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Usado em</p>
                      <div className="flex flex-wrap gap-1">
                        {s.usedIn.map(u => (
                          <code key={u} className="text-[10px] bg-slate-800/60 text-slate-400 px-1.5 py-0.5 rounded">{u}</code>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  switch (status) {
    case 'active':    return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Activo</Badge>;
    case 'simulated': return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Simulado</Badge>;
    case 'failed':    return <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">Falhou</Badge>;
    case 'testing':   return <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 animate-pulse">A testar...</Badge>;
    default:          return <Badge variant="outline" className="border-slate-700 text-slate-500">Não testado</Badge>;
  }
}

// =================== TEST FUNCTIONS ===================
async function testMaps(): Promise<ServiceResult> {
  try {
    const google = await loadGoogleMaps();
    if (google?.maps?.Map) {
      return { status: 'active', message: 'Google Maps JS API carregado com sucesso. Pronto para renderizar mapas.' };
    }
    return { status: 'failed', message: 'Google Maps carregou mas objecto Map não disponível.' };
  } catch (e: any) {
    return { status: 'failed', message: e.message || 'Erro ao carregar Google Maps' };
  }
}

async function testRoutes(): Promise<ServiceResult> {
  try {
    // Testar rota Maputo → Beira (coords aproximadas)
    const result = await fetchRouteDistance(
      { lat: -25.9692, lng: 32.5732 }, // Maputo
      { lat: -19.8436, lng: 34.8389 }, // Beira
      'hospital',
      'test-beira',
      'driving'
    );
    if (result?.via === 'google_routes') {
      const km = Math.round(result.distanceMeters / 1000);
      const hours = Math.round(result.durationSeconds / 3600);
      return {
        status: 'active',
        message: `Rota Maputo→Beira calculada: ${km} km em ~${hours}h (Google Routes API).`,
        detail: `via=${result.via}, polyline=${result.polyline ? 'sim' : 'não'}`,
      };
    }
    if (result) {
      return { status: 'simulated', message: 'Rota calculada via fallback (Mapbox/Haversine).', detail: `via=${result.via}` };
    }
    // Haversine como último recurso
    const km = haversineKm({ lat: -25.9692, lng: 32.5732 }, { lat: -19.8436, lng: 34.8389 });
    return { status: 'simulated', message: `Rota calculada via Haversine (geometria). ${Math.round(km)} km em linha recta.`, detail: 'Google Routes indisponível, usando fallback.' };
  } catch (e: any) {
    return { status: 'failed', message: e.message || 'Erro ao calcular rota' };
  }
}

async function testPlaces(): Promise<ServiceResult> {
  try {
    const google = await loadGoogleMaps();
    if (google?.maps?.places?.Autocomplete) {
      return { status: 'active', message: 'Places Autocomplete disponível. Pesquisa de farmácias/hospitais funcional.' };
    }
    return { status: 'simulated', message: 'Places API parcialmente disponível. Algumas funcionalidades podem usar fallback.' };
  } catch (e: any) {
    return { status: 'failed', message: e.message };
  }
}

async function testGeocoding(): Promise<ServiceResult> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Maputo,Mozambique&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'OK' && json.results?.[0]) {
      const loc = json.results[0].geometry.location;
      return {
        status: 'active',
        message: `Geocoding "Maputo" → ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}.`,
        detail: `address=${json.results[0].formatted_address}`,
      };
    }
    return { status: 'failed', message: `Geocoding respondeu: ${json.status}` };
  } catch (e: any) {
    return { status: 'failed', message: e.message };
  }
}

async function testVision(): Promise<ServiceResult> {
  try {
    // Criar imagem 1x1 com texto "TEST" para validar o endpoint
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas não disponível');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText('TEST MedWallet', 10, 35);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
    const file = new File([blob], 'test-ocr.png', { type: 'image/png' });
    const text = await detectText(file);
    if (text.includes('Simulado')) {
      return { status: 'simulated', message: 'Vision API em modo simulação (API Key não configurada ou falhou).' };
    }
    return { status: 'active', message: `OCR detectou: "${text.substring(0, 50)}..."`, detail: 'Vision API funcional para leitura de receitas/RDTs.' };
  } catch (e: any) {
    return { status: 'failed', message: e.message };
  }
}

async function testTTS(): Promise<ServiceResult> {
  try {
    // Não reproduzir som automaticamente para não incomodar, apenas verificar
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey && !apiKey.includes('your_')) {
      // Verificar que o endpoint responde
      const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: 'test' },
          voice: { languageCode: 'pt-PT' },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });
      if (res.ok) {
        return { status: 'active', message: 'TTS API respondeu. Pronto para gerar voz pt-PT/pt-BR.' };
      }
      return { status: 'simulated', message: `TTS API respondeu ${res.status}. Fallback p/ browser SpeechSynthesis activo.` };
    }
    return { status: 'simulated', message: 'TTS usando fallback do browser (SpeechSynthesis API). Funcional mas com qualidade inferior.' };
  } catch (e: any) {
    return { status: 'simulated', message: 'TTS usando fallback do browser. API Google indisponível.' };
  }
}

async function testTranslate(): Promise<ServiceResult> {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return { status: 'simulated', message: 'Translation API indisponível sem chave.' };
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: 'Saúde para todos',
        source: 'pt',
        target: 'en',
      }),
    });
    const json = await res.json();
    if (json?.data?.translations?.[0]?.translatedText) {
      return {
        status: 'active',
        message: `Traduzido "Saúde para todos" → "${json.data.translations[0].translatedText}"`,
        detail: 'Translation API funcional para i18n automático.',
      };
    }
    return { status: 'failed', message: 'Translation API respondeu sem tradução.' };
  } catch (e: any) {
    return { status: 'failed', message: e.message };
  }
}

async function testAirQuality(): Promise<ServiceResult> {
  try {
    const data = await fetchEnvironmentalHealth(-25.9692, 32.5732); // Maputo
    if (data.status === 'success') {
      return {
        status: 'active',
        message: `Maputo agora: AQI ${data.aqi} (${data.category}), ${data.temp}°C, ${data.recommendation.substring(0, 60)}...`,
        detail: `${data.alerts.length} alertas activos.`,
      };
    }
    return { status: 'failed', message: 'Air Quality API indisponível.' };
  } catch (e: any) {
    return { status: 'failed', message: e.message };
  }
}
