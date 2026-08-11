import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, Phone, ArrowLeft, Sparkles, Heart, ChevronRight, Zap, Globe, Star } from '@/components/icons/lucide-compat';
import { z } from 'zod';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { UserTypeSelector } from '@/components/auth/UserTypeSelector';
// Factory para schemas de validação com mensagens traduzidas
const makeEmailSchema = (t: (k: string) => string) => z.string().email(t('auth.validation_invalid_email'));
const makePasswordSchema = (t: (k: string) => string) => z.string().min(6, t('auth.validation_password_min'));

// Phone validation — aceita formatos MZ (+258 84/85/86/87 XXX XXXX) e BR (+55)
const makePhoneSchema = (t: (k: string) => string) => z.string()
  .min(9, t('auth.validation_phone_min'))
  .refine((v) => {
    const digits = v.replace(/\D/g, '');
    if (digits.length === 9) return /^(84|85|86|87)\d{7}$/.test(digits);
    if (digits.length === 12 && digits.startsWith('258')) return /^258(84|85|86|87)\d{7}$/.test(digits);
    if (digits.length >= 10) return true;
    return false;
  }, t('auth.validation_phone_invalid'));

// Avalia força da senha: 0=fraca, 1=média, 2=forte
function getPasswordStrength(pwd: string): 0 | 1 | 2 {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  if (pwd.length >= 12) score++;
  return score >= 3 ? 2 : score >= 1 ? 1 : 0;
}

const normalizePhone = (v: string) => {
  const digits = v.replace(/\D/g, '');
  if (digits.length === 9 && /^(84|85|86|87)/.test(digits)) {
    return `+258${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('258')) {
    return `+${digits}`;
  }
  return v.trim();
};

// Dynamic background uses CSS .float-orb animation from index.css

// Fundo Dinâmico com Orbs e Mesh
const DynamicBackground = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-primary/5" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="float-orb w-[600px] h-[600px] -top-40 -left-40 bg-primary/10" style={{ animationDelay: '0s' }} />
        <div className="float-orb w-[500px] h-[500px] -bottom-20 -right-20 bg-secondary/10" style={{ animationDelay: '-4s' }} />
        <div className="float-orb w-[300px] h-[300px] top-1/2 left-1/4 bg-accent/10" style={{ animationDelay: '-8s' }} />
      </div>
    </div>
  );
};

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, signInWithGoogle, loading: authLoading } = useAuth();
  const { t, country } = useCountry();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<'patient' | 'health_worker' | 'rider' | 'promoter' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Password strength (0=fraca, 1=média, 2=forte)
  const passwordStrength = useMemo(() => tab === 'register' ? getPasswordStrength(password) : 0, [tab, password]);

  // Schemas memoizados com traduções
  const emailSchema = useMemo(() => makeEmailSchema(t), [t]);
  const passwordSchema = useMemo(() => makePasswordSchema(t), [t]);
  const phoneSchema = useMemo(() => makePhoneSchema(t), [t]);

  const startCooldown = useCallback((seconds: number) => {
    setCooldownRemaining(seconds);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);
  const referralCode = useMemo(() => new URLSearchParams(location.search).get('ref')?.trim() || '', [location.search]);
  const initialTab = useMemo(() => new URLSearchParams(location.search).get('tab'), [location.search]);
  // Security: read nextPath from URL params and validate to prevent open redirect attacks
  const rawNextPath = useMemo(() => new URLSearchParams(location.search).get('next') || '', [location.search]);
  const safeNextPath = useMemo(() => {
    if (!rawNextPath) return null;
    if (!rawNextPath.startsWith('/') || rawNextPath.startsWith('//') || rawNextPath.startsWith('/\\')) return null;
    // Block protocol-relative and absolute URLs (e.g. javascript:, https:, data:)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawNextPath)) return null;
    // Block encoded variants that could bypass the above checks
    if (rawNextPath.includes('%3A') || rawNextPath.includes('%2F%2F')) return null;
    return rawNextPath;
  }, [rawNextPath]);
  const mode = useMemo(() => new URLSearchParams(location.search).get('mode'), [location.search]);

  useEffect(() => {
    if (initialTab === 'register' || initialTab === 'login') {
      setTab(initialTab);
    }
  }, [initialTab]);

  const goAfterAuth = async (userId?: string | null) => {
    try {
      if (!userId) return navigate(safeNextPath || '/register');
      if (safeNextPath) return navigate(safeNextPath);

      // Busca perfil e roles simultaneamente para decisão mais inteligente
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('onboarding_completed').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId)
      ]);

      const hasRoles = rolesRes.data && rolesRes.data.length > 0;
      const onboardingDone = profileRes.data?.onboarding_completed;

      // Se já tem papéis (médico, farmácia, etc), garantimos que o onboarding está OK
      if (hasRoles) {
        if (!onboardingDone) {
          await supabase.from('profiles').update({ onboarding_completed: true }).eq('user_id', userId);
        }
        navigate('/');
        return;
      }

      if (onboardingDone) navigate('/');
      else navigate('/register');
    } catch (error) {
      console.error("Erro no redirecionamento pós-auth:", error);
      navigate('/register');
    }
  };

  const GOOGLE_AUTH_ENABLED = true;
  const handleGoogle = async () => {
    if (cooldownRemaining > 0) return;
    setLoading(true);
    try {
      const { error } = await signInWithGoogle(referralCode, safeNextPath);
      if (error) {
        console.error("Google Auth Error:", error);
        toast.error(t('auth.error_google_title'), {
          description: error.message.includes('configuration')
            ? t('auth.error_google_config')
            : t('auth.error_google_retry'),
        });
        setLoading(false);
      }
    } catch (err) {
      toast.error(t('auth.error_unexpected_login'));
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
      newErrors.fullName = t('auth.validation_name_required');
    }
    if (tab === 'register' && !userType) {
      newErrors.userType = t('userType.validation_required');
    }
    if (tab === 'register') {
      try {
        phoneSchema.parse(phone);
      } catch (e) {
        if (e instanceof z.ZodError) newErrors.phone = e.issues[0].message;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validação em tempo real para limpar erros quando o utilizador corrige
  const validateField = (field: 'email' | 'password' | 'fullName' | 'phone', value: string) => {
    if (!errors[field]) return;
    let valid = true;
    try {
      if (field === 'email') emailSchema.parse(value);
      if (field === 'password') passwordSchema.parse(value);
      if (field === 'fullName') valid = !!value.trim();
      if (field === 'phone') phoneSchema.parse(value);
    } catch {
      valid = false;
    }
    if (valid) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0) return;
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { error, user: signedIn } = await signIn(email, password, referralCode);
      if (error) {
        toast.error(error.message.includes('Invalid login credentials') ? t('auth.invalid_credentials') : t('common.error'));
        // Rate limit: após 3 falhas, inicia cooldown de 30s
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= 3) {
          startCooldown(30);
          toast.error(t('auth.rate_limit_warning'), { description: t('auth.rate_limit_desc') });
        }
      } else {
        setFailedAttempts(0);
        toast.success(t('auth.welcome_back'));
        if (mode === 'professional' || safeNextPath) {
          navigate(safeNextPath || '/register');
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
      const { error } = await signUp(email, password, fullName, referralCode, country?.id, normalizePhone(phone), userType ?? undefined);
      if (error) {
        toast.error(error.message.includes('already registered') ? t('auth.email_registered') : t('common.error'));
      } else {
        toast.success(t('auth.account_created'));
        // Redirect based on selected user type
        if (userType === 'rider') {
          navigate('/health/riders');
        } else if (userType === 'health_worker') {
          navigate('/health/workers/profile');
        } else if (userType === 'promoter') {
          navigate('/referrals');
        } else {
          navigate(safeNextPath || '/register');
        }
      }
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-background px-6"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">{t('auth.checking_session_aria')}</span>
        <div className="relative animate-fade-in" aria-hidden="true">
          <div className="h-16 w-16 rounded-3xl bg-primary/20 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 text-secondary h-6 w-6 animate-pulse" />
        </div>
        <p className="mt-4 font-black text-primary animate-pulse tracking-widest uppercase text-xs">{t('auth.checking_session')}</p>
        {/* Skeleton espelha o layout do card de auth para sensação de continuidade */}
        <div className="mt-8 w-full max-w-md" aria-hidden="true">
          <div className="rounded-[2rem] border bg-card p-8 space-y-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-background flex flex-col font-sans selection:bg-primary/20">
      <DynamicBackground />

      <div className="relative z-10 p-6 flex justify-between items-center animate-fade-in">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          aria-label={t('auth.back_aria')}
          className="rounded-2xl bg-white/50 dark:bg-card/50 backdrop-blur-md hover:bg-white/70 dark:hover:bg-card/70 transition-all shadow-sm group min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
        </Button>
        <div className="flex items-center gap-2 bg-white/50 dark:bg-card/50 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm min-h-[44px]">
          <Globe className="h-4 w-4 text-secondary" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-wider">{country?.name || 'MedWallet'}</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 pb-20 animate-fade-in">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-10">
            <div className="w-24 h-24 bg-gradient-to-br from-primary via-primary/90 to-secondary rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-premium relative group cursor-pointer active:scale-95 transition-transform">
              <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity" />
              <Sparkles className="h-12 w-12 text-white" />
              <div className="absolute -top-2 -right-2 bg-secondary text-white p-1.5 rounded-full shadow-lg animate-pulse">
                <Heart className="h-4 w-4 fill-current" />
              </div>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-foreground mb-3 flex items-center justify-center gap-0.5">
              <span>Med</span>
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Wallet</span>
            </h1>
            <p className="text-muted-foreground font-bold flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-[10px]">
              {t('auth.tagline')} <Star className="h-3 w-3 text-gold fill-gold" aria-hidden="true" />
            </p>
            <p className="text-xs font-bold text-primary/60 uppercase tracking-[0.3em]">
              {t('auth.text_morph_health')}
            </p>
          </div>

          <div
            className="glass-card p-1 border-white/40 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]"
          >
            <div className="bg-white/40 dark:bg-card/40 backdrop-blur-xl rounded-[calc(var(--radius)-4px)] p-8 relative overflow-hidden">
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

                <div key={tab} className="animate-fade-in">
                    {GOOGLE_AUTH_ENABLED && (
                      <>
                        <Button
                          onClick={handleGoogle}
                          disabled={loading || cooldownRemaining > 0}
                          variant="outline"
                          aria-label={t('auth.continue_with_google')}
                          className="w-full h-12 rounded-2xl font-black mb-4 flex items-center justify-center gap-3 border-2 border-white/30 min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.4 0 10.3-2 14-5.4l-6.5-5.3C29.5 34.9 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.5 5.3C41.7 35.1 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
                          {t('auth.continue_with_google')}
                        </Button>
                        <div className="mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-muted-foreground" role="separator" aria-orientation="horizontal">
                          <span className="flex-1 h-px bg-border" aria-hidden="true" /> {t('auth.or_divider')} <span className="flex-1 h-px bg-border" aria-hidden="true" />
                        </div>
                      </>
                    )}

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
                            <button type="button" onClick={() => navigate('/auth/forgot-password')} className="text-[10px] font-black text-secondary hover:underline uppercase tracking-tighter">{t('auth.forgot_password')}</button>
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
                          <Label htmlFor="phone" className="font-black text-[10px] uppercase tracking-widest text-primary/60 ml-2">
                            Celular (WhatsApp)
                          </Label>
                          <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="phone"
                              type="tel"
                              inputMode="tel"
                              placeholder={country?.id === 'BR' ? '(11) 99999-9999' : '+258 84 XXX XXXX'}
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-primary/30 transition-all bg-white shadow-sm font-medium"
                            />
                          </div>
                          {errors.phone && <p className="text-[10px] text-destructive font-black ml-2 uppercase animate-bounce-in">{errors.phone}</p>}
                          {!errors.phone && (
                            <p className="text-[10px] text-muted-foreground ml-2">
                              Usamos para confirmações por WhatsApp e recuperação de conta
                            </p>
                          )}
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

                        <UserTypeSelector value={userType} onChange={(ut) => { setUserType(ut); if (errors.userType) setErrors(prev => { const c = { ...prev }; delete c.userType; return c; }); }} />
                        {errors.userType && <p className="text-[10px] text-destructive font-black ml-2 uppercase animate-bounce-in">{errors.userType}</p>}

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
                  </div>
              </Tabs>
            </div>
          </div>

          {referralCode && (
            <div className="mt-6 p-5 rounded-[2rem] bg-secondary/10 border-2 border-secondary/20 text-center backdrop-blur-md animate-fade-in">
              <p className="text-xs font-black text-secondary flex items-center justify-center gap-3 uppercase tracking-wider">
                <Zap className="h-4 w-4 fill-current" /> {t('auth.invite_activated')}: <span className="bg-secondary text-white px-3 py-1 rounded-full">{referralCode}</span>
              </p>
            </div>
          )}

          <p className="text-center text-[9px] text-muted-foreground mt-10 px-10 leading-relaxed font-black uppercase tracking-[0.15em] opacity-60">
            Ao acessar, concordas com os Termos e Privacidade da plataforma.
            <br />
            MedWallet MZ © {new Date().getFullYear()} — Feito com <Heart className="h-2 w-2 inline text-destructive fill-current" /> em Moçambique.
          </p>
        </div>
      </div>
    </div>
  );
}
