import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface CountryConfig {
  id: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  phone_code: string;
}

interface LocationContextType {
  coordinates: Coordinates | null;
  city: string;
  countryCode: string;
  countryConfig: CountryConfig | null;
  setCity: (city: string) => void;
  setCountryCode: (code: string) => void;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
  calculateDistance: (lat: number, lng: number) => number | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Default coordinates for major hubs
const CITY_COORDINATES: Record<string, Coordinates & { country: string }> = {
  'Maputo': { latitude: -25.9692, longitude: 32.5732, country: 'MZ' },
  'Beira': { latitude: -19.8436, longitude: 34.8389, country: 'MZ' },
  'São Paulo': { latitude: -23.5505, longitude: -46.6333, country: 'BR' },
  'Rio de Janeiro': { latitude: -22.9068, longitude: -43.1729, country: 'BR' },
  'Luanda': { latitude: -8.8390, longitude: 13.2894, country: 'AO' },
  'Lisboa': { latitude: 38.7223, longitude: -9.1393, country: 'PT' },
  'Johannesburg': { latitude: -26.2041, longitude: 28.0473, country: 'ZA' },
  'Mumbai': { latitude: 19.0760, longitude: 72.8777, country: 'IN' },
};

const DEFAULT_CITY_BY_COUNTRY: Record<string, string> = {
  'MZ': 'Maputo',
  'BR': 'São Paulo',
  'AO': 'Luanda',
  'ZA': 'Johannesburg',
  'IN': 'Mumbai',
  'PT': 'Lisboa',
};

const guessCountryFromTimezone = (): string => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz.includes('Sao_Paulo') || tz.includes('Brazil')) return 'BR';
  if (tz.includes('Luanda')) return 'AO';
  if (tz.includes('Johannesburg')) return 'ZA';
  if (tz.includes('Kolkata')) return 'IN';
  if (tz.includes('Lisbon')) return 'PT';
  if (tz.includes('Maputo')) return 'MZ';
  return 'MZ';
};

export function LocationProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCodeState] = useState<string>(() => {
    try {
      return localStorage.getItem('selectedCountry') || guessCountryFromTimezone();
    } catch {
      return 'MZ';
    }
  });

  const [city, setCityState] = useState<string>(() => {
    try {
      return localStorage.getItem('selectedCity') || DEFAULT_CITY_BY_COUNTRY[countryCode] || 'Maputo';
    } catch {
      return 'Maputo';
    }
  });

  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [countryConfig, setCountryConfig] = useState<CountryConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update country code with persistence
  const setCountryCode = (code: string) => {
    setCountryCodeState(code);
    localStorage.setItem('selectedCountry', code);
    // If country changes, pick default city for that country
    const defaultCity = DEFAULT_CITY_BY_COUNTRY[code];
    if (defaultCity) {
      setCityState(defaultCity);
      localStorage.setItem('selectedCity', defaultCity);
    }
  };

  // Update city with persistence
  const setCity = (newCity: string) => {
    setCityState(newCity);
    localStorage.setItem('selectedCity', newCity);
    // If we have static coords for this city, use them
    if (CITY_COORDINATES[newCity]) {
      setCoordinates(CITY_COORDINATES[newCity]);
    }
  };

  // Fetch country settings from DB
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('countries')
        .select('*')
        .eq('id', countryCode)
        .maybeSingle();
      if (data) setCountryConfig(data as CountryConfig);
    };
    fetchConfig();
  }, [countryCode]);

  useEffect(() => {
    if (!coordinates && CITY_COORDINATES[city]) {
      setCoordinates(CITY_COORDINATES[city]);
    }
  }, [city]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLoading(false);
      },
      (err) => {
        setError('Não foi possível obter a localização');
        setLoading(false);
        if (CITY_COORDINATES[city]) {
          setCoordinates(CITY_COORDINATES[city]);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const calculateDistance = (lat: number, lng: number): number | null => {
    if (!coordinates) return null;
    const R = 6371;
    const dLat = (lat - coordinates.latitude) * Math.PI / 180;
    const dLon = (lng - coordinates.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coordinates.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <LocationContext.Provider value={{
      coordinates,
      city,
      countryCode,
      countryConfig,
      setCity,
      setCountryCode,
      loading,
      error,
      requestLocation,
      calculateDistance
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
