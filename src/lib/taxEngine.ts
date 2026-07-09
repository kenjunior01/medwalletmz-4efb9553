/**
 * MedWallet Global Tax Engine
 * Calculates dynamic taxes (IVA, VAT, GST, Sales Tax) based on country and service type.
 */

export interface TaxBreakdown {
  rate: number;
  amount: number;
  name: string; // IVA, VAT, etc.
}

export interface TaxConfig {
  countryId: string;
  serviceTaxes: Record<string, number>; // e.g., { 'pharmacy': 0.17, 'consultation': 0.05 }
  defaultRate: number;
  taxName: string;
}

const COUNTRY_TAX_CONFIGS: Record<string, TaxConfig> = {
  'MZ': {
    countryId: 'MZ',
    taxName: 'IVA',
    defaultRate: 0.17,
    serviceTaxes: {
      'pharmacy': 0.17,
      'consultation': 0, // Healthcare often exempt or lower in MZ
      'lab': 0.17
    }
  },
  'ZA': {
    countryId: 'ZA',
    taxName: 'VAT',
    defaultRate: 0.15,
    serviceTaxes: {
      'pharmacy': 0.15,
      'consultation': 0.15
    }
  },
  'PT': {
    countryId: 'PT',
    taxName: 'IVA',
    defaultRate: 0.23,
    serviceTaxes: {
      'pharmacy': 0.06, // Reduced rate for meds in Portugal
      'consultation': 0
    }
  },
  'BR': {
    countryId: 'BR',
    taxName: 'ISS/ICMS',
    defaultRate: 0.12,
    serviceTaxes: {
      'pharmacy': 0.18,
      'consultation': 0.05
    }
  },
  'FR': {
    countryId: 'FR',
    taxName: 'TVA',
    defaultRate: 0.20,
    serviceTaxes: {
      'pharmacy': 0.021, // Special reduced rate for reimbursed drugs in France
      'consultation': 0
    }
  },
  'ES': {
    countryId: 'ES',
    taxName: 'IVA',
    defaultRate: 0.21,
    serviceTaxes: {
      'pharmacy': 0.04, // Super-reduced rate for meds in Spain
      'consultation': 0
    }
  },
  'IN': {
    countryId: 'IN',
    taxName: 'GST',
    defaultRate: 0.18,
    serviceTaxes: {
      'pharmacy': 0.12,
      'consultation': 0
    }
  },
  'US': {
    countryId: 'US',
    taxName: 'Sales Tax',
    defaultRate: 0.08,
    serviceTaxes: {
      'pharmacy': 0, // Prescription drugs often exempt in many US states
      'consultation': 0
    }
  },
  'GB': {
    countryId: 'GB',
    taxName: 'VAT',
    defaultRate: 0.20,
    serviceTaxes: {
      'pharmacy': 0, // Prescriptions are zero-rated in UK
      'consultation': 0
    }
  }
};

export function calculateTaxes(
  subtotal: number,
  countryId: string = 'MZ',
  serviceType: string = 'pharmacy'
): TaxBreakdown {
  const config = COUNTRY_TAX_CONFIGS[countryId] || COUNTRY_TAX_CONFIGS['MZ'];
  const rate = config.serviceTaxes[serviceType] ?? config.defaultRate;

  return {
    rate,
    amount: Math.round(subtotal * rate),
    name: config.taxName
  };
}
