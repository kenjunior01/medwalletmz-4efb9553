import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles, MapPin, UserCheck } from '@/components/icons/lucide-compat';

const STORAGE_KEY = 'mz_deep_link_data';

interface DeepLinkData {
  ref?: string;
  province?: string;
  campaign?: string;
  role?: string;
  handled: boolean;
}

function parseDeepLinkData(searchParams: URLSearchParams): DeepLinkData {
  return {
    ref: searchParams.get('ref') || undefined,
    province: searchParams.get('province') || undefined,
    campaign: searchParams.get('campaign') || undefined,
    role: searchParams.get('role') || undefined,
    handled: false,
  };
}

async function getReferrerName(code: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('referral_code', code)
      .maybeSingle();
    return data?.full_name || 'um amigo';
  } catch {
    return 'um amigo';
  }
}

function mapRoleToPath(role: string): string {
  const map: Record<string, string> = {
    doctor: '/doctor/register',
    rider: '/driver/register',
    store_owner: '/pharmacy/register',
    pharmacy: '/pharmacy/register',
    clinic: '/clinic/register',
    hospital: '/hospital/register',
    lab: '/lab/register',
    promoter: '/auth',
  };
  return map[role] || '/auth';
}

export function DeepLinkHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [referrerName, setReferrerName] = useState('');
  const [deepLinkData, setDeepLinkData] = useState<DeepLinkData | null>(null);
  const [processed, setProcessed] = useState(false);

  // Check URL params on mount
  const checkDeepLink = useCallback(() => {
    if (processed) return;

    const ref = searchParams.get('ref');
    const province = searchParams.get('province');
    const campaign = searchParams.get('campaign');
    const role = searchParams.get('role');

    if (!ref && !province && !campaign && !role) return;

    const data: DeepLinkData = {
      ref: ref || undefined,
      province: province || undefined,
      campaign: campaign || undefined,
      role: role || undefined,
      handled: false,
    };

    setDeepLinkData(data);

    // Store in localStorage for persistence across auth flow
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    setProcessed(true);
  }, [searchParams, processed]);

  // Process the deep link
  const processDeepLink = useCallback(async (data: DeepLinkData) => {
    if (data.ref) {
      const name = await getReferrerName(data.ref);
      setReferrerName(name);

      if (user) {
        // Logged in: apply referral
        try {
          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('referral_code', data.ref)
            .maybeSingle();

          if (referrerProfile && referrerProfile.user_id !== user.id) {
            const { data: existingRef } = await supabase
              .from('user_referrals')
              .select('id')
              .eq('referred_id', user.id)
              .maybeSingle();

            if (!existingRef) {
              await supabase.from('user_referrals').insert({
                referrer_id: referrerProfile.user_id,
                referred_id: user.id,
                referral_code: data.ref,
                status: 'completed',
              });
            }
          }

          setShowWelcome(true);
          setTimeout(() => setShowWelcome(false), 5000);
        } catch (err) {
          console.error('Error applying referral:', err);
        }

        // Navigate based on role/province
        if (data.role) {
          navigate(mapRoleToPath(data.role));
        } else if (data.province) {
          navigate(`/health/facilities?province=${data.province}`);
        }
      } else {
        // Not logged in: show welcome modal and redirect to auth
        setShowWelcome(true);
      }
    } else if (data.province && !user) {
      // Province deep link without auth
      localStorage.setItem('mz_selected_province', data.province);
      navigate('/auth');
    } else if (data.role && !user) {
      // Role deep link: redirect to auth with role suggestion
      localStorage.setItem('mz_suggested_role', data.role);
      navigate(mapRoleToPath(data.role));
    }

    // Mark as handled
    const updatedData = { ...data, handled: true };
    setDeepLinkData(updatedData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
  }, [user, navigate]);

  // Run on mount
  useEffect(() => {
    // First, check if there's pending data from a previous session
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData) as DeepLinkData;
        if (!parsed.handled) {
          setDeepLinkData(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Then check current URL params
    checkDeepLink();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Process when auth state settles and we have data
  useEffect(() => {
    if (authLoading || !deepLinkData || deepLinkData.handled) return;
    processDeepLink(deepLinkData);
  }, [authLoading, deepLinkData, processDeepLink]);

  const handleGetStarted = () => {
    setShowWelcome(false);
    if (deepLinkData?.ref) {
      if (user) {
        // Already logged in, navigate home
        navigate('/');
      } else {
        // Redirect to auth with referral
        const role = deepLinkData.role;
        if (role) {
          navigate(mapRoleToPath(role));
        } else {
          navigate('/auth');
        }
      }
    }
  };

  const handleGetStartedGoogle = async () => {
    setShowWelcome(false);
    if (deepLinkData?.ref) {
      localStorage.setItem('pending_referral_code', deepLinkData.ref);
      await signInWithGoogle(deepLinkData.ref);
    }
  };

  return (
    <AnimatePresence>
      {showWelcome && deepLinkData?.ref && (
        <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
          <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
            {/* Gradient Header */}
            <div className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-indigo-600 p-8 pb-12 text-white">
              {/* Background orbs */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-indigo-400/20 blur-2xl" />

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', duration: 0.6 }}
                  className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm mx-auto mb-4"
                >
                  <Gift className="h-8 w-8 text-white" />
                </motion.div>

                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-center text-white leading-tight">
                    {deepLinkData.role === 'doctor' ? 'Bem-vindo, Médico!' :
                     deepLinkData.role === 'rider' ? 'Bem-vindo, Rider!' :
                     'Bem-vindo à MedWallet!'}
                  </DialogTitle>
                  <DialogDescription className="text-teal-50 text-center text-sm font-medium mt-2">
                    Foste convidado por <span className="font-bold text-white">{referrerName || 'um amigo'}</span>
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="p-6 -mt-6 space-y-4"
            >
              {/* Bonus Card */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-bold text-amber-800">Bónus de Boas-vindas</p>
                </div>
                <p className="text-xs text-amber-700 font-medium">
                  Tens um bónus de boas-vindas à tua espera! Regista-te para receber créditos na tua carteira.
                </p>
              </div>

              {/* Context badges */}
              {(deepLinkData.province || deepLinkData.role || deepLinkData.campaign) && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {deepLinkData.province && (
                    <div className="flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-bold text-teal-700">
                      <MapPin className="h-3 w-3" />
                      {deepLinkData.province}
                    </div>
                  )}
                  {deepLinkData.role && (
                    <div className="flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
                      <UserCheck className="h-3 w-3" />
                      {deepLinkData.role}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <Button
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-teal-600/20"
                  onClick={handleGetStarted}
                >
                  Começar Agora
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-2 font-bold text-sm"
                  onClick={handleGetStartedGoogle}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continuar com Google
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
