// Helper script to configure Telegram Mini App menu button and bot metadata
import https from 'https';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8942245391:AAH5bn66CbwDM7Tbe5w5Zyt7Q6otmEFSZy8';

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
        timeout: 10000,
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
      reject(new Error('Request timeout'));
    });

    req.write(payload);
    req.end();
  });
}

async function setup() {
  const appUrl = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'https://courts-slideshow-optimum-distributed.trycloudflare.com';
  console.log(`Setting up Telegram Bot for Mini App: ${appUrl}`);

  // 1. Get Me
  const me = await telegramRequest('getMe');
  console.log('Bot info:', me);

  // 2. Set Bot Commands
  const commands = await telegramRequest('setMyCommands', {
    commands: [
      { command: 'start', description: 'Smart Finance ilovasini ishga tushirish' },
      { command: 'app', description: 'Mini App-ni ochish' },
      { command: 'help', description: 'Yordam va qo‘llanma' },
    ],
  });
  console.log('Set commands result:', commands);

  // 3. Set Bot Description
  const desc = await telegramRequest('setMyDescription', {
    description: '💰 Smart Finance — Shaxsiy moliya, xarajatlar, daromadlar, byudjetlar va qarzlarni hisobga olish bo‘yicha qulay Telegram Mini App.',
  });
  console.log('Set description result:', desc);

  // 4. Set Bot Short Description
  const shortDesc = await telegramRequest('setMyShortDescription', {
    short_description: 'Smart Finance Telegram Mini App — shaxsiy moliyaviy hisobot va boshqaruv.',
  });
  console.log('Set short description result:', shortDesc);

  // 5. Set Menu Button to WebApp (shows Mini App button next to chat input)
  if (appUrl.startsWith('https://')) {
    const menuBtn = await telegramRequest('setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: '📱 Ilovani ochish',
        web_app: {
          url: appUrl,
        },
      },
    });
    console.log('Set menu button result:', menuBtn);

    // 6. Set Webhook
    const webhookRes = await telegramRequest('setWebhook', {
      url: `${appUrl}/api/telegram/webhook`,
      allowed_updates: ['message', 'callback_query'],
    });
    console.log('Set webhook result:', webhookRes);
  } else {
    console.log('Notice: appUrl is not HTTPS. Telegram WebApp requires HTTPS URL to set Menu Button & Webhook.');
  }

  console.log('Bot setup finished successfully!');
}

setup().catch(console.error);
