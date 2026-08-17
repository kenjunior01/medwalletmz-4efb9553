import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WalletData {
  balance: number;
  total_deposited: number;
  total_spent: number;
  currency: string;
  country_id?: string | null;
}

const FALLBACK_CURRENCY_BY_COUNTRY: Record<string, string> = {
  MZ: 'MZN', BR: 'BRL', AO: 'AOA', ZA: 'ZAR', PT: 'EUR', IN: 'INR'
};

/** Fetch wallet data — handles auto-creation if missing */
async function fetchWallet(userId: string): Promise<WalletData> {
  // Using 'as any' because types might be outdated regarding renamed balance and added country_id
  const { data } = await (supabase as any)
    .from('wallets')
    .select('balance_mzn, total_deposited, total_spent, currency, country_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    // Ensure wallet exists - now with country_id from profile
    const { data: profile } = await (supabase as any).from('profiles').select('country_id').eq('user_id', userId).maybeSingle();
    const defaultCountry = profile?.country_id || 'MZ';
    const { data: country } = await (supabase as any)
      .from('countries')
      .select('currency_code')
      .eq('id', defaultCountry)
      .maybeSingle();
    const defaultCurrency = country?.currency_code || FALLBACK_CURRENCY_BY_COUNTRY[defaultCountry] || 'USD';

    await (supabase as any).from('wallets').insert({
      user_id: userId,
      country_id: defaultCountry,
      currency: defaultCurrency,
      balance_mzn: 0,
      total_deposited: 0,
      total_spent: 0
    });

    return { balance: 0, total_deposited: 0, total_spent: 0, currency: defaultCurrency, country_id: defaultCountry };
  }

  const currency = data.currency || FALLBACK_CURRENCY_BY_COUNTRY[data.country_id || 'MZ'] || 'USD';
  return {
    balance: Number(data.balance_mzn || 0),
    total_deposited: Number(data.total_deposited || 0),
    total_spent: Number(data.total_spent || 0),
    currency,
    country_id: data.country_id
  };
}

export function useWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => fetchWallet(user!.id),
    enabled: !!user,
    staleTime: 30_000,  // 30s — wallet changes are infrequent
    gcTime: 5 * 60_000,
  });

  // Realtime updates — update cache instead of re-fetching
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`wallet-${user.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (p: any) => {
          const currency = p.new.currency || FALLBACK_CURRENCY_BY_COUNTRY[p.new.country_id || 'MZ'] || 'USD';
          const updated: WalletData = {
            balance: Number(p.new.balance_mzn || 0),
            total_deposited: Number(p.new.total_deposited || 0),
            total_spent: Number(p.new.total_spent || 0),
            currency,
            country_id: p.new.country_id
          };
          // Update React Query cache directly — no refetch needed
          queryClient.setQueryData(['wallet', user.id], updated);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, queryClient]);

  const reload = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const deposit = useCallback(async (amount: number, method?: string) => {
    if (!user) throw new Error('Sem sessão');
    const { data: profile } = await (supabase as any).from('profiles').select('country_id').eq('user_id', user.id).maybeSingle();
    const { data: country } = await (supabase as any).from('countries').select('config').eq('id', profile?.country_id || 'MZ').maybeSingle();
    const preferredMethod = method || country?.config?.payment_methods?.[0]?.id || 'wallet';
    const { data, error } = await (supabase as any).rpc('wallet_deposit', {
      _user_id: user.id, _amount: amount, _method: preferredMethod,
    });
    if (error) throw error;
    await reload();
    return data as any;
  }, [user, reload]);

  const debit = useCallback(async (amount: number, serviceType: string, refId: string, description?: string) => {
    if (!user) throw new Error('Sem sessão');
    const { data, error } = await (supabase as any).rpc('wallet_debit', {
      _user_id: user.id, _amount: amount, _service_type: serviceType, _ref_id: refId,
      _description: description ?? null,
    });
    if (error) throw error;
    await reload();
    return data as any;
  }, [user, reload]);

  return { wallet: query.data ?? null, loading: query.isLoading, reload, deposit, debit };
}
