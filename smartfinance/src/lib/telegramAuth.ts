import crypto from 'crypto';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string
): { isValid: boolean; user?: TelegramUserData; error?: string } {
  try {
    if (!initData || !botToken) {
      return { isValid: false, error: 'Missing initData or botToken' };
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      return { isValid: false, error: 'Missing hash parameter' };
    }

    urlParams.delete('hash');

    // Sort parameters alphabetically by key
    const params: string[] = [];
    urlParams.forEach((value, key) => {
      params.push(`${key}=${value}`);
    });
    params.sort();

    const dataCheckString = params.join('\n');

    // Telegram HMAC key is HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Secure timing comparison
    const hashBuffer = Buffer.from(hash, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

    if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
      return { isValid: false, error: 'Invalid HMAC signature' };
    }

    // Parse user object
    const userParam = urlParams.get('user');
    let user: TelegramUserData | undefined;
    if (userParam) {
      user = JSON.parse(userParam);
    }

    return { isValid: true, user };
  } catch (err: unknown) {
    return { isValid: false, error: (err as Error).message };
  }
}
