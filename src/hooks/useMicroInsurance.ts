// ============================================================
// useMicroInsurance · Hook for user-facing micro-insurance
// src/hooks/useMicroInsurance.ts
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface InsurancePlan {
  id: string;
  nameKey: string;
  descriptionKey: string;
  type: 'individual' | 'family';
  monthlyPremium: number;
  currency: string;
  coverageAmount: number;
  covers: string[];
  isActive: boolean;
  icon: string;
  color: string;
}

export interface ActivePlan {
  policyId: string;
  plan: InsurancePlan;
  startDate: string;
  endDate: string | null;
  status: 'active' | 'expired' | 'cancelled' | 'claimed';
  premiumPaid: number;
  coverageUsed: number;
}

export interface InsuranceClaim {
  id: string;
  policyId: string;
  claimType: string;
  amountRequested: number;
  amountPaid: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  description: string;
  createdAt: string;
  planName?: string;
}

// ----------------------------------------------------------------
// Default plans for MZ market (realistic 50-500 MT/month)
// ----------------------------------------------------------------

export const MZ_MICRO_INSURANCE_PLANS: InsurancePlan[] = [
  {
    id: 'mz-basic',
    nameKey: 'microInsurance.plans.basic.name',
    descriptionKey: 'microInsurance.plans.basic.description',
    type: 'individual',
    monthlyPremium: 75,
    currency: 'MZN',
    coverageAmount: 5000,
    covers: ['consultation', 'prescription'],
    isActive: true,
    icon: 'Shield',
    color: '#009739',
  },
  {
    id: 'mz-plus',
    nameKey: 'microInsurance.plans.plus.name',
    descriptionKey: 'microInsurance.plans.plus.description',
    type: 'individual',
    monthlyPremium: 175,
    currency: 'MZN',
    coverageAmount: 15000,
    covers: ['consultation', 'prescription', 'lab', 'dental'],
    isActive: true,
    icon: 'Heart',
    color: '#1E88E5',
  },
  {
    id: 'mz-family',
    nameKey: 'microInsurance.plans.family.name',
    descriptionKey: 'microInsurance.plans.family.description',
    type: 'family',
    monthlyPremium: 350,
    currency: 'MZN',
    coverageAmount: 30000,
    covers: ['consultation', 'prescription', 'lab', 'dental', 'emergency'],
    isActive: true,
    icon: 'Users',
    color: '#FF6F00',
  },
  {
    id: 'mz-emergency',
    nameKey: 'microInsurance.plans.emergency.name',
    descriptionKey: 'microInsurance.plans.emergency.description',
    type: 'individual',
    monthlyPremium: 50,
    currency: 'MZN',
    coverageAmount: 10000,
    covers: ['emergency'],
    isActive: true,
    icon: 'AlertTriangle',
    color: '#D32F2F',
  },
  {
    id: 'mz-complete',
    nameKey: 'microInsurance.plans.complete.name',
    descriptionKey: 'microInsurance.plans.complete.description',
    type: 'family',
    monthlyPremium: 500,
    currency: 'MZN',
    coverageAmount: 75000,
    covers: ['consultation', 'prescription', 'emergency', 'lab', 'dental'],
    isActive: true,
    icon: 'Stethoscope',
    color: '#6A1B9A',
  },
];

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------

export function useMicroInsurance() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // All available plans (static for MZ, could be fetched from Supabase later)
  const plansQuery = useQuery({
    queryKey: ['micro-insurance-plans'],
    queryFn: async (): Promise<InsurancePlan[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('micro_insurance_products')
          .select('*')
          .eq('country_id', 'MZ')
          .eq('active', true);

        if (!error && data && data.length > 0) {
          return data.map(mapDbToPlan);
        }
      } catch {
        // Table may not exist yet — fall back to static list
      }
      return MZ_MICRO_INSURANCE_PLANS;
    },
    staleTime: 5 * 60_000,
  });

  // User's active policies
  const activePlansQuery = useQuery({
    queryKey: ['my-micro-insurance-policies', user?.id],
    queryFn: async (): Promise<ActivePlan[]> => {
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('micro_insurance_policies')
        .select('*, product:micro_insurance_products!product_id(*)')
        .eq('user_id', user.id)
        .in('status', ['active'])
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any) => {
        const product = Array.isArray(row.product) ? row.product[0] : row.product;
        const plan = product ? mapDbToPlan(product) : MZ_MICRO_INSURANCE_PLANS[0];
        return {
          policyId: row.id,
          plan,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.status,
          premiumPaid: Number(row.premium_paid ?? 0),
          coverageUsed: Number(row.coverage_used ?? 0),
        };
      });
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // User's claim history
  const claimsQuery = useQuery({
    queryKey: ['my-micro-insurance-claims', user?.id],
    queryFn: async (): Promise<InsuranceClaim[]> => {
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from('micro_insurance_claims')
        .select('*, policy:micro_insurance_policies!policy_id(*, product:micro_insurance_products!product_id(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !data) return [];

      return data.map((row: any) => {
        const policy = Array.isArray(row.policy) ? row.policy[0] : row.policy;
        const product = policy?.product
          ? (Array.isArray(policy.product) ? policy.product[0] : policy.product)
          : null;
        return {
          id: row.id,
          policyId: row.policy_id,
          claimType: row.claim_type,
          amountRequested: Number(row.amount_requested ?? 0),
          amountPaid: row.amount_paid ? Number(row.amount_paid) : null,
          status: row.status,
          description: row.metadata?.description ?? '',
          createdAt: row.created_at,
          planName: product?.product_name ?? undefined,
        };
      });
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  // Activate (subscribe to) a plan
  const activatePlan = useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error('microInsurance.error_auth');

      const plan = MZ_MICRO_INSURANCE_PLANS.find(p => p.id === planId);
      if (!plan) throw new Error('microInsurance.error_plan_not_found');

      const { data, error } = await (supabase as any)
        .from('micro_insurance_policies')
        .insert({
          product_id: planId,
          user_id: user.id,
          country_id: 'MZ',
          policy_number: `MZ-${Date.now()}`,
          status: 'active',
          start_date: new Date().toISOString(),
          premium_paid: plan.monthlyPremium,
          coverage_used: 0,
          payout_count: 0,
          metadata: { source: 'micro_insurance_component' },
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-micro-insurance-policies'] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  // Submit a claim
  const submitClaim = useMutation({
    mutationFn: async (params: {
      policyId: string;
      claimType: string;
      amount: number;
      description: string;
    }) => {
      if (!user) throw new Error('microInsurance.error_auth');

      const { data, error } = await (supabase as any)
        .from('micro_insurance_claims')
        .insert({
          policy_id: params.policyId,
          user_id: user.id,
          country_id: 'MZ',
          claim_type: params.claimType,
          amount_requested: params.amount,
          status: 'pending',
          metadata: { description: params.description, source: 'micro_insurance_component' },
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-micro-insurance-claims'] });
      qc.invalidateQueries({ queryKey: ['my-micro-insurance-policies'] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  return {
    plans: plansQuery.data ?? MZ_MICRO_INSURANCE_PLANS,
    plansLoading: plansQuery.isLoading,
    activePlans: activePlansQuery.data ?? [],
    activePlansLoading: activePlansQuery.isLoading,
    claims: claimsQuery.data ?? [],
    claimsLoading: claimsQuery.isLoading,
    activatePlan: activatePlan.mutateAsync,
    isActivating: activatePlan.isPending,
    submitClaim: submitClaim.mutateAsync,
    isSubmitting: submitClaim.isPending,
    isLoading: plansQuery.isLoading || activePlansQuery.isLoading || claimsQuery.isLoading,
  };
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function mapDbToPlan(row: any): InsurancePlan {
  const covers: string[] = [];
  if (row.metadata?.covers) {
    covers.push(...(Array.isArray(row.metadata.covers) ? row.metadata.covers : []));
  }
  return {
    id: row.id,
    nameKey: row.product_name || 'microInsurance.unknown',
    descriptionKey: row.product_name ? `microInsurance.plan.${row.product_code}` : 'microInsurance.unknown',
    type: row.metadata?.type === 'family' ? 'family' : 'individual',
    monthlyPremium: Number(row.premium_amount ?? 0),
    currency: row.premium_currency || 'MZN',
    coverageAmount: Number(row.coverage_amount ?? 0),
    covers: covers.length > 0 ? covers : ['consultation'],
    isActive: Boolean(row.active),
    icon: row.metadata?.icon || 'Shield',
    color: row.metadata?.color || '#009739',
  };
}
