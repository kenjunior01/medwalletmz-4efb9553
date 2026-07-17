import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ShieldCheck, ChevronRight, X, Check, Sparkles,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

/**
 * HealthProfileOnboarding
 *
 * Modal de onboarding que aparece APENAS:
 *   1. Logo após o registo de um novo utilizador
 *   2. No primeiro login de um utilizador que ainda não completou o perfil de saúde
 *
 * Para garantir que NÃO aparece repetidamente ao mesmo utilizador,
 * usamos um flag dedicado em `patient_profiles.health_onboarding_completed_at`
 * (timestamp). Enquanto o utilizador não fechar/completar o modal, o campo fica NULL.
 * Logo que ele clica em "Finalizar" ou "Mais tarde", gravamos o timestamp
 * e o modal nunca mais aparece (a menos que o utilizador apague o perfil manualmente).
 *
 * Estratégia fallback: se a coluna health_onboarding_completed_at não existir
 * (ainda não migrada), usamos blood_type != null como indicador de conclusão.
 */

const HEALTH_CONCERNS: Array<{ id: string; label: string; icon: string }> = [
  { id: 'hipertensao', label: 'Hipertensão', icon: '❤️' },
  { id: 'diabetes', label: 'Diabetes', icon: '🍬' },
  { id: 'asma', label: 'Asma / Respiratório', icon: '🫁' },
  { id: 'malaria_recente', label: 'Malária recente', icon: '🦟' },
  { id: 'tb', label: 'Tuberculose', icon: '🫁' },
  { id: 'hiv', label: 'HIV / SIDA', icon: '🎗️' },
  { id: 'doenca_cardiaca', label: 'Doença Cardíaca', icon: '💗' },
  { id: 'doenca_renal', label: 'Doença Renal', icon: '🧪' },
  { id: 'epilepsia', label: 'Epilepsia', icon: '🧠' },
  { id: 'cancro', label: 'Cancro / Oncologia', icon: '🎗️' },
  { id: 'gravidez', label: 'Gravidez', icon: '🤰' },
  { id: 'obesidade', label: 'Obesidade', icon: '⚖️' },
  { id: 'artrite', label: 'Artrite / Artrose', icon: '🦴' },
  { id: 'ansiedade_depressao', label: 'Ansiedade / Depressão', icon: '🧠' },
  { id: 'colesterol_alto', label: 'Colesterol Alto', icon: '🩸' },
  { id: 'tiroides', label: 'Tiróide', icon: '🦋' },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const ALLERGIES_OPTIONS = [
  'Penicilina', 'Sulfonamidas', 'Aspirina', 'Ibuprofeno',
  'Amendoim', 'Marisco', 'Glúten', 'Lactose', 'Pólen', 'Ácaros',
];

export function HealthProfileOnboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState({
    chronic_conditions: [] as string[],
    blood_type: '',
    allergies: [] as string[],
    none: false,
  });

  // Verifica se o onboarding já foi concluído pelo utilizador
  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: profile, error } = await supabase
          .from('patient_profiles')
          .select('blood_type, chronic_conditions, allergies, health_onboarding_completed_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          // Provavelmente a coluna health_onboarding_completed_at ainda não existe
          // → usar fallback: blood_type != null significa que já preencheu
          if (!profile?.blood_type) {
            // tentar sem a coluna nova
            const { data: p2 } = await supabase
              .from('patient_profiles')
              .select('blood_type, chronic_conditions, allergies')
              .eq('user_id', user.id)
              .maybeSingle();
            if (!cancelled && !p2?.blood_type) {
              setShow(true);
            }
          }
        } else if (profile) {
          // Mostrar o modal APENAS se ainda não completou
          const completed =
            profile.health_onboarding_completed_at ||
            profile.blood_type;
          if (!completed) {
            setShow(true);
          } else if (profile.chronic_conditions) {
            // pré-preencher se já existir dados parciais
            setData(prev => ({
              ...prev,
              chronic_conditions: profile.chronic_conditions || [],
              blood_type: profile.blood_type || '',
              allergies: profile.allergies || [],
            }));
          }
        } else {
          // Perfil não existe → mostrar modal (novo utilizador pós-registo)
          setShow(true);
        }
      } catch {
        if (!cancelled) setShow(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const toggleCondition = (id: string) => {
    setData(prev => {
      const hasNone = prev.none;
      const hasItem = prev.chronic_conditions.includes(id);
      // Se tinha "Nenhuma" selecionada e escolhe uma condição, limpa o "none"
      if (hasNone && !hasItem) {
        return {
          ...prev,
          none: false,
          chronic_conditions: [id],
        };
      }
      return {
        ...prev,
        chronic_conditions: hasItem
          ? prev.chronic_conditions.filter(x => x !== id)
          : [...prev.chronic_conditions, id],
      };
    });
  };

  const toggleNone = () => {
    setData(prev => ({
      ...prev,
      none: !prev.none,
      chronic_conditions: !prev.none ? [] : prev.chronic_conditions,
    }));
  };

  const toggleAllergy = (id: string) => {
    setData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(id)
        ? prev.allergies.filter(x => x !== id)
        : [...prev.allergies, id],
    }));
  };

  const persistProfile = async (opts: { completed: boolean }) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      chronic_conditions: data.none ? [] : data.chronic_conditions,
      blood_type: data.blood_type || null,
      allergies: data.allergies,
      updated_at: new Date().toISOString(),
      ...(opts.completed
        ? { health_onboarding_completed_at: new Date().toISOString() }
        : {}),
    };
    try {
      await supabase.from('patient_profiles').upsert(payload);
    } catch (e) {
      // Tenta sem o campo novo (coluna pode não existir)
      try {
        const { health_onboarding_completed_at, ...rest } = payload;
        await supabase.from('patient_profiles').upsert(rest);
      } catch {
        /* non-blocking */
      }
    }
  };

  const handleFinish = async () => {
    await persistProfile({ completed: true });
    toast.success("Perfil de saúde atualizado! O Meddy vai personalizar as recomendações para ti.");
    setShow(false);
  };

  const handleSkip = async () => {
    // Mesmo quando o utilizador salta, marcamos como "completou" para não voltar a aparecer
    await persistProfile({ completed: true });
    setShow(false);
  };

  const handleLater = async () => {
    // "Mais tarde" — não marca como completou, mas guardamos parcial
    await persistProfile({ completed: false });
    setShow(false);
  };

  // Linha de progresso dinâmica (0→100%)
  const progressPct = useMemo(() => {
    if (step === 0) return 0;
    if (step === 1) return 33;
    if (step === 2) return 66;
    return 100;
  }, [step]);

  if (checking || !show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-6 rounded-[2.5rem] shadow-premium relative overflow-hidden">
          {/* Botão fechar (X) — só esconde, mas marca como visto para não repetir */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              aria-label="Fechar"
              className="h-9 w-9 rounded-full hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Cabeçalho com progresso */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm">Personalização do Meddy</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">
              Passo {step + 1} de 4 · Leva menos de 1 minuto
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* PASSO 0 — Welcome */}
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4 text-center"
              >
                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-black">Olá! Vamos personalizar a tua saúde?</h2>
                <p className="text-sm text-muted-foreground">
                  Estes dados ajudam o Meddy a dar-te recomendações adequadas ao teu perfil.
                  São privados e ficam guardados com segurança.
                </p>
                <Button className="w-full rounded-2xl h-12 font-bold" onClick={() => setStep(1)}>
                  Começar <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={handleLater}>
                  Mais tarde
                </Button>
              </motion.div>
            )}

            {/* PASSO 1 — Condições de Saúde (com opção Nenhuma) */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="font-black text-xl mb-1">Tens algum problema de saúde?</h3>
                  <p className="text-xs text-muted-foreground">
                    Seleciona tudo o que se aplica a ti. Podes mudar depois nas definições.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1 -mr-1">
                  {HEALTH_CONCERNS.map(c => {
                    const selected = !data.none && data.chronic_conditions.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCondition(c.id)}
                        disabled={data.none}
                        className={cn(
                          "p-3 rounded-2xl border-2 transition-all text-left flex items-start gap-2",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-primary/40",
                          data.none && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <span className="text-xl leading-none">{c.icon}</span>
                        <span className="font-bold text-xs leading-tight">{c.label}</span>
                        {selected && (
                          <Check className="h-3.5 w-3.5 text-primary ml-auto flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Opção Nenhuma */}
                <button
                  onClick={toggleNone}
                  className={cn(
                    "w-full p-3 rounded-2xl border-2 transition-all flex items-center gap-3",
                    data.none
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-muted hover:border-emerald-400"
                  )}
                >
                  <div className={cn(
                    "h-6 w-6 rounded-full border-2 flex items-center justify-center",
                    data.none ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                  )}>
                    {data.none && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <span className="font-bold text-sm">Nenhuma — sou saudável</span>
                </button>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-2xl h-11" onClick={() => setStep(0)}>
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 rounded-2xl h-11 font-bold"
                    onClick={() => setStep(2)}
                    disabled={!data.none && data.chronic_conditions.length === 0}
                  >
                    Próximo <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PASSO 2 — Tipo Sanguíneo */}
            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="font-black text-xl mb-1">Qual é o teu tipo de sangue?</h3>
                  <p className="text-xs text-muted-foreground">
                    Essencial para emergências e doações. Se não sabes, podes saltar.
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setData(prev => ({ ...prev, blood_type: type }))}
                      className={cn(
                        "h-12 rounded-xl border-2 font-black transition-all",
                        data.blood_type === type
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted hover:border-primary/40"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setData(prev => ({ ...prev, blood_type: '' }))}
                  className={cn(
                    "w-full text-xs py-2 rounded-lg border",
                    !data.blood_type
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {!data.blood_type
                    ? "Não sei o meu tipo de sangue (vai aparecer como desconhecido)"
                    : "Limpar seleção"}
                </button>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-2xl h-11" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button className="flex-1 rounded-2xl h-11 font-bold" onClick={() => setStep(3)}>
                    Próximo <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* PASSO 3 — Alergias */}
            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="font-black text-xl mb-1">Tens alguma alergia?</h3>
                  <p className="text-xs text-muted-foreground">
                    Importante para prescrições seguras e recomendações de medicamentos.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {ALLERGIES_OPTIONS.map(a => {
                    const selected = data.allergies.includes(a);
                    return (
                      <button
                        key={a}
                        onClick={() => toggleAllergy(a)}
                        className={cn(
                          "px-3 py-2 rounded-full border-2 text-xs font-bold transition-all",
                          selected
                            ? "border-red-400 bg-red-50 text-red-700"
                            : "border-muted hover:border-red-300"
                        )}
                      >
                        {selected && <Check className="inline h-3 w-3 mr-1" />}
                        {a}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setStep(4)}
                  className="w-full text-xs py-2 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Não tenho alergias conhecidas
                </button>

                <Button className="w-full rounded-2xl h-12 font-bold" onClick={handleFinish}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Finalizar Perfil
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-2xl h-11" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
