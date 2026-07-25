import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Heart,
  Users,
  Stethoscope,
  Pill,
  AlertTriangle,
  CheckCircle,
  FileText,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import { getTheme } from '@/themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useMicroInsurance,
  type InsurancePlan,
} from '@/hooks/useMicroInsurance';
import { InsuranceClaimForm } from './InsuranceClaimForm';

// ----------------------------------------------------------------
// Icon map
// ----------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Heart,
  Users,
  Stethoscope,
  Pill,
  AlertTriangle,
  CheckCircle,
  FileText,
};

function PlanIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICON_MAP[name] || Shield;
  return <Icon className={className} style={style} />;
}

// ----------------------------------------------------------------
// Coverage label keys
// ----------------------------------------------------------------

const COVER_KEYS = [
  'consultation',
  'prescription',
  'emergency',
  'lab',
  'dental',
] as const;

// ----------------------------------------------------------------
// Animation variants
// ----------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' },
  }),
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function MicroInsurancePlans() {
  const { t, country } = useCountry();
  const theme = getTheme(country?.id || 'MZ');
  const currencySymbol = country?.currency_symbol || 'MT';

  const {
    plans,
    activePlans,
    claims,
    activatePlan,
    isActivating,
    submitClaim,
    isSubmitting,
    isLoading,
  } = useMicroInsurance();

  const [showClaimForm, setShowClaimForm] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // ---- Handlers ----

  const handleActivate = async (plan: InsurancePlan) => {
    if (activatingId) return;
    setActivatingId(plan.id);
    try {
      await activatePlan(plan.id);
      toast.success(t('microInsurance.activated', { plan: t(plan.nameKey) }));
    } catch {
      // toast already shown by hook
    } finally {
      setActivatingId(null);
    }
  };

  const isPlanActive = (planId: string) =>
    activePlans.some((ap) => ap.plan.id === planId);

  // ---- Loading state ----

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: theme.colors.primary }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ---- Header ---- */}
      <motion.div initial="hidden" animate="visible" variants={sectionVariants}>
        <h2
          className="text-2xl font-black"
          style={{ color: theme.colors.text }}
        >
          {t('microInsurance.title')}
        </h2>
        <p className="text-sm mt-1" style={{ color: theme.colors.textMuted }}>
          {t('microInsurance.subtitle')}
        </p>
      </motion.div>

      {/* ---- Active plans ---- */}
      {activePlans.length > 0 && (
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <h3
            className="text-lg font-bold mb-3"
            style={{ color: theme.colors.primary }}
          >
            {t('microInsurance.your_coverage')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activePlans.map((ap) => (
              <motion.div
                key={ap.policyId}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{
                  background: `${ap.plan.color}10`,
                  border: `1px solid ${ap.plan.color}30`,
                }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <PlanIcon
                  name={ap.plan.icon}
                  className="h-5 w-5 mt-0.5 shrink-0"
                  style={{ color: ap.plan.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {t(ap.plan.nameKey)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currencySymbol}{ap.plan.monthlyPremium}/{t('microInsurance.month')} ·{' '}
                    {t('microInsurance.coverage_up_to')} {currencySymbol}
                    {ap.plan.coverageAmount.toLocaleString('pt-MZ')}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {ap.plan.covers.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${ap.plan.color}20`,
                          color: ap.plan.color,
                        }}
                      >
                        <CheckCircle className="h-2.5 w-2.5" />
                        {t(`microInsurance.covers.${c}`)}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ---- Available plans grid ---- */}
      <section>
        <h3 className="text-lg font-bold mb-3" style={{ color: theme.colors.text }}>
          {t('microInsurance.available_plans')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan, i) => {
            const active = isPlanActive(plan.id);
            return (
              <motion.div
                key={plan.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                className={cn(
                  'relative rounded-2xl p-5 transition-shadow hover:shadow-lg',
                  active && 'ring-2',
                )}
                style={{
                  background: `linear-gradient(145deg, ${plan.color}08, ${plan.color}15)`,
                  border: `1px solid ${plan.color}30`,
                  ...(active ? { '--tw-ring-color': plan.color } as React.CSSProperties : {}),
                }}
              >
                {/* Icon + type badge */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${plan.color}20` }}
                  >
                    <PlanIcon name={plan.icon} className="h-5 w-5" style={{ color: plan.color }} />
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                    style={{
                      background: `${plan.color}15`,
                      color: plan.color,
                    }}
                  >
                    {t(`microInsurance.type.${plan.type}`)}
                  </span>
                </div>

                {/* Name + description */}
                <h4 className="font-bold text-sm" style={{ color: theme.colors.text }}>
                  {t(plan.nameKey)}
                </h4>
                <p
                  className="text-xs mt-1 leading-relaxed"
                  style={{ color: theme.colors.textMuted }}
                >
                  {t(plan.descriptionKey)}
                </p>

                {/* Premium + coverage */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span
                    className="text-2xl font-black"
                    style={{ color: plan.color }}
                  >
                    {currencySymbol}{plan.monthlyPremium}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    /{t('microInsurance.month')}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t('microInsurance.coverage_up_to')}{' '}
                    <span className="font-semibold">
                      {currencySymbol}{plan.coverageAmount.toLocaleString('pt-MZ')}
                    </span>
                  </span>
                </div>

                {/* Coverage checkmarks */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {COVER_KEYS.map((key) => {
                    const covered = plan.covers.includes(key);
                    return (
                      <span
                        key={key}
                        className={cn(
                          'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full',
                        )}
                        style={{
                          background: covered ? `${plan.color}15` : 'transparent',
                          color: covered ? plan.color : theme.colors.textMuted,
                          opacity: covered ? 1 : 0.45,
                        }}
                      >
                        <CheckCircle className="h-3 w-3" />
                        {t(`microInsurance.covers.${key}`)}
                      </span>
                    );
                  })}
                </div>

                {/* Activate button */}
                <Button
                  className={cn('mt-4 w-full', active && 'pointer-events-none')}
                  style={{
                    backgroundColor: active
                      ? `${plan.color}40`
                      : plan.color,
                    color: active ? theme.colors.text : '#fff',
                  }}
                  disabled={active || activatingId === plan.id}
                  onClick={() => handleActivate(plan)}
                >
                  {activatingId === plan.id ? (
                    <div
                      className="h-4 w-4 animate-spin rounded-full border-2 border-transparent"
                      style={{ borderTopColor: '#fff' }}
                    />
                  ) : active ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      {t('microInsurance.active')}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1.5" />
                      {t('microInsurance.activate')}
                    </>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ---- Claim form ---- */}
      <AnimatePresence>
        {showClaimForm && (
          <motion.section
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
          >
            <div className="rounded-2xl p-5" style={{ background: theme.colors.surface }}>
              <h3
                className="text-lg font-bold mb-4"
                style={{ color: theme.colors.primary }}
              >
                {t('microInsurance.claim.title')}
              </h3>
              <InsuranceClaimForm
                activePlans={activePlans}
                currencySymbol={currencySymbol}
                onSubmit={submitClaim}
                isSubmitting={isSubmitting}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ---- Claim history ---- */}
      {claims.length > 0 && (
        <motion.section
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <h3 className="text-lg font-bold mb-3" style={{ color: theme.colors.text }}>
            {t('microInsurance.claims_history')}
          </h3>
          <div className="space-y-2">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ background: theme.colors.surface }}
              >
                <FileText
                  className="h-4 w-4 shrink-0"
                  style={{
                    color:
                      claim.status === 'approved'
                        ? '#22c55e'
                        : claim.status === 'rejected'
                          ? '#ef4444'
                          : theme.colors.primary,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {claim.planName || claim.claimType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(claim.createdAt).toLocaleDateString('pt-MZ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {currencySymbol}{claim.amountRequested.toLocaleString('pt-MZ')}
                  </p>
                  <span
                    className="text-[10px] uppercase font-semibold"
                    style={{
                      color:
                        claim.status === 'approved'
                          ? '#22c55e'
                          : claim.status === 'rejected'
                            ? '#ef4444'
                            : theme.colors.textMuted,
                    }}
                  >
                    {t(`microInsurance.claim.status.${claim.status}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ---- Toggle claim form button ---- */}
      {!showClaimForm && activePlans.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pt-2"
        >
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowClaimForm(true)}
            style={{
              borderColor: theme.colors.primary,
              color: theme.colors.primary,
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('microInsurance.submit_claim')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export default MicroInsurancePlans;
