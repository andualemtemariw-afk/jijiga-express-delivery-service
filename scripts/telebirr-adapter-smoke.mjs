import { generateKeyPairSync, createSign, constants as cryptoConstants } from 'node:crypto';
import { parseAndVerifyTelebirrNotification, getTelebirrCanonicalString } from '../functions/lib/payments/telebirr.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function signPayload(payload) {
  const signer = createSign('sha256');
  signer.update(getTelebirrCanonicalString(payload), 'utf8');
  signer.end();
  return signer.sign({
    key: privateKey,
    padding: cryptoConstants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  }).toString('base64');
}

const payload = {
  appid: 'merchant-app',
  merch_code: '123456',
  merch_order_id: 'JX20261003ABC123',
  trade_status: 'Completed',
  payment_order_id: 'PAY123456',
  transId: 'TRANS123',
  total_amount: '100.00',
  trans_currency: 'ETB',
  trans_end_time: '1784756474676',
  notify_time: '1784756475676',
  notify_url: 'https://api.example.com/telebirrWebhook',
};

const signed = { ...payload, sign_type: 'SHA256WithRSA' };
signed.sign = signPayload(signed);
const parsed = parseAndVerifyTelebirrNotification(JSON.stringify(signed), publicKey);

if (parsed.status !== 'PAID_CONFIRMED') throw new Error('valid payment was not confirmed');
if (parsed.merchantOrderId !== payload.merch_order_id) throw new Error('merchant order id mismatch');
if (parsed.reference !== payload.payment_order_id) throw new Error('payment reference mismatch');
if (parsed.amount !== 100) throw new Error('amount mismatch');

const aliasedSigningPayload = { ...payload };
delete aliasedSigningPayload.transId;
aliasedSigningPayload.trans_id = payload.transId;
const aliased = { ...payload, sign_type: 'SHA256WithRSA', sign: signPayload(aliasedSigningPayload) };
const aliasedParsed = parseAndVerifyTelebirrNotification(JSON.stringify(aliased), publicKey);
if (aliasedParsed.transId !== payload.transId) throw new Error('transId alias verification failed');

const wrapped = { data: signed };
const wrappedParsed = parseAndVerifyTelebirrNotification(JSON.stringify(wrapped), publicKey);
if (wrappedParsed.eventId !== parsed.eventId) throw new Error('wrapped notification mismatch');

const tampered = { ...signed, total_amount: '101.00' };
try {
  parseAndVerifyTelebirrNotification(JSON.stringify(tampered), publicKey);
  throw new Error('tampered notification was accepted');
} catch (error) {
  if (!(error instanceof Error) || error.message !== 'INVALID_SIGNATURE') throw error;
}

const wrongSignType = { ...signed, sign_type: 'MD5' };
try {
  parseAndVerifyTelebirrNotification(JSON.stringify(wrongSignType), publicKey);
  throw new Error('wrong signature type was accepted');
} catch (error) {
  if (!(error instanceof Error) || error.message !== 'INVALID_SIGNATURE') throw error;
}

console.log('All Telebirr adapter smoke tests passed.');
