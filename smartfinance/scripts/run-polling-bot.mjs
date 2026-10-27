// Long-polling Telegram bot runner for local development and direct bot interactions
import https from 'https';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8942245391:AAH5bn66CbwDM7Tbe5w5Zyt7Q6otmEFSZy8';
let appUrl = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function telegramRequest(method, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = https.request(
      `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        family: 4,
        timeout: 40000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ ok: false, body });
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });

    req.write(payload);
    req.end();
  });
}

async function startPolling() {
  console.log(`Starting Telegram Bot Polling for @smartfinance1_bot...`);
  console.log(`Mini App URL: ${appUrl}`);

  // Delete webhook so long polling can receive updates
  await telegramRequest('deleteWebhook', { drop_pending_updates: false });

  let offset = 0;

  while (true) {
    try {
      const res = await telegramRequest('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query'],
      });

      if (res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          const msg = update.message;
          if (!msg || !msg.text) continue;

          const text = msg.text.trim();
          const chatId = msg.chat.id;
          const firstName = msg.from?.first_name || 'Foydalanuvchi';
          const lang = msg.from?.language_code || 'uz';

          if (text === '/start' || text.startsWith('/start') || text === '/app') {
            let welcome = '';
            let btnText = '';

            if (lang === 'ru') {
              welcome = `Привет, <b>${firstName}</b>! 👋\n\n💰 <b>Smart Finance</b> — ваш умный помощник для управления личными финансами.\n\n📊 Расходы и доходы\n🎯 Бюджеты и лимиты\n🤝 Долги и возвраты\n📈 Аналитика и статистика\n\nНажмите кнопку ниже, чтобы открыть приложение:`;
              btnText = '🚀 Открыть Smart Finance';
            } else if (lang === 'en') {
              welcome = `Hello, <b>${firstName}</b>! 👋\n\n💰 <b>Smart Finance</b> — your smart personal finance manager.\n\n📊 Expenses & Income\n🎯 Budgets & Limits\n🤝 Debts & Repayments\n📈 Analytics & Reports\n\nTap the button below to launch the Mini App:`;
              btnText = '🚀 Open Smart Finance';
            } else {
              welcome = `Assalomu alaykum, <b>${firstName}</b>! 👋\n\n💰 <b>Smart Finance</b> — shaxsiy moliyani boshqarish ilovangiz.\n\n📊 Xarajat va daromadlar hisobi\n🎯 Byudjet va limitlar nazorati\n🤝 Qarzlar va qaytarishlar\n📈 Moliyaviy tahlil va hisobotlar\n\nIlovani ochish uchun quyidagi tugmani bosing:`;
              btnText = '🚀 Smart Finance ilovasini ochish';
            }

            const replyMarkup = appUrl.startsWith('https://')
              ? {
                  inline_keyboard: [
                    [
                      {
                        text: btnText,
                        web_app: { url: appUrl },
                      },
                    ],
                  ],
                }
              : {
                  inline_keyboard: [
                    [
                      {
                        text: '🌐 Veb havola orqali ochish',
                        url: appUrl,
                      },
                    ],
                  ],
                };

            await telegramRequest('sendMessage', {
              chat_id: chatId,
              text: welcome,
              parse_mode: 'HTML',
              reply_markup: replyMarkup,
            });
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err.message || err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

startPolling();
