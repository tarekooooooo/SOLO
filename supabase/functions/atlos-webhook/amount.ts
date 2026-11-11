export function isAtlosOverpayment(orderAmount: number, paidAmount: number): boolean {
  if (!Number.isFinite(orderAmount) || !Number.isFinite(paidAmount)) return false;
  const orderCents = Math.round(orderAmount * 100 + Number.EPSILON * Math.max(1, Math.abs(orderAmount * 100)));
  const paidCents = Math.round(paidAmount * 100 + Number.EPSILON * Math.max(1, Math.abs(paidAmount * 100)));
  return paidCents > orderCents;
}
