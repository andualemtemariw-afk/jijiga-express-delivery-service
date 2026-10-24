import { createFirebaseCustomToken, TelegramInitDataError, validateTelegramInitData, type FirebaseServiceAccount } from '../../server/telegram';

interface ApiRequest { method?: string; body?: unknown }
interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(value: unknown): void;
}
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const rawAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!botToken || !rawAccount) {
    res.status(503).json({ error: 'Telegram authentication is not configured.' });
    return;
  }
  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  if (typeof body.initData !== 'string' || body.initData.length > 8192) {
    res.status(400).json({ error: 'A valid Telegram session is required.' });
    return;
  }

  let serviceAccount: FirebaseServiceAccount;
  try {
    serviceAccount = JSON.parse(rawAccount) as FirebaseServiceAccount;
    if (!serviceAccount || typeof serviceAccount.client_email !== 'string' || typeof serviceAccount.private_key !== 'string') throw new Error('invalid account');
  } catch {
    res.status(503).json({ error: 'Telegram authentication is not configured.' });
    return;
  }

  try {
    const user = validateTelegramInitData(body.initData, botToken);
    const customToken = createFirebaseCustomToken('telegram_' + String(user.id), serviceAccount);
    res.status(200).json({ customToken, user });
  } catch (error) {
    if (error instanceof TelegramInitDataError) {
      res.status(401).json({ error: 'Telegram session is invalid or expired. Close and reopen the Mini App.' });
      return;
    }
    res.status(500).json({ error: 'Telegram sign-in could not be completed.' });
  }
}
