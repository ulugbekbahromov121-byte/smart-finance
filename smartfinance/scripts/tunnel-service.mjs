// Persistent Tunnel Service with Keepalive and Auto-Reconnection for Telegram Mini App
import { spawn } from 'child_process';
import https from 'https';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8942245391:AAH5bn66CbwDM7Tbe5w5Zyt7Q6otmEFSZy8';

function telegramRequest(method, data = {}) {
  return new Promise((resolve) => {
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
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ ok: false });
          }
        });
      }
    );
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false });
    });
    req.write(payload);
    req.end();
  });
}

async function updateBotUrl(liveUrl) {
  console.log(`[Tunnel] Updating Telegram Bot to URL: ${liveUrl}`);
  // Set Menu Button
  await telegramRequest('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: '📱 Ilovani ochish',
      web_app: { url: liveUrl },
    },
  });

  // Set Webhook
  await telegramRequest('setWebhook', {
    url: `${liveUrl}/api/telegram/webhook`,
    allowed_updates: ['message', 'callback_query'],
  });

  console.log(`[Tunnel] Successfully synced @smartfinance1_bot with ${liveUrl}`);
}

function runTunnel() {
  console.log('[Tunnel] Starting SSH tunnel with Keepalive...');
  const child = spawn(
    'ssh',
    [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=99999',
      '-o', 'ExitOnForwardFailure=yes',
      '-R', '80:localhost:3000',
      'nokey@localhost.run',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );

  let currentUrl = null;

  child.stdout.on('data', async (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
    if (match && match[0] && match[0] !== currentUrl) {
      currentUrl = match[0];
      console.log(`[Tunnel] Connected! Live URL: ${currentUrl}`);
      await updateBotUrl(currentUrl);
    }
  });

  child.stderr.on('data', async (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
    if (match && match[0] && match[0] !== currentUrl) {
      currentUrl = match[0];
      console.log(`[Tunnel] Connected! Live URL: ${currentUrl}`);
      await updateBotUrl(currentUrl);
    }
  });

  child.on('close', (code) => {
    console.log(`[Tunnel] Process exited with code ${code}. Reconnecting in 3 seconds...`);
    setTimeout(runTunnel, 3000);
  });

  child.on('error', (err) => {
    console.error(`[Tunnel] Error:`, err);
    setTimeout(runTunnel, 3000);
  });
}

runTunnel();
