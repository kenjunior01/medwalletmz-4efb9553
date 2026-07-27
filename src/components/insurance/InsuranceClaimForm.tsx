import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Loader2 } from "@/components/icons/lucide-compat";
import { toast } from 'sonner';
import type { ActivePlan } from '@/hooks/useMicroInsurance';

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const claimSchema = z.object({
  policyId: z.string().min(1, 'microInsurance.submit_validation.policy_required'),
  claimType: z.string().min(1, 'microInsurance.submit_validation.claim_type_required'),
  amount: z
    .number({ invalid_type_error: 'microInsurance.submit_validation.amount_invalid' })
    .positive('microInsurance.submit_validation.amount_positive')
    .max(999999, 'microInsurance.submit_validation.amount_too_large'),
  description: z
    .string()
    .min(10, 'microInsurance.submit_validation.description_min')
    .max(500, 'microInsurance.submit_validation.description_max'),
});

type ClaimFormValues = z.infer<typeof claimSchema>;

// ----------------------------------------------------------------
// Claim type options
// ----------------------------------------------------------------

const CLAIM_TYPES = [
  { value: 'consultation', key: 'microInsurance.claim.types.consultation' },
  { value: 'prescription', key: 'microInsurance.claim.types.prescription' },
  { value: 'emergency', key: 'microInsurance.claim.types.emergency' },
] as const;

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

interface InsuranceClaimFormProps {
  activePlans: ActivePlan[];
  currencySymbol: string;
  onSubmit: (params: {
    policyId: string;
    claimType: string;
    amount: number;
    description: string;
  }) => Promise<unknown>;
  isSubmitting: boolean;
}

export function InsuranceClaimForm({
  activePlans,
  currencySymbol,
  onSubmit,
  isSubmitting,
}: InsuranceClaimFormProps) {
  const { t } = useCountry();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      policyId: '',
      claimType: '',
      amount: undefined,
      description: '',
    },
  });

  const onValid = async (values: ClaimFormValues) => {
    try {
      await onSubmit({
        policyId: values.policyId,
        claimType: values.claimType,
        amount: values.amount,
        description: values.description,
      });
      toast.success(t('microInsurance.claim.success'));
      setSubmitted(true);
      reset();
      setTimeout(() => setSubmitted(false), 3000);
    } catch {
      toast.error(t('microInsurance.claim.error'));
    }
  };

  if (activePlans.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-muted-foreground/25 p-8 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          {t('microInsurance.claim.no_active_plan')}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      {/* Plan selector */}
      <div className="space-y-2">
        <Label>{t('microInsurance.claim.select_plan')}</Label>
        <Select onValueChange={(v) => setValue('policyId', v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('microInsurance.claim.select_plan_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {activePlans.map((ap) => (
              <SelectItem key={ap.policyId} value={ap.policyId}>
                {t(ap.plan.nameKey)} — {currencySymbol}
                {ap.plan.monthlyPremium}/{t('microInsurance.month')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.policyId && (
          <p className="text-xs text-destructive">{t(errors.policyId.message!)}</p>
        )}
      </div>

      {/* Claim type */}
      <div className="space-y-2">
        <Label>{t('microInsurance.claim.claim_type_label')}</Label>
        <Select onValueChange={(v) => setValue('claimType', v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('microInsurance.claim.claim_type_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {CLAIM_TYPES.map((ct) => (
              <SelectItem key={ct.value} value={ct.value}>
                {t(ct.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.claimType && (
          <p className="text-xs text-destructive">{t(errors.claimType.message!)}</p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label>{t('microInsurance.claim.amount_label')}</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {currencySymbol}
          </span>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="pl-8"
            {...register('amount', { valueAsNumber: true })}
          />
        </div>
        {errors.amount && (
          <p className="text-xs text-destructive">{t(errors.amount.message!)}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>{t('microInsurance.claim.description_label')}</Label>
        <Textarea
          rows={3}
          placeholder={t('microInsurance.claim.description_placeholder')}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{t(errors.description.message!)}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting || submitted}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('microInsurance.claim.submitting')}
          </>
        ) : submitted ? (
          t('microInsurance.claim.submitted')
        ) : (
          t('microInsurance.claim.submit_button')
        )}
      </Button>
    </form>
  );
}
