import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNaturalLanguageTransaction } from '../src/lib/nlp.ts';

test('NLP Transaction Parser: English, Uzbek, and Russian inputs', () => {
  // 1. English Expense: "I spent 10,000 UZS on bread today."
  const resEn = parseNaturalLanguageTransaction('I spent 10,000 UZS on bread today.');
  assert.equal(resEn.type, 'expense');
  assert.equal(resEn.amount, 10000);
  assert.equal(resEn.categoryId, 'cat-exp-food');
  assert.equal(resEn.isAmbiguous, false);

  // 2. Uzbek Expense: "Bugun nonga 10 000 so‘m sarfladim."
  const resUz = parseNaturalLanguageTransaction('Bugun nonga 10 000 so‘m sarfladim.');
  assert.equal(resUz.type, 'expense');
  assert.equal(resUz.amount, 10000);
  assert.equal(resUz.categoryId, 'cat-exp-food');
  assert.equal(resUz.detectedLanguage, 'uz');
  assert.equal(resUz.isAmbiguous, false);

  // 3. Russian Expense: "Сегодня я потратил 10 000 сумов на хлеб."
  const resRu = parseNaturalLanguageTransaction('Сегодня я потратил 10 000 сумов на хлеб.');
  assert.equal(resRu.type, 'expense');
  assert.equal(resRu.amount, 10000);
  assert.equal(resRu.categoryId, 'cat-exp-food');
  assert.equal(resRu.detectedLanguage, 'ru');
  assert.equal(resRu.isAmbiguous, false);

  // 4. English Income: "I received 3,000,000 UZS as my salary."
  const resSalary = parseNaturalLanguageTransaction('I received 3,000,000 UZS as my salary.');
  assert.equal(resSalary.type, 'income');
  assert.equal(resSalary.amount, 3000000);
  assert.equal(resSalary.categoryId, 'cat-inc-salary');

  // 5. Uzbek Debt Loan: "Shohruhga 100 000 qarz berdim"
  const resLentUz = parseNaturalLanguageTransaction('Shohruhga 100 000 qarz berdim');
  assert.equal(resLentUz.type, 'loan_given');
  assert.equal(resLentUz.amount, 100000);
  assert.equal(resLentUz.counterparty, 'Shohruh');

  // 6. Ambiguous entry without amount: "I bought groceries"
  const resAmbiguous = parseNaturalLanguageTransaction('I bought groceries');
  assert.equal(resAmbiguous.isAmbiguous, true);
  assert.ok(resAmbiguous.clarificationMessage);
});
