import { createClient } from 'jsr:@supabase/supabase-js@2';
import { isPaymentoToken, sha256Hex } from '../_shared/paymento.ts';
import { processPendingPaymentoCallbacks } from '../_shared/paymento-processor.ts';
import { verifyPaymentoSignature } from './signature.ts';

const MAX_BODY_BYTES = 64 * 1024;
const ORDER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const jsonHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

function jsonResponse(status: number, value: Record<string, unknown>): Response {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders });
}

async function readLimitedBody(req: Request): Promise<{ body: Uint8Array; tooLarge: boolean }> {
  const reader = req.body?.getReader();
  if (!reader) return { body: new Uint8Array(), tooLarge: false };
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return { body: new Uint8Array(), tooLarge: true };
    }
    chunks.push(value);
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { body, tooLarge: false };
}

// Configure Paymento to send POST. PUT is also accepted for stores whose panel
// has its IPN method set to the documented PUT alternative.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return jsonResponse(405, { success: false, error: 'Method not allowed.' });
  }

  const ipnSecret = Deno.env.get('PAYMENTO_SECRET_KEY');
  const apiKey = Deno.env.get('PAYMENTO_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!ipnSecret || !apiKey || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(503, { success: false, error: 'Paymento webhook is not configured.' });
  }

  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonResponse(413, { success: false, error: 'Payload too large.' });
  }

  let rawBody: Uint8Array;
  let text: string;
  try {
    const bounded = await readLimitedBody(req);
    if (bounded.tooLarge) return jsonResponse(413, { success: false, error: 'Payload too large.' });
    rawBody = bounded.body;
    if (rawBody.byteLength === 0) return jsonResponse(400, { success: false, error: 'Empty callback body.' });
    text = new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
  } catch {
    return jsonResponse(400, { success: false, error: 'Invalid callback encoding.' });
  }

  const signature = req.headers.get('X-HMAC-SHA256-Signature');
  if (!await verifyPaymentoSignature(rawBody, signature, ipnSecret)) {
    return jsonResponse(401, { success: false, error: 'Invalid Paymento signature.' });
  }

  let callback: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonResponse(400, { success: false, error: 'Invalid callback JSON.' });
    }
    callback = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { success: false, error: 'Invalid callback JSON.' });
  }

  const token = callback.Token;
  const paymentId = typeof callback.PaymentId === 'string' ? callback.PaymentId.trim() : '';
  const orderId = typeof callback.OrderId === 'string' ? callback.OrderId.trim() : '';
  const reportedStatus = callback.OrderStatus;
  if (!isPaymentoToken(token) || !paymentId || paymentId.length > 200
      || !ORDER_UUID.test(orderId) || typeof reportedStatus !== 'number'
      || !Number.isInteger(reportedStatus) || reportedStatus < 0 || reportedStatus > 10) {
    return jsonResponse(400, { success: false, error: 'Missing or invalid callback identifiers.' });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const tokenHash = await sha256Hex(token);
  const { data: stored, error: storeError } = await serviceClient.rpc('record_paymento_ipn', {
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_payment_token: token,
    p_token_hash: tokenHash,
    p_reported_status: reportedStatus,
    p_sanitized_payload: {
      callback_method: req.method,
    },
  });
  if (storeError || stored?.success !== true) {
    // A non-2xx response asks Paymento to retry if the callback is still retryable.
    return jsonResponse(500, { success: false, error: 'Could not durably store the verified callback.' });
  }
  if (stored.matched !== true) {
    return jsonResponse(202, { success: true, recorded: true, review_required: true });
  }
  if (reportedStatus !== 7 || stored.processed === true) {
    return jsonResponse(200, { success: true, recorded: true, processed: stored.processed === true });
  }

  // The callback is already durable. Verify only after storage; if this request
  // fails, the leased queue entry remains available to paymento-process-pending.
  try {
    const summary = await processPendingPaymentoCallbacks(serviceClient, apiKey, 1);
    return jsonResponse(200, {
      success: true,
      recorded: true,
      processed: summary.approved > 0,
      retry_scheduled: summary.retrying > 0,
      review_required: summary.needsReview > 0,
    });
  } catch {
    return jsonResponse(200, { success: true, recorded: true, processed: false, retry_scheduled: true });
  }
});
