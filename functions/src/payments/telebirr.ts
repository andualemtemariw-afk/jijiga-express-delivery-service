import { createHash, createPublicKey, verify as cryptoVerify, constants as cryptoConstants } from 'node:crypto';

const EXCLUDED_FIELDS = new Set([
  'sign',
  'sign_type',
  'header',
  'refund_info',
  'openType',
  'raw_request',
  'biz_content',
]);

const SIGNED_FIELD_ALIASES: Readonly<Record<string, string>> = {
  transId: 'trans_id',
};

export interface TelebirrNotification {
  raw: Record<string, unknown>;
  tradeStatus: string;
  merchantOrderId: string;
  paymentOrderId: string;
  transId: string;
  merchCode: string;
  appId: string;
  notifyUrl: string;
  amount: number;
  currency: string;
  eventId: string;
  status: 'PAID_CONFIRMED' | 'FAILED';
  reference: string;
}

function asString(value: unknown): string {
  return typeof value === 'string'
    ? value.trim()
    : value !== undefined && value !== null
      ? String(value).trim()
      : '';
}

function unwrapNotification(input: Record<string, unknown>): Record<string, unknown> {
  const inner = input.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner) && 'merch_order_id' in inner) {
    return inner as Record<string, unknown>;
  }
  return input;
}

function normalizePublicKey(value: string): string {
  const trimmed = value.trim().replace(/\\n/g, '\n');
  if (trimmed.includes('-----BEGIN')) return trimmed;

  const body = trimmed.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) {
    throw new Error('Invalid Telebirr public key format.');
  }

  const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? body;
  const candidates = [
    `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----\n`,
    `-----BEGIN RSA PUBLIC KEY-----\n${wrapped}\n-----END RSA PUBLIC KEY-----\n`,
  ];

  for (const pem of candidates) {
    try {
      createPublicKey(pem);
      return pem;
    } catch {
      // Try the alternate DER container.
    }
  }

  throw new Error('Unable to parse Telebirr public key.');
}

function canonicalString(fields: Record<string, unknown>): string {
  const fieldMap = new Map<string, unknown>();

  for (const [key, value] of Object.entries(fields)) {
    if (EXCLUDED_FIELDS.has(key)) continue;
    fieldMap.set(key, value);
  }

  const bizContent = fields.biz_content;
  if (bizContent && typeof bizContent === 'object' && !Array.isArray(bizContent)) {
    for (const [key, value] of Object.entries(bizContent as Record<string, unknown>)) {
      if (EXCLUDED_FIELDS.has(key)) continue;
      fieldMap.set(key, value);
    }
  }

  const sortedKeys = [...fieldMap.keys()].sort();
  return sortedKeys.map((key) => `${key}=${String(fieldMap.get(key))}`).join('&');
}

function canonicalVariants(fields: Record<string, unknown>): string[] {
  const variants = [canonicalString(fields)];
  const aliased: Record<string, unknown> = { ...fields };
  let renamed = false;

  for (const [sentAs, signedAs] of Object.entries(SIGNED_FIELD_ALIASES)) {
    if (sentAs in aliased && !(signedAs in aliased)) {
      aliased[signedAs] = aliased[sentAs];
      delete aliased[sentAs];
      renamed = true;
    }
  }

  if (renamed) variants.push(canonicalString(aliased));
  return variants;
}

function signatureCandidates(value: string): Buffer[] {
  const attempts = [value, value.replace(/ /g, '+'), decodeURIComponentSafe(value).replace(/ /g, '+'), decodeURIComponentSafe(value)];
  const decoded: Buffer[] = [];

  for (const attempt of attempts) {
    const padded = attempt + '='.repeat((4 - (attempt.length % 4)) % 4);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(padded)) continue;
    const bytes = Buffer.from(padded, 'base64');
    if (bytes.length > 0 && !decoded.some((existing) => existing.equals(bytes))) {
      decoded.push(bytes);
    }
  }

  return decoded;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function verifySignature(fields: Record<string, unknown>, publicKeyPem: string): boolean {
  const signature = asString(fields.sign);
  if (!signature || !asString(fields.sign_type)) return false;

  const publicKey = normalizePublicKey(publicKeyPem);
  return canonicalVariants(fields).some((canonical) =>
    signatureCandidates(signature).some((candidate) => {
      try {
        return cryptoVerify(
          'sha256',
          Buffer.from(canonical, 'utf8'),
          {
            key: publicKey,
            padding: cryptoConstants.RSA_PKCS1_PSS_PADDING,
            saltLength: 32,
          },
          candidate
        );
      } catch {
        return false;
      }
    })
  );
}

export function parseAndVerifyTelebirrNotification(
  rawBody: string,
  publicKeyPem: string,
): TelebirrNotification {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error('INVALID_JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_PAYLOAD');
  }

  const notification = unwrapNotification(parsed as Record<string, unknown>);

  if (!verifySignature(notification, publicKeyPem)) {
    throw new Error('INVALID_SIGNATURE');
  }

  const tradeStatus = asString(notification.trade_status || notification.status);
  const merchantOrderId = asString(notification.merch_order_id);
  const paymentOrderId = asString(notification.payment_order_id);
  const transId = asString(notification.transId || notification.trans_id);
  const merchCode = asString(notification.merch_code);
  const appId = asString(notification.appid);
  const notifyUrl = asString(notification.notify_url);
  const currency = asString(notification.trans_currency) || 'ETB';
  const amountText = asString(notification.total_amount || notification.amount);
  const amount = Number(amountText);

  if (
    !merchantOrderId ||
    !/^[A-Za-z0-9]{8,128}$/.test(merchantOrderId) ||
    !paymentOrderId && !transId ||
    !merchCode ||
    !appId ||
    !notifyUrl ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    currency !== 'ETB'
  ) {
    throw new Error('INVALID_PAYMENT_FIELDS');
  }

  let status: 'PAID_CONFIRMED' | 'FAILED';
  if (tradeStatus === 'Completed' || tradeStatus === 'PAY_SUCCESS') {
    status = 'PAID_CONFIRMED';
  } else if (tradeStatus === 'PAY_FAILED' || tradeStatus === 'PAY_CANCEL' || tradeStatus === 'FAILED') {
    status = 'FAILED';
  } else {
    throw new Error('UNSUPPORTED_TRADE_STATUS');
  }

  const reference = paymentOrderId || transId;
  const eventId = createHash('sha256').update(canonicalString(notification), 'utf8').digest('hex');

  return {
    raw: notification,
    tradeStatus,
    merchantOrderId,
    paymentOrderId,
    transId,
    merchCode,
    appId,
    notifyUrl,
    amount,
    currency,
    eventId: `telebirr_${eventId}`,
    status,
    reference,
  };
}

export function signTelebirrTestPayload(payload: Record<string, unknown>, privateKeyPem: string): string {
  // Test-only helper for deterministic CI coverage; production code verifies only.
  throw new Error('signTelebirrTestPayload is not available at runtime.');
}
