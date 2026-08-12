import { Stethoscope, ArrowRight, FileText, Crown, Sparkles, FolderHeart, Gift, CalendarCheck, MessageCircle } from "@/components/icons/lucide-compat";
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useCountry } from '@/contexts/CountryContext';

export function HealthCard() {
  const navigate = useNavigate();
  const { t } = useCountry();
  return (
    <section className="px-4 space-y-2">
      <Card
        onClick={() => navigate('/health/doctors')}
        className="cursor-pointer overflow-hidden border-none bg-gradient-to-br from-pharmacy via-pharmacy/90 to-primary p-5 text-pharmacy-foreground shadow-premium transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {t('healthCard.new_badge')}
            </div>
            <h3 className="text-lg font-bold leading-tight">{t('healthCard.online_consultation')}</h3>
            <p className="text-sm opacity-90">{t('healthCard.talk_doctor')}</p>
          </div>
          <ArrowRight className="h-5 w-5 opacity-80" />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate('/health/consultations')}
          className="flex items-center justify-center gap-1.5 text-xs text-pharmacy hover:text-pharmacy/80 transition py-3 rounded-lg border border-pharmacy/30 bg-pharmacy/5 min-h-11"
        >
          <MessageCircle className="h-3 w-3" /> {t('healthCard.consultations')}
        </button>
        <button
          onClick={() => navigate('/health/doctors')}
          className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 transition py-3 min-h-11 rounded-lg border border-primary/30 bg-primary/5"
        >
          <CalendarCheck className="h-3 w-3" /> {t('healthCard.schedule')}
        </button>
        <button
          onClick={() => navigate('/health/triage')}
          className="flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 transition py-3 min-h-11 rounded-lg border border-primary/30 bg-primary/5"
        >
          <Sparkles className="h-3 w-3" /> {t('healthCard.meddy_consult')}
        </button>
        <button
          onClick={() => navigate('/health/records')}
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition py-3 min-h-11 rounded-lg border border-border"
        >
          <FolderHeart className="h-3 w-3" /> {t('healthCard.exams')}
        </button>
        <button
          onClick={() => navigate('/health/prescriptions')}
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition py-3 min-h-11 rounded-lg border border-border"
        >
          <FileText className="h-3 w-3" /> {t('healthCard.prescriptions')}
        </button>
        <button
          onClick={() => navigate('/health/plans')}
          className="flex items-center justify-center gap-1.5 text-xs text-gold hover:text-gold/80 transition py-3 min-h-11 rounded-lg border border-gold/30 bg-gold/5"
        >
          <Crown className="h-3 w-3" /> {t('healthCard.health_pass')}
        </button>
        <button
          onClick={() => navigate('/referrals')}
          className="col-span-2 flex items-center justify-center gap-1.5 text-xs text-pharmacy hover:text-pharmacy/80 transition py-3 min-h-11 rounded-lg border border-pharmacy/30 bg-pharmacy/5"
        >
          <Gift className="h-3 w-3" /> {t('healthCard.invite_friends')}
        </button>
      </div>
    </section>
  );
}
