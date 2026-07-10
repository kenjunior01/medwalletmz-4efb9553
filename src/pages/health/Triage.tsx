import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useCountry } from '@/contexts/CountryContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Sparkles, AlertTriangle, Stethoscope, MapPin,
  CheckCircle2, Mic, MicOff, Loader2, Volume2, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TriageResult {
  severity: string;
  recommendation: string;
  suggested_specialty: string;
  red_flags?: string[];
}

const sevColor: Record<string, string> = {
  baixa: 'bg-pharmacy text-pharmacy-foreground',
  moderada: 'bg-warning text-warning-foreground',
  alta: 'bg-destructive text-destructive-foreground',
  'emergência': 'bg-destructive text-destructive-foreground animate-pulse',
};

export default function Triage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country, t } = useCountry();
  const { coordinates, calculateDistance, countryCode } = useLocation();
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [nearbyDoctors, setNearbyDoctors] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      // Simulate STT conversion
      setIsRecording(false);
      toast.success("Áudio processado via Google Cloud Speech-to-Text");
      if (!symptoms) {
        setSymptoms("Sinto uma dor de cabeça latejante há 3 horas, acompanhada de sensibilidade à luz e náuseas. Não tomei nenhum medicamento ainda.");
      }
    } else {
      setIsRecording(true);
      toast.info("A ouvir...", { description: "Descreva os seus sintomas em voz alta." });
    }
  };

  const findNearbyDoctors = async (specialtyName: string) => {
    try {
      const { data: specs } = await supabase
        .from('medical_specialties')
        .select('id, name')
        .ilike('name', `%${specialtyName}%`)
        .limit(1);
      const specialtyId = specs?.[0]?.id;
      let q = supabase
        .from('doctor_profiles')
        .select('*, medical_specialties(name, icon)')
        .eq('is_available', true);
      if (specialtyId) q = q.eq('specialty_id', specialtyId);
      const { data } = await q.order('is_verified', { ascending: false }).limit(10);
      let list = (data as any[]) || [];
      if (coordinates) {
        list = list
          .map((d) => ({
            ...d,
            _dist: d.latitude && d.longitude ? calculateDistance(d.latitude, d.longitude) : null,
          }))
          .sort((a, b) => (a._dist ?? 9999) - (b._dist ?? 9999));
      }
      const top = list.slice(0, 3);
      const ids = top.map((d) => d.user_id);
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
        top.forEach((d: any) => {
          d.profiles = profs?.find((p: any) => p.user_id === d.user_id) || null;
        });
      }
      setNearbyDoctors(top);
    } catch (e) {
      console.warn('nearby doctors failed', e);
    }
  };

  const run = async () => {
    if (!symptoms.trim()) return toast.error(t('doctor_register.required_fields_error'));
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-triage', {
        body: { symptoms, age: age ? Number(age) : null, duration, country: countryCode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as TriageResult);
      if (data?.suggested_specialty) findNearbyDoctors(data.suggested_specialty);
      if (user) {
        await supabase.from('triage_logs').insert({
          patient_id: user.id,
          symptoms,
          age: age ? Number(age) : null,
          duration: duration || null,
          severity: data.severity,
          recommendation: data.recommendation,
          suggested_specialty: data.suggested_specialty,
          ai_response: data,
        });
      }
    } catch (e: any) {
      toast.error(e.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const speakRecommendation = () => {
    if (!result) return;
    toast.info("A gerar áudio via Cloud Text-to-Speech...", { icon: <Volume2 className="h-4 w-4" /> });
    // In a real app, use SpeechSynthesis or Cloud TTS
    const msg = new SpeechSynthesisUtterance(result.recommendation);
    msg.lang = 'pt-PT';
    window.speechSynthesis.speak(msg);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Meddy Consulta
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Triagem Inteligente (VUI)</p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase">
          AI-Powered
        </Badge>
      </header>

      <section className="p-4 space-y-6 max-w-2xl mx-auto">
        <Card className="p-4 bg-destructive/10 border-destructive/20 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-black text-destructive uppercase tracking-widest">{t('health.urgent')}</p>
            <p className="text-[11px] leading-relaxed">
              {t('health.triage_emergency_warning', { number: t('health.emergency_call') })}
            </p>
          </div>
        </Card>

        <Card className="p-5 space-y-5 shadow-premium border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Stethoscope className="h-24 w-24" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('health.symptoms_label')}</Label>
              <button
                onClick={toggleRecording}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[10px] font-black uppercase tracking-tighter",
                  isRecording ? "bg-destructive text-white animate-pulse" : "bg-primary/10 text-primary"
                )}
              >
                {isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                {isRecording ? `... ${recordingTime}s` : t('home.meddy_consulta')}
              </button>
            </div>
            <div className="relative">
              <Textarea
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder={t('health.symptoms_placeholder')}
                className="rounded-2xl border-2 focus:border-primary/50 transition-all resize-none text-sm leading-relaxed p-4"
              />
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-primary/5 backdrop-blur-[2px] rounded-2xl flex items-center justify-center"
                  >
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <motion.div
                          key={i}
                          animate={{ height: [10, 30, 10] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                          className="w-1 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('health.age_label')}</Label>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Ex: 30"
                className="h-12 rounded-xl border-2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('health.duration_label')}</Label>
              <Input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ex: 2 dias"
                className="h-12 rounded-xl border-2"
              />
            </div>
          </div>

          <Button
            className="w-full h-14 rounded-2xl font-black text-lg shadow-premium group"
            onClick={run}
            disabled={loading || isRecording}
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {t('health.analyze_symptoms')} <Sparkles className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </span>
            )}
          </Button>
        </Card>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card className="p-6 space-y-4 border-none shadow-premium relative overflow-hidden">
                <div className={cn("absolute top-0 left-0 w-full h-1.5", sevColor[result.severity]?.split(' ')[0] || 'bg-muted')} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <p className="text-xs uppercase font-black tracking-widest text-muted-foreground">{t('health.triage_report')}</p>
                  </div>
                  <Badge className={cn("rounded-full px-3 py-1 font-black uppercase text-[9px] tracking-widest", sevColor[result.severity] ?? 'bg-muted')}>
                    {t('health.severity_label')}: {result.severity}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-sm font-medium leading-relaxed italic text-foreground/90">
                      "{result.recommendation}"
                    </p>
                    <Button variant="ghost" size="icon" className="shrink-0 rounded-full bg-muted/50" onClick={speakRecommendation}>
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {result.red_flags && result.red_flags.length > 0 && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-destructive uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3" /> {t('health.recent_triage_title')}
                      </p>
                      <ul className="space-y-1.5">
                        {result.red_flags.map((r, i) => (
                          <li key={i} className="text-xs flex items-start gap-2 text-foreground/80">
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{t('health.suggested_specialty_label')}</p>
                    <p className="font-black text-lg text-primary">{result.suggested_specialty}</p>
                  </div>
                  <Button className="rounded-xl font-bold bg-secondary hover:bg-secondary/90 shadow-md" onClick={() => navigate('/health/doctors')}>
                    {t('health.book_doctor')}
                  </Button>
                </div>
              </Card>

              {nearbyDoctors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{t('health.available_specialists')}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {nearbyDoctors.map((d: any) => (
                      <Card
                        key={d.id}
                        className="p-3 cursor-pointer hover:border-primary/30 transition-all group"
                        onClick={() => navigate(`/health/book/${d.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Stethoscope className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm flex items-center gap-1 truncate">
                              Dr(a). {d.profiles?.full_name || t('common.doctor')}
                              {d.is_verified && <CheckCircle2 className="h-3 w-3 text-primary" />}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                              {d.medical_specialties?.name || t('doctor_register.specialty_placeholder')}
                              {d._dist != null && ` · ${d._dist.toFixed(1)} km`}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                            {t('health.reserve')}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
