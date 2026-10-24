import assert from 'node:assert/strict';
import { createHmac, createVerify, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { createFirebaseCustomToken, validateTelegramInitData } from '../server/telegram.ts';

const BOT_TOKEN = 'unit-test-token-not-for-use';
const NOW = 1_800_000_000;
function signedInitData({ authDate = NOW, userId = 987654321, firstName = 'Test Customer' } = {}) {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'AAE-unit-test-query',
    user: JSON.stringify({ id: userId, first_name: firstName, username: 'jx_customer' }),
  });
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => key + '=' + value).join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  params.set('hash', createHmac('sha256', secretKey).update(dataCheckString).digest('hex'));
  return params.toString();
}
test('accepts valid fresh Telegram initData', () => {
  const user = validateTelegramInitData(signedInitData(), BOT_TOKEN, NOW);
  assert.equal(user.id, 987654321);
  assert.equal(user.first_name, 'Test Customer');
  assert.equal(user.username, 'jx_customer');
});
test('rejects tampered Telegram initData', () => {
  const params = new URLSearchParams(signedInitData());
  params.set('user', JSON.stringify({ id: 1, first_name: 'Attacker' }));
  assert.throws(() => validateTelegramInitData(params.toString(), BOT_TOKEN, NOW), /invalid or expired/i);
});
test('rejects expired Telegram initData', () => {
  assert.throws(() => validateTelegramInitData(signedInitData({ authDate: NOW - 11 * 60 }), BOT_TOKEN, NOW), /invalid or expired/i);
});
test('rejects duplicate parameters', () => {
  assert.throws(() => validateTelegramInitData(signedInitData() + '&auth_date=' + NOW, BOT_TOKEN, NOW), /invalid or expired/i);
});
test('creates a one-hour RS256 Firebase customer token', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { client_email: 'test-service-account@example.invalid', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
  const token = createFirebaseCustomToken('telegram_987654321', account, NOW);
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
  assert.equal(header.alg, 'RS256');
  assert.equal(payload.uid, 'telegram_987654321');
  assert.equal(payload.iss, account.client_email);
  assert.equal(payload.sub, account.client_email);
  assert.equal(payload.iat, NOW);
  assert.equal(payload.exp, NOW + 3600);
  assert.equal(payload.provider, 'telegram');
  assert.equal(payload.telegramUserId, '987654321');
  assert.equal('email' in payload, false);
  const verifier = createVerify('RSA-SHA256');
  verifier.update(headerPart + '.' + payloadPart);
  verifier.end();
  assert.equal(verifier.verify(publicKey, Buffer.from(signaturePart, 'base64url')), true);
});
