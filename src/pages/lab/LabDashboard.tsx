import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FlaskConical, Upload, ArrowLeft, Clock, CheckCircle2, DollarSign,
  Download, Activity, Inbox, RefreshCw,
} from "@/components/icons/lucide-compat";
import { toast } from 'sonner';

type AnyRec = Record<string, any>;
type Filter = 'all' | 'pending' | 'completed';

export default function LabDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { t, country } = useCountry();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const currency = country?.currency_symbol || country?.currency_code || 'MZN';
  const locale = country?.default_locale || 'pt-MZ';
  const tc = (k: string, p?: Record<string, string>) => t(`panels.lab.${k}`, p);

  const labQ = useQuery({
    queryKey: ['lab-dashboard', user?.id],
    queryFn: async () => {
      const { data: l, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('owner_id', user!.id)
        .eq('type', 'laboratory')
        .maybeSingle();
      if (error) throw error;
      return (l as AnyRec) || null;
    },
    enabled: !!user,
  });

  const ordersQ = useQuery({
    queryKey: ['lab-orders', labQ.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_exam_orders')
        .select('*')
        .eq('lab_id', labQ.data!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as AnyRec[]) || [];
    },
    enabled: !!labQ.data?.id,
  });

  const orders = useMemo(() => ordersQ.data || [], [ordersQ.data]);
  const kpis = useMemo(() => {
    const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
    const done = orders.filter((o) => o.status === 'completed');
    const pending = orders.filter((o) => o.status !== 'completed');
    const revenue = done
      .filter((o) => new Date(o.created_at) >= startMonth)
      .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
    return { pending: pending.length, done: done.length, revenue, total: orders.length };
  }, [orders]);

  const visible = useMemo(
    () => orders.filter((o) =>
      filter === 'all' ? true : filter === 'completed' ? o.status === 'completed' : o.status !== 'completed'
    ),
    [orders, filter]
  );

  const uploadResult = async (orderId: string, file: File) => {
    if (!user) return;
    setUploadingId(orderId);
    const path = `${user.id}/${orderId}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from('lab-results').upload(path, file, { upsert: true });
    if (upErr) { setUploadingId(null); return toast.error(upErr.message); }
    const { error } = await (supabase as any).rpc('lab_order_set_result', { _order_id: orderId, _result_url: path });
    setUploadingId(null);
    if (error) return toast.error(error.message);
    toast.success(tc('sent'));
    qc.invalidateQueries({ queryKey: ['lab-orders'] });
  };

  const downloadResult = async (path: string) => {
    const { data } = await supabase.storage.from('lab-results').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  };

  if (labQ.isSuccess && !labQ.data) {
    return (
      <div className="p-8 text-center max-w-md mx-auto min-h-[60vh] flex flex-col justify-center">
        <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground mb-4">{tc('no_profile')}</p>
        <Button onClick={() => nav('/lab/register')}>{tc('register_now')}</Button>
      </div>
    );
  }

  if (labQ.isLoading) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-8 w-56" /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
    );
  }

  if (labQ.error) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-3">{t('panels.common.error_load')}</p>
        <Button onClick={() => labQ.refetch()}>{t('panels.common.retry')}</Button>
      </div>
    );
  }

  const lab = labQ.data;
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: t('panels.common.all'), count: kpis.total },
    { key: 'pending', label: tc('filter_pending'), count: kpis.pending },
    { key: 'completed', label: tc('filter_done'), count: kpis.done },
  ];

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-5 pb-24">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav('/')} aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary shrink-0" />
            <span className="truncate">{lab.name}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{lab.city} · {kpis.total} {tc('orders_count')}</p>
        </div>
        <Badge variant={lab.is_verified ? 'default' : 'outline'}>
          {lab.is_verified ? t('panels.common.verified') : t('panels.common.pending')}
        </Badge>
      </header>

      {!lab.is_verified && (
        <Card className="p-4 bg-warning/10 border-warning/30 text-sm">{tc('verify_notice')}</Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Clock, v: String(kpis.pending), l: tc('kpi_pending'), c: 'text-warning' },
          { icon: CheckCircle2, v: String(kpis.done), l: tc('kpi_done'), c: 'text-green-600' },
          { icon: DollarSign, v: `${kpis.revenue.toLocaleString(locale)} ${currency}`, l: tc('kpi_revenue'), c: 'text-gold' },
          { icon: Activity, v: String(kpis.total), l: tc('kpi_total'), c: 'text-primary' },
        ].map((k) => (
          <Card key={k.l} className="p-3">
            <k.icon className={`h-4 w-4 mb-1.5 ${k.c}`} aria-hidden="true" />
            <p className="text-xl font-black tabular-nums leading-none">{k.v}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{k.l}</p>
          </Card>
        ))}
      </div>

      <Card onClick={() => nav('/subscribe')} className="p-4 cursor-pointer bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
        <p className="text-sm font-semibold">{tc('sub_title')}</p>
        <p className="text-xs text-muted-foreground mt-1">{tc('sub_desc')}</p>
      </Card>

      {/* Filtros */}
      <div className="flex gap-2" role="tablist" aria-label={tc('kpi_total')}>
        {filters.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Lista de pedidos */}
      {ordersQ.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" aria-hidden="true" />
          <p className="text-sm font-medium">{tc('empty_orders')}</p>
          <p className="text-xs text-muted-foreground mt-1">{tc('empty_orders_desc')}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((o) => (
            <Card key={o.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{tc('order')} #{o.id.slice(0, 8)}</span>
                  <Badge variant={o.status === 'completed' ? 'default' : 'outline'} className="text-[10px]">
                    {o.status === 'completed'
                      ? <><CheckCircle2 className="h-3 w-3 mr-1" />{tc('concluded')}</>
                      : <><Clock className="h-3 w-3 mr-1" />{o.status}</>}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(o.created_at).toLocaleString(locale)} · {Number(o.total_amount).toLocaleString(locale)} {currency}
                </p>
              </div>
              {o.status === 'completed' && o.result_url ? (
                <Button size="sm" variant="outline" onClick={() => downloadResult(o.result_url)}>
                  <Download className="h-4 w-4 mr-1.5" /> {tc('download')}
                </Button>
              ) : o.status !== 'completed' ? (
                <label className="cursor-pointer">
                  <input type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadResult(o.id, e.target.files[0])} />
                  <Button asChild size="sm" variant="outline" disabled={uploadingId === o.id}>
                    <span><Upload className="h-4 w-4 mr-1.5" /> {tc('upload_pdf')}</span>
                  </Button>
                </label>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
