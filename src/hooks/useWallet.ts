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
    const { data } = await supabase
      .from('wallets')
      .select('balance_mzn, total_deposited, total_spent, currency')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) {
      // Ensure wallet exists
      await supabase.from('wallets').insert({ user_id: user.id }).select().maybeSingle();
      setWallet({ balance: 0, total_deposited: 0, total_spent: 0, currency: 'MZN' });
    } else {
      setWallet({
        balance: Number(data.balance_mzn),
        total_deposited: Number(data.total_deposited),
        total_spent: Number(data.total_spent),
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
            balance: Number(p.new.balance_mzn),
            total_deposited: Number(p.new.total_deposited),
            total_spent: Number(p.new.total_spent),
            currency: p.new.currency || 'MZN'
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const deposit = async (amount: number, method: string = 'mpesa') => {
    if (!user) throw new Error('Sem sessão');
    const { data, error } = await supabase.rpc('wallet_deposit', {
      _user_id: user.id, _amount: amount, _method: method,
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
