import { format, formatDistanceToNow } from 'date-fns';
import { ptBR, pt, enUS, hi } from 'date-fns/locale';

const locales: Record<string, any> = {
  'pt-BR': ptBR,
  'pt': pt,
  'en': enUS,
  'hi': hi,
};

/**
 * Formata uma data baseada no locale atual do usuário.
 * Ex: "20 de Jan, 14:30"
 */
export function formatLocal(date: string | Date, pattern: string = 'PPp', currentLocale: string = 'pt'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: locales[currentLocale] || pt });
}

/**
 * Retorna o tempo relativo (Ex: "Há 5 minutos")
 */
export function formatRelative(date: string | Date, currentLocale: string = 'pt'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: locales[currentLocale] || pt
  });
}

/**
 * Detecta o Timezone do dispositivo
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
