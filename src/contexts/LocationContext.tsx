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

// Default coordinates for major cities
const CITY_COORDINATES: Record<string, Coordinates & { country: string }> = {
  'Maputo': { latitude: -25.9692, longitude: 32.5732, country: 'MZ' },
  'Beira': { latitude: -19.8436, longitude: 34.8389, country: 'MZ' },
  'São Paulo': { latitude: -23.5505, longitude: -46.6333, country: 'BR' },
  'Luanda': { latitude: -8.8390, longitude: 13.2894, country: 'AO' },
  'Lisboa': { latitude: 38.7223, longitude: -9.1393, country: 'PT' },
};

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [city, setCity] = useState<string>(() => localStorage.getItem('selectedCity') || 'Maputo');
  const [countryCode, setCountryCode] = useState<string>(() => localStorage.getItem('selectedCountry') || 'MZ');
  const [countryConfig, setCountryConfig] = useState<CountryConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch country settings from DB
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('countries')
        .select('*')
        .eq('id', countryCode)
        .single();
      if (data) setCountryConfig(data as CountryConfig);
    };
    fetchConfig();
  }, [countryCode]);

  useEffect(() => {
    localStorage.setItem('selectedCity', city);
    localStorage.setItem('selectedCountry', countryCode);
    if (!coordinates && CITY_COORDINATES[city]) {
      setCoordinates(CITY_COORDINATES[city]);
      setCountryCode(CITY_COORDINATES[city].country);
    }
  }, [city, countryCode]);

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
        console.error('Geolocation error:', err);
        setLoading(false);
        // Fall back to city coordinates
        if (CITY_COORDINATES[city]) {
          setCoordinates(CITY_COORDINATES[city]);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Haversine formula to calculate distance in km
  const calculateDistance = (lat: number, lng: number): number | null => {
    if (!coordinates) return null;
    
    const R = 6371; // Earth's radius in km
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
