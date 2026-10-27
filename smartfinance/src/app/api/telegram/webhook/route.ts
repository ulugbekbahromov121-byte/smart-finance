import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8942245391:AAH5bn66CbwDM7Tbe5w5Zyt7Q6otmEFSZy8';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://courts-slideshow-optimum-distributed.trycloudflare.com';

function sendMessage(chatId: number | string, text: string, replyMarkup?: object): Promise<boolean> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {})
    });

    const req = https.request(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        family: 4,
        timeout: 10000
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message;

    if (message?.text && (message.text === '/start' || message.text.startsWith('/start') || message.text === '/app')) {
      const chatId = message.chat.id;
      const firstName = message.from?.first_name || 'Foydalanuvchi';
      const lang = message.from?.language_code || 'uz';

      let welcomeText = '';
      let buttonText = '';

      if (lang === 'ru') {
        welcomeText = `Привет, <b>${firstName}</b>! 👋\n\n💰 <b>Smart Finance</b> — ваш умный помощник для управления личными финансами.\n\n📊 Расходы и доходы\n🎯 Бюджеты и лимиты\n🤝 Долги и возвраты\n📈 Аналитика и статистика\n\nНажмите кнопку ниже, чтобы открыть приложение:`;
        buttonText = '🚀 Открыть Smart Finance';
      } else if (lang === 'en') {
        welcomeText = `Hello, <b>${firstName}</b>! 👋\n\n💰 <b>Smart Finance</b> — your smart personal finance manager.\n\n📊 Expenses & Income\n🎯 Budgets & Limits\n🤝 Debts & Repayments\n📈 Analytics & Reports\n\nTap the button below to launch the Mini App:`;
        buttonText = '🚀 Open Smart Finance';
      } else {
        welcomeText = `Assalomu alaykum, <b>${firstName}</b>! 👋\n\n💰 <b>Smart Finance</b> — shaxsiy moliyani boshqarish ilovangiz.\n\n📊 Xarajat va daromadlar hisobi\n🎯 Byudjet va limitlar nazorati\n🤝 Qarzlar va qaytarishlar\n📈 Moliyaviy tahlil va hisobotlar\n\nIlovani ochish uchun quyidagi tugmani bosing:`;
        buttonText = '🚀 Smart Finance ilovasini ochish';
      }

      await sendMessage(chatId, welcomeText, {
        inline_keyboard: [
          [
            {
              text: buttonText,
              web_app: { url: APP_URL }
            }
          ]
        ]
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
