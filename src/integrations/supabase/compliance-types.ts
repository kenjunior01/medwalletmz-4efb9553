// ============================================================
// MedWallet Global · Compliance Engine Types
// src/integrations/supabase/compliance-types.ts
// ============================================================

export type RegionGroup =
  | 'PALOP'
  | 'SUB_SAHARAN_AFRICA'
  | 'LATAM'
  | 'SEA'
  | 'MENA'
  | 'EUROPE';

export type CertificationTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type CertificationStatus = 'pending' | 'verified' | 'suspended' | 'revoked';

export type PartnerType =
  | 'store' | 'clinic' | 'hospital' | 'lab'
  | 'doctor' | 'veterinary' | 'insurance';

export type DocumentType =
  | 'pharmacy_license' | 'medical_license' | 'lab_license' | 'veterinary_license'
  | 'insurance_license' | 'tax_certificate' | 'fire_safety' | 'health_permit'
  | 'drug_control_permit' | 'radiation_safety' | 'iso_certificate' | 'data_protection';

export type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export type AuditEventType =
  | 'certification_granted' | 'certification_revoked'
  | 'tier_upgraded' | 'tier_downgraded'
  | 'document_uploaded' | 'document_verified' | 'document_rejected' | 'document_expired'
  | 'framework_compliance_changed'
  | 'insurance_policy_issued' | 'insurance_claim_paid'
  | 'data_accessed' | 'data_exported' | 'consent_changed' | 'breach_detected';

export type InsuranceTriggerType =
  | 'consultation_no_show' | 'delivery_delay' | 'pharmacy_stockout'
  | 'appointment_cancelled' | 'telemedicine_downtime' | 'cold_chain_breach';

export type ClaimStatus =
  | 'pending' | 'auto_approved' | 'approved' | 'rejected' | 'paid';

// ============================================================
// DB Row types (espelham as tabelas SQL)
// ============================================================

export interface RegulatoryFramework {
  id: string;
  country_id: string;
  region_group: RegionGroup;
  framework_code: string;
  framework_name: string;
  authority: string;
  authority_url: string | null;
  description: string | null;
  compliance_score: number;
  mandatory: boolean;
  last_audit_date: string | null;
  next_audit_date: string | null;
  requirements: {
    items?: Array<{
      code: string;
      label: string;
      status: 'compliant' | 'partial' | 'missing';
      evidence_url?: string;
    }>;
  };
  penalties: {
    max_fine_usd?: number;
    license_revocation?: boolean;
    criminal_liability?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface PartnerCertification {
  id: string;
  partner_user_id: string;
  partner_type: PartnerType;
  country_id: string;
  certification_tier: CertificationTier;
  status: CertificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  expires_at: string | null;
  total_transactions: number;
  avg_rating: number;
  sla_compliance: number;
  iso_certified: boolean;
  iso_certificate_no: string | null;
  jci_accredited: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined
  partner_name?: string;
  partner_phone?: string;
}

export interface ComplianceDocument {
  id: string;
  partner_user_id: string;
  country_id: string;
  document_type: DocumentType;
  document_number: string | null;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  file_url: string | null;
  file_hash: string | null;
  verification_status: DocumentStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined
  partner_name?: string;
  partner_phone?: string;
  days_to_expiry?: number;
}

export interface ComplianceAuditEvent {
  id: number;
  event_type: AuditEventType;
  actor_user_id: string | null;
  partner_user_id: string | null;
  country_id: string | null;
  event_metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  previous_hash: string | null;
  event_hash: string;
  created_at: string;
  // Joined
  actor_name?: string | null;
  partner_name?: string | null;
}

export interface MicroInsuranceProduct {
  id: string;
  country_id: string;
  product_code: string;
  product_name: string;
  insurer_name: string;
  insurer_license: string | null;
  premium_amount: number;
  premium_currency: string;
  coverage_amount: number;
  trigger_type: InsuranceTriggerType;
  trigger_threshold: Record<string, any>;
  waiting_period_hours: number;
  payout_auto: boolean;
  active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MicroInsurancePolicy {
  id: string;
  product_id: string;
  user_id: string;
  country_id: string;
  policy_number: string;
  status: 'active' | 'expired' | 'cancelled' | 'claimed';
  start_date: string;
  end_date: string | null;
  premium_paid: number;
  coverage_used: number;
  payout_count: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined
  product?: MicroInsuranceProduct;
  user_name?: string;
}

export interface MicroInsuranceClaim {
  id: string;
  policy_id: string;
  user_id: string;
  country_id: string;
  claim_type: string;
  trigger_data: Record<string, any>;
  amount_requested: number;
  amount_paid: number | null;
  status: ClaimStatus;
  payout_tx_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined
  policy?: MicroInsurancePolicy;
  user_name?: string;
}

// View: v_compliance_overview
export interface ComplianceOverviewRow {
  country_id: string;
  country_name: string;
  total_frameworks: number;
  compliant_frameworks: number;
  avg_compliance_score: number;
  total_partners_certified: number;
  platinum_partners: number;
  gold_partners: number;
  silver_partners: number;
  bronze_partners: number;
  verified_partners: number;
  suspended_partners: number;
  total_documents: number;
  expired_documents: number;
  expiring_30_days: number;
  expiring_60_days: number;
  total_audit_events: number;
}

// ============================================================
// Static metadata for UI
// ============================================================

export const REGION_LABELS: Record<RegionGroup, string> = {
  PALOP: 'PALOP (Países Africanos de Língua Oficial Portuguesa)',
  SUB_SAHARAN_AFRICA: 'África Subsaariana',
  LATAM: 'América Latina',
  SEA: 'Sudeste Asiático',
  MENA: 'Médio Oriente & Norte de África',
  EUROPE: 'Europa',
};

export const REGION_FLAGS: Record<RegionGroup, string> = {
  PALOP: '🌍',
  SUB_SAHARAN_AFRICA: '🦁',
  LATAM: '🌎',
  SEA: '🌏',
  MENA: '🕌',
  EUROPE: '🇪🇺',
};

export const TIER_META: Record<CertificationTier, {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: string;
  min_transactions: number;
  min_rating: number;
  min_sla: number;
}> = {
  bronze: {
    label: 'Bronze',
    color: '#CD7F32',
    bgClass: 'bg-amber-950/40',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-700/40',
    icon: '🥉',
    min_transactions: 0,
    min_rating: 0,
    min_sla: 0,
  },
  silver: {
    label: 'Prata',
    color: '#C0C0C0',
    bgClass: 'bg-slate-800/60',
    textClass: 'text-slate-300',
    borderClass: 'border-slate-600/40',
    icon: '🥈',
    min_transactions: 50,
    min_rating: 4.0,
    min_sla: 90,
  },
  gold: {
    label: 'Ouro',
    color: '#FFD700',
    bgClass: 'bg-yellow-950/40',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-700/40',
    icon: '🥇',
    min_transactions: 500,
    min_rating: 4.5,
    min_sla: 95,
  },
  platinum: {
    label: 'Platina',
    color: '#E5E4E2',
    bgClass: 'bg-cyan-950/40',
    textClass: 'text-cyan-300',
    borderClass: 'border-cyan-700/40',
    icon: '💎',
    min_transactions: 5000,
    min_rating: 4.8,
    min_sla: 99,
  },
};

export const AUDIT_EVENT_LABELS: Record<AuditEventType, { label: string; icon: string; severity: 'info' | 'success' | 'warning' | 'critical' }> = {
  certification_granted: { label: 'Certificação concedida', icon: '✅', severity: 'success' },
  certification_revoked: { label: 'Certificação revogada', icon: '⛔', severity: 'critical' },
  tier_upgraded: { label: 'Tier elevado', icon: '⬆️', severity: 'success' },
  tier_downgraded: { label: 'Tier rebaixado', icon: '⬇️', severity: 'warning' },
  document_uploaded: { label: 'Documento enviado', icon: '📄', severity: 'info' },
  document_verified: { label: 'Documento verificado', icon: '✓', severity: 'success' },
  document_rejected: { label: 'Documento rejeitado', icon: '⚠️', severity: 'warning' },
  document_expired: { label: 'Documento expirado', icon: '⏰', severity: 'critical' },
  framework_compliance_changed: { label: 'Compliance regulatória alterada', icon: '🔧', severity: 'info' },
  insurance_policy_issued: { label: 'Apólice emitida', icon: '🛡️', severity: 'info' },
  insurance_claim_paid: { label: 'Sinistro pago', icon: '💸', severity: 'success' },
  data_accessed: { label: 'Dados acedidos', icon: '👁️', severity: 'info' },
  data_exported: { label: 'Dados exportados', icon: '📤', severity: 'warning' },
  consent_changed: { label: 'Consentimento alterado', icon: '🔄', severity: 'info' },
  breach_detected: { label: 'Violação detectada', icon: '🚨', severity: 'critical' },
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  pharmacy_license: 'Licença de Farmácia',
  medical_license: 'Licença Médica',
  lab_license: 'Licença de Laboratório',
  veterinary_license: 'Licença Veterinária',
  insurance_license: 'Licença de Seguros',
  tax_certificate: 'Certidão Fiscal',
  fire_safety: 'Certificado de Segurança contra Incêndio',
  health_permit: 'Licença Sanitária',
  drug_control_permit: 'Permissão de Controlo de Estupefacientes',
  radiation_safety: 'Segurança contra Radiação',
  iso_certificate: 'Certificado ISO',
  data_protection: 'Certificado de Proteção de Dados',
};

export const TRIGGER_LABELS: Record<InsuranceTriggerType, { label: string; icon: string; description: string }> = {
  consultation_no_show: { label: 'Falta de Médico', icon: '👨‍⚕️', description: 'Médico não comparece à teleconsulta agendada' },
  delivery_delay: { label: 'Atraso de Entrega', icon: '🛵', description: 'Entrega de medicamentos atrasa além do SLA' },
  pharmacy_stockout: { label: 'Ruptura de Stock', icon: '💊', description: 'Farmácia não tem medicamento prescrito' },
  appointment_cancelled: { label: 'Cancelamento', icon: '📅', description: 'Clínica cancela consulta com pouco aviso' },
  telemedicine_downtime: { label: 'Indisponibilidade Plataforma', icon: '🖥️', description: 'Plataforma de telemedicina cai durante consulta' },
  cold_chain_breach: { label: 'Quebra de Cadeia de Frio', icon: '🧊', description: 'Vacinas/insulina saem da temperatura segura' },
};

export const COUNTRY_FLAG_EMOJI: Record<string, string> = {
  MZ: '🇲🇿', BR: '🇧🇷', PT: '🇵🇹', AO: '🇦🇴', CV: '🇨🇻', ST: '🇸🇹', GW: '🇬🇼',
  NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', UG: '🇺🇬', ZA: '🇿🇦', TZ: '🇹🇿',
  MX: '🇲🇽', CO: '🇨🇴', PE: '🇵🇪', AR: '🇦🇷', CL: '🇨🇱',
  ID: '🇮🇩', PH: '🇵🇭', VN: '🇻🇳', TH: '🇹🇭',
  AE: '🇦🇪', SA: '🇸🇦', QA: '🇶🇦', BH: '🇧🇭', KW: '🇰🇼', OM: '🇴🇲',
  ES: '🇪🇸', FR: '🇫🇷', IT: '🇮🇹', DE: '🇩🇪', GB: '🇬🇧',
  IN: '🇮🇳', US: '🇺🇸',
};
