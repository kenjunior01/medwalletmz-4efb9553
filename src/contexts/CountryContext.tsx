import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from '@/contexts/LocationContext';
import { hexToHslComponents } from '@/lib/colors';

// Translations store
import pt from '@/i18n/pt.json';
import ptBR from '@/i18n/pt-BR.json';
import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';
import es from '@/i18n/es.json';
import fr from '@/i18n/fr.json';
import af from '@/i18n/af.json';

const translations: Record<string, any> = { pt, 'pt-BR': ptBR, en, hi, es, fr, af };

export interface Country {
  id: string; // ISO Code e.g. 'MZ', 'BR'
  name: string;
  currency_code: string;
  currency_symbol: string;
  phone_code: string;
  flag_url?: string;
  default_locale: string;
  supported_locales: string[];
  timezone: string;
  branding_config?: {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    home_banner_url?: string;
  };
  config: any;
}

const STATIC_COUNTRIES: Country[] = [
  {
    id: 'MZ', name: 'Moçambique', currency_code: 'MZN', currency_symbol: 'MT', phone_code: '258',
    default_locale: 'pt', supported_locales: ['pt', 'en'], timezone: 'Africa/Maputo',
    branding_config: {
      primary_color: '#009739',   // Verde Moçambique
      secondary_color: '#FFD100', // Amarelo
      accent_color: '#D40000',    // Vermelho
    },
    config: {
      health_categories: ['pharmacy', 'clinic', 'hospital', 'laboratory', 'veterinary'],
      phone_placeholder: "+258 8X XXX XXXX",
      registration_defaults: {
        consultation_fee: 500,
        delivery_fee: 50,
        reward_amount: 25,
        vehicle_plate: "ABC-123-MZ"
      },
      payment_methods: [
        { id: "mpesa", name: "M-Pesa", type: "mobile_money", icon: "📱", description: "Vodacom M-Pesa", requires_phone: true },
        { id: "emola", name: "e-Mola", type: "mobile_money", icon: "💰", description: "Movitel e-Mola", requires_phone: true },
        { id: "mkesh", name: "Mkesh", type: "mobile_money", icon: "🏦", description: "BCI Mkesh", requires_phone: true },
        { id: "wallet", name: "Carteira MedWallet", type: "wallet", icon: "💳", description: "Débito do saldo MZN", badge: "Instantâneo" }
      ],
      support: {
        whatsapp: "258848547887",
        phone: "+258 84 854 7887",
        email: "suporte@medwallet.co.mz"
      }
    }
  },
  {
    id: 'BR', name: 'Brasil', currency_code: 'BRL', currency_symbol: 'R$', phone_code: '55',
    default_locale: 'pt-BR', supported_locales: ['pt-BR', 'en', 'es'], timezone: 'America/Sao_Paulo',
    branding_config: {
      primary_color: '#009C3B',   // Verde bandeira
      secondary_color: '#FFDF00', // Amarelo bandeira
      accent_color: '#002776',    // Azul bandeira
    },
    config: {
      cities: [
        "São Paulo","Rio de Janeiro","Belo Horizonte","Brasília","Salvador",
        "Fortaleza","Curitiba","Recife","Porto Alegre","Manaus","Belém",
        "Goiânia","Campinas","Guarulhos","Florianópolis","Vitória","Natal",
        "João Pessoa","Maceió","Cuiabá","Campo Grande","Teresina","Aracaju",
        "São Luís","Palmas","Rio Branco","Boa Vista","Macapá","Porto Velho"
      ],
      health_categories: ['pharmacy','clinic','hospital','laboratory','veterinary'],
      phone_placeholder: "+55 (XX) 9XXXX-XXXX",
      registration_defaults: {
        consultation_fee: 150,
        delivery_fee: 15,
        vehicle_plate: "ABC1D23"
      },
      payment_methods: [
        { id: "pix", name: "PIX", type: "mobile_money", icon: "💎", description: "Pagamento instantâneo BCB", requires_phone: true, badge: "Instantâneo" },
        { id: "stripe", name: "Cartão de Crédito", type: "card", icon: "💳", description: "Visa/Mastercard/Elo via Stripe" },
        { id: "boleto", name: "Boleto Bancário", type: "bank", icon: "🏦", description: "Compensação em até 3 dias úteis" },
        { id: "wallet", name: "Carteira MedWallet", type: "wallet", icon: "👛", description: "Saldo em Reais (BRL)" }
      ],
      support: {
        whatsapp: "5511999999999",
        phone: "+55 11 99999-9999",
        email: "suporte.br@medwallet.com"
      }
    }
  },
  {
    id: 'AO', name: 'Angola', currency_code: 'AOA', currency_symbol: 'Kz', phone_code: '244',
    default_locale: 'pt', supported_locales: ['pt', 'en'], timezone: 'Africa/Luanda',
    config: {
      cities: ["Luanda", "Benguela", "Huambo", "Lubango", "Cabinda", "Malanje", "Namibe"],
      phone_placeholder: "+244 9XX XXX XXX",
      registration_defaults: {
        consultation_fee: 5000,
        delivery_fee: 1000,
        vehicle_plate: "LD-00-00-AA"
      },
      payment_methods: [
        { id: "unitel_money", name: "Unitel Money", type: "mobile_money", icon: "📱", description: "Pagamento Unitel", requires_phone: true },
        { id: "multicaixa", name: "Multicaixa Express", type: "bank", icon: "🏦", description: "Referência Multicaixa" },
        { id: "wallet", name: "Carteira MedWallet", type: "wallet", icon: "👛", description: "Saldo em Kwanzas" }
      ],
      support: {
        whatsapp: "244999999999",
        phone: "+244 999 999 999",
        email: "suporte.ao@medwallet.com"
      }
    }
  },
  {
    id: 'ZA', name: 'South Africa', currency_code: 'ZAR', currency_symbol: 'R', phone_code: '27',
    default_locale: 'en', supported_locales: ['en', 'af'], timezone: 'Africa/Johannesburg',
    config: {
      cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein"],
      phone_placeholder: "+27 XX XXX XXXX",
      registration_defaults: {
        consultation_fee: 400,
        delivery_fee: 60,
        vehicle_plate: "ABC 123 GP"
      },
      payment_methods: [
        { id: "paystack", name: "Paystack", type: "card", icon: "💳", description: "Card or Bank Transfer" },
        { id: "ozow", name: "Ozow", type: "bank", icon: "🇿🇦", description: "Instant EFT" },
        { id: "wallet", name: "MedWallet (ZAR)", type: "wallet", icon: "👛", description: "Pay with ZAR balance" }
      ],
      support: {
        whatsapp: "27119999999",
        phone: "+27 11 999 9999",
        email: "support.za@medwallet.com"
      }
    }
  },
  {
    id: 'PT', name: 'Portugal', currency_code: 'EUR', currency_symbol: '€', phone_code: '351',
    default_locale: 'pt', supported_locales: ['pt', 'en'], timezone: 'Europe/Lisbon',
    config: {
      cities: ["Lisboa", "Porto", "Braga", "Coimbra", "Setúbal", "Aveiro", "Faro"],
      phone_placeholder: "+351 9XX XXX XXX",
      registration_defaults: {
        consultation_fee: 40,
        delivery_fee: 5,
        vehicle_plate: "AA-00-AA"
      },
      payment_methods: [
        { id: "mbway", name: "MB WAY", type: "mobile_money", icon: "📱", description: "Pagamento MB WAY", requires_phone: true },
        { id: "stripe", name: "Stripe", type: "card", icon: "💳", description: "Cartão de Crédito/Débito" },
        { id: "wallet", name: "Carteira MedWallet", type: "wallet", icon: "👛", description: "Saldo em Euros" }
      ],
      support: {
        whatsapp: "351999999999",
        phone: "+351 999 999 999",
        email: "suporte.pt@medwallet.com"
      }
    }
  },
  {
    id: 'IN', name: 'India', currency_code: 'INR', currency_symbol: '₹', phone_code: '91',
    default_locale: 'hi', supported_locales: ['hi', 'en'], timezone: 'Asia/Kolkata',
    config: {
      cities: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata"],
      phone_placeholder: "+91 XXXXX-XXXXX",
      registration_defaults: {
        consultation_fee: 800,
        delivery_fee: 100,
        vehicle_plate: "MH 01 AB 1234"
      },
      payment_methods: [
        { id: "upi", name: "UPI", type: "mobile_money", icon: "📱", description: "GPay / PhonePe / Paytm", requires_phone: true },
        { id: "card", name: "Credit/Debit Card", type: "card", icon: "💳", description: "Visa/Mastercard via Razorpay" },
        { id: "wallet", name: "MedWallet (INR)", type: "wallet", icon: "👛", description: "Pay with INR balance" }
      ],
      support: {
        whatsapp: "919999999999",
        phone: "+91 999 999 9999",
        email: "support.in@medwallet.com"
      }
    }
  }
];

interface CountryContextType {
  country: Country | null;
  allCountries: Country[];
  setCountryById: (id: string) => void;
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
  loading: boolean;
  reload: () => Promise<void>;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export function CountryProvider({ children }: { children: ReactNode }) {
  const { countryCode: gpsCountry, setCountryCode } = useLocation();
  const [country, setCountry] = useState<Country | null>(null);
  const [allCountries, setAllCountries] = useState<Country[]>(STATIC_COUNTRIES);
  const [locale, setLocale] = useState(() => {
    try {
      const saved = localStorage.getItem('appLocale');
      if (saved) return saved;
    } catch (e) {
      console.warn('LocalStorage blocked', e);
    }

    const browserLang = navigator.language.split('-')[0];
    const map: Record<string, string> = {
      'pt': 'pt', 'en': 'en', 'hi': 'hi', 'es': 'es', 'fr': 'fr', 'af': 'af'
    };
    return map[browserLang] || 'en';
  });
  const [loading, setLoading] = useState(true);

  const t = (path: string, params?: Record<string, string>) => {
    const keys = path.split('.');
    let current = translations[locale] || translations['pt'];

    for (const key of keys) {
      if (!current || current[key] === undefined) {
        if (locale !== 'pt') {
          let fallback = translations['pt'];
          for (const fallbackKey of keys) {
            if (!fallback || fallback[fallbackKey] === undefined) return path;
            fallback = fallback[fallbackKey];
          }
          current = fallback;
          break;
        }
        return path;
      }
      current = current[key];
    }

    if (typeof current !== 'string') return path;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        current = (current as string).replace(`{{${key}}}`, value);
      });
    }
    return current;
  };

  useEffect(() => {
    localStorage.setItem('appLocale', locale);
  }, [locale]);

  useEffect(() => {
    if (country?.branding_config) {
      const root = document.documentElement;
      const { primary_color, secondary_color, accent_color } = country.branding_config;
      if (primary_color) root.style.setProperty('--primary', hexToHslComponents(primary_color));
      if (secondary_color) root.style.setProperty('--secondary', hexToHslComponents(secondary_color));
      if (accent_color) root.style.setProperty('--accent', hexToHslComponents(accent_color));
    }
  }, [country]);

  useEffect(() => {
    if (gpsCountry && allCountries.length > 0) {
      const detected = allCountries.find(c => c.id === gpsCountry);
      if (detected && country?.id !== gpsCountry) {
        setCountry(detected);
        if (!localStorage.getItem('appLocale')) setLocale(detected.default_locale);
      }
    }
  }, [gpsCountry, allCountries]);

  useEffect(() => {
    fetchCountries();
  }, []);

  async function fetchCountries() {
    try {
      setLoading(true);
      const { data, error } = await (supabase.from('countries' as any) as any)
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.warn('Countries table query failed, using static definitions:', error.message);
        const initialCountry = STATIC_COUNTRIES.find(c => c.id === gpsCountry) || STATIC_COUNTRIES[0];
        setCountry(initialCountry);
        return;
      }

      // Merge DB results with static definitions to ensure we have regions/config
      const merged = (data || []).map((dbC: any) => {
        const staticC = STATIC_COUNTRIES.find(s => s.id === dbC.id);
        return { ...staticC, ...dbC };
      });

      setAllCountries(merged.length > 0 ? merged : STATIC_COUNTRIES);
      const savedCountryId = localStorage.getItem('selectedCountryId') || gpsCountry;
      const initialCountry = merged.find((c: any) => c.id === savedCountryId) || merged[0] || STATIC_COUNTRIES[0];
      if (initialCountry) setCountry(initialCountry);
    } catch (error) {
      console.error('Error fetching countries:', error);
      setCountry(STATIC_COUNTRIES[0]);
    } finally {
      setLoading(false);
    }
  }

  const setCountryById = (id: string) => {
    const selected = allCountries.find(c => c.id === id);
    if (selected) {
      setCountry(selected);
      localStorage.setItem('selectedCountryId', id);
      setCountryCode(id); // This also updates city and persistence in LocationContext
      if (!selected.supported_locales?.includes(locale)) setLocale(selected.default_locale);
    }
  };

  return (
    <CountryContext.Provider value={{
      country, allCountries, setCountryById, locale, setLocale, t, loading, reload: fetchCountries
    }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
}
