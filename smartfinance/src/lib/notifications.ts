import crypto from 'crypto';
import { getDb } from './db';
import { formatLocalDate, getUserBudgetsStatus } from './accounting';
import { formatCurrency, SupportedLanguage } from './i18n';

export interface NotificationItem {
  id: string;
  userId: string;
  titleEn: string;
  titleUz: string;
  titleRu: string;
  messageEn: string;
  messageUz: string;
  messageRu: string;
  type: 'budget_warning' | 'budget_exceeded' | 'debt_reminder' | 'debt_overdue' | 'system';
  isRead: number;
  createdAt: string;
}

/**
 * Checks all active budgets and upcoming/overdue debts for a given user,
 * generating deduplicated in-app notifications in English, Uzbek, and Russian.
 */
export function runUserFinancialChecks(userId: string): { newNotificationsCount: number } {
  const db = getDb();

  // 1. Get user preferences, timezone, language, and currency
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = db.prepare('SELECT language, currency, timezone FROM users WHERE id = ?').get(userId) as any;
  if (!user) return { newNotificationsCount: 0 };

  const timezone = user.timezone || 'Asia/Tashkent';
  const currency = user.currency || 'UZS';
  const todayStr = formatLocalDate(new Date(), timezone);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prefs = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId) as any;
  if (!prefs) {
    // Insert default preferences if not yet created
    db.prepare(`
      INSERT INTO notification_preferences (user_id, budget_warning, budget_exceeded, debt_due_reminders, overdue_reminders, reminder_days_before)
      VALUES (?, 1, 1, 1, 1, 1)
    `).run(userId);
    prefs = { budget_warning: 1, budget_exceeded: 1, debt_due_reminders: 1, overdue_reminders: 1, reminder_days_before: 1 };
  }

  let newNotificationsCount = 0;

  // Insert notification helper with deduplication
  const insertNotification = (
    type: 'budget_warning' | 'budget_exceeded' | 'debt_reminder' | 'debt_overdue' | 'system',
    dedupKey: string,
    titleEn: string,
    titleUz: string,
    titleRu: string,
    msgEn: string,
    msgUz: string,
    msgRu: string
  ) => {
    // Check if deduplication key already exists for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = db.prepare('SELECT id FROM notifications WHERE user_id = ? AND deduplication_key = ?').get(userId, dedupKey) as any;
    if (existing) return;

    const id = 'notif-' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title_en, title_uz, title_ru, message_en, message_uz, message_ru, type, is_read, deduplication_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, userId, titleEn, titleUz, titleRu, msgEn, msgUz, msgRu, type, dedupKey);

    newNotificationsCount++;
  };

  // 2. Check Budgets
  const budgets = getUserBudgetsStatus(userId, timezone, 'en');
  for (const b of budgets) {
    const periodKey = b.period === 'daily' ? todayStr : b.period === 'weekly' ? todayStr.substring(0, 7) + '-w' : todayStr.substring(0, 7);
    const spentFormatted = formatCurrency(b.spent, currency, 'en');
    const limitFormatted = formatCurrency(b.amount, currency, 'en');
    const remainingFormatted = formatCurrency(b.remaining, currency, 'en');

    const spentUz = formatCurrency(b.spent, currency, 'uz');
    const limitUz = formatCurrency(b.amount, currency, 'uz');
    const remainingUz = formatCurrency(b.remaining, currency, 'uz');

    const spentRu = formatCurrency(b.spent, currency, 'ru');
    const limitRu = formatCurrency(b.amount, currency, 'ru');
    const remainingRu = formatCurrency(b.remaining, currency, 'ru');

    // 100%+ Exceeded alert
    if (b.percentage >= 100 && prefs.budget_exceeded) {
      const dedupKey = `budget_exceeded_${b.id}_${periodKey}`;
      insertNotification(
        'budget_exceeded',
        dedupKey,
        'Budget Limit Exceeded',
        'Byudjet limiti oshib ketdi',
        'Превышен лимит бюджета',
        `You have exceeded your ${b.period} spending limit for ${b.categoryName}. Limit: ${limitFormatted}. Spent: ${spentFormatted}.`,
        `${b.categoryName} bo‘yicha ${b.period}lik xarajat limitingiz oshib ketdi. Limit: ${limitUz}. Sarflangan: ${spentUz}.`,
        `Вы превысили свой ${b.period === 'daily' ? 'дневной' : b.period === 'weekly' ? 'недельный' : 'месячный'} лимит по категории ${b.categoryName}. Лимит: ${limitRu}. Потрачено: ${spentRu}.`
      );
    }
    // 90% Critical Warning
    else if (b.percentage >= 90 && prefs.budget_warning) {
      const dedupKey = `budget_warn_90_${b.id}_${periodKey}`;
      insertNotification(
        'budget_warning',
        dedupKey,
        'Critical Budget Warning (90%)',
        'Xavfli byudjet ogohlantirishi (90%)',
        'Критическое предупреждение по бюджету (90%)',
        `You have used 90% of your ${b.period} limit. Limit: ${limitFormatted}. Spent: ${spentFormatted}. Remaining: ${remainingFormatted}.`,
        `${b.period}lik limitingizning 90 foizini ishlatdingiz. Limit: ${limitUz}. Sarflangan: ${spentUz}. Qolgan: ${remainingUz}.`,
        `Вы использовали 90% своего ${b.period === 'daily' ? 'дневного' : b.period === 'weekly' ? 'недельного' : 'месячного'} лимита. Лимит: ${limitRu}. Потрачено: ${spentRu}. Осталось: ${remainingRu}.`
      );
    }
    // Configured threshold warning (e.g. 80%)
    else if (b.percentage >= b.warningThreshold && prefs.budget_warning) {
      const dedupKey = `budget_warn_thresh_${b.id}_${periodKey}`;
      insertNotification(
        'budget_warning',
        dedupKey,
        `Budget Warning (${b.percentage}%)`,
        `Byudjet ogohlantirishi (${b.percentage}%)`,
        `Предупреждение по бюджету (${b.percentage}%)`,
        `You have used ${b.percentage}% of your ${b.period} limit for ${b.categoryName}.`,
        `${b.categoryName} bo‘yicha ${b.period}lik limitingizning ${b.percentage}% qismini sarfladingiz.`,
        `Вы использовали ${b.percentage}% ${b.period === 'daily' ? 'дневного' : b.period === 'weekly' ? 'недельного' : 'месячного'} лимита по категории ${b.categoryName}.`
      );
    }
  }

  // 3. Check Debts & Reminders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeDebts = db.prepare(`
    SELECT id, type, counterparty_name, original_amount, amount_repaid, due_date
    FROM debts
    WHERE user_id = ? AND status != 'fully_repaid'
  `).all(userId) as any[];

  for (const d of activeDebts) {
    const outstanding = Math.max(0, Number(d.original_amount) - Number(d.amount_repaid));
    if (outstanding <= 0) continue;

    const amtEn = formatCurrency(outstanding, currency, 'en');
    const amtUz = formatCurrency(outstanding, currency, 'uz');
    const amtRu = formatCurrency(outstanding, currency, 'ru');
    const person = d.counterparty_name;

    // Debt due today
    if (d.due_date === todayStr && prefs.debt_due_reminders) {
      const dedupKey = `debt_due_today_${d.id}_${todayStr}`;
      if (d.type === 'lent') {
        insertNotification(
          'debt_reminder',
          dedupKey,
          'Debt Repayment Due Today',
          'Qarz qaytarish muddati bugun',
          'Срок возврата долга сегодня',
          `Reminder: ${person} owes you ${amtEn}. The repayment date is today.`,
          `Eslatma: ${person} sizga ${amtUz} qarz. Qaytarish muddati bugun.`,
          `Напоминание: ${person} должен вам ${amtRu}. Срок возврата — сегодня.`
        );
      } else {
        insertNotification(
          'debt_reminder',
          dedupKey,
          'Borrowing Repayment Due Today',
          'Qarzni to‘lash muddati bugun',
          'Срок погашения долга сегодня',
          `Reminder: You need to repay ${amtEn} to ${person} today.`,
          `Eslatma: Bugun ${person}ga ${amtUz} qarzni qaytarishingiz kerak.`,
          `Напоминание: Сегодня необходимо вернуть ${amtRu} ${person}.`
        );
      }
    }
    // Debt overdue
    else if (d.due_date < todayStr && prefs.overdue_reminders) {
      // Overdue reminder once a week or with date key
      const dedupKey = `debt_overdue_${d.id}_${todayStr}`;
      if (d.type === 'lent') {
        insertNotification(
          'debt_overdue',
          dedupKey,
          'Overdue Debt Reminder',
          'Muddati o‘tgan qarz eslatmasi',
          'Просроченная задолженность',
          `Reminder: ${person}'s debt of ${amtEn} was due on ${d.due_date} and is now overdue.`,
          `Eslatma: ${person}ning ${amtUz} miqdoridagi qarzi muddati ${d.due_date} edi va muddati o‘tdi.`,
          `Напоминание: Срок возврата долга ${amtRu} от ${person} истек ${d.due_date}.`
        );
      } else {
        insertNotification(
          'debt_overdue',
          dedupKey,
          'Overdue Borrowing Reminder',
          'Muddati o‘tgan qarz to‘lovi',
          'Просроченный долг к выплате',
          `Reminder: Your borrowing of ${amtEn} from ${person} was due on ${d.due_date} and is overdue.`,
          `Eslatma: ${person}dan olingan ${amtUz} miqdoridagi qarz muddati ${d.due_date} edi va muddati o‘tdi.`,
          `Напоминание: Ваш долг ${amtRu} перед ${person} просрочен (срок был ${d.due_date}).`
        );
      }
    }
  }

  return { newNotificationsCount };
}
