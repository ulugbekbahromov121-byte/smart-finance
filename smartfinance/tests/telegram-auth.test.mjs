import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyTelegramInitData } from '../src/lib/telegramAuth.ts';

describe('Telegram WebApp Authentication', () => {
  const BOT_TOKEN = '8942245391:AAH5bn66CbwDM7Tbe5w5Zyt7Q6otmEFSZy8';

  function createValidInitData(userObj) {
    const userStr = JSON.stringify(userObj);
    const authDate = Math.floor(Date.now() / 1000).toString();
    const queryId = 'AAHdF6IQAAAAAN0XohD_test';

    const params = [
      `auth_date=${authDate}`,
      `query_id=${queryId}`,
      `user=${userStr}`,
    ];
    params.sort();
    const dataCheckString = params.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return `auth_date=${authDate}&query_id=${queryId}&user=${encodeURIComponent(userStr)}&hash=${hash}`;
  }

  test('Successfully validates authentic Telegram initData', () => {
    const user = {
      id: 99887766,
      first_name: 'Anvar',
      last_name: 'Karimov',
      username: 'anvar_uz',
      language_code: 'uz',
    };

    const initData = createValidInitData(user);
    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    assert.equal(result.isValid, true);
    assert.ok(result.user);
    assert.equal(result.user.id, 99887766);
    assert.equal(result.user.first_name, 'Anvar');
    assert.equal(result.user.language_code, 'uz');
  });

  test('Rejects tampered initData', () => {
    const user = { id: 12345, first_name: 'Hacker' };
    let initData = createValidInitData(user);
    // Tamper with data
    initData = initData.replace('12345', '99999');

    const result = verifyTelegramInitData(initData, BOT_TOKEN);
    assert.equal(result.isValid, false);
  });

  test('Rejects missing hash or empty data', () => {
    const result = verifyTelegramInitData('', BOT_TOKEN);
    assert.equal(result.isValid, false);

    const resultNoHash = verifyTelegramInitData('user=%7B%7D', BOT_TOKEN);
    assert.equal(resultNoHash.isValid, false);
  });
});
