import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { formatCurrency, getTranslation } from '../src/lib/i18n.ts';

test('i18n: Complete translation coverage in en, uz, and ru', () => {
  const en = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'locales/en.json'), 'utf8'));
  const uz = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'locales/uz.json'), 'utf8'));
  const ru = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'locales/ru.json'), 'utf8'));

  // Ensure top-level sections exist in all 3 languages
  const sections = ['app', 'nav', 'auth', 'common', 'dashboard', 'transactions', 'categories', 'budgets', 'debts', 'recurring', 'reports', 'notifications', 'settings', 'validation'];

  for (const s of sections) {
    assert.ok(en[s], `en.json missing section ${s}`);
    assert.ok(uz[s], `uz.json missing section ${s}`);
    assert.ok(ru[s], `ru.json missing section ${s}`);
  }

  // Ensure category names exist in all 3
  const catKeys = ['food', 'drinks', 'transport', 'housing', 'clothing', 'education', 'health', 'entertain', 'phone', 'shopping', 'otherExpense', 'salary', 'business', 'sales', 'freelance', 'gifts', 'invest', 'otherIncome'];
  for (const ck of catKeys) {
    assert.ok(en.categories[ck], `en category missing ${ck}`);
    assert.ok(uz.categories[ck], `uz category missing ${ck}`);
    assert.ok(ru.categories[ck], `ru category missing ${ck}`);
  }

  // Verify getTranslation key lookup
  assert.equal(getTranslation('en', 'nav.dashboard'), 'Dashboard');
  assert.equal(getTranslation('uz', 'nav.dashboard'), 'Bosh sahifa');
  assert.equal(getTranslation('ru', 'nav.dashboard'), 'Панель');

  // Verify currency formatting according to prompt specifications:
  // "Display amounts clearly, for example: 10 000 UZS, 10 000 so‘m, or 10 000 сумов."
  const fmtEn = formatCurrency(10000, 'UZS', 'en');
  const fmtUz = formatCurrency(10000, 'UZS', 'uz');
  const fmtRu = formatCurrency(10000, 'UZS', 'ru');

  assert.ok(fmtEn.includes('10') && fmtEn.includes('UZS'), 'English UZS format');
  assert.ok(fmtUz.includes('10') && fmtUz.includes('so‘m'), 'Uzbek so‘m format');
  assert.ok(fmtRu.includes('10') && fmtRu.includes('сумов'), 'Russian сумов format');
});
