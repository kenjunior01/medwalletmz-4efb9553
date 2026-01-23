import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  coordinates: Coordinates | null;
  city: string;
  setCity: (city: string) => void;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
  calculateDistance: (lat: number, lng: number) => number | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Default coordinates for major cities in Mozambique
const CITY_COORDINATES: Record<string, Coordinates> = {
  'Maputo': { latitude: -25.9692, longitude: 32.5732 },
  'Beira': { latitude: -19.8436, longitude: 34.8389 },
  'Nampula': { latitude: -15.1165, longitude: 39.2666 },
  'Quelimane': { latitude: -17.8786, longitude: 36.8881 },
  'Tete': { latitude: -16.1564, longitude: 33.5867 },
  'Chimoio': { latitude: -19.1164, longitude: 33.4833 },
};

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [city, setCity] = useState<string>(() => {
    return localStorage.getItem('selectedCity') || 'Maputo';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('selectedCity', city);
    // Set default coordinates for selected city
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
      setCity,
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
