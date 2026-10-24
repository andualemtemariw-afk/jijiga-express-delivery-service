import { timingSafeEqual } from 'node:crypto';

interface ApiRequest { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown }
interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(value: unknown): void;
}
interface TelegramUpdate {
  message?: { text?: string; chat?: { id?: number; type?: string } };
}
function getHeader(req: ApiRequest, name: string): string {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}
function safeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
function miniAppBaseUrl(): URL {
  const raw = process.env.TELEGRAM_MINI_APP_URL;
  if (!raw) throw new Error('Mini App URL is not configured.');
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Expected HTTPS origin without path.');
  return url;
}
function makeMiniAppUrl(command: string, orderId?: string): string {
  const url = miniAppBaseUrl();
  url.searchParams.set('tg', '1');
  url.searchParams.set('tgCommand', command);
  if (orderId && /^[A-Za-z0-9_-]{1,128}$/.test(orderId)) url.searchParams.set('tgOrderId', orderId);
  return url.toString();
}
async function sendTelegramMessage(token: string, chatId: number, text: string, replyMarkup?: Record<string, unknown>): Promise<void> {
  const response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}), disable_web_page_preview: true }),
  });
  const result = await response.json().catch(() => ({})) as { ok?: boolean };
  if (!response.ok || result.ok !== true) throw new Error('Telegram message delivery failed.');
}
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!botToken || !webhookSecret) {
    res.status(503).json({ error: 'Telegram webhook is not configured.' });
    return;
  }
  if (!safeEquals(webhookSecret, getHeader(req, 'x-telegram-bot-api-secret-token'))) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const update = req.body && typeof req.body === 'object' ? req.body as TelegramUpdate : {};
  const message = update.message;
  const chatId = message?.chat?.id;
  if (message?.chat?.type !== 'private' || typeof chatId !== 'number' || !Number.isSafeInteger(chatId)
    || typeof message?.text !== 'string' || message.text.length > 500) {
    res.status(200).json({ ok: true });
    return;
  }
  const match = message.text.trim().match(/^\/([a-z0-9_]+)(?:@[a-z0-9_]+)?(?:\s+([\s\S]{1,160}))?$/i);
  if (!match) {
    res.status(200).json({ ok: true });
    return;
  }
  const command = match[1].toLowerCase();
  const argument = (match[2] || '').trim();
  const recognized = new Set(['start', 'order', 'orders', 'status', 'location', 'contact', 'help', 'cancel']);
  if (!recognized.has(command)) {
    try { await sendTelegramMessage(botToken, chatId, 'I did not recognize that command. Send /help to see the available commands.'); }
    catch { res.status(502).json({ error: 'Telegram message could not be delivered.' }); return; }
    res.status(200).json({ ok: true });
    return;
  }

  const messages: Record<string, string> = {
    start: 'Welcome to Jijiga Express! Open the Mini App to browse services, place orders, and follow your deliveries.',
    order: 'Ready to order? Open Jijiga Express and choose a service. Review your details before submitting.',
    orders: 'Open My Orders to review your order history.',
    status: 'Open Live Tracking to view your delivery status. You can also send /status ORDER_ID for a specific order.',
    location: 'Open Profile & Address, then tap “Use my current location” and approve Telegram’s location prompt if you wish to share it.',
    contact: 'Open the contact options for Jijiga Express dispatch.',
    help: 'Jijiga Express commands:\n/start — Start Jijiga Express\n/order — Place a new order\n/orders — My orders\n/status — Check order status\n/location — Update my location\n/contact — Contact dispatcher\n/help — Help\n/cancel — Cancel current order',
    cancel: 'Open My Orders, select the correct order, and use its cancellation option. The app checks eligibility and asks you to confirm.',
  };
  const routeCommand = command === 'status' ? 'status'
    : command === 'orders' || command === 'cancel' ? command
    : command === 'location' ? 'location'
    : command === 'contact' ? 'contact'
    : command === 'order' ? 'order'
    : 'start';
  const specificOrder = (command === 'status' || command === 'cancel') ? argument : undefined;
  let url: string;
  try { url = makeMiniAppUrl(routeCommand, specificOrder); }
  catch {
    res.status(503).json({ error: 'Telegram Mini App URL is not configured.' });
    return;
  }
  const username = (process.env.TELEGRAM_DISPATCHER_USERNAME || '').replace(/^@/, '').trim();
  const buttonText = command === 'orders' || command === 'cancel' ? 'Open My Orders'
    : command === 'status' ? 'Open Live Tracking'
    : command === 'location' ? 'Update My Location'
    : command === 'contact' ? 'Contact Options' : 'Open Jijiga Express';
  const keyboard: Array<Array<Record<string, unknown>>> = [[{ text: buttonText, web_app: { url } }]];
  if (command === 'contact' && /^[A-Za-z0-9_]{5,32}$/.test(username)) {
    keyboard.push([{ text: 'Message dispatcher', url: 'https://t.me/' + username }]);
  }
  try {
    await sendTelegramMessage(botToken, chatId, messages[command], { inline_keyboard: keyboard });
    res.status(200).json({ ok: true });
  } catch {
    res.status(502).json({ error: 'Telegram message could not be delivered.' });
  }
}
