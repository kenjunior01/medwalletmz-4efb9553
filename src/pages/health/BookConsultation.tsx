import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Calendar, Loader2, Wallet, AlertTriangle,
  Stethoscope, BadgeCheck, Clock, Video, MapPin, ChevronRight,
  CalendarCheck, Sparkles, ShieldCheck, AlertCircle, RefreshCw,
} from '@/components/icons/lucide-compat';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCountry } from '@/contexts/CountryContext';
import { CouponInput } from '@/components/checkout/CouponInput';
import { cn } from '@/lib/utils';

interface Slot { id: string; starts_at: string }

type LoadState = 'loading' | 'success' | 'error';
type ConfirmState = 'form' | 'processing' | 'success';

export default function BookConsultation() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, reload } = useWallet();
  const { t, country } = useCountry();
  const currency = country?.currency_code || 'MZN';
  const locale = country?.id === 'BR' ? 'pt-BR' : 'pt-MZ';

  const [doctor, setDoctor] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [coupon, setCoupon] = useState<any>(null);
  const [payWithWallet, setPayWithWallet] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [confirmState, setConfirmState] = useState<ConfirmState>('form');
  const [bookedConsultationId, setBookedConsultationId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!doctorId) return;
    setLoadState('loading');
    try {
      const { data, error: docErr } = await supabase
        .from('doctor_profiles')
        .select('*, medical_specialties(name, icon)')
        .eq('id', doctorId)
        .maybeSingle();
      if (docErr) throw docErr;
      if (!data) {
        setLoadState('error');
        return;
      }
      const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('user_id', data.user_id).maybeSingle();
      setDoctor({ ...data, full_name: prof?.full_name, avatar_url: prof?.avatar_url });

      const { data: s, error: slotErr } = await supabase
        .from('doctor_availability_slots')
        .select('id, starts_at')
        .eq('doctor_id', data.user_id)
        .eq('is_booked', false)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(40);
      if (slotErr) throw slotErr;
      setSlots((s as Slot[]) || []);
      setLoadState('success');
    } catch (err) {
      console.error('BookConsultation fetch error:', err);
      setLoadState('error');
    }
  };

  useEffect(() => { void fetchData(); }, [doctorId]);

  const gross = Number(doctor?.consultation_fee || 0);
  const discount = coupon?.discount ?? 0;
  const finalAmount = Math.max(gross - discount, 0);
  // Pacientes pagam directamente o serviço — não é exigido saldo na carteira.
  const lowBalance = false;
  const walletBalance = Number(wallet?.balance || 0);
  const canPayWithWallet = walletBalance >= finalAmount && finalAmount > 0;

  // Group slots by day for better UX
  const slotsByDay = useMemo(() => {
    const groups: { date: Date; label: string; slots: Slot[] }[] = [];
    slots.forEach((s) => {
      const d = new Date(s.starts_at);
      const dayKey = d.toDateString();
      let g = groups.find((x) => x.date.toDateString() === dayKey);
      if (!g) {
        g = { date: d, label: d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long' }), slots: [] };
        groups.push(g);
      }
      g.slots.push(s);
    });
    return groups;
  }, [slots, locale]);

  const handleBook = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!selected || !doctor) return;
    setSaving(true);
    setConfirmState('processing');
    try {
      const { data, error } = await supabase.rpc('book_consultation_atomic', {
        _slot_id: selected.id,
        _reason: reason || null,
        _coupon_id: coupon?.id ?? null,
        _use_wallet: payWithWallet && canPayWithWallet,
      } as any);
      if (error) {
        if (error.message?.includes('professional_insufficient_balance')) {
          toast.error('Profissional indisponível', {
            description: 'Este profissional não tem saldo suficiente na carteira para aceitar consultas neste momento.',
          });
          setConfirmState('form');
        } else if (error.message?.includes('patient_insufficient_balance')) {
          toast.error('Saldo insuficiente', {
            description: 'O teu saldo não cobre o valor da consulta. Desmarca o pagamento com carteira ou carrega saldo.',
          });
          setPayWithWallet(false);
          setConfirmState('form');
        } else if (error.message?.includes('slot_unavailable')) {
          toast.error(t('booking.slot_taken'));
          setSlots((prev) => prev.filter((s) => s.id !== selected.id));
          setSelected(null);
          setConfirmState('form');
        } else {
          toast.error(t('booking.book_failed'), { description: error.message });
          setConfirmState('form');
        }
        return;
      }
      await reload();
      const consId = (data as any)?.consultation_id;
      setBookedConsultationId(consId);
      setConfirmState('success');
      // Auto-navigate after 3s
      setTimeout(() => navigate(`/health/consultation/${consId}`), 3000);
    } catch (err) {
      console.error('BookConsultation error:', err);
      toast.error(t('common.error'));
      setConfirmState('form');
    } finally {
      setSaving(false);
    }
  };

  // Generate .ics calendar file
  const downloadICS = () => {
    if (!selected || !doctor) return;
    const start = new Date(selected.starts_at);
    const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min consultation
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MedWallet//Consultation//PT',
      'BEGIN:VEVENT',
      `UID:${selected.id}@medwallet.co.mz`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${t('booking.ics_summary', { doctor: doctor.full_name })}`,
      `DESCRIPTION:${reason || t('booking.ics_default_desc')}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${t('booking.ics_reminder')}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta-${doctor.full_name}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // LOADING state with skeleton
  if (loadState === 'loading') {
    return (
      <div className="min-h-screen bg-background" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">{t('booking.loading_aria')}</span>
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-6 w-40" />
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // ERROR state
  if (loadState === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm"
          role="alert"
        >
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-xl font-bold mb-2">{t('booking.error_title')}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t('booking.error_desc')}</p>
          <Button
            onClick={() => void fetchData()}
            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('booking.retry')}
          </Button>
        </motion.div>
      </div>
    );
  }

  // SUCCESS state
  if (confirmState === 'success' && bookedConsultationId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mb-6"
        >
          <CalendarCheck className="h-12 w-12 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </motion.div>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center max-w-sm"
        >
          <h2 className="text-2xl font-black mb-2">{t('booking.success_title')}</h2>
          <p className="text-sm text-muted-foreground mb-1">
            {t('booking.success_desc', { doctor: doctor?.full_name })}
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            {selected && new Date(selected.starts_at).toLocaleDateString(locale, {
              weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
            })}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={downloadICS}
              variant="outline"
              className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
              {t('booking.add_to_calendar')}
            </Button>
            <Button
              onClick={() => navigate(`/health/consultation/${bookedConsultationId}`)}
              className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('booking.view_consultation')}
              <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-6 animate-pulse">{t('booking.redirecting')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <h1 className="font-bold">{t('booking.title')}</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Doctor card with trust signals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3 items-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pharmacy to-primary flex items-center justify-center text-pharmacy-foreground font-bold text-xl overflow-hidden">
                  {doctor?.avatar_url ? (
                    <img src={doctor.avatar_url} alt="" className="h-full w-full object-cover" aria-hidden="true" />
                  ) : (
                    <span>{doctor?.full_name?.[0] || 'M'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold flex items-center gap-1.5">
                    Dr(a). {doctor?.full_name}
                    {doctor?.is_verified && (
                      <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" aria-label={t('booking.verified_doctor')} />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" aria-hidden="true" />
                    {doctor?.medical_specialties?.icon} {doctor?.medical_specialties?.name}
                  </p>
                  {doctor?.facility_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {doctor.facility_name}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-black text-pharmacy text-lg">{doctor?.consultation_fee}</span>
                  <span className="text-xs text-muted-foreground ml-1">{currency}</span>
                </div>
              </div>
              {/* Trust strip */}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                {doctor?.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    {t('booking.verified_doctor')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Video className="h-3 w-3" aria-hidden="true" />
                  {t('booking.video_call_included')}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {t('booking.duration_30min')}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Slot picker */}
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {t('booking.choose_slot')}
          </h2>
          {slots.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-6 rounded-xl border-2 border-dashed border-border"
              role="status"
            >
              <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm font-semibold mb-1">{t('booking.no_slots_title')}</p>
              <p className="text-xs text-muted-foreground mb-4">{t('booking.no_slots_desc')}</p>
              <Button
                variant="outline"
                onClick={() => navigate('/health/doctors')}
                className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t('booking.find_other_doctor')}
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {slotsByDay.map((group, gi) => (
                <motion.div
                  key={group.date.toISOString()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.05 }}
                >
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 ml-1">
                    {group.label}
                  </p>
                  <div
                    className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                    role="radiogroup"
                    aria-label={t('booking.slots_for_day', { day: group.label })}
                  >
                    {group.slots.map((s) => {
                      const d = new Date(s.starts_at);
                      const isSelected = selected?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelected(s)}
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={t('booking.slot_at', { time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) })}
                          className={cn(
                            'p-2.5 rounded-lg border text-xs transition min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            isSelected
                              ? 'border-primary bg-primary/10 font-bold ring-2 ring-primary/30'
                              : 'border-border hover:border-primary/40 hover:bg-accent'
                          )}
                        >
                          <div className="font-bold">
                            {d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Reason */}
        <div>
          <Label htmlFor="reason" className="mb-2 block">{t('booking.reason_label')}</Label>
          <Textarea
            id="reason"
            placeholder={t('booking.reason_placeholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-describedby="reason-hint"
          />
          <p id="reason-hint" className="text-[10px] text-muted-foreground mt-1 ml-1">
            {t('booking.reason_hint')}
          </p>
        </div>

        {/* Coupon */}
        <CouponInput
          subtotal={gross}
          appliedCoupon={coupon}
          onApplyCoupon={setCoupon}
          onRemoveCoupon={() => setCoupon(null)}
          serviceType="consultation"
        />

        {/* Price summary */}
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-sm space-y-1">
            <div className="flex justify-between"><span>{t('booking.subtotal')}</span><span>{gross.toFixed(2)} {currency}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>{t('booking.coupon_discount')}</span>
                <span>-{discount.toFixed(2)} {currency}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t mt-2">
              <span>{t('booking.total_to_debit')}</span><span>{finalAmount.toFixed(2)} {currency}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
              <Wallet className="h-3 w-3" aria-hidden="true" />
              Pagamento directo ao serviço — não precisa de saldo na carteira.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 md:bottom-4 inset-x-0 p-4 bg-background/95 backdrop-blur border-t z-30">
        <Button
          className={cn(
            'w-full min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-bold',
            lowBalance && 'bg-amber-500 hover:bg-amber-600 text-white'
          )}
          size="lg"
          disabled={!selected || saving}
          onClick={handleBook}
          aria-label={lowBalance ? t('booking.deposit_aria') : t('booking.confirm_aria', { amount: finalAmount.toFixed(2), currency })}
        >
          <AnimatePresence mode="wait">
            {saving ? (
              <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('booking.processing')}
              </motion.span>
            ) : lowBalance ? (
              <motion.span key="low" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Wallet className="h-4 w-4" aria-hidden="true" />
                {t('booking.deposit_balance')}
              </motion.span>
            ) : !selected ? (
              <motion.span key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {t('booking.select_slot_first')}
              </motion.span>
            ) : (
              <motion.span key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {t('booking.confirm_and_pay', { amount: finalAmount.toFixed(2), currency })}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}
