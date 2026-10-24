import { createHmac, createSign, timingSafeEqual } from 'node:crypto';

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}
export interface FirebaseServiceAccount {
  project_id?: string;
  client_email: string;
  private_key: string;
}
export class TelegramInitDataError extends Error {
  constructor(message = 'Telegram Mini App data is invalid or expired.') {
    super(message);
    this.name = 'TelegramInitDataError';
  }
}
function secureEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Validate Telegram WebApp.initData on the server. */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): TelegramWebAppUser {
  if (!initData || initData.length > 8192 || !botToken) throw new TelegramInitDataError();
  const params = new URLSearchParams(initData);
  const seen = new Set<string>();
  for (const [key] of params.entries()) {
    if (seen.has(key)) throw new TelegramInitDataError();
    seen.add(key);
  }

  const receivedHash = params.get('hash');
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) throw new TelegramInitDataError();
  const authDateRaw = params.get('auth_date');
  if (!authDateRaw || !/^[0-9]+$/.test(authDateRaw)) throw new TelegramInitDataError();
  const authDate = Number(authDateRaw);
  if (!Number.isSafeInteger(authDate) || authDate <= 0 || authDate > nowSeconds + 60 || nowSeconds - authDate > 10 * 60) {
    throw new TelegramInitDataError();
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => key + '=' + value)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest();
  if (!secureEqual(expectedHash, Buffer.from(receivedHash, 'hex'))) throw new TelegramInitDataError();

  let rawUser: unknown;
  try { rawUser = JSON.parse(params.get('user') || ''); }
  catch { throw new TelegramInitDataError(); }
  if (!rawUser || typeof rawUser !== 'object') throw new TelegramInitDataError();
  const user = rawUser as Record<string, unknown>;
  if (typeof user.id !== 'number' || !Number.isSafeInteger(user.id) || user.id <= 0
    || typeof user.first_name !== 'string' || !user.first_name.trim() || user.first_name.length > 128) {
    throw new TelegramInitDataError();
  }

  const verified: TelegramWebAppUser = { id: user.id, first_name: user.first_name.trim() };
  if (typeof user.last_name === 'string' && user.last_name.trim() && user.last_name.length <= 128) verified.last_name = user.last_name.trim();
  if (typeof user.username === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(user.username)) verified.username = user.username;
  if (typeof user.photo_url === 'string' && user.photo_url.length <= 2048) {
    try {
      const photo = new URL(user.photo_url);
      if (photo.protocol === 'https:') verified.photo_url = photo.toString();
    } catch { /* Ignore optional invalid photo metadata. */ }
  }
  return verified;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Sign a one-hour Firebase custom token for a customer-only Telegram identity. */
export function createFirebaseCustomToken(
  uid: string,
  serviceAccount: FirebaseServiceAccount,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  if (!uid || uid.length > 128 || /\s/.test(uid) || !serviceAccount?.client_email
    || !serviceAccount?.private_key || !Number.isSafeInteger(nowSeconds) || nowSeconds <= 0) {
    throw new Error('Firebase service account or token inputs are invalid.');
  }
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const payload = base64UrlJson({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: nowSeconds,
    exp: nowSeconds + 3600,
    uid,
    provider: 'telegram',
    telegramUserId: uid.startsWith('telegram_') ? uid.slice('telegram_'.length) : '',
  });
  const signingInput = header + '.' + payload;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  return signingInput + '.' + signer.sign(serviceAccount.private_key).toString('base64url');
}
