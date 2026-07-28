import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Gift, Copy, Share2, Users, Zap, Heart, Trophy, TrendingUp, Coins, Wallet } from '@/components/icons/lucide-compat';
import { toast } from 'sonner';
import { useCountry } from '@/contexts/CountryContext';
import { motion } from 'framer-motion';

function genCode(uid: string) {
  return ('MOZ' + uid.replace(/-/g, '').slice(0, 6)).toUpperCase();
}

const TIERS = [
  { goal: 3, label: 'Consulta grátis', icon: Heart, color: 'from-teal-500 to-emerald-500' },
  { goal: 10, label: '1 mês premium', icon: Zap, color: 'from-indigo-500 to-purple-500' },
  { goal: 25, label: 'Cartão VIP', icon: Trophy, color: 'from-amber-500 to-orange-500' },
];

const LEADERS = [
  { name: 'Ana M.', refs: 47 },
  { name: 'Carlos T.', refs: 34 },
  { name: 'Beatriz L.', refs: 28 },
  { name: 'João N.', refs: 21 },
  { name: 'Maria S.', refs: 15 },
];

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

export default function Referrals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country } = useCountry();
  const [code, setCode] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [bonusMzn, setBonusMzn] = useState(100);
  const [bonusCoins, setBonusCoins] = useState(100);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from('profiles').select('referral_code')
        .eq('user_id', user.id).maybeSingle();
      let c = prof?.referral_code;
      if (!c) { c = genCode(user.id); await supabase.from('profiles').update({ referral_code: c }).eq('user_id', user.id); }
      setCode(c);
      const { data: refs } = await supabase
        .from('user_referrals')
        .select('*, referred_profile:profiles!user_referrals_referred_id_fkey(full_name)')
        .eq('referrer_id', user.id).order('created_at', { ascending: false });
      setReferrals(refs ?? []);
      const { data: settings } = await supabase
        .from('platform_settings').select('key, value')
        .in('key', ['referral_bonus_mzn', 'referral_bonus_coins']);
      (settings || []).forEach((s: any) => {
        if (s.key === 'referral_bonus_mzn') setBonusMzn(Number(s.value));
        if (s.key === 'referral_bonus_coins') setBonusCoins(Number(s.value));
      });
    })();
  }, [user]);

  const link = `${window.location.origin}/auth?ref=${code}`;
  const completed = referrals.filter(r => r.status === 'completed').length;
  const totalCoins = referrals.reduce((a, r) => a + (Number(r.bonus_coins) || 0), 0);
  const totalMzn = referrals.reduce((a, r) => a + (Number(r.bonus_mzn) || 0), 0);
  const currencyCode = country?.currency_code || 'MZN';

  const copyCode = () => { navigator.clipboard.writeText(link); toast.success('Link copiado!'); };

  const shareNative = async () => {
    const text = `Junta-te ao MedWallet e ganha bónus! ${link}`;
    if (navigator.share) { try { await navigator.share({ title: 'MedWallet', text }); return; } catch {} }
  };

  const shareWA = () => { const t = `Junta-te ao MedWallet! ${link}`; window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank'); };
  const shareTG = () => { window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Junta-te ao MedWallet!')}`, '_blank'); };
  const shareFB = () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank'); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-bold">Convidar Amigos</h1>
      </header>

      <section className="p-4 space-y-4">
        {/* Hero */}
        <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="text-center py-4">
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-transparent">
            Convida Amigos, Ganha Recompensas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Cada amigo que se junta traz-te bónus</p>
        </motion.div>

        {/* Referral Code */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">O teu código</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-bold font-mono tracking-wider">{code}</p>
              <Button size="sm" variant="outline" onClick={copyCode}>
                <Copy className="h-3 w-3 mr-1" /> Copiar
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Button size="sm" variant="outline" className="text-xs" onClick={shareWA}>WhatsApp</Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={shareTG}>Telegram</Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={shareFB}>Facebook</Button>
            </div>
            <Button className="w-full mt-2" onClick={shareNative}>
              <Share2 className="h-4 w-4 mr-1" /> Partilhar
            </Button>
          </Card>
        </motion.div>

        {/* Progress Tracker */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="p-4 border-none bg-gradient-to-br from-teal-600 to-indigo-600 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">O teu progresso</p>
              <p className="text-lg font-bold">{completed}/25</p>
            </div>
            <div className="w-full h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${Math.min((completed / 25) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs opacity-80">
              <span>{currencyCode} {totalMzn} ganhos</span>
              <span>{totalCoins} Pulse</span>
            </div>
          </Card>
        </motion.div>

        {/* Rewards Tiers */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }}>
          <p className="text-sm font-semibold mb-2">Níveis de Recompensa</p>
          <div className="space-y-2">
            {TIERS.map((t) => {
              const Ic = t.icon;
              const done = completed >= t.goal;
              return (
                <Card key={t.goal} className={`p-3 flex items-center gap-3 ${done ? 'border-teal-400' : ''}`}>
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${t.color} text-white`}>
                    <Ic className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{t.goal} amigos = {t.label}</p>
                    <div className="w-full h-1.5 rounded-full bg-muted mt-1">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-teal-500 to-indigo-500 transition-all"
                        style={{ width: `${Math.min((completed / t.goal) * 100, 100)}%` }} />
                    </div>
                  </div>
                  {done && <Badge variant="default" className="text-[10px]">Conquistado</Badge>}
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.25 }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <p className="text-sm font-semibold">Top Referenciadores</p>
          </div>
          <Card className="divide-y">
            {LEADERS.map((l, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <span className={`text-sm font-bold w-5 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>{i + 1}</span>
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{l.name}</span>
                <span className="text-sm font-bold text-teal-600">{l.refs}</span>
              </div>
            ))}
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }} className="grid grid-cols-3 gap-2 pb-8">
          <Card className="p-3 text-center"><Users className="h-5 w-5 mx-auto text-teal-500 mb-1" /><p className="text-xl font-bold">{completed}</p><p className="text-[10px] text-muted-foreground">Amigos</p></Card>
          <Card className="p-3 text-center"><Wallet className="h-5 w-5 mx-auto text-indigo-500 mb-1" /><p className="text-xl font-bold">{totalMzn}</p><p className="text-[10px] text-muted-foreground">{currencyCode}</p></Card>
          <Card className="p-3 text-center"><Coins className="h-5 w-5 mx-auto text-amber-500 mb-1" /><p className="text-xl font-bold">{totalCoins}</p><p className="text-[10px] text-muted-foreground">Pulse</p></Card>
        </motion.div>
      </section>
    </div>
  );
}
