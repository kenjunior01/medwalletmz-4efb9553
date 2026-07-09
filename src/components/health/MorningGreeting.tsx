import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, X, Bell, Coffee, Heart, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function MorningGreeting() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      const hasSeenToday = localStorage.getItem(`morning_greet_${new Date().toDateString()}`);

      // Show between 5am and 11am if not seen today
      if (hour >= 5 && hour < 11 && !hasSeenToday) {
        setShow(true);
      }
    };

    if (user) {
      supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        setProfile(data);
        checkTime();
      });
    }
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(`morning_greet_${new Date().toDateString()}`, 'true');
    setShow(false);
  };

  if (!show) return null;

  const firstName = profile?.full_name?.split(' ')[0] || 'Amigo';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-x-4 top-20 z-[60]"
      >
        <Card className="p-5 border-2 border-primary/20 shadow-premium gradient-mesh overflow-hidden">
          <div className="absolute top-0 right-0 p-2">
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={dismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 animate-bounce">
              <Sun className="h-7 w-7 text-amber-600" />
            </div>

            <div className="flex-1">
              <h3 className="font-black text-lg leading-tight">Bom dia, {firstName}! 🇲🇿</h3>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                Hoje em Maputo está um dia ideal para focar na tua saúde.
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/5 p-2 rounded-lg">
                  <Coffee className="h-3 w-3" />
                  Dica: Bebe água morna com limão para despertar o metabolismo.
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50/50 p-2 rounded-lg">
                  <Heart className="h-3 w-3" />
                  Lembrete: Já verificaste a tua tensão arterial esta semana?
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button size="sm" className="flex-1 rounded-xl h-10 font-bold" onClick={() => { dismiss(); /* Navigate to triage or similar */ }}>
                  <Bell className="h-3.5 w-3.5 mr-1.5" /> Ativar Alertas
                </Button>
                <Button size="sm" variant="outline" className="flex-1 rounded-xl h-10 font-bold" onClick={dismiss}>
                  Entendido
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
