// ============================================================
// useCompliance · Hook de dados para o Compliance Command Center
// src/hooks/useCompliance.ts
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  RegulatoryFramework,
  PartnerCertification,
  ComplianceDocument,
  ComplianceAuditEvent,
  MicroInsuranceProduct,
  MicroInsurancePolicy,
  MicroInsuranceClaim,
  ComplianceOverviewRow,
  CertificationTier,
  DocumentStatus,
} from '@/integrations/supabase/compliance-types';

// ============================================================
// QUERIES
// ============================================================

export function useComplianceOverview() {
  return useQuery({
    queryKey: ['compliance-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_compliance_overview' as any)
        .select('*')
        .order('country_name');
      if (error) throw error;
      return (data || []) as unknown as ComplianceOverviewRow[];
    },
    staleTime: 30_000,
  });
}

export function useRegulatoryFrameworks(countryId?: string) {
  return useQuery({
    queryKey: ['regulatory-frameworks', countryId],
    queryFn: async () => {
      let q = supabase.from('regulatory_frameworks' as any).select('*').order('framework_name');
      if (countryId) q = q.eq('country_id', countryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as RegulatoryFramework[];
    },
    staleTime: 60_000,
  });
}

export function usePartnerCertifications(countryId?: string, filters?: { tier?: CertificationTier; status?: string }) {
  return useQuery({
    queryKey: ['partner-certifications', countryId, filters],
    queryFn: async () => {
      let q = supabase
        .from('partner_certifications' as any)
        .select('*, partner:profiles!partner_user_id(full_name, phone)')
        .order('created_at', { ascending: false });
      if (countryId) q = q.eq('country_id', countryId);
      if (filters?.tier) q = q.eq('certification_tier', filters.tier);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        partner_name: d.partner?.full_name,
        partner_phone: d.partner?.phone,
      })) as unknown as PartnerCertification[];
    },
    staleTime: 30_000,
  });
}

export function useComplianceDocuments(countryId?: string, expiringOnly = false) {
  return useQuery({
    queryKey: ['compliance-documents', countryId, expiringOnly],
    queryFn: async () => {
      let q = supabase
        .from('compliance_documents' as any)
        .select('*, partner:profiles!partner_user_id(full_name, phone)')
        .order('expiry_date', { ascending: true });
      if (countryId) q = q.eq('country_id', countryId);
      if (expiringOnly) {
        const future = new Date();
        future.setDate(future.getDate() + 90);
        q = q.lte('expiry_date', future.toISOString().slice(0, 10));
      }
      const { data, error } = await q;
      if (error) throw error;

      const today = new Date();
      return (data || []).map((d: any) => {
        const expiry = new Date(d.expiry_date);
        const diffMs = expiry.getTime() - today.getTime();
        return {
          ...d,
          partner_name: d.partner?.full_name,
          partner_phone: d.partner?.phone,
          days_to_expiry: Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
        };
      }) as unknown as ComplianceDocument[];
    },
    staleTime: 30_000,
  });
}

export function useAuditTrail(countryId?: string, limit = 50) {
  return useQuery({
    queryKey: ['audit-trail', countryId, limit],
    queryFn: async () => {
      let q = supabase
        .from('compliance_audit_trail' as any)
        .select('*, actor:profiles!actor_user_id(full_name), partner:profiles!partner_user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (countryId) q = q.eq('country_id', countryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        actor_name: d.actor?.full_name,
        partner_name: d.partner?.full_name,
      })) as unknown as ComplianceAuditEvent[];
    },
    staleTime: 15_000,
  });
}

export function useMicroInsuranceProducts(countryId?: string) {
  return useQuery({
    queryKey: ['micro-insurance-products', countryId],
    queryFn: async () => {
      let q = supabase.from('micro_insurance_products' as any).select('*').order('country_id');
      if (countryId) q = q.eq('country_id', countryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as MicroInsuranceProduct[];
    },
    staleTime: 60_000,
  });
}

export function useMicroInsuranceClaims(countryId?: string, limit = 50) {
  return useQuery({
    queryKey: ['micro-insurance-claims', countryId, limit],
    queryFn: async () => {
      let q = supabase
        .from('micro_insurance_claims' as any)
        .select('*, policy:micro_insurance_policies!policy_id(*, product:micro_insurance_products!product_id(*)), user:profiles!user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (countryId) q = q.eq('country_id', countryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        policy: Array.isArray(d.policy) ? d.policy[0] : d.policy,
        user_name: Array.isArray(d.user) ? d.user[0]?.full_name : d.user?.full_name,
      })) as unknown as MicroInsuranceClaim[];
    },
    staleTime: 30_000,
  });
}

// ============================================================
// MUTATIONS
// ============================================================

export function useUpgradePartnerTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ partnerUserId, newTier, countryId, reason }: {
      partnerUserId: string;
      newTier: CertificationTier;
      countryId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('fn_upgrade_partner_tier' as any, {
        p_partner_user_id: partnerUserId,
        p_new_tier: newTier,
        p_country_id: countryId,
        p_reason: reason || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-certifications'] });
      qc.invalidateQueries({ queryKey: ['audit-trail'] });
      qc.invalidateQueries({ queryKey: ['compliance-overview'] });
      toast.success('Tier atualizado e evento registrado no audit trail.');
    },
    onError: (e: any) => toast.error('Erro ao atualizar tier: ' + e.message),
  });
}

export function useVerifyDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, action, reason }: {
      documentId: string;
      action: 'verify' | 'reject';
      reason?: string;
    }) => {
      const status: DocumentStatus = action === 'verify' ? 'verified' : 'rejected';
      const { error } = await (supabase as any)
        .from('compliance_documents')
        .update({
          verification_status: status,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString(),
          rejection_reason: action === 'reject' ? reason : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      if (error) throw error;

      // Log audit event
      await supabase.rpc('fn_log_compliance_event' as any, {
        p_event_type: action === 'verify' ? 'document_verified' : 'document_rejected',
        p_country_id: null,
        p_metadata: { document_id: documentId, reason },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-documents'] });
      qc.invalidateQueries({ queryKey: ['audit-trail'] });
      toast.success('Documento processado.');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

export function useApproveClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ claimId, action, reason }: {
      claimId: string;
      action: 'approve' | 'reject';
      reason?: string;
    }) => {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const { error } = await (supabase as any)
        .from('micro_insurance_claims')
        .update({
          status,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: action === 'reject' ? reason : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['micro-insurance-claims'] });
      qc.invalidateQueries({ queryKey: ['audit-trail'] });
      toast.success('Sinistro processado.');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}
