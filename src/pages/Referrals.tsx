import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Gift, Copy, Share2, Users, Coins } from 'lucide-react';
import { toast } from 'sonner';

function genCode(uid: string) {
  return ('MOZ' + uid.replace(/-/g, '').slice(0, 6)).toUpperCase();
}

export default function Referrals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [reward, setReward] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .maybeSingle();
      let c = prof?.referral_code;
      if (!c) {
        c = genCode(user.id);
        await supabase.from('profiles').update({ referral_code: c }).eq('user_id', user.id);
      }
      setCode(c);

      const { data: refs } = await supabase
        .from('user_referrals')
        .select('*, referred_profile:profiles!user_referrals_referred_id_fkey(full_name)')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      setReferrals(refs ?? []);

      const { data: r } = await supabase.from('health_referral_rewards').select('*').eq('active', true).maybeSingle();
      setReward(r);
    })();
  }, [user]);

  const link = `${window.location.origin}/auth?ref=${code}`;
  const completed = referrals.filter(r => r.status === 'completed').length;
  const totalCoins = completed * (reward?.joy_coins_referrer ?? 100);

  const copy = () => { navigator.clipboard.writeText(link); toast.success('Link copiado!'); };
  const share = async () => {
    const text = `Junta-te ao MoçambiApp e ganha ${reward?.joy_coins_referred ?? 50} Joy Coins! ${link}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'MoçambiApp', text }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">Convidar Amigos</h1>
      </header>

      <section className="p-4 space-y-4">
        <Card className="border-none bg-gradient-to-br from-primary to-pharmacy p-6 text-primary-foreground text-center">
          <Gift className="h-10 w-10 mx-auto mb-2" />
          <p className="text-sm opacity-90">Convida e ambos ganham</p>
          <p className="text-3xl font-bold mt-1">
            +{reward?.joy_coins_referrer ?? 100} <span className="text-base">Joy Coins</span>
          </p>
          {reward?.coupon_code && (
            <p className="text-xs mt-2 opacity-90">+ cupão saúde <b>{reward.coupon_code}</b> ao 3.º convite</p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground">O teu código</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-bold font-mono tracking-wider">{code}</p>
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="h-3 w-3 mr-1" /> Copiar
            </Button>
          </div>
          <Button className="w-full mt-3" onClick={share}>
            <Share2 className="h-4 w-4 mr-1" /> Partilhar
          </Button>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{completed}</p>
            <p className="text-xs text-muted-foreground">Amigos ativos</p>
          </Card>
          <Card className="p-3 text-center">
            <Coins className="h-5 w-5 mx-auto text-gold mb-1" />
            <p className="text-2xl font-bold">{totalCoins}</p>
            <p className="text-xs text-muted-foreground">Joy Coins ganhos</p>
          </Card>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Histórico</p>
          {referrals.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              Ainda sem convidados. Partilha o teu código!
            </Card>
          ) : referrals.map(r => (
            <Card key={r.id} className="p-3 flex justify-between items-center mb-2">
              <div>
                <p className="font-semibold text-sm">{r.referred_profile?.full_name ?? 'Novo utilizador'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString('pt-MZ')}
                </p>
              </div>
              <Badge variant={r.status === 'completed' ? 'default' : 'outline'}>
                {r.status === 'completed' ? 'Ativo' : 'Pendente'}
              </Badge>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}