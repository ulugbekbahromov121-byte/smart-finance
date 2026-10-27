import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'smart_finance.db');

// Global database instance cache for Next.js hot-reloading
declare global {
  // eslint-disable-next-line no-var
  var __smartFinanceDb: DatabaseSync | undefined;
}

export function getDb(): DatabaseSync {
  if (!global.__smartFinanceDb) {
    const db = new DatabaseSync(dbPath);
    // Enable foreign keys and WAL mode for reliability and performance
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = WAL;');
    initSchema(db);
    global.__smartFinanceDb = db;
  }
  return global.__smartFinanceDb;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      currency TEXT NOT NULL DEFAULT 'UZS',
      timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',
      opening_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT, -- NULL for system default categories
      name_en TEXT NOT NULL,
      name_uz TEXT NOT NULL,
      name_ru TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer', 'loan_given', 'borrowing', 'debt_repayment_received', 'debt_repayment_made')),
      amount REAL NOT NULL,
      category_id TEXT,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      payment_method TEXT,
      related_debt_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT, -- NULL for overall spending limit
      period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
      amount REAL NOT NULL,
      warning_threshold_percent REAL NOT NULL DEFAULT 80,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('lent', 'borrowed')),
      counterparty_name TEXT NOT NULL,
      original_amount REAL NOT NULL,
      amount_repaid REAL NOT NULL DEFAULT 0,
      lent_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL CHECK (status IN ('active', 'partially_repaid', 'fully_repaid', 'overdue')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY,
      debt_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      amount REAL NOT NULL,
      category_id TEXT,
      description TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      next_due_date TEXT NOT NULL,
      last_processed_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id TEXT PRIMARY KEY,
      budget_warning INTEGER NOT NULL DEFAULT 1,
      budget_exceeded INTEGER NOT NULL DEFAULT 1,
      debt_due_reminders INTEGER NOT NULL DEFAULT 1,
      overdue_reminders INTEGER NOT NULL DEFAULT 1,
      reminder_days_before INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title_en TEXT NOT NULL,
      title_uz TEXT NOT NULL,
      title_ru TEXT NOT NULL,
      message_en TEXT NOT NULL,
      message_uz TEXT NOT NULL,
      message_ru TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('budget_warning', 'budget_exceeded', 'debt_reminder', 'debt_overdue', 'system')),
      is_read INTEGER NOT NULL DEFAULT 0,
      deduplication_key TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Create indexes for fast lookup and strict user isolation queries
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, period);
    CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(user_id, deduplication_key);
    CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id, is_active);
  `);

  seedDefaultCategories(db);
}

function seedDefaultCategories(db: DatabaseSync) {
  const check = db.prepare('SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL').get() as { count: number };
  if (check && check.count > 0) return;

  const defaultCategories = [
    // Expense Categories
    { id: 'cat-exp-food', en: 'Food and groceries', uz: 'Oziq-ovqat va bozor', ru: 'Продукты и еда', type: 'expense', icon: 'Utensils', color: '#10B981' },
    { id: 'cat-exp-drinks', en: 'Drinks', uz: 'Ichimliklar', ru: 'Напитки', type: 'expense', icon: 'Coffee', color: '#06B6D4' },
    { id: 'cat-exp-transport', en: 'Transportation', uz: 'Transport va yo‘l', ru: 'Транспорт', type: 'expense', icon: 'Car', color: '#3B82F6' },
    { id: 'cat-exp-housing', en: 'Housing and utilities', uz: 'Uy-joy va kommunal', ru: 'Жилье и коммуналка', type: 'expense', icon: 'Home', color: '#8B5CF6' },
    { id: 'cat-exp-clothing', en: 'Clothing', uz: 'Kiyim-kechak', ru: 'Одежда', type: 'expense', icon: 'Shirt', color: '#EC4899' },
    { id: 'cat-exp-education', en: 'Education', uz: 'Taʼlim', ru: 'Образование', type: 'expense', icon: 'GraduationCap', color: '#F59E0B' },
    { id: 'cat-exp-health', en: 'Healthcare', uz: 'Salomatlik va dori', ru: 'Здоровье и медицина', type: 'expense', icon: 'HeartPulse', color: '#EF4444' },
    { id: 'cat-exp-entertain', en: 'Entertainment', uz: 'Dam olish va ko‘ngilochar', ru: 'Развлечения и отдых', type: 'expense', icon: 'Film', color: '#F97316' },
    { id: 'cat-exp-phone', en: 'Phone and internet', uz: 'Aloqa va internet', ru: 'Связь и интернет', type: 'expense', icon: 'Wifi', color: '#14B8A6' },
    { id: 'cat-exp-shopping', en: 'Shopping', uz: 'Xaridlar', ru: 'Покупки', type: 'expense', icon: 'ShoppingBag', color: '#6366F1' },
    { id: 'cat-exp-other', en: 'Other expenses', uz: 'Boshqa xarajatlar', ru: 'Прочие расходы', type: 'expense', icon: 'MoreHorizontal', color: '#64748B' },

    // Income Categories
    { id: 'cat-inc-salary', en: 'Salary', uz: 'Oylik maosh', ru: 'Заработная плата', type: 'income', icon: 'Briefcase', color: '#10B981' },
    { id: 'cat-inc-business', en: 'Business income', uz: 'Biznes daromadi', ru: 'Доход от бизнеса', type: 'income', icon: 'TrendingUp', color: '#3B82F6' },
    { id: 'cat-inc-sales', en: 'Sales', uz: 'Savdo tushumi', ru: 'Продажи', type: 'income', icon: 'Coins', color: '#F59E0B' },
    { id: 'cat-inc-freelance', en: 'Freelance and services', uz: 'Frilans va xizmatlar', ru: 'Фриланс и услуги', type: 'income', icon: 'Laptop', color: '#8B5CF6' },
    { id: 'cat-inc-gifts', en: 'Gifts', uz: 'Sovg‘alar', ru: 'Подарки', type: 'income', icon: 'Gift', color: '#EC4899' },
    { id: 'cat-inc-invest', en: 'Investment income', uz: 'Investitsiya daromadi', ru: 'Инвестиционный доход', type: 'income', icon: 'LineChart', color: '#06B6D4' },
    { id: 'cat-inc-other', en: 'Other income', uz: 'Boshqa daromadlar', ru: 'Прочие доходы', type: 'income', icon: 'PlusCircle', color: '#64748B' },
  ];

  const stmt = db.prepare(`
    INSERT INTO categories (id, user_id, name_en, name_uz, name_ru, type, icon, color, is_default)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (const cat of defaultCategories) {
    stmt.run(cat.id, cat.en, cat.uz, cat.ru, cat.type, cat.icon, cat.color);
  }
}
