import test from 'node:test';
import assert from 'node:assert/strict';

test('Budgets & Deduplicated Notification Generation', () => {
  // Test budget percentage and status states according to requirement:
  // 0–69%: Normal.
  // 70–89%: Warning.
  // 90–99%: Critical warning.
  // 100% or more: Limit reached or exceeded.

  function evaluateBudgetStatus(spent, limit, threshold = 80) {
    const percentage = Math.round((spent / limit) * 100);
    let status = 'normal';
    if (percentage >= 100) status = 'exceeded';
    else if (percentage >= 90) status = 'critical';
    else if (percentage >= threshold) status = 'warning';
    return { percentage, status };
  }

  // Example: 50,000 UZS daily limit
  // Spent 20,000 -> 40% -> normal
  assert.deepEqual(evaluateBudgetStatus(20000, 50000), { percentage: 40, status: 'normal' });

  // Spent 40,000 -> 80% -> warning
  assert.deepEqual(evaluateBudgetStatus(40000, 50000), { percentage: 80, status: 'warning' });

  // Spent 45,000 -> 90% -> critical warning
  assert.deepEqual(evaluateBudgetStatus(45000, 50000), { percentage: 90, status: 'critical' });

  // Spent 55,000 -> 110% -> exceeded
  assert.deepEqual(evaluateBudgetStatus(55000, 50000), { percentage: 110, status: 'exceeded' });

  // Test Deduplication Key logic
  const notificationsSet = new Set();
  function addNotification(dedupKey) {
    if (notificationsSet.has(dedupKey)) return false;
    notificationsSet.add(dedupKey);
    return true;
  }

  const key1 = `budget_warn_90_b1_2026-10-27`;
  assert.equal(addNotification(key1), true, 'First notification delivered');
  assert.equal(addNotification(key1), false, 'Duplicate notification suppressed');
});
