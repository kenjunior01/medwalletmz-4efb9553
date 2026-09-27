import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Search, FileText, MessageCircle, Calendar } from "@/components/icons/lucide-compat";

type AnyRec = Record<string, any>;

export default function DoctorPatients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, country } = useCountry();
  const locale = country?.default_locale || 'pt-PT';
  const [patients, setPatients] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const tc = (k: string, p?: Record<string, string>) => t(`panels.doctor.${k}`, p);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: cons } = await supabase
        .from('consultations')
        .select('patient_id, scheduled_at, status')
        .eq('doctor_id', user.id)
        .order('scheduled_at', { ascending: false });
      const map = new Map<string, { last: string; count: number; completed: number }>();
      (cons || []).forEach((c: AnyRec) => {
        const entry = map.get(c.patient_id) || { last: c.scheduled_at, count: 0, completed: 0 };
        entry.count += 1;
        if (c.status === 'completed') entry.completed += 1;
        if (new Date(c.scheduled_at) > new Date(entry.last)) entry.last = c.scheduled_at;
        map.set(c.patient_id, entry);
      });
      const ids = [...map.keys()];
      if (!ids.length) { setPatients([]); setLoading(false); return; }
      const { data: profs } = await (supabase.rpc as any)('list_patients_for_doctor', { _ids: ids });
      setPatients((profs || []).map((p: AnyRec) => ({
        ...p,
        last: map.get(p.user_id)?.last,
        count: map.get(p.user_id)?.count || 0,
        completed: map.get(p.user_id)?.completed || 0,
      })));
      setLoading(false);
    })();
  }, [user]);

  const filtered = patients.filter((p) =>
    !query.trim() || (p.full_name || '').toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('panels.common.close')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold">{tc('my_patients')}</h1>
          <p className="text-xs text-muted-foreground">{patients.length} {t('doctor.patients')}</p>
        </div>
      </header>

      <div className="p-4 space-y-3 max-w-2xl mx-auto pb-24">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tc('search_patients')}
            className="pl-9"
            aria-label={tc('search_patients')}
          />
        </div>

        {loading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}</div>
        ) : patients.length === 0 ? (
          <Card><CardContent className="p-8 text-center">
            <User className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{tc('patients_empty')}</p>
          </CardContent></Card>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">{t('panels.common.empty')}</p>
        ) : (
          filtered.map((p) => (
            <Card key={p.user_id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.full_name || tc('no_name')}</p>
                  <p className="text-xs text-muted-foreground">
                    {tc('last_visit')}: {p.last ? new Date(p.last).toLocaleDateString(locale) : '—'} · {p.count} {tc('consults')}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  <Calendar className="h-3 w-3 mr-1" aria-hidden="true" />{p.completed}
                </Badge>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => navigate('/doctor/prescription/new')} aria-label={tc('prescribe')}>
                    <FileText className="h-4 w-4 text-primary" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => navigate('/health/consultations')} aria-label={tc('view')}>
                    <MessageCircle className="h-4 w-4 text-secondary" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
