import { useCountry } from '@/contexts/CountryContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from "@/components/icons/lucide-compat";

export function LanguageSelector() {
  const { allCountries, country, setCountryById, locale, setLocale, t } = useCountry();

  const languages = [
    { code: 'pt', name: 'Português (MZ)', flag: '🇲🇿' },
    { code: 'pt-BR', name: 'Português (BR)', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' },
    { code: 'am', name: 'አማርኛ (Amharic)', flag: '🇪🇹' },
    { code: 'hi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
    { code: 'emk', name: 'Emakhuwa', flag: '🇲🇿' },
    { code: 'tsn', name: 'Xichangana', flag: '🇲🇿' },
    { code: 'seh', name: 'Cisena', flag: '🇲🇿' },
    { code: 'elo', name: 'Elomwe', flag: '🇲🇿' },
    { code: 'chw', name: 'Echuwabo', flag: '🇲🇿' },
  ];

  return (
    <div className="flex items-center gap-2 p-2">
      <div className="flex flex-col gap-1 flex-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
          <Globe className="h-3 w-3" /> {t('layout.region_language')}
        </label>
        <div className="flex gap-2">
          <Select value={country?.id} onValueChange={setCountryById}>
            <SelectTrigger className="h-8 text-xs border-none bg-muted/50 w-[120px]">
              <SelectValue placeholder={t('layout.country_placeholder')} />
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
              <SelectValue placeholder={t('layout.language_placeholder')} />
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
