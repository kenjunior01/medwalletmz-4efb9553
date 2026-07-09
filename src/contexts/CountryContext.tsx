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
  t: (key: string, params?: Record<string, string>) => string;
  loading: boolean;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

// Translations store
import pt from '@/i18n/pt.json';
import ptBR from '@/i18n/pt-BR.json';
import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';
import es from '@/i18n/es.json';
import fr from '@/i18n/fr.json';
import af from '@/i18n/af.json';

const translations: Record<string, any> = { pt, 'pt-BR': ptBR, en, hi, es, fr, af };

export function CountryProvider({ children }: { children: ReactNode }) {
  const { countryCode: gpsCountry } = useLocation();
  const [country, setCountry] = useState<Country | null>(null);
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem('appLocale');
    if (saved) return saved;
    // Detect browser language
    const browserLang = navigator.language.split('-')[0];
    const map: Record<string, string> = {
      'pt': 'pt',
      'en': 'en',
      'hi': 'hi',
      'es': 'es',
      'fr': 'fr',
      'af': 'af'
    };
    return map[browserLang] || 'en';
  });
  const [loading, setLoading] = useState(true);

  // Translation helper with simple placeholder support
  const t = (path: string, params?: Record<string, string>) => {
    const keys = path.split('.');
    let current = translations[locale] || translations['pt'];

    for (const key of keys) {
      if (!current || current[key] === undefined) {
        // Fallback to 'pt' if current locale doesn't have the key
        if (locale !== 'pt') {
          let fallback = translations['pt'];
          for (const fallbackKey of keys) {
            if (!fallback || fallback[fallbackKey] === undefined) {
              console.warn(`Missing translation key: ${path}`);
              return path;
            }
            fallback = fallback[fallbackKey];
          }
          current = fallback;
          break;
        }
        console.warn(`Missing translation key: ${path}`);
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

  // Helper for dynamic translation using Google Cloud (via Edge Function)
  const translateDynamic = async (text: string, target?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-translate', {
        body: { text, target_lang: target || locale, source_lang: 'pt' }
      });
      if (error) throw error;
      return data.translatedText;
    } catch (e) {
      console.warn('Dynamic translation failed', e);
      return text;
    }
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
        const { data, error } = await (supabase.from('countries' as any) as any)
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
