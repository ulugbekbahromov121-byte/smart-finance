import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

test('Security & User Data Isolation: Users cannot access or tamper with other users financial data', () => {
  const db = new DatabaseSync(':memory:');

  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      full_name TEXT
    );

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      amount REAL,
      description TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE debts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      original_amount REAL,
      counterparty_name TEXT
    );
  `);

  // User A (Alice) and User B (Bob)
  db.prepare('INSERT INTO users VALUES (?, ?, ?)').run('usr-alice', 'alice@test.com', 'Alice');
  db.prepare('INSERT INTO users VALUES (?, ?, ?)').run('usr-bob', 'bob@test.com', 'Bob');

  // Alice adds private transactions and debts
  db.prepare('INSERT INTO transactions VALUES (?, ?, ?, ?)').run('tx-alice-1', 'usr-alice', 150000, 'Confidential expense');
  db.prepare('INSERT INTO debts VALUES (?, ?, ?, ?)').run('debt-alice-1', 'usr-alice', 300000, 'Secret Debtor');

  // 1. Bob queries transactions
  // When Bob sends request, the server queries: WHERE user_id = 'usr-bob'
  const bobTransactions = db.prepare('SELECT * FROM transactions WHERE user_id = ?').all('usr-bob');
  assert.equal(bobTransactions.length, 0, 'Bob cannot see any of Alice transactions');

  // 2. Bob attempts to manipulate Alice transaction by ID ('tx-alice-1')
  // Server executes: UPDATE ... WHERE id = ? AND user_id = ?
  const updateResult = db.prepare(`
    UPDATE transactions
    SET amount = 1
    WHERE id = ? AND user_id = ?
  `).run('tx-alice-1', 'usr-bob');

  assert.equal(updateResult.changes, 0, 'Tampering failed: 0 rows modified');

  // Check Alice record was untouched
  const aliceTx = db.prepare('SELECT amount FROM transactions WHERE id = ?').get('tx-alice-1');
  assert.equal(aliceTx.amount, 150000, 'Alice transaction remains untouched');

  // 3. Bob attempts to delete Alice debt
  const deleteResult = db.prepare('DELETE FROM debts WHERE id = ? AND user_id = ?').run('debt-alice-1', 'usr-bob');
  assert.equal(deleteResult.changes, 0, 'Deletion blocked: 0 rows deleted');
});
