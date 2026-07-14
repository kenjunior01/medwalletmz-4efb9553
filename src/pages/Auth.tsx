import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, ArrowLeft, Sparkles, Heart, Pill, Stethoscope, Activity, ShieldCheck, ChevronRight, Zap, Globe, Star } from 'lucide-react';
import { z } from 'zod';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCountry } from '@/contexts/CountryContext';
import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter pelo menos 6 caracteres');

// Componente para Stickers flutuantes com efeito de paralaxe
const FloatingSticker = ({ icon: Icon, delay = 0, className = "", color = "bg-white" }: { icon: any, delay?: number, className?: string, color?: string }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(useTransform(mouseX, [-0.5, 0.5], [-30, 30]), springConfig);
  const y = useSpring(useTransform(mouseY, [-0.5, 0.5], [-30, 30]), springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) - 0.5);
      mouseY.set((e.clientY / window.innerHeight) - 0.5);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0, rotate: -20 }}
      animate={{
        opacity: 1,
        scale: 1,
        rotate: [0, 5, -5, 0],
        y: [0, -10, 0]
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { type: "spring", delay },
        rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" },
        y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
      }}
      className={cn("absolute pointer-events-none hidden md:flex items-center justify-center p-4 rounded-2xl shadow-premium border-4 border-white", color, className)}
    >
      <Icon size={32} className="text-primary" strokeWidth={2.5} />
      <div className="absolute -bottom-1 -right-1">
        <Sparkles size={16} className="text-secondary fill-secondary" />
      </div>
    </motion.div>
  );
};

// Fundo Dinâmico com Orbs e Mesh
const DynamicBackground = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-primary/5" />

      {/* Mesh Gradient Animado */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[20%] -left-[10%] w-[120%] h-[120%] opacity-30"
        style={{
          background: `radial-gradient(circle at 20% 30%, hsl(var(--secondary) / 0.4) 0%, transparent 40%),
                       radial-gradient(circle at 80% 70%, hsl(var(--primary) / 0.3) 0%, transparent 40%),
                       radial-gradient(circle at 50% 50%, hsl(var(--accent) / 0.2) 0%, transparent 50%)`
        }}
      />

      {/* Orbs interativos */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="float-orb w-[600px] h-[600px] -top-40 -left-40 bg-primary/10" style={{ animationDelay: '0s' }} />
        <div className="float-orb w-[500px] h-[500px] -bottom-20 -right-20 bg-secondary/10" style={{ animationDelay: '-4s' }} />
        <div className="float-orb w-[300px] h-[300px] top-1/2 left-1/4 bg-accent/10" style={{ animationDelay: '-8s' }} />
      </div>

      {/* Stickers Decorativos */}
      <FloatingSticker icon={Heart} className="top-[15%] left-[8%] -rotate-12" delay={0.1} />
      <FloatingSticker icon={Pill} className="top-[60%] left-[12%] rotate-12" delay={0.3} color="bg-emerald-50" />
      <FloatingSticker icon={Stethoscope} className="top-[20%] right-[10%] rotate-6" delay={0.5} color="bg-blue-50" />
      <FloatingSticker icon={Activity} className="top-[70%] right-[15%] -rotate-6" delay={0.7} color="bg-rose-50" />
      <FloatingSticker icon={ShieldCheck} className="bottom-[15%] left-[40%] rotate-3" delay={0.9} color="bg-amber-50" />
      <FloatingSticker icon={Zap} className="top-[40%] right-[5%] -rotate-12" delay={1.1} color="bg-yellow-50" />
    </div>
  );
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const { t, country } = useCountry();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const referralCode = useMemo(() => new URLSearchParams(location.search).get('ref')?.trim() || '', [location.search]);

  const goAfterAuth = async (userId?: string | null) => {
    try {
      if (!userId) return navigate('/register');
      const { data } = await supabase.from('profiles')
        .select('onboarding_completed')
        .eq('user_id', userId)
        .maybeSingle();
      if (data?.onboarding_completed) navigate('/');
      else navigate('/register');
    } catch {
      navigate('/register');
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
      if (result.error) {
        toast.error(result.error.message || 'Erro ao entrar com Google');
      }
      if (result.redirected) return;
      await goAfterAuth(user?.id);
    } catch (err: any) {
      toast.error(err?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      void goAfterAuth(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.issues[0].message;
    }
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.password = e.issues[0].message;
    }
    if (tab === 'register' && !fullName.trim()) {
      newErrors.fullName = 'Nome é obrigatório';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { error, user: signedIn } = await signIn(email, password, referralCode);
      if (error) {
        toast.error(error.message.includes('Invalid login credentials') ? t('auth.invalid_credentials') : t('common.error'));
      } else {
        toast.success(t('auth.welcome_back'));
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.get('mode') === 'professional') {
          navigate('/register');
        } else {
          await goAfterAuth(signedIn?.id);
        }
      }
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { error } = await signUp(email, password, fullName, referralCode, country?.id);
      if (error) {
        toast.error(error.message.includes('already registered') ? t('auth.email_registered') : t('common.error'));
      } else {
        toast.success(t('auth.account_created'));
        // Redireciona sempre para seleção de perfil após novo registo
        navigate('/register');
      }
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <div className="h-16 w-16 rounded-3xl bg-primary/20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 text-secondary h-6 w-6 animate-pulse" />
        </motion.div>
        <p className="mt-4 font-black text-primary animate-pulse tracking-widest uppercase text-xs">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-background flex flex-col font-sans selection:bg-primary/20">
      <DynamicBackground />

      {/* Header Interativo */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-6 flex justify-between items-center"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="rounded-2xl bg-white/50 backdrop-blur-md hover:bg-white transition-all shadow-sm group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
        </Button>
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm">
          <Globe className="h-4 w-4 text-secondary" />
          <span className="text-[10px] font-black uppercase tracking-wider">{country?.name || 'MedWallet'}</span>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 pb-20">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="w-full max-w-md"
        >
          {/* Logo Premium */}
          <div className="text-center mb-10">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.15, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="w-24 h-24 bg-gradient-to-br from-primary via-primary/90 to-secondary rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-premium relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity" />
              <Sparkles className="h-12 w-12 text-white" />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2 bg-secondary text-white p-1.5 rounded-full shadow-lg"
              >
                <Heart className="h-4 w-4 fill-current" />
              </motion.div>
            </motion.div>
            <h1 className="text-5xl font-black tracking-tighter text-foreground mb-3 flex items-center justify-center gap-2">
              Med<span className="text-secondary">Wallet</span>
            </h1>
            <p className="text-muted-foreground font-bold flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-[10px]">
              A tua revolução na saúde <Star className="h-3 w-3 text-gold fill-gold" />
            </p>
          </div>

          {/* Auth Card com Vidro Reforçado */}
          <motion.div
            layout
            className="glass-card p-1 border-white/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]"
          >
            <div className="bg-white/40 backdrop-blur-xl rounded-[calc(var(--radius)-4px)] p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-shimmer" />

              <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-10 p-1.5 bg-primary/5 rounded-2xl">
                  <TabsTrigger
                    value="login"
                    className="rounded-xl font-black transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg py-3"
                  >
                    {t('auth.login')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-xl font-black transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg py-3"
                  >
                    {t('auth.register')}
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogle}
                      disabled={loading}
                      className="w-full h-12 rounded-2xl font-black mb-4 border-2 bg-white hover:bg-slate-50 flex items-center justify-center gap-3"
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2 14-5.4l-6.5-5.3C29.5 34.9 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.3C41.7 35.1 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
                      Continuar com Google
                    </Button>
                    <div className="mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      <span className="flex-1 h-px bg-border" /> ou <span className="flex-1 h-px bg-border" />
                    </div>

                    {tab === 'login' ? (
                      <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="font-black text-[10px] uppercase tracking-widest text-primary/60 ml-2">{t('auth.email_address')}</Label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="email"
                              type="email"
                              placeholder={country?.id === 'BR' ? 'exemplo@medwallet.com.br' : 'exemplo@medwallet.co.mz'}
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-primary/30 transition-all bg-white shadow-sm font-medium"
                            />
                          </div>
                          {errors.email && <p className="text-[10px] text-destructive font-black ml-2 uppercase animate-bounce-in">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-2">
                            <Label htmlFor="password" className="font-black text-[10px] uppercase tracking-widest text-primary/60">{t('auth.password')}</Label>
                            <button type="button" className="text-[10px] font-black text-secondary hover:underline uppercase tracking-tighter">{t('auth.forgot_password')}</button>
                          </div>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="password"
                              type="password"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-primary/30 transition-all bg-white shadow-sm font-medium"
                            />
                          </div>
                          {errors.password && <p className="text-[10px] text-destructive font-black ml-2 uppercase animate-bounce-in">{errors.password}</p>}
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-14 rounded-2xl font-black text-lg shadow-premium hover:shadow-primary/30 transition-all bg-primary hover:bg-primary/95 group relative overflow-hidden"
                          disabled={loading}
                        >
                          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="flex items-center gap-3 relative z-10">{t('auth.access_wallet')} <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></span>}
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={handleRegister} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="fullName" className="font-black text-[10px] uppercase tracking-widest text-primary/60 ml-2">{t('auth.full_name')}</Label>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="fullName"
                              type="text"
                              placeholder="Como gostarias de ser chamado?"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-primary/30 transition-all bg-white shadow-sm font-medium"
                            />
                          </div>
                          {errors.fullName && <p className="text-[10px] text-destructive font-black ml-2 uppercase animate-bounce-in">{errors.fullName}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="registerEmail" className="font-black text-[10px] uppercase tracking-widest text-primary/60 ml-2">{t('auth.best_email')}</Label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="registerEmail"
                              type="email"
                              placeholder={country?.id === 'BR' ? 'exemplo@medwallet.com.br' : 'exemplo@medwallet.co.mz'}
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-primary/30 transition-all bg-white shadow-sm font-medium"
                            />
                          </div>
                          {errors.email && <p className="text-[10px] text-destructive font-black ml-2 uppercase animate-bounce-in">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="registerPassword" className="font-black text-[10px] uppercase tracking-widest text-primary/60 ml-2">{t('auth.strong_password')}</Label>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="registerPassword"
                              type="password"
                              placeholder="Mínimo 6 caracteres"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-primary/30 transition-all bg-white shadow-sm font-medium"
                            />
                          </div>
                          {errors.password && <p className="text-[10px] text-destructive font-black ml-2 uppercase animate-bounce-in">{errors.password}</p>}
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-14 rounded-2xl font-black text-lg shadow-premium hover:shadow-primary/30 transition-all bg-primary hover:bg-primary/95 group relative overflow-hidden"
                          disabled={loading}
                        >
                          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="flex items-center gap-3 relative z-10">{t('auth.create_account')} <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></span>}
                        </Button>
                      </form>
                    )}
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </div>
          </motion.div>

          {referralCode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 rounded-[2rem] bg-secondary/10 border-2 border-secondary/20 text-center backdrop-blur-md"
            >
              <p className="text-xs font-black text-secondary flex items-center justify-center gap-3 uppercase tracking-wider">
                <Zap className="h-4 w-4 fill-current" /> {t('auth.invite_activated')}: <span className="bg-secondary text-white px-3 py-1 rounded-full">{referralCode}</span>
              </p>
            </motion.div>
          )}

          <p className="text-center text-[9px] text-muted-foreground mt-10 px-10 leading-relaxed font-black uppercase tracking-[0.15em] opacity-60">
            Ao acessar, concordas com os Termos e Privacidade da plataforma.
            <br />
            MedWallet MZ © {new Date().getFullYear()} — Feito com <Heart className="h-2 w-2 inline text-destructive fill-current" /> em Moçambique.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
