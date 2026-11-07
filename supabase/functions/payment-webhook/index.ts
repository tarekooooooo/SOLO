// Deliberately fail-closed. A generic HMAC assumption is not a payment
// provider contract; each provider requires its own verified implementation.
Deno.serve((req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  return new Response(JSON.stringify({
    active: false,
    error: 'Webhook الدفع العام معطّل. لا يُقبل الدفع الآلي حتى اختيار مزود وتنفيذ عقده الموثق.',
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
});
