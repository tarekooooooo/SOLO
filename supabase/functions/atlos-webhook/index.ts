// Deliberately fail-closed. Do not enable this endpoint until ATLOS provides
// the merchant-specific signature, event, amount, and replay-protection contract.
Deno.serve((req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  return new Response(JSON.stringify({
    active: false,
    error: 'ATLOS غير مفعّلة: عقد Webhook الرسمي لم يُتحقق منه بعد، ولم يتم قبول أي دفعة.',
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
});
