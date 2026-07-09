import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Activity, AlertTriangle, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

export function HealthProfileOnboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [data, setData] = useState({
    chronic_conditions: [] as string[],
    blood_type: '',
    allergies: [] as string[],
    smoker: false
  });

  useEffect(() => {
    if (!user) return;
    // Verifica se o perfil já está completo
    supabase.from('patient_profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data: profile }) => {
      if (!profile || !profile.blood_type) {
        setShow(true);
      }
    });
  }, [user]);

  const conditions = [
    { id: 'hipertensao', label: 'Hipertensão', icon: '❤️' },
    { id: 'diabetes', label: 'Diabetes', icon: '🍬' },
    { id: 'asma', label: 'Asma/Resp.', icon: '🫁' },
    { id: 'malaria_recente', label: 'Malária Recente', icon: '🦟' }
  ];

  const handleFinish = async () => {
    try {
      const { error } = await supabase.from('patient_profiles').upsert({
        user_id: user?.id,
        chronic_conditions: data.chronic_conditions,
        blood_type: data.blood_type,
        allergies: data.allergies,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      toast.success("Perfil de saúde atualizado! Agora a MedWallet é personalizada para ti.");
      setShow(false);
    } catch (e) {
      toast.error("Erro ao guardar perfil.");
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
        <Card className="p-6 rounded-[2.5rem] shadow-premium relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <Button variant="ghost" size="icon" onClick={() => setShow(false)}><X className="h-5 w-5" /></Button>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 text-primary font-bold mb-1">
              <ShieldCheck className="h-5 w-5" />
              <span>Personalização IA</span>
            </div>
            <Progress value={(step / 3) * 100} className="h-2" />
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4 text-center">
                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-4xl">👋</div>
                <h2 className="text-2xl font-black">Olá! Vamos personalizar a tua saúde?</h2>
                <p className="text-sm text-muted-foreground">Leva 30 segundos e ajuda o Meddy a dar-te as melhores recomendações.</p>
                <Button className="w-full rounded-2xl h-12 font-bold" onClick={() => setStep(1)}>Começar <ChevronRight className="ml-2 h-4 w-4" /></Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <h3 className="font-black text-xl">Tens alguma destas condições?</h3>
                <div className="grid grid-cols-2 gap-3">
                  {conditions.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setData(prev => ({
                        ...prev,
                        chronic_conditions: prev.chronic_conditions.includes(c.id)
                          ? prev.chronic_conditions.filter(x => x !== c.id)
                          : [...prev.chronic_conditions, c.id]
                      }))}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all text-left",
                        data.chronic_conditions.includes(c.id) ? "border-primary bg-primary/5" : "border-muted"
                      )}
                    >
                      <span className="text-2xl mb-2 block">{c.icon}</span>
                      <span className="font-bold text-sm">{c.label}</span>
                    </button>
                  ))}
                </div>
                <Button className="w-full rounded-2xl h-12 font-bold" onClick={() => setStep(2)}>Próximo</Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <h3 className="font-black text-xl">Qual é o teu tipo de sangue?</h3>
                <div className="grid grid-cols-4 gap-2">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                    <button
                      key={type}
                      onClick={() => setData(prev => ({ ...prev, blood_type: type }))}
                      className={cn(
                        "h-12 rounded-xl border-2 font-black transition-all",
                        data.blood_type === type ? "border-primary bg-primary/5 text-primary" : "border-muted"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground text-center">Essencial para casos de emergência e doação de sangue.</p>
                <Button className="w-full rounded-2xl h-12 font-bold" onClick={handleFinish}>Finalizar Perfil</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
