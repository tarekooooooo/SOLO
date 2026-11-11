import { createHmac } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPaymentoSignature } from './signature.ts';

const secret = 'local-paymento-test-secret-only';
const body = new TextEncoder().encode('{"Token":"test-token-1234567890","PaymentId":"payment-01","OrderId":"00000000-0000-4000-8000-000000000001","OrderStatus":7}');
const signature = createHmac('sha256', secret).update(body).digest('hex').toUpperCase();

test('accepts uppercase hex HMAC-SHA256 of the exact raw body', async () => {
  assert.equal(await verifyPaymentoSignature(body, signature, secret), true);
});

test('rejects lowercase hex because Paymento specifies uppercase hex', async () => {
  assert.equal(await verifyPaymentoSignature(body, signature.toLowerCase(), secret), false);
});

test('rejects a signature when any raw-body byte changes', async () => {
  const changedBody = new TextEncoder().encode('{"Token":"test-token-1234567890","PaymentId":"payment-02","OrderId":"00000000-0000-4000-8000-000000000001","OrderStatus":7}');
  assert.equal(await verifyPaymentoSignature(changedBody, signature, secret), false);
});

test('rejects missing, malformed, and wrong-length signatures', async () => {
  assert.equal(await verifyPaymentoSignature(body, null, secret), false);
  assert.equal(await verifyPaymentoSignature(body, 'not-hex!', secret), false);
  assert.equal(await verifyPaymentoSignature(body, 'ABCD', secret), false);
});

test('rejects a signature generated with another secret key', async () => {
  const wrongSignature = createHmac('sha256', 'different-test-secret').update(body).digest('hex').toUpperCase();
  assert.equal(await verifyPaymentoSignature(body, wrongSignature, secret), false);
});
