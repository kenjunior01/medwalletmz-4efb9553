import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from '@/contexts/LocationContext';

export interface Country {
  id: string; // ISO Code e.g. 'MZ', 'BR'
  name: string;
  currency_code: string;
  currency_symbol: string;
  phone_prefix: string;
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

interface CountryContextType {
  country: Country | null;
  allCountries: Country[];
  setCountryById: (id: string) => void;
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
  loading: boolean;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

// Translations store
import pt from '@/i18n/pt.json';
import ptBR from '@/i18n/pt-BR.json';
import en from '@/i18n/en.json';

const translations: Record<string, any> = { pt, 'pt-BR': ptBR, en };

export function CountryProvider({ children }: { children: ReactNode }) {
  const { countryCode: gpsCountry } = useLocation();
  const [country, setCountry] = useState<Country | null>(null);
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem('appLocale');
    if (saved) return saved;
    // Detect browser language
    const browserLang = navigator.language;
    return browserLang.startsWith('pt') ? (browserLang === 'pt-BR' ? 'pt-BR' : 'pt') : 'en';
  });
  const [loading, setLoading] = useState(true);

  // Translation helper
  const t = (path: string) => {
    const keys = path.split('.');
    let current = translations[locale] || translations['pt'];

    for (const key of keys) {
      if (!current || current[key] === undefined) return path;
      current = current[key];
    }
    return typeof current === 'string' ? current : path;
  };

  useEffect(() => {
    localStorage.setItem('appLocale', locale);
  }, [locale]);

  // Apply dynamic branding colors
  useEffect(() => {
    if (country?.branding_config) {
      const root = document.documentElement;
      if (country.branding_config.primary_color) {
        root.style.setProperty('--primary', country.branding_config.primary_color);
      }
      if (country.branding_config.secondary_color) {
        root.style.setProperty('--secondary', country.branding_config.secondary_color);
      }
    }
  }, [country]);

  // Sync Country with GPS/Location context
  useEffect(() => {
    if (gpsCountry && allCountries.length > 0) {
      const detected = allCountries.find(c => c.id === gpsCountry);
      if (detected && country?.id !== gpsCountry) {
        console.log(`Auto-switching country to ${gpsCountry} based on location`);
        setCountry(detected);
        localStorage.setItem('selectedCountryId', gpsCountry);

        // Auto-switch locale to country default if user hasn't manually set one
        if (!localStorage.getItem('appLocale')) {
          setLocale(detected.default_locale);
        }
      }
    }
  }, [gpsCountry, allCountries]);

  useEffect(() => {
    async function fetchCountries() {
      try {
        const { data, error } = await supabase
          .from('countries')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        setAllCountries(data || []);

        // Priority: GPS > Saved > Default
        const savedCountryId = localStorage.getItem('selectedCountryId') || 'MZ';
        const initialCountry = data?.find(c => c.id === (gpsCountry || savedCountryId)) || data?.[0] || null;

        if (initialCountry) {
          setCountry(initialCountry);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCountries();
  }, []);

  const setCountryById = (id: string) => {
    const selected = allCountries.find(c => c.id === id);
    if (selected) {
      setCountry(selected);
      localStorage.setItem('selectedCountryId', id);
      // Auto-switch locale if current one not supported in new country
      if (!selected.supported_locales.includes(locale)) {
        setLocale(selected.default_locale);
      }
    }
  };

  return (
    <CountryContext.Provider value={{
      country,
      allCountries,
      setCountryById,
      locale,
      setLocale,
      t,
      loading
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
