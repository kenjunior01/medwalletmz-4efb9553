/**
 * AddressAutocomplete — autocompletar de moradas gratuito via Nominatim
 * (OpenStreetMap). Sem chave de API, com debounce e fila de rate-limit.
 */

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, Search } from "@/components/icons/lucide-compat";
import { searchAddresses, reverseGeocodePoint, type GeoAddress } from '@/lib/openGeo';

interface Props {
  value: string;
  onChange: (value: string, info?: { lat: number; lng: number; neighborhood?: string }) => void;
  placeholder?: string;
  label?: string;
  /** Códigos ISO-2 para restringir a pesquisa; vazio = global */
  countryCodes?: string[];
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  label = "Endereço de Entrega",
  countryCodes,
}: Props) {
  const [results, setResults] = useState<GeoAddress[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipNextSearch = useRef(false);

  // Debounce da pesquisa
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await searchAddresses(q, { countryCodes: countryCodes ?? ['MZ', 'BR'], limit: 6 });
      setResults(res);
      setHighlight(0);
      setOpen(res.length > 0);
      setSearching(false);
    }, 350);
    return () => {
      clearTimeout(t);
      setSearching(false);
    };
  }, [value, countryCodes]);

  // Fechar ao clicar fora
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const pick = (r: GeoAddress) => {
    skipNextSearch.current = true;
    setOpen(false);
    onChange(r.label, { lat: r.lat, lng: r.lng, neighborhood: r.neighborhood });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const addr = await reverseGeocodePoint(latitude, longitude);
          const label = addr?.label ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          onChange(label, { lat: latitude, lng: longitude, neighborhood: addr?.neighborhood });
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div className="space-y-2" ref={boxRef}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="text-[10px] text-primary font-bold flex items-center gap-1 hover:underline"
          disabled={locating}
        >
          {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
          Usar localização atual
        </button>
      </div>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder || "Pesquise rua, bairro ou local..."}
          className="pl-10 pr-9 h-12"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}

        {open && results.length > 0 && (
          <div
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
            role="listbox"
          >
            {results.map((r, i) => (
              <button
                key={`${r.lat},${r.lng},${i}`}
                type="button"
                role="option"
                aria-selected={i === highlight}
                onClick={() => pick(r)}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  i === highlight ? 'bg-accent' : ''
                }`}
              >
                <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{r.label}</span>
              </button>
            ))}
            <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              Dados &copy; OpenStreetMap
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
