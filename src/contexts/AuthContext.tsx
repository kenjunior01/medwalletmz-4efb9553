import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'customer' | 'store_owner' | 'driver' | 'admin' | 'doctor' | 'clinic';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: Error | null; user: User | null }>;
  signIn: (email: string, password: string, referralCode?: string) => Promise<{ error: Error | null; user: User | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRoles = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (!error && data) {
      setRoles(data.map(r => r.role as AppRole));
    } else {
      setRoles([]);
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    if (user) await fetchUserRoles(user.id);
  }, [fetchUserRoles, user]);

  const applyReferralCode = useCallback(async (referralCode: string, referredId: string) => {
    const normalizedCode = referralCode?.trim();
    if (!normalizedCode || !referredId) return;

    // Wait a bit for the database trigger handle_new_user to create the profile
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('referral_code', normalizedCode)
      .maybeSingle();

    const referrerId = referrerProfile?.user_id;
    if (!referrerId || referrerId === referredId) return;

    const { data: existingReferral } = await supabase
      .from('user_referrals')
      .select('id')
      .eq('referred_id', referredId)
      .maybeSingle();

    if (existingReferral) return;

    const { error } = await supabase.from('user_referrals').insert({
      referrer_id: referrerId,
      referred_id: referredId,
      referral_code: normalizedCode,
      status: 'completed',
    });

    if (error) {
      console.error('Erro a aplicar convite:', error);
    } else {
      console.log('Convite aplicado com sucesso');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    let roleRequest = 0;

    const loadRoles = async (nextUser: User | null) => {
      const requestId = ++roleRequest;
      if (!nextUser) {
        if (mounted && requestId === roleRequest) setRoles([]);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', nextUser.id);

      if (!mounted || requestId !== roleRequest) return;
      setRoles(!error && data ? data.map(r => r.role as AppRole) : []);
    };

    // Set up auth state listener FIRST, without awaiting backend calls in the callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        // Só faz sentido reiniciar loading em SIGN_IN / SIGN_OUT — não em token refresh
        // (senão as páginas admin voltam ao skeleton a cada ~50min)
        if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'USER_UPDATED') {
          void loadRoles(session?.user ?? null);
        }
      }
    );

    // THEN check for existing session
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      await loadRoles(session?.user ?? null);

      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
    });

    if (!error && data.user && referralCode) {
      await applyReferralCode(referralCode, data.user.id);
    }

    return { error: error as Error | null, user: data.user as User | null };
  };

  const signIn = async (email: string, password: string, referralCode?: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error && data.user && referralCode) {
      await applyReferralCode(referralCode, data.user.id);
    }

    return { error: error as Error | null, user: data.user as User | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
  };

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  return (
    <AuthContext.Provider value={{
      user, session, roles, loading,
      signUp, signIn, signOut, hasRole,
      refreshRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
