import assert from 'node:assert/strict';
import test from 'node:test';
import { isAtlosOverpayment } from './amount.ts';

test('does not treat equal or underpaid cent amounts as overpayment', () => {
  assert.equal(isAtlosOverpayment(10.01, 10.01), false);
  assert.equal(isAtlosOverpayment(10.01, 9.99), false);
});

test('detects an overpayment of one cent', () => {
  assert.equal(isAtlosOverpayment(10.01, 10.02), true);
});

test('compares values using two-decimal currency rounding', () => {
  assert.equal(isAtlosOverpayment(1, 1.004), false);
  assert.equal(isAtlosOverpayment(1, 1.005), true);
});

test('does not classify non-finite values as amounts', () => {
  assert.equal(isAtlosOverpayment(Number.NaN, 1), false);
  assert.equal(isAtlosOverpayment(1, Number.POSITIVE_INFINITY), false);
});
