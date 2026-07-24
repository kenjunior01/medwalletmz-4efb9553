import { useCountry } from '@/contexts/CountryContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { allCountries, country, setCountryById, locale, setLocale } = useCountry();

  const languages = [
    { code: 'pt', name: 'Português (PT)', flag: '🇵🇹' },
    { code: 'pt-BR', name: 'Português (BR)', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'hi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  ];

  return (
    <div className="flex items-center gap-2 p-2">
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
          <Globe className="h-3 w-3" /> Região & Idioma
        </label>
        <div className="flex gap-2">
          <Select value={country?.id} onValueChange={setCountryById}>
            <SelectTrigger className="h-8 text-xs border-none bg-muted/50 w-[120px]">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              {allCountries.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger className="h-8 text-xs border-none bg-muted/50 w-[140px]">
              <SelectValue placeholder="Idioma" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
