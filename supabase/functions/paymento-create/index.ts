import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { isPaymentoToken, sha256Hex } from '../_shared/paymento.ts';

const PAYMENTO_REQUEST_URL = 'https://api.paymento.io/v1/payment/request';
const PAYMENTO_GATEWAY_URL = 'https://app.paymento.io/gateway';
const ORDER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const jsonHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

function jsonResponse(req: Request, status: number, value: Record<string, unknown>): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...getCorsHeaders(req.headers.get('origin')), ...jsonHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req.headers.get('origin')) });
  }
  if (req.method !== 'POST') {
    return jsonResponse(req, 405, { success: false, error: 'Method not allowed.' });
  }

  const apiKey = Deno.env.get('PAYMENTO_API_KEY');
  const ipnSecret = Deno.env.get('PAYMENTO_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!apiKey || !ipnSecret || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(req, 503, { success: false, error: 'Paymento is not configured on the server.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(req, 401, { success: false, error: 'Authentication is required.' });
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser(authHeader.slice('Bearer '.length).trim());
  if (authError || !user) {
    return jsonResponse(req, 401, { success: false, error: 'The login session is invalid or expired.' });
  }

  let orderId: string;
  try {
    const body = await req.json();
    orderId = typeof body?.order_id === 'string' ? body.order_id.trim() : '';
  } catch {
    return jsonResponse(req, 400, { success: false, error: 'Invalid request body.' });
  }
  if (!ORDER_UUID.test(orderId)) {
    return jsonResponse(req, 400, { success: false, error: 'Invalid order ID.' });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: settings, error: settingsError } = await serviceClient
    .from('store_settings')
    .select('checkout_enabled, paymento_enabled')
    .eq('singleton', true)
    .maybeSingle();
  if (settingsError || settings?.checkout_enabled !== true || settings?.paymento_enabled !== true) {
    return jsonResponse(req, 503, { success: false, error: 'Paymento checkout is not enabled.' });
  }

  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id, customer_id, payment_method, status, payment_status, total_usd, currency_code, delivery_type, reservation_expires_at, customer_email')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError || !order || order.customer_id !== user.id) {
    return jsonResponse(req, 404, { success: false, error: 'Order not found.' });
  }
  if (order.payment_method !== 'paymento_crypto'
      || order.status !== 'pending'
      || order.payment_status !== 'pending'
      || order.delivery_type === 'physical_shipment'
      || order.currency_code !== 'USD') {
    return jsonResponse(req, 409, { success: false, error: 'This order is not eligible for Paymento checkout.' });
  }
  const reservationExpiry = order.reservation_expires_at ? Date.parse(order.reservation_expires_at) : Number.NaN;
  if (!Number.isFinite(reservationExpiry) || reservationExpiry <= Date.now()) {
    return jsonResponse(req, 409, { success: false, error: 'The order inventory reservation has expired.' });
  }
  const totalUsd = Number(order.total_usd);
  if (!Number.isFinite(totalUsd) || totalUsd <= 0) {
    return jsonResponse(req, 409, { success: false, error: 'The order total is invalid.' });
  }

  const originHeader = req.headers.get('origin');
  const returnOrigin = isAllowedOrigin(originHeader) ? originHeader : 'https://solo-5kv.pages.dev';
  const proposedReturnUrl = new URL('/?paymento_return=1', returnOrigin).toString();
  const { data: sessionData, error: reservationError } = await serviceClient.rpc('reserve_paymento_payment_session', {
    p_order_id: order.id,
    p_return_url: proposedReturnUrl,
  });
  const session = sessionData as Record<string, unknown> | null;
  if (reservationError || session?.success !== true) {
    if (session?.reason === 'ambiguous_provider_request' || session?.reason === 'session_not_reusable') {
      return jsonResponse(req, 409, { success: false, error: 'A previous Paymento request needs manual review; do not retry this order.' });
    }
    return jsonResponse(req, 503, { success: false, error: 'A Paymento checkout session could not be reserved safely.' });
  }
  if (session.action === 'in_progress') {
    return jsonResponse(req, 409, { success: false, error: 'Paymento checkout is being prepared; retry shortly.' });
  }

  let token: string;
  if (session.action === 'reuse') {
    if (!isPaymentoToken(session.payment_token)
        || typeof session.token_hash !== 'string'
        || await sha256Hex(session.payment_token) !== session.token_hash) {
      return jsonResponse(req, 503, { success: false, error: 'The saved Paymento session is unavailable.' });
    }
    token = session.payment_token;
  } else if (session.action === 'create') {
    const leaseId = typeof session.lease_id === 'string' && ORDER_UUID.test(session.lease_id)
      ? session.lease_id
      : null;
    const returnUrl = typeof session.return_url === 'string' ? session.return_url : '';
    const expiresAt = typeof session.expires_at === 'string' ? Date.parse(session.expires_at) : Number.NaN;
    if (!leaseId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return jsonResponse(req, 503, { success: false, error: 'Paymento checkout reservation is invalid.' });
    }
    let trustedReturnUrl: string;
    try {
      const parsedReturnUrl = new URL(returnUrl);
      if (parsedReturnUrl.protocol !== 'https:' || !isAllowedOrigin(parsedReturnUrl.origin)) {
        throw new Error('untrusted return URL');
      }
      trustedReturnUrl = parsedReturnUrl.toString();
    } catch {
      await serviceClient.rpc('mark_paymento_payment_session_needs_review', {
        p_order_id: order.id, p_lease_id: leaseId, p_payment_token: null, p_token_hash: null,
      });
      return jsonResponse(req, 503, { success: false, error: 'Paymento return address is invalid.' });
    }

    let providerResponse: Response;
    try {
      providerResponse = await fetch(PAYMENTO_REQUEST_URL, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          fiatAmount: totalUsd.toFixed(2),
          fiatCurrency: 'USD',
          orderId: order.id,
          returnUrl: trustedReturnUrl,
          additionalData: [{ key: 'OrderId', value: order.id }],
          tokenExpiryDate: new Date(expiresAt).toISOString(),
          emailAddress: typeof order.customer_email === 'string' ? order.customer_email : undefined,
        }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      await serviceClient.rpc('mark_paymento_payment_session_needs_review', {
        p_order_id: order.id, p_lease_id: leaseId, p_payment_token: null, p_token_hash: null,
      });
      return jsonResponse(req, 502, { success: false, error: 'Paymento request outcome is uncertain and requires manual review; do not retry this order.' });
    }

    let providerBody: { success?: unknown; body?: unknown };
    try {
      providerBody = await providerResponse.json();
    } catch {
      await serviceClient.rpc('mark_paymento_payment_session_needs_review', {
        p_order_id: order.id, p_lease_id: leaseId, p_payment_token: null, p_token_hash: null,
      });
      return jsonResponse(req, 502, { success: false, error: 'Paymento response requires manual review; do not retry this order.' });
    }
    if (!providerResponse.ok || providerBody?.success !== true || !isPaymentoToken(providerBody.body)) {
      // Do not relay provider payloads, tokens, or credentials to logs or the browser.
      await serviceClient.rpc('mark_paymento_payment_session_needs_review', {
        p_order_id: order.id, p_lease_id: leaseId, p_payment_token: null, p_token_hash: null,
      });
      return jsonResponse(req, 502, { success: false, error: 'Paymento response requires manual review; do not retry this order.' });
    }

    token = providerBody.body;
    const tokenHash = await sha256Hex(token);
    const { data: registration, error: registrationError } = await serviceClient.rpc('register_paymento_payment_request', {
      p_order_id: order.id,
      p_payment_token: token,
      p_token_hash: tokenHash,
      p_lease_id: leaseId,
    });
    if (registrationError || registration?.success !== true) {
      await serviceClient.rpc('mark_paymento_payment_session_needs_review', {
        p_order_id: order.id, p_lease_id: leaseId, p_payment_token: token, p_token_hash: tokenHash,
      });
      return jsonResponse(req, 503, { success: false, error: 'Paymento created a request that could not be recorded; manual review is required, so do not retry this order.' });
    }
  } else {
    return jsonResponse(req, 503, { success: false, error: 'Paymento returned an invalid session state.' });
  }

  const paymentUrl = new URL(PAYMENTO_GATEWAY_URL);
  paymentUrl.searchParams.set('token', token);
  return jsonResponse(req, 200, {
    success: true,
    payment_url: paymentUrl.toString(),
  });
});
