import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

test('Accounting Rules: Loan accounting without double-counting and accurate cash-flow', () => {
  const db = new DatabaseSync(':memory:');

  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT,
      opening_balance REAL DEFAULT 0
    );

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT,
      amount REAL,
      date TEXT
    );

    CREATE TABLE debts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT,
      original_amount REAL,
      amount_repaid REAL DEFAULT 0,
      status TEXT
    );
  `);

  // User starts with 1,000,000 UZS opening balance
  db.prepare('INSERT INTO users (id, email, opening_balance) VALUES (?, ?, ?)').run('u1', 'test@test.com', 1000000);

  // 1. Regular expense: 50,000 UZS on groceries
  db.prepare('INSERT INTO transactions (id, user_id, type, amount, date) VALUES (?, ?, ?, ?, ?)').run('t1', 'u1', 'expense', 50000, '2026-10-27');

  // 2. Regular income: 200,000 UZS freelance
  db.prepare('INSERT INTO transactions (id, user_id, type, amount, date) VALUES (?, ?, ?, ?, ?)').run('t2', 'u1', 'income', 200000, '2026-10-27');

  // 3. User lends Shohruh 100,000 UZS:
  // Must reduce available cash by 100,000 UZS, but MUST NOT be counted as ordinary expense!
  db.prepare('INSERT INTO debts (id, user_id, type, original_amount, amount_repaid, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run('d1', 'u1', 'lent', 100000, 0, 'active');
  db.prepare('INSERT INTO transactions (id, user_id, type, amount, date) VALUES (?, ?, ?, ?, ?)').run('t3', 'u1', 'loan_given', 100000, '2026-10-27');

  // 4. User borrows 500,000 UZS from Akmal:
  // Must increase available cash by 500,000 UZS, but MUST NOT be counted as ordinary income!
  db.prepare('INSERT INTO debts (id, user_id, type, original_amount, amount_repaid, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run('d2', 'u1', 'borrowed', 500000, 0, 'active');
  db.prepare('INSERT INTO transactions (id, user_id, type, amount, date) VALUES (?, ?, ?, ?, ?)').run('t4', 'u1', 'borrowing', 500000, '2026-10-27');

  // Calculate ordinary totals vs cash flow
  const txs = db.prepare('SELECT type, amount FROM transactions WHERE user_id = ?').all('u1');

  let ordinaryIncome = 0;
  let ordinaryExpenses = 0;
  let totalInflow = 0;
  let totalOutflow = 0;

  for (const t of txs) {
    if (t.type === 'income') ordinaryIncome += t.amount;
    if (t.type === 'expense') ordinaryExpenses += t.amount;

    if (t.type === 'income' || t.type === 'borrowing' || t.type === 'debt_repayment_received') {
      totalInflow += t.amount;
    }
    if (t.type === 'expense' || t.type === 'loan_given' || t.type === 'debt_repayment_made') {
      totalOutflow += t.amount;
    }
  }

  // Verify Ordinary Income & Ordinary Expenses are NOT contaminated by loan principal
  assert.equal(ordinaryIncome, 200000, 'Ordinary income must strictly be 200,000 UZS (not including 500,000 borrowed)');
  assert.equal(ordinaryExpenses, 50000, 'Ordinary expenses must strictly be 50,000 UZS (not including 100,000 lent)');

  // Verify Net Inflow and Outflow
  // Inflow = 200,000 (income) + 500,000 (borrowed) = 700,000
  // Outflow = 50,000 (expense) + 100,000 (lent) = 150,000
  assert.equal(totalInflow, 700000);
  assert.equal(totalOutflow, 150000);

  // Available Cash = Opening (1,000,000) + Inflow (700,000) - Outflow (150,000) = 1,550,000
  const availableBalance = 1000000 + totalInflow - totalOutflow;
  assert.equal(availableBalance, 1550000, 'Available balance accurately reflects cash transactions');

  // 5. Partial Repayment received: Shohruh pays back 40,000 UZS of his 100,000 UZS debt
  // Updates debt.amount_repaid to 40,000, remaining debt becomes 60,000
  db.prepare('UPDATE debts SET amount_repaid = 40000, status = ? WHERE id = ?').run('partially_repaid', 'd1');
  db.prepare('INSERT INTO transactions (id, user_id, type, amount, date) VALUES (?, ?, ?, ?, ?)').run('t5', 'u1', 'debt_repayment_received', 40000, '2026-10-27');

  const updatedDebt = db.prepare('SELECT * FROM debts WHERE id = ?').get('d1');
  assert.equal(updatedDebt.amount_repaid, 40000);
  assert.equal(updatedDebt.original_amount - updatedDebt.amount_repaid, 60000, 'Outstanding balance is 60,000');
  assert.equal(updatedDebt.status, 'partially_repaid');
});
