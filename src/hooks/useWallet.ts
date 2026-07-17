import { useEffect, useState, useCallback } from 'react';
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

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    // Using 'as any' because types might be outdated regarding renamed balance and added country_id
    const { data } = await (supabase as any)
      .from('wallets')
      .select('balance_mzn, total_deposited, total_spent, currency, country_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) {
      // Ensure wallet exists - now with country_id from profile
      const { data: profile } = await (supabase as any).from('profiles').select('country_id').eq('user_id', user.id).maybeSingle();

      const defaultCountry = profile?.country_id || 'MZ';
      const { data: country } = await (supabase as any)
        .from('countries')
        .select('currency_code')
        .eq('id', defaultCountry)
        .maybeSingle();
      const defaultCurrency = country?.currency_code || FALLBACK_CURRENCY_BY_COUNTRY[defaultCountry] || 'USD';

      await (supabase as any).from('wallets').insert({
        user_id: user.id,
        country_id: defaultCountry,
        currency: defaultCurrency,
        balance_mzn: 0,
        total_deposited: 0,
        total_spent: 0
      });

      setWallet({ balance: 0, total_deposited: 0, total_spent: 0, currency: defaultCurrency, country_id: defaultCountry });
    } else {
      const currency = data.currency || FALLBACK_CURRENCY_BY_COUNTRY[data.country_id || 'MZ'] || 'USD';
      setWallet({
        balance: Number(data.balance_mzn || 0),
        total_deposited: Number(data.total_deposited || 0),
        total_spent: Number(data.total_spent || 0),
        currency,
        country_id: data.country_id
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
          const currency = p.new.currency || FALLBACK_CURRENCY_BY_COUNTRY[p.new.country_id || 'MZ'] || 'USD';
          setWallet({
            balance: Number(p.new.balance_mzn || 0),
            total_deposited: Number(p.new.total_deposited || 0),
            total_spent: Number(p.new.total_spent || 0),
            currency,
            country_id: p.new.country_id
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const deposit = async (amount: number, method?: string) => {
    if (!user) throw new Error('Sem sessão');

    // Auto-select best method if none provided
    const { data: profile } = await (supabase as any).from('profiles').select('country_id').eq('user_id', user.id).maybeSingle();
    const { data: country } = await (supabase as any).from('countries').select('config').eq('id', profile?.country_id || 'MZ').maybeSingle();

    const preferredMethod = method || country?.config?.payment_methods?.[0]?.id || 'wallet';

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
