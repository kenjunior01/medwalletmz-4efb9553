import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WalletData {
  balance: number;
  total_deposited: number;
  total_spent: number;
  currency: string;
}

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    // Using 'as any' because types might be outdated regarding renamed balance and added country_id
    const { data } = await supabase
      .from('wallets')
      .select('balance, total_deposited, total_spent, currency, country_id' as any)
      .eq('user_id', user.id)
      .maybeSingle() as any;

    if (!data) {
      // Ensure wallet exists - now with country_id from profile
      const { data: profile } = await supabase.from('profiles').select('country_id' as any).eq('user_id', user.id).single() as any;

      const defaultCountry = profile?.country_id || 'MZ';
      const defaultCurrency = defaultCountry === 'MZ' ? 'MZN' : defaultCountry === 'BR' ? 'BRL' : 'USD';

      await supabase.from('wallets').insert({
        user_id: user.id,
        country_id: defaultCountry,
        currency: defaultCurrency,
        balance: 0,
        total_deposited: 0,
        total_spent: 0
      } as any).select().maybeSingle();

      setWallet({ balance: 0, total_deposited: 0, total_spent: 0, currency: defaultCurrency });
    } else {
      setWallet({
        balance: Number(data.balance || data.balance_mzn || 0),
        total_deposited: Number(data.total_deposited || 0),
        total_spent: Number(data.total_spent || 0),
        currency: data.currency || 'MZN'
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`wallet-${user.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (p: any) => {
          setWallet({
            balance: Number(p.new.balance || p.new.balance_mzn || 0),
            total_deposited: Number(p.new.total_deposited || 0),
            total_spent: Number(p.new.total_spent || 0),
            currency: p.new.currency || 'MZN'
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const deposit = async (amount: number, method?: string) => {
    if (!user) throw new Error('Sem sessão');

    // Auto-select best method if none provided
    const { data: profile } = await supabase.from('profiles').select('country_id' as any).eq('user_id', user.id).single() as any;
    const { data: country } = await supabase.from('countries' as any).select('config').eq('id', profile?.country_id).single() as any;

    const preferredMethod = method || country?.config?.payments?.[0] || 'card';

    const { data, error } = await supabase.rpc('wallet_deposit', {
      _user_id: user.id, _amount: amount, _method: preferredMethod,
    });
    if (error) throw error;
    await load();
    return data as any;
  };

  const debit = async (amount: number, serviceType: string, refId: string, description?: string) => {
    if (!user) throw new Error('Sem sessão');
    const { data, error } = await supabase.rpc('wallet_debit', {
      _user_id: user.id, _amount: amount, _service_type: serviceType, _ref_id: refId,
      _description: description ?? null,
    });
    if (error) throw error;
    await load();
    return data as any;
  };

  return { wallet, loading, reload: load, deposit, debit };
}
