import assert from 'node:assert/strict';
import test from 'node:test';
import { getCorsHeaders, isAllowedOrigin } from './cors.ts';

test('allows only the Cloudflare production storefront', () => {
  assert.equal(isAllowedOrigin('https://solo-5kv.pages.dev'), true);
  assert.equal(isAllowedOrigin('https://solostor.netlify.app'), false);
});

test('allows a single Cloudflare Pages preview hostname for this project', () => {
  assert.equal(isAllowedOrigin('https://review-digital-atlos-launch.solo-5kv.pages.dev'), true);
  assert.equal(isAllowedOrigin('https://a.solo-5kv.pages.dev'), true);
});

test('rejects unrelated, malformed, and non-HTTPS origins', () => {
  assert.equal(isAllowedOrigin('https://evil.example'), false);
  assert.equal(isAllowedOrigin('https://solo-5kv.pages.dev.attacker.example'), false);
  assert.equal(isAllowedOrigin('https://a.b.solo-5kv.pages.dev'), false);
  assert.equal(isAllowedOrigin('http://review.solo-5kv.pages.dev'), false);
  assert.equal(isAllowedOrigin('https://solostor.netlify.app'), false);
  assert.equal(isAllowedOrigin('null'), false);
  assert.equal(isAllowedOrigin(null), false);
});

test('returns the requesting origin only when it is explicitly allowed', () => {
  assert.equal(
    getCorsHeaders('https://review-digital-atlos-launch.solo-5kv.pages.dev')['Access-Control-Allow-Origin'],
    'https://review-digital-atlos-launch.solo-5kv.pages.dev',
  );
  assert.equal(
    getCorsHeaders('https://evil.example')['Access-Control-Allow-Origin'],
    'https://solo-5kv.pages.dev',
  );
});
