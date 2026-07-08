import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string, info?: { lat: number; lng: number; neighborhood?: string }) => void;
  placeholder?: string;
  label?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export function GoogleAddressInput({ value, onChange, placeholder, label = "Endereço de Entrega" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if (window.google?.maps?.places) {
      setScriptLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=pt&region=MZ`;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !inputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'MZ' },
      fields: ['formatted_address', 'geometry', 'name'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        // Tentar extrair o bairro (sublocality ou neighborhood)
        let neighborhood = '';
        if (place.address_components) {
          const sublocality = place.address_components.find((c: any) =>
            c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')
          );
          if (sublocality) neighborhood = sublocality.long_name;
        }

        onChange(place.formatted_address || place.name, { lat, lng, neighborhood });
      } else {
        onChange(inputRef.current?.value || '');
      }
    });

    // Impedir que o "Enter" no autocomplete submeta o formulário pai
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const pacContainer = document.querySelector('.pac-container');
        if (pacContainer && window.getComputedStyle(pacContainer).display !== 'none') {
          e.preventDefault();
        }
      }
    };

    inputRef.current.addEventListener('keydown', handleKeyDown);
    return () => inputRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [scriptLoaded, onChange]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=pt&region=MZ`);
          const data = await res.json();
          if (data.results?.[0]) {
            const result = data.results[0];
            const addr = result.formatted_address;
            let neighborhood = '';
            const sublocality = result.address_components?.find((c: any) =>
              c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')
            );
            if (sublocality) neighborhood = sublocality.long_name;

            onChange(addr, { lat: latitude, lng: longitude, neighborhood });
          }
        } catch (e) {
          console.error('Geocoding error', e);
        } finally {
          setIsLoading(false);
        }
      },
      () => setIsLoading(false)
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
          Usar localização atual
        </button>
      </div>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Pesquise rua, bairro ou local..."}
          className="pl-10 h-12"
        />
      </div>
    </div>
  );
}
