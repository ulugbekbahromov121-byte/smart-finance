// Master runner: Starts Next.js server + Cloudflare Tunnel + Configures Telegram Bot
import { spawn } from 'child_process';
import https from 'https';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
process.chdir(ROOT_DIR);

const DATA_DIR = path.join(ROOT_DIR, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const LOG_FILE = path.join(DATA_DIR, 'service.log');
const URL_FILE = path.join(DATA_DIR, 'current_url.txt');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {}
}

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
        timeout: 15000,
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

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startNextServer() {
  const isRunning = await checkPort(3000);
  if (isRunning) {
    log('[Server] Next.js server is already running on http://localhost:3000');
    return null;
  }

  log('[Server] Starting Next.js production server on http://localhost:3000...');
  const nextProcess = spawn('cmd.exe', ['/c', 'npm', 'start'], {
    cwd: ROOT_DIR,
    stdio: 'ignore',
    detached: true,
  });
  nextProcess.unref();

  // Wait until server is listening
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await checkPort(3000)) {
      log('[Server] Next.js is ready on http://localhost:3000!');
      return nextProcess;
    }
  }

  log('[Server] Server check finished, continuing...');
  return nextProcess;
}

async function updateBot(liveUrl) {
  log(`[Bot] Syncing @smartfinance1_bot with: ${liveUrl}`);

  // 1. Set Chat Menu Button
  const menuRes = await telegramRequest('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: '📱 Ilovani ochish',
      web_app: { url: liveUrl },
    },
  });

  // 2. Set Webhook
  const webhookRes = await telegramRequest('setWebhook', {
    url: `${liveUrl}/api/telegram/webhook`,
    allowed_updates: ['message', 'callback_query'],
  });

  // 3. Set Commands
  await telegramRequest('setMyCommands', {
    commands: [
      { command: 'start', description: 'Smart Finance ilovasini ochish' },
      { command: 'app', description: 'Mini App-ni ishga tushirish' },
      { command: 'help', description: 'Yordam' },
    ],
  });

  log(`[Bot] Menu button result: ${menuRes?.ok ? 'OK' : 'Error'}`);
  log(`[Bot] Webhook result: ${webhookRes?.ok ? 'OK' : 'Error'}`);

  // Update local files
  try {
    fs.writeFileSync(URL_FILE, liveUrl);
    fs.writeFileSync(path.join(ROOT_DIR, 'menu_button.json'), JSON.stringify({
      menu_button: {
        type: 'web_app',
        text: '📱 Ilovani ochish',
        web_app: { url: liveUrl }
      }
    }, null, 2));

    fs.writeFileSync(path.join(ROOT_DIR, 'webhook.json'), JSON.stringify({
      url: `${liveUrl}/api/telegram/webhook`,
      allowed_updates: ['message', 'callback_query']
    }, null, 2));

    const envContent = `NODE_ENV=production\nJWT_SECRET=super_secret_jwt_key_smart_finance_secure_2026_change_in_production\nDATABASE_PATH=data/smart_finance.db\nNEXT_PUBLIC_APP_URL=${liveUrl}\nTELEGRAM_BOT_TOKEN=8942245391:AAH5bn66CbwDM7Tbe5w5Zyt7Q6otmEFSZy8\n`;
    fs.writeFileSync(path.join(ROOT_DIR, '.env.local'), envContent);
  } catch (e) {
    log(`[Bot] File sync error: ${e.message}`);
  }
}

async function main() {
  log('Starting Smart Finance 24/7 background service...');
  await startNextServer();

  const binPath = path.join(ROOT_DIR, 'cloudflared.exe');

  log('[Cloudflare] Starting Cloudflare tunnel to http://localhost:3000...');
  const cf = spawn(binPath, ['tunnel', '--url', 'http://localhost:3000'], {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let synced = false;

  const handleOutput = async (chunk) => {
    const text = chunk.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && match[0] && !synced) {
      synced = true;
      const liveUrl = match[0];
      log(`============================================================`);
      log(`🚀 CLOUDFLARE TUNNEL ONLINE!`);
      log(`🔗 Live URL: ${liveUrl}`);
      log(`🤖 Telegram Bot: @smartfinance1_bot`);
      log(`============================================================`);

      await updateBot(liveUrl);
    }
  };

  cf.stdout.on('data', handleOutput);
  cf.stderr.on('data', handleOutput);

  cf.on('close', (code) => {
    log(`[Cloudflare] Tunnel exited with code ${code}. Reconnecting in 3 seconds...`);
    synced = false;
    setTimeout(main, 3000);
  });

  cf.on('error', (err) => {
    log(`[Cloudflare] Error: ${err.message}. Retrying in 3 seconds...`);
    synced = false;
    setTimeout(main, 3000);
  });
}

main().catch((err) => {
  log(`[Fatal] Error in main runner: ${err.message}`);
});
