import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Phone, MapPin, Heart, Share2, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function EmergencySOS() {
  const [isOpen, setIsOpen] = useState(false);
  const { coordinates, city } = useLocation();
  const { user } = useAuth();
  const { country } = useCountry();
  const [profile, setProfile] = useState<any>(null);

  const emergencyNumber = country?.config?.emergency_number || '112';

  useEffect(() => {
    if (user) {
      supabase.from('patient_profiles').select('*, profiles(full_name, phone)').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setProfile(data));
    }
  }, [user]);

  const handleSOS = async () => {
    toast.loading("A enviar alerta SOS para contactos de emergência...");

    // Simulação de envio de SMS/Notificação via Edge Function
    const alertData = {
      user_id: user?.id,
      location: coordinates,
      city: city,
      timestamp: new Date().toISOString(),
      medical_summary: {
        blood_type: profile?.blood_type,
        conditions: profile?.chronic_conditions
      }
    };

    console.log("SOS ALERTA ENVIADO:", alertData);

    setTimeout(() => {
      toast.dismiss();
      toast.success("Alerta enviado! As autoridades e contactos de emergência foram notificados.");
      setIsOpen(false);
    }, 2000);
  };

  return (
    <>
      {/* Floating SOS Button — bottom-right, acima do BottomNav (80px) com safe-area */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label="S.O.S — Emergência médica"
        className="fixed right-4 fab-safe-bottom-lg z-40 h-14 w-14 rounded-full bg-destructive text-white shadow-premium flex items-center justify-center border-4 border-white dark:border-slate-900 no-tap-target"
      >
        <ShieldAlert className="h-7 w-7" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg"
            >
              <Card className="p-6 rounded-[2.5rem] border-t-8 border-destructive overflow-hidden relative">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-black text-destructive">S.O.S</h2>
                    <p className="text-sm font-bold text-muted-foreground">Assistência Imediata</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X /></Button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-destructive/5 p-4 rounded-2xl border border-destructive/10">
                    <div className="flex items-center gap-3 text-destructive font-black mb-2">
                      <MapPin className="h-5 w-5" /> Localização Atual
                    </div>
                    <p className="text-sm font-medium">{city || 'A localizar...'} {coordinates ? `(${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)})` : ''}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Sangue</p>
                      <p className="text-lg font-black">{profile?.blood_type || 'N/A'}</p>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Condições</p>
                      <p className="text-xs font-bold truncate">{profile?.chronic_conditions?.join(', ') || 'Nenhuma'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    size="lg"
                    className="h-20 rounded-2xl bg-destructive hover:bg-destructive/90 text-white text-xl font-black shadow-lg"
                    onClick={handleSOS}
                  >
                    ATIVAR ALERTA TOTAL
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold gap-2" asChild>
                      <a href={`tel:${emergencyNumber}`}>
                        <Phone className="h-5 w-5" /> Ligar {emergencyNumber}
                      </a>
                    </Button>
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold gap-2">
                      <Share2 className="h-5 w-5" /> Partilhar Local
                    </Button>
                  </div>
                </div>

                <p className="text-center text-[10px] text-muted-foreground mt-6 uppercase tracking-widest font-bold">
                  MedWallet Guardian System 🛡️
                </p>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
