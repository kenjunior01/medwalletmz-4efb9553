import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, FileText, Pill, Search, RefreshCw, AlertCircle,
  Stethoscope, ShieldCheck, ChevronRight, Calendar, Clock,
} from '@/components/icons/lucide-compat';
import { motion, AnimatePresence } from 'framer-motion';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useCountry } from '@/contexts/CountryContext';
import { cn } from '@/lib/utils';

import { logger } from '@/lib/logger';
type LoadState = 'loading' | 'success' | 'error';
type FilterTab = 'all' | 'active' | 'expired';

export default function MyPrescriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, country } = useCountry();
  const locale = country?.id === 'BR' ? 'pt-BR' : 'pt-MZ';

  const [list, setList] = useState<any[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoadState('loading');
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*, prescription_items(*)')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const doctorIds = [...new Set(data.map(d => d.doctor_id))];
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', doctorIds);
        const map = new Map(profs?.map(p => [p.user_id, p.full_name]) || []);
        setList(data.map(d => ({ ...d, doctor_name: map.get(d.doctor_id) || t('prescriptions.unknown_doctor') })));
      }
      setLoadState('success');
    } catch (err) {
      logger.error('MyPrescriptions fetch error:', { error: err });
      setLoadState('error');
    }
  };

  useEffect(() => { void fetchData(); }, [user]);

  const filteredList = useMemo(() => {
    let l = list;
    if (tab === 'active') {
      l = l.filter(p => !(p.expires_at && new Date(p.expires_at) < new Date()) && p.status !== 'cancelled');
    } else if (tab === 'expired') {
      l = l.filter(p => (p.expires_at && new Date(p.expires_at) < new Date()) || p.status === 'cancelled');
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      l = l.filter(p =>
        p.doctor_name?.toLowerCase().includes(q) ||
        p.prescription_items?.some((it: any) => it.medication_name?.toLowerCase().includes(q))
      );
    }
    return l;
  }, [list, tab, query]);

  const tabCounts = useMemo(() => ({
    all: list.length,
    active: list.filter(p => !(p.expires_at && new Date(p.expires_at) < new Date()) && p.status !== 'cancelled').length,
    expired: list.filter(p => (p.expires_at && new Date(p.expires_at) < new Date()) || p.status === 'cancelled').length,
  }), [list]);

  return (
    <PullToRefresh onRefresh={fetchData}>
    <div className="flex flex-col gap-4 p-4 animate-fade-in pb-8">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{t('prescriptions.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('prescriptions.subtitle')}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void fetchData()}
          aria-label={t('prescriptions.refresh')}
          className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Trust strip */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          {t('prescriptions.verified_by_doctor')}
        </span>
      </motion.div>

      {/* Search */}
      {list.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder={t('prescriptions.search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('prescriptions.search_aria')}
            className="pl-9 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      )}

      {/* Tabs */}
      {list.length > 0 && (
        <div
          role="tablist"
          aria-label={t('prescriptions.tablist_label')}
          className="flex gap-1 p-1 bg-muted rounded-xl"
        >
          {(['all', 'active', 'expired'] as FilterTab[]).map((tb) => (
            <button
              key={tb}
              role="tab"
              aria-selected={tab === tb}
              aria-controls={`panel-${tb}`}
              id={`tab-${tb}`}
              tabIndex={tab === tb ? 0 : -1}
              onClick={() => setTab(tb)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                tab === tb ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(`prescriptions.tab_${tb}`)}
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] rounded-full bg-primary/10 text-primary">
                {tabCounts[tb]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* LOADING */}
      {loadState === 'loading' && (
        <div role="status" aria-busy="true" aria-live="polite" className="space-y-3">
          <span className="sr-only">{t('prescriptions.loading_aria')}</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* ERROR */}
      {loadState === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center p-8 rounded-2xl border-2 border-dashed border-destructive/30"
          role="alert"
        >
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-destructive" aria-hidden="true" />
          <p className="font-semibold mb-1">{t('prescriptions.error_title')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('prescriptions.error_desc')}</p>
          <Button
            onClick={() => void fetchData()}
            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('prescriptions.retry')}
          </Button>
        </motion.div>
      )}

      {/* EMPTY */}
      {loadState === 'success' && list.length === 0 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-8 rounded-2xl border-2 border-dashed border-border"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 0.1 }}
            className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <FileText className="h-8 w-8 text-primary" aria-hidden="true" />
          </motion.div>
          <p className="font-bold mb-1">{t('prescriptions.empty_title')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('prescriptions.empty_desc')}</p>
          <Button
            onClick={() => navigate('/health/doctors')}
            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Stethoscope className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('prescriptions.empty_cta')}
          </Button>
        </motion.div>
      )}

      {/* EMPTY FILTER */}
      {loadState === 'success' && list.length > 0 && filteredList.length === 0 && (
        <div className="text-center p-8 rounded-2xl border-2 border-dashed border-border" role="status">
          <Search className="h-11 w-11 mx-auto mb-3 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-semibold mb-1">{t('prescriptions.empty_filter_title')}</p>
          <p className="text-sm text-muted-foreground mb-3">{t('prescriptions.empty_filter_desc')}</p>
          <Button
            variant="outline"
            onClick={() => { setQuery(''); setTab('all'); }}
            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('prescriptions.clear_filters')}
          </Button>
        </div>
      )}

      {/* LIST */}
      {loadState === 'success' && filteredList.length > 0 && (
        <div
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredList.map((p, idx) => {
              const expired = p.expires_at && new Date(p.expires_at) < new Date();
              const isActive = !expired && p.status !== 'cancelled';
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.32) }}
                >
                  <Card
                    className="p-4 space-y-3 cursor-pointer hover:shadow-medium transition-all min-h-[44px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                    onClick={() => navigate(`/health/prescription/${p.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/health/prescription/${p.id}`); } }}
                    aria-label={t('prescriptions.card_aria', { doctor: p.doctor_name, count: p.prescription_items?.length || 0 })}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold flex items-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                          Dr(a). {p.doctor_name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          <time dateTime={p.created_at}>
                            {new Date(p.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </time>
                        </p>
                      </div>
                      <Badge
                        variant={expired ? 'outline' : 'default'}
                        className={cn(
                          'flex-shrink-0',
                          isActive && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
                          expired && 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {expired ? t('prescriptions.status_expired') : t(`prescriptions.status_${p.status || 'active'}`)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Pill className="h-4 w-4" aria-hidden="true" />
                        {t('prescriptions.medications_count', { count: p.prescription_items?.length || 0 })}
                      </span>
                      {p.expires_at && (
                        <span className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {expired
                            ? t('prescriptions.expired_on', { date: new Date(p.expires_at).toLocaleDateString(locale) })
                            : t('prescriptions.valid_until', { date: new Date(p.expires_at).toLocaleDateString(locale) })}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
