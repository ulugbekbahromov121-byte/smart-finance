import en from '../locales/en.json' with { type: 'json' };
import uz from '../locales/uz.json' with { type: 'json' };
import ru from '../locales/ru.json' with { type: 'json' };

export type SupportedLanguage = 'en' | 'uz' | 'ru';
export type SupportedCurrency = 'UZS' | 'USD' | 'EUR' | 'RUB';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'uz', label: "O‘zbekcha", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; label: string; symbol: string }[] = [
  { code: 'UZS', label: "Uzbekistani soʻm (UZS)", symbol: "so'm" },
  { code: 'USD', label: "US Dollar (USD)", symbol: "$" },
  { code: 'EUR', label: "Euro (EUR)", symbol: "€" },
  { code: 'RUB', label: "Russian Ruble (RUB)", symbol: "₽" },
];

export const translations: Record<SupportedLanguage, typeof en> = {
  en,
  uz,
  ru,
};

export function getTranslation(lang: SupportedLanguage, path: string, params?: Record<string, string | number>): string {
  const dict = translations[lang] || translations.en;
  const keys = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = dict;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      // Fallback to English
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fallback: any = translations.en;
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          return path;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== 'string') {
    return path;
  }

  if (params) {
    let result = current;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
    return result;
  }

  return current;
}

/**
 * Format currency amounts according to requirements:
 * Example: 10 000 UZS, 10 000 so‘m, or 10 000 сумов
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'UZS',
  lang: SupportedLanguage = 'en'
): string {
  const validAmount = amount == null || isNaN(amount) ? 0 : amount;
  // Use non-breaking space / thin space formatting for thousands
  const formattedNumber = new Intl.NumberFormat(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(validAmount);

  if (currency === 'UZS') {
    if (lang === 'uz') return `${formattedNumber} so‘m`;
    if (lang === 'ru') return `${formattedNumber} сумов`;
    return `${formattedNumber} UZS`;
  }

  if (currency === 'USD') return `$${formattedNumber}`;
  if (currency === 'EUR') return `€${formattedNumber}`;
  if (currency === 'RUB') return `${formattedNumber} ₽`;

  return `${formattedNumber} ${currency}`;
}

export function formatDate(dateStr: string | Date, lang: SupportedLanguage = 'en', includeTime = false): string {
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);

    const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
  } catch {
    return String(dateStr);
  }
}
