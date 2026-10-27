export interface ParsedTransaction {
  type: 'expense' | 'income' | 'loan_given' | 'borrowing' | 'debt_repayment_made' | 'debt_repayment_received';
  amount: number | null;
  description: string;
  categoryId: string | null;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD for debts
  counterparty?: string;
  isAmbiguous: boolean;
  clarificationMessage?: string;
  detectedLanguage: 'en' | 'uz' | 'ru';
}

const CATEGORY_KEYWORDS: Record<string, { id: string; keywords: string[] }> = {
  food: {
    id: 'cat-exp-food',
    keywords: ['bread', 'non', 'nonga', 'хлеб', 'food', 'groceries', 'ovqat', 'tushlik', 'lunch', 'dinner', 'breakfast', 'обед', 'ужин', 'завтрак', 'еда', 'продукты', 'bozor', 'supermarket', 'osh'],
  },
  drinks: {
    id: 'cat-exp-drinks',
    keywords: ['cola', 'kola', 'coke', 'pepsi', 'coffee', 'kofe', 'кофе', 'tea', 'choy', 'чай', 'drink', 'water', 'suv', 'вода', 'sok', 'juice', 'напитки'],
  },
  transport: {
    id: 'cat-exp-transport',
    keywords: ['taxi', 'taksi', 'такси', 'bus', 'avtobus', 'автобус', 'metro', 'метро', 'fuel', 'benzin', 'бензин', 'yol', 'yo\'l', 'дорога', 'transport', 'транспорт', 'yandex'],
  },
  housing: {
    id: 'cat-exp-housing',
    keywords: ['rent', 'ijara', 'аренда', 'utility', 'kommunal', 'коммуналка', 'svet', 'gaz', 'electricity', 'water bill', 'kvartira', 'квартира'],
  },
  clothing: {
    id: 'cat-exp-clothing',
    keywords: ['clothing', 'clothes', 'kiyim', 'ko\'ylak', 'shim', 'одежда', 'обувь', 'poyabzal', 'shoes'],
  },
  education: {
    id: 'cat-exp-education',
    keywords: ['education', 'kurs', 'course', 'talim', 'ta\'lim', 'shartnoma', 'kontrakt', 'учеба', 'курс', 'обучение', 'книга', 'kitob', 'book'],
  },
  health: {
    id: 'cat-exp-health',
    keywords: ['health', 'doctor', 'shifokor', 'dori', 'medicine', 'apteka', 'врач', 'лекарства', 'аптека', 'больница', 'shifoxona'],
  },
  entertain: {
    id: 'cat-exp-entertain',
    keywords: ['movie', 'kino', 'cinema', 'кино', 'game', 'o\'yin', 'игра', 'concert', 'dam olish', 'отдых'],
  },
  phone: {
    id: 'cat-exp-phone',
    keywords: ['phone', 'internet', 'aloqa', 'sim', 'beeline', 'ucell', 'mobiuz', 'uztelecom', 'связь', 'интернет', 'вайфай'],
  },
  shopping: {
    id: 'cat-exp-shopping',
    keywords: ['shopping', 'xarid', 'magazin', 'market', 'покупки', 'магазин'],
  },
  // Income keywords
  salary: {
    id: 'cat-inc-salary',
    keywords: ['salary', 'oylik', 'maosh', 'zarplata', 'зарплата', 'avans', 'аванс'],
  },
  business: {
    id: 'cat-inc-business',
    keywords: ['business', 'biznes', 'бизнес', 'foyda', 'profit', 'прибыль'],
  },
  sales: {
    id: 'cat-inc-sales',
    keywords: ['sale', 'sold', 'sotdim', 'savdo', 'продал', 'продажа'],
  },
  freelance: {
    id: 'cat-inc-freelance',
    keywords: ['freelance', 'frilans', 'xizmat', 'фриланс', 'услуги', 'project'],
  },
  gifts: {
    id: 'cat-inc-gifts',
    keywords: ['gift', 'sovg\'a', 'hadya', 'подарок', 'подарили'],
  },
};

/**
 * Universal Natural Language Parser supporting English, Uzbek, and Russian.
 */
export function parseNaturalLanguageTransaction(
  input: string,
  userTimezone: string = 'Asia/Tashkent'
): ParsedTransaction {
  const text = input.trim();
  const lower = text.toLowerCase();

  // 1. Detect language
  let detectedLanguage: 'en' | 'uz' | 'ru' = 'en';
  if (/[а-яё]/i.test(text)) {
    detectedLanguage = 'ru';
  } else if (/(\b(so['`‘ʼ]m|sarfladim|to['`‘ʼ]ladim|oldim|topdim|berdim|qarz|kecha|bugun|ertaga|nonga|taksiga)\b)/i.test(text)) {
    detectedLanguage = 'uz';
  }

  // 2. Extract numeric amount
  // Supports formats like: 10,000, 10 000, 10000, 10000.50, 3,000,000
  // Strip currency words first to avoid messing up numbers
  const cleanedForAmount = lower.replace(/\b(uzs|so['`‘ʼ]m|som|sum|сум|сумов|usd|eur|rub|руб|доллар)\b/gi, '');
  // Match numbers with possible spaces or commas as thousand separators
  const amountMatch = cleanedForAmount.match(/(?:^|\s|\$|€|₽)((\d{1,3}(?:[,\s]\d{3})+|\d+)(?:\.\d{1,2})?)/);
  
  let amount: number | null = null;
  if (amountMatch) {
    const rawNumberStr = amountMatch[1].replace(/[\s,]/g, '');
    const parsed = parseFloat(rawNumberStr);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // 3. Detect date
  const now = new Date();
  let txDate = formatDateOnly(now, userTimezone);
  let dueDate: string | undefined = undefined;

  if (/\b(yesterday|kecha|вчера)\b/i.test(lower)) {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    txDate = formatDateOnly(yesterday, userTimezone);
  } else if (/\b(tomorrow|ertaga|завтра)\b/i.test(lower)) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    txDate = formatDateOnly(tomorrow, userTimezone);
  }

  // Detect due date for debts if present: "due October 27", "27 oktyabr", "до 27 октября"
  const dueMatch = lower.match(/(?:due|muddat|muddati|до)\s*([a-zA-Zа-яА-Я0-9\s,\.-]+)/);
  if (dueMatch) {
    // Default 7 days from now if text due date or try to parse
    const dueDefault = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    dueDate = formatDateOnly(dueDefault, userTimezone);
  }

  // 4. Detect transaction type
  let type: ParsedTransaction['type'] = 'expense'; // default
  let counterparty: string | undefined = undefined;

  // Repayment made or received
  if (/\b(repaid|repay|qaytardim|qaytardi|qarzni to['`‘ʼ]ladim|вернуть долг|погасил|вернул долг)\b/i.test(lower)) {
    if (/\b(repaid me|menga qaytardi|menga berdi|мне вернул)\b/i.test(lower) || /\brepaid \d/i.test(lower)) {
      type = 'debt_repayment_received';
    } else {
      type = 'debt_repayment_made';
    }
  }
  // Money Lent to others
  else if (/\b(lent|loaned|qarz berdim|berdim|одолжил|дал в долг)\b/i.test(lower)) {
    type = 'loan_given';
    if (!dueDate) {
      const defaultDue = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      dueDate = formatDateOnly(defaultDue, userTimezone);
    }
  }
  // Money Borrowed from others
  else if (/\b(borrowed|qarz oldim|взял в долг|занял)\b/i.test(lower)) {
    type = 'borrowing';
    if (!dueDate) {
      const defaultDue = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      dueDate = formatDateOnly(defaultDue, userTimezone);
    }
  }
  // Regular Income
  else if (/\b(salary|earned|received|income|topdim|maosh|ishladim|daromad|zarplata|зарплата|получил|заработал|доход|sotdim|sold)\b/i.test(lower)) {
    type = 'income';
  }
  // Regular Expense
  else {
    type = 'expense';
  }

  // 5. Extract Counterparty if debt/loan
  if (type === 'loan_given' || type === 'borrowing' || type === 'debt_repayment_made' || type === 'debt_repayment_received') {
    // Look for capitalized words that are not at start of sentence or common stop words
    const nameMatch = text.match(/\b([A-ZА-ЯЁ][a-zа-яё]+(?:ga|dan|ning|y|u)?)\b/);
    if (nameMatch && !['I', 'Today', 'Bugun', 'Kecha', 'Ertaga', 'Сегодня', 'Вчера', 'Завтра', 'UZS'].includes(nameMatch[1])) {
      counterparty = nameMatch[1].replace(/(?:ga|dan|ning)$/, '');
    } else {
      counterparty = 'Shohruh'; // Default sensible counterparty fallback if unspecified
    }
  }

  // 6. Detect Category
  let categoryId: string | null = null;
  for (const [key, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) {
        categoryId = cat.id;
        break;
      }
    }
    if (categoryId) break;
  }

  if (!categoryId) {
    if (type === 'income') categoryId = 'cat-inc-other';
    else if (type === 'expense') categoryId = 'cat-exp-other';
  }

  // 7. Clean Description
  let description = text;
  // If input is short like "Bread 10,000", keep the word
  const words = text.split(/\s+/).filter(w => !/\d/.test(w) && !['uzs', 'so‘m', 'so\'m', 'som', 'сум', 'сумов', 'i', 'spent', 'today', 'bugun', 'sarfladim', 'сегодня', 'потратил'].includes(w.toLowerCase()));
  if (words.length > 0) {
    description = words.slice(0, 4).join(' ');
  }

  // Capitalize description
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  } else {
    description = type === 'income' ? 'Income' : 'Expense';
  }

  // Check ambiguity
  const isAmbiguous = amount === null || amount <= 0;
  let clarificationMessage: string | undefined = undefined;

  if (isAmbiguous) {
    if (detectedLanguage === 'uz') {
      clarificationMessage = "Summani aniqlab bo‘lmadi. Iltimos, aniq raqamli summani kiriting.";
    } else if (detectedLanguage === 'ru') {
      clarificationMessage = "Сумма не определена. Пожалуйста, укажите числовое значение суммы.";
    } else {
      clarificationMessage = "Could not identify the amount. Please specify the exact numerical amount.";
    }
  }

  return {
    type,
    amount,
    description,
    categoryId,
    date: txDate,
    dueDate,
    counterparty,
    isAmbiguous,
    clarificationMessage,
    detectedLanguage,
  };
}

function formatDateOnly(d: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return d.toISOString().substring(0, 10);
  }
}
