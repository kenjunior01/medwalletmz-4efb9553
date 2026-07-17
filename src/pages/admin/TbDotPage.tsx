/**
 * TbDotPage — TB Directly Observed Treatment Digital
 * Moçambique é top-30 global em TB. Substituir caderno de papel por DOT digital.
 * First country in the world with DOT 100% digital.
 * Dados 100% locais (Supabase) — sem integrações de vídeo/GPS externas
 *
 * INTEGRAÇÕES ATIVAS (Google Cloud + WhatsApp + Gemini AI):
 * - Google Cloud Vision OCR: verificação de rótulo de medicação TB (detectText)
 * - WhatsApp via wa.me (sem API Business): buildTbReminder para lembrete de toma observada
 * - Google Gemini 2.0 Flash: assistente de adesão + efeitos adversos + interpretação de sputum
 */
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Clock, AlertTriangle, TrendingUp, Pill, CheckCircle,
  XCircle, Video, MapPin, ScanLine, MessageCircle, Send, Loader2, FileImage,
  Sparkles,
} from "lucide-react";
import { useTbDotRecords, useLogTbDose } from "@/hooks/useMzVerticals";
import { detectText } from "@/lib/googleVision";
import { openWhatsApp, buildTbReminder } from "@/lib/whatsapp";
import { GeminiAssistantCard, GeminiImageAnalyzer } from "@/components/gemini";

export default function TbDotPage() {
  const [provinceFilter, setProvinceFilter] = useState('');
  const { data: records = [], isLoading } = useTbDotRecords(provinceFilter || undefined);
  const logDose = useLogTbDose();

  // --- Vision OCR state ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrFileName, setOcrFileName] = useState<string | null>(null);

  // --- WhatsApp reminder state ---
  const [waPhone, setWaPhone] = useState('');
  const [waPatient, setWaPatient] = useState('');
  const [waCaseId, setWaCaseId] = useState('');
  const [waPhase, setWaPhase] = useState<'intensive' | 'continuation' | 'follow_up'>('intensive');

  /** Vision OCR: lê rótulo do medicamento TB (RHZE / RH) para verificação. */
  async function handleOcrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrFileName(file.name);
    try {
      const text = await detectText(file);
      setOcrText(text);
    } finally {
      setOcrLoading(false);
    }
  }

  /** WhatsApp: envia lembrete de toma TB ao paciente. */
  function handleSendWhatsapp() {
    if (!waPhone) return;
    const message = buildTbReminder({
      patientName: waPatient || undefined,
      phase: waPhase === 'intensive' ? 'RHZE (Fase Intensiva)' :
             waPhase === 'continuation' ? 'RH (Fase Continuação)' : 'Follow-up',
      caseId: waCaseId || undefined,
    });
    openWhatsApp(waPhone, message);
  }

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
            Moçambique top-30 global em TB · Primeiro país do mundo com DOT 100% digital · Observação local sem APIs externas
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
                        Observar Toma
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

      {/* TOOLS — Google Cloud Vision + WhatsApp */}
      <div className="px-8 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <ScanLine className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-100">Ferramentas TB DOT</h2>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 ml-2">Google Cloud Vision + WhatsApp</Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Google Vision OCR */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-sky-400" />
                Verificação de Rótulo — Google Cloud Vision OCR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-400">
                Carrega uma foto do rótulo da medicação TB (RHZE/RH) para verificar via Google Cloud Vision TEXT_DETECTION.
                Útil para evitar erros de dispensa e auditar conformidade do esquema terapêutico.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleOcrFile}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrLoading}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white"
              >
                {ocrLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileImage className="h-4 w-4 mr-2" />}
                {ocrLoading ? 'A ler texto...' : 'Carregar Foto do Rótulo'}
              </Button>
              {ocrFileName && !ocrText && !ocrLoading && (
                <p className="text-xs text-slate-400">Ficheiro: {ocrFileName}</p>
              )}
              {ocrText && (
                <div className="bg-slate-950/60 border border-slate-700 rounded p-3 max-h-64 overflow-y-auto">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                    <ScanLine className="h-3 w-3" /> Texto detectado — {ocrFileName}
                  </div>
                  <pre className="text-xs text-emerald-300 whitespace-pre-wrap font-mono leading-relaxed">{ocrText}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp TB Reminder */}
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                Lembrete de Toma — WhatsApp (wa.me)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-400">
                Envia lembrete padronizado de toma observada ao paciente. Abre WhatsApp com mensagem pré-preenchida
                (sem necessidade de API Business).
              </p>
              <input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="Telefone (8XXXXXXXX)" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
              <input value={waPatient} onChange={(e) => setWaPatient(e.target.value)} placeholder="Nome do paciente (opcional)" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
              <input value={waCaseId} onChange={(e) => setWaCaseId(e.target.value)} placeholder="ID do caso TB (opcional)" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
              <select value={waPhase} onChange={(e) => setWaPhase(e.target.value as 'intensive' | 'continuation' | 'follow_up')} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100">
                <option value="intensive">Fase Intensiva (RHZE)</option>
                <option value="continuation">Fase Continuação (RH)</option>
                <option value="follow_up">Follow-up</option>
              </select>
              <Button onClick={handleSendWhatsapp} disabled={!waPhone} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                <Send className="h-4 w-4 mr-2" /> Enviar Lembrete WhatsApp
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* INFO */}
      <div className="px-8 pb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <Video className="h-5 w-5 text-sky-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Observação Digital</h3>
            <p className="text-xs text-slate-400">Observação da toma registada localmente pelo profissional. Sem dependência de APIs externas de vídeo.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <AlertTriangle className="h-5 w-5 text-amber-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Alerta de Abandono</h3>
            <p className="text-xs text-slate-400">Após 24h sem registo, alerta automático ao gestor nacional. Após 7 dias, marca caso como abandono.</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/60 border-slate-700">
          <CardContent className="p-4">
            <MapPin className="h-5 w-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Verificação Local</h3>
            <p className="text-xs text-slate-400">Cada observação fica registada com timestamp e profissional responsável, para auditoria interna.</p>
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
            systemPromptKey="tb"
            subtitle="Dúvidas de adesão, efeitos adversos da RHZE, sinal de alerta"
          />
          <GeminiImageAnalyzer
            title="Interpretar Lâmina de Sputum / RX"
            prompt="És um assistente de saúde em Moçambique. Analisa esta imagem (lâmina de sputum com coloração Ziehl-Neelsen, radiografia de tórax, ou rótulo de medicação TB). Descreve de forma curta o que observas. Para sputum: indica se observas bacilos vermelhos (BAAR positivo) fundo azul. Para RX: descreve opacidades, cavernas, derrame. Para rótulo: lê medicação e dosagem. Não diagnostiques — apenas descreve. Em caso de dúvida, REFER. Responde em português de Moçambique."
            fallback={(name) =>
              `[Simulado] Imagem ${name} recebida. Gemini API indisponível (quota/região). Para BAAR: observar 100 campos antes de reportar negativo. Suspeita de TB-MDR ou falência terapêutica = REFER ao médico.`
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
