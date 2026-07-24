import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Star, Trophy, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/contexts/CountryContext';

type Tab = 'doctors' | 'clinics' | 'hospitals' | 'pharmacies' | 'laboratories' | 'veterinary';

const TABS_CONFIG: { id: Tab; labelKey: string; table: string; typeFilter?: string }[] = [
  { id: 'doctors', labelKey: 'ranking.tab_doctors', table: 'doctor_profiles' },
  { id: 'clinics', labelKey: 'ranking.tab_clinics', table: 'clinics' },
  { id: 'hospitals', labelKey: 'ranking.tab_hospitals', table: 'clinics', typeFilter: 'hospital' },
  { id: 'pharmacies', labelKey: 'ranking.tab_pharmacies', table: 'stores', typeFilter: 'pharmacy' },
  { id: 'laboratories', labelKey: 'ranking.tab_laboratories', table: 'stores', typeFilter: 'laboratory' },
  { id: 'veterinary', labelKey: 'ranking.tab_veterinary', table: 'stores', typeFilter: 'veterinary' },
];

export default function Ranking() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('doctors');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const cfg = TABS_CONFIG.find(tc => tc.id === tab)!;
      if (cfg.id === 'doctors') {
        const { data } = await (supabase as any)
          .from('doctor_profiles')
          .select('user_id, rating, total_consultations, specialty, profiles:profiles!doctor_profiles_user_id_fkey(full_name, avatar_url)')
          .order('rating', { ascending: false })
          .order('total_consultations', { ascending: false })
          .limit(50);
        setRows((data || []).map((d: any) => ({
          id: d.user_id,
          name: d.profiles?.full_name || 'Médico',
          avatar: d.profiles?.avatar_url,
          rating: Number(d.rating || 0),
          reviews: d.total_consultations || 0,
          subtitle: d.specialty,
        })));
      } else {
        let query = (supabase as any)
          .from(cfg.table)
          .select('id, name, avg_rating, reviews_count, city, address');
        if (cfg.typeFilter) query = query.eq('type', cfg.typeFilter);
        else query = query.eq('is_active', true);
        const { data } = await query
          .order('avg_rating', { ascending: false })
          .order('reviews_count', { ascending: false })
          .limit(50);
        setRows((data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          rating: Number(r.avg_rating || 0),
          reviews: r.reviews_count || 0,
          subtitle: r.city || r.address,
        })));
      }
      setLoading(false);
    })();
  }, [tab]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gold" />
          <h1 className="font-bold text-lg">{t('ranking.title')}</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full overflow-x-auto flex justify-start">
            {TABS_CONFIG.map(tabCfg => (
              <TabsTrigger key={tabCfg.id} value={tabCfg.id} className="shrink-0">{t(tabCfg.labelKey)}</TabsTrigger>
            ))}
          </TabsList>
          {TABS_CONFIG.map(tabCfg => (
            <TabsContent key={tabCfg.id} value={tabCfg.id} className="space-y-2 mt-4">
              {loading ? (
                [1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)
              ) : rows.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">{t('ranking.no_data')}</p>
              ) : rows.map((r, i) => (
                <Card key={r.id} className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{r.name}</p>
                    {r.subtitle && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" /> {r.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="flex items-center gap-1 font-bold text-sm">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {r.rating.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('ranking.reviews_count', { count: r.reviews })}</p>
                  </div>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}