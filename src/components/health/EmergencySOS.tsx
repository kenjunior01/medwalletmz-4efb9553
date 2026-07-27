import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Phone, MapPin, Share2, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const COUNTDOWN_SECONDS = 5;

export function EmergencySOS() {
  const [isOpen, setIsOpen] = useState(false);
  const { coordinates, city } = useLocation();
  const { user } = useAuth();
  const { country, t } = useCountry();
  const [profile, setProfile] = useState<any>(null);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emergencyNumber = country?.config?.emergency_number || '112';

  useEffect(() => {
    if (user) {
      supabase.from('patient_profiles').select('*, profiles(full_name, phone)').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setProfile(data));
    }
  }, [user]);

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  }, []);

  // Watch for countdown reaching 0 to trigger SOS
  useEffect(() => {
    if (countdown === 0) {
      setCountdown(null);
      handleSOS();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const handleSOS = async () => {
    setIsSending(true);
    toast.loading(t('sos.sending_alert'), { id: 'sos-toast' });

    const alertData = {
      user_id: user?.id,
      location: coordinates,
      city: city,
      blood_type: profile?.blood_type,
      chronic_conditions: profile?.chronic_conditions,
      timestamp: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.functions.invoke('emergency-sos', {
        body: alertData,
      });

      if (error) throw error;

      toast.success(t('sos.alert_sent'), { id: 'sos-toast' });
      setIsSending(false);
      setIsOpen(false);

      // Auto-call emergency number after successful SOS
      window.location.href = `tel:${emergencyNumber}`;
    } catch (err: any) {
      toast.error(t('sos.alert_error') + (err?.message || 'Unknown error'), { id: 'sos-toast' });
      setIsSending(false);
    }
  };

  const shareLocation = async () => {
    if (!coordinates) return;

    const url = `https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: t('sos.my_location'),
          text: t('sos.share_text', { city: city || '' }),
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t('sos.location_copied'));
      }
    } catch (err: any) {
      // User cancelled share dialog — ignore
      if (err?.name !== 'AbortError') {
        await navigator.clipboard.writeText(url);
        toast.success(t('sos.location_copied'));
      }
    }
  };

  return (
    <>
      {/* Floating SOS Button — bottom-right, above BottomNav (80px) with safe-area */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label={`${t('sos.button_label')} — ${t('sos.subtitle')}`}
        className={`fixed right-4 fab-safe-bottom-lg z-40 h-14 w-14 rounded-full bg-destructive text-white shadow-premium flex items-center justify-center border-4 border-white dark:border-slate-900 no-tap-target ${
          isOpen ? 'animate-sos-pulse-glow' : ''
        }`}
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
                    <h2 className="text-3xl font-black text-destructive">{t('sos.button_label')}</h2>
                    <p className="text-sm font-bold text-muted-foreground">{t('sos.subtitle')}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { cancelCountdown(); setIsOpen(false); }}><X /></Button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-destructive/5 p-4 rounded-2xl border border-destructive/10">
                    <div className="flex items-center gap-3 text-destructive font-black mb-2">
                      <MapPin className="h-5 w-5" /> {t('sos.location_title')}
                    </div>
                    <p className="text-sm font-medium">
                      {city || t('sos.locating')}{' '}
                      {coordinates ? `(${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)})` : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">{t('sos.blood_label')}</p>
                      <p className="text-lg font-black">{profile?.blood_type || 'N/A'}</p>
                    </div>
                    <div className="bg-muted/40 p-3 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">{t('sos.conditions_label')}</p>
                      <p className="text-xs font-bold truncate">
                        {profile?.chronic_conditions?.join(', ') || t('sos.none')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {/* Countdown overlay */}
                  {countdown !== null ? (
                    <div className="relative flex flex-col items-center gap-3">
                      {/* Pulsing countdown ring */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <motion.div
                          key={countdown}
                          initial={{ scale: 0.8, opacity: 0.6 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="w-20 h-20 rounded-full bg-destructive/30"
                        />
                      </div>
                      <div className="text-6xl font-black text-destructive tabular-nums drop-shadow-lg">
                        {countdown}
                      </div>
                      <Button
                        size="lg"
                        variant="destructive"
                        className="h-14 rounded-2xl text-lg font-black w-full"
                        onClick={cancelCountdown}
                      >
                        {t('sos.cancel_countdown')}
                      </Button>
                    </div>
                  ) : isSending ? (
                    <Button
                      size="lg"
                      disabled
                      className="h-20 rounded-2xl bg-destructive text-white text-xl font-black shadow-lg opacity-70"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="mr-3"
                      >
                        <AlertCircle className="h-6 w-6" />
                      </motion.div>
                      {t('sos.sending_alert')}
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="h-20 rounded-2xl bg-destructive hover:bg-destructive/90 text-white text-xl font-black shadow-lg"
                      onClick={startCountdown}
                    >
                      {t('sos.activate_button')}
                    </Button>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold gap-2" asChild>
                      <a href={`tel:${emergencyNumber}`}>
                        <Phone className="h-5 w-5" /> {t('sos.call_button', { number: emergencyNumber })}
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-14 rounded-2xl font-bold gap-2"
                      onClick={shareLocation}
                    >
                      <Share2 className="h-5 w-5" /> {t('sos.share_location')}
                    </Button>
                  </div>
                </div>

                <p className="text-center text-[10px] text-muted-foreground mt-6 uppercase tracking-widest font-bold">
                  {t('sos.system_label')} 🛡️
                </p>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
