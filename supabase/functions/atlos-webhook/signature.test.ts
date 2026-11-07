import { createHmac } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAtlosSignature } from './signature.ts';

const secret = 'local-test-secret-only';
const body = new TextEncoder().encode('{"TransactionId":"txn-test-01","OrderId":"00000000-0000-4000-8000-000000000001"}');
const signature = createHmac('sha256', secret).update(body).digest('base64');

test('accepts a valid Base64 HMAC-SHA256 signature over the exact raw body', async () => {
  assert.equal(await verifyAtlosSignature(body, signature, secret), true);
});

test('rejects a signature if any raw-body byte changes', async () => {
  const changedBody = new TextEncoder().encode('{"TransactionId":"txn-test-02","OrderId":"00000000-0000-4000-8000-000000000001"}');
  assert.equal(await verifyAtlosSignature(changedBody, signature, secret), false);
});

test('rejects missing, malformed, and wrong-length signatures', async () => {
  assert.equal(await verifyAtlosSignature(body, null, secret), false);
  assert.equal(await verifyAtlosSignature(body, 'not-base64!!', secret), false);
  assert.equal(await verifyAtlosSignature(body, btoa('short'), secret), false);
});

test('rejects an otherwise valid signature created with a different secret', async () => {
  const wrongSignature = createHmac('sha256', 'different-secret').update(body).digest('base64');
  assert.equal(await verifyAtlosSignature(body, wrongSignature, secret), false);
});
