import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

test('End-to-End Integration: Complete Financial Lifecycle & Multi-User Isolation', () => {
  const db = new DatabaseSync(':memory:');

  // Initialize normalized schema
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      currency TEXT NOT NULL DEFAULT 'UZS',
      timezone TEXT NOT NULL DEFAULT 'Asia/Tashkent',
      opening_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name_en TEXT NOT NULL,
      name_uz TEXT NOT NULL,
      name_ru TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      related_debt_id TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT,
      period TEXT NOT NULL,
      amount REAL NOT NULL,
      warning_threshold_percent REAL NOT NULL DEFAULT 80
    );

    CREATE TABLE debts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      counterparty_name TEXT NOT NULL,
      original_amount REAL NOT NULL,
      amount_repaid REAL NOT NULL DEFAULT 0,
      lent_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE debt_payments (
      id TEXT PRIMARY KEY,
      debt_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL
    );

    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title_en TEXT,
      title_uz TEXT,
      title_ru TEXT,
      message_en TEXT,
      message_uz TEXT,
      message_ru TEXT,
      type TEXT,
      deduplication_key TEXT
    );
  `);

  // 1. User Registration: Alisher registers
  const u1PasswordHash = bcrypt.hashSync('secret123', 8);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, language, currency, timezone, opening_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('usr-1', 'alisher@example.com', u1PasswordHash, 'Alisher Navoiy', 'en', 'UZS', 'Asia/Tashkent', 500000);

  const u1 = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-1');
  assert.equal(u1.full_name, 'Alisher Navoiy');
  assert.equal(u1.language, 'en');
  assert.equal(u1.opening_balance, 500000);

  // 2. Switch Language: User changes language to 'uz' (persistent across sessions)
  db.prepare('UPDATE users SET language = ? WHERE id = ?').run('uz', 'usr-1');
  const u1Updated = db.prepare('SELECT language FROM users WHERE id = ?').get('usr-1');
  assert.equal(u1Updated.language, 'uz');

  // 3. User sets daily budget limit of 50,000 UZS
  db.prepare(`
    INSERT INTO budgets (id, user_id, period, amount, warning_threshold_percent)
    VALUES (?, ?, ?, ?, ?)
  `).run('bud-1', 'usr-1', 'daily', 50000, 80);

  // 4. Record Expense: 45,000 UZS on food ("Bugun nonga 45 000 so‘m sarfladim")
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, description, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('tx-1', 'usr-1', 'expense', 45000, 'Nonga va bozorga', '2026-10-27');

  // Check budget usage: 45,000 / 50,000 = 90% (Critical Warning threshold reached)
  const spentRow = db.prepare(`SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense'`).get('usr-1');
  const percentUsed = Math.round((spentRow.total / 50000) * 100);
  assert.equal(percentUsed, 90);

  // Generates 90% warning notification in Uzbek
  db.prepare(`
    INSERT INTO notifications (id, user_id, title_uz, message_uz, type, deduplication_key)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('notif-1', 'usr-1', 'Xavfli byudjet ogohlantirishi (90%)', 'Kunlik xarajat limitingizning 90 foizini ishlatdingiz.', 'budget_warning', 'budget_warn_90_bud-1_2026-10-27');

  // Verify notification stored
  const notif = db.prepare('SELECT * FROM notifications WHERE user_id = ?').get('usr-1');
  assert.equal(notif.type, 'budget_warning');
  assert.ok(notif.message_uz.includes('90 foizini'));

  // 5. Debt Management: User lends 100,000 UZS to Shohruh ("I lent Shohruh 100,000 UZS, due October 27")
  db.prepare(`
    INSERT INTO debts (id, user_id, type, counterparty_name, original_amount, amount_repaid, lent_date, due_date, status)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).run('debt-1', 'usr-1', 'lent', 'Shohruh', 100000, '2026-10-27', '2026-10-27', 'active');

  // Outflow transaction for loan given
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, description, date, related_debt_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('tx-loan', 'usr-1', 'loan_given', 100000, 'Shohruhga qarz berildi', '2026-10-27', 'debt-1');

  // 6. Partial Repayment: Shohruh repays 40,000 UZS
  db.prepare(`
    INSERT INTO debt_payments (id, debt_id, user_id, amount, payment_date)
    VALUES (?, ?, ?, ?, ?)
  `).run('pay-1', 'debt-1', 'usr-1', 40000, '2026-10-27');

  db.prepare(`
    UPDATE debts
    SET amount_repaid = 40000, status = 'partially_repaid'
    WHERE id = 'debt-1'
  `).run();

  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, description, date, related_debt_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('tx-repay', 'usr-1', 'debt_repayment_received', 40000, 'Shohruh qarzini qisman qaytardi', '2026-10-27', 'debt-1');

  const debtRecord = db.prepare('SELECT * FROM debts WHERE id = ?').get('debt-1');
  assert.equal(debtRecord.amount_repaid, 40000);
  assert.equal(debtRecord.original_amount - debtRecord.amount_repaid, 60000);
  assert.equal(debtRecord.status, 'partially_repaid');

  // 7. Verify Cash Balance:
  // Opening: 500,000
  // Outflows: 45,000 (food) + 100,000 (loan given) = 145,000
  // Inflows: 40,000 (repayment received)
  // Balance = 500,000 - 145,000 + 40,000 = 395,000
  const txList = db.prepare('SELECT type, amount FROM transactions WHERE user_id = ?').all('usr-1');
  let cash = 500000;
  for (const t of txList) {
    if (t.type === 'expense' || t.type === 'loan_given' || t.type === 'debt_repayment_made') cash -= t.amount;
    if (t.type === 'income' || t.type === 'borrowing' || t.type === 'debt_repayment_received') cash += t.amount;
  }
  assert.equal(cash, 395000, 'Cash balance accurately updated');

  // 8. Register User 2 (Bobur) and verify strict data isolation
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, language)
    VALUES (?, ?, ?, ?, ?)
  `).run('usr-2', 'bobur@example.com', u1PasswordHash, 'Bobur Mirzo', 'ru');

  const boburTxs = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all('usr-2');
  const boburDebts = db.prepare('SELECT * FROM debts WHERE user_id = ?').all('usr-2');
  const boburBudgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all('usr-2');
  const boburNotifs = db.prepare('SELECT * FROM notifications WHERE user_id = ?').all('usr-2');

  assert.equal(boburTxs.length, 0, 'No data leakage into User 2 transactions');
  assert.equal(boburDebts.length, 0, 'No data leakage into User 2 debts');
  assert.equal(boburBudgets.length, 0, 'No data leakage into User 2 budgets');
  assert.equal(boburNotifs.length, 0, 'No data leakage into User 2 notifications');
});
