import assert from 'node:assert/strict';
import test from 'node:test';

import { isValidEeuStsToken, normalizeEeuStsToken } from '../src/utils/eeuStateMachine.ts';

test('normalizes a valid 20-digit STS token with separators', () => {
  assert.equal(
    normalizeEeuStsToken('1234-5678 9012-3456 7890'),
    '12345678901234567890',
  );
  assert.equal(isValidEeuStsToken('1234-5678 9012-3456 7890'), true);
});

test('preserves an extra digit so exact-length validation can reject it', () => {
  const normalized = normalizeEeuStsToken('123456789012345678901');

  assert.equal(normalized, '123456789012345678901');
  assert.equal(normalized.length, 21);
  assert.notEqual(normalized.length, 20);
  assert.equal(isValidEeuStsToken(normalized), false);
});

test('does not pad a token with fewer than 20 digits', () => {
  const normalized = normalizeEeuStsToken('1234567890123456789');

  assert.equal(normalized, '1234567890123456789');
  assert.equal(normalized.length, 19);
  assert.equal(isValidEeuStsToken(normalized), false);
});

test('removes readable separators without changing digit order', () => {
  assert.equal(
    normalizeEeuStsToken('12 34-56 78-90 12-34 56-78 90'),
    '12345678901234567890',
  );
});

test('rejects non-digit characters instead of stripping them from a token', () => {
  const normalized = normalizeEeuStsToken('1234567890123456789X');

  assert.equal(normalized, '1234567890123456789X');
  assert.equal(isValidEeuStsToken(normalized), false);
});
