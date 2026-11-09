import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifyAtlosSignature } from './signature.ts';

const MAX_BODY_BYTES = 64 * 1024;
const ORDER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const jsonHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

function jsonResponse(status: number, value: Record<string, unknown>): Response {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders });
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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

// Deploy with Supabase verify_jwt=false for this provider endpoint; this function
// authenticates ATLOS using the raw-body HMAC-SHA256 signature before processing.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method not allowed' });
  }

  const apiSecret = Deno.env.get('ATLOS_API_SECRET');
  const merchantId = Deno.env.get('ATLOS_MERCHANT_ID');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!apiSecret || !merchantId || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(503, { success: false, error: 'ATLOS webhook is not configured.' });
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
    if (rawBody.byteLength === 0) return jsonResponse(400, { success: false, error: 'Empty postback body.' });
    text = new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
  } catch {
    return jsonResponse(400, { success: false, error: 'Invalid UTF-8 request body.' });
  }

  const signature = req.headers.get('Signature');
  const signatureIsValid = await verifyAtlosSignature(rawBody, signature, apiSecret);
  if (!signatureIsValid) {
    return jsonResponse(401, { success: false, error: 'Invalid ATLOS signature.' });
  }

  let event: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return jsonResponse(400, { success: false, error: 'Invalid postback JSON.' });
    }
    event = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { success: false, error: 'Invalid postback JSON.' });
  }

  const transactionId = typeof event.TransactionId === 'string' ? event.TransactionId.trim() : '';
  const orderId = typeof event.OrderId === 'string' ? event.OrderId.trim() : '';
  const eventMerchantId = typeof event.MerchantId === 'string' ? event.MerchantId : '';
  const orderCurrency = typeof event.OrderCurrency === 'string' ? event.OrderCurrency : '';
  const status = typeof event.Status === 'number' ? event.Status : NaN;
  const orderAmount = finiteNumber(event.OrderAmount);
  const paidAmount = finiteNumber(event.PaidAmount);

  if (!transactionId || transactionId.length > 200 || !ORDER_UUID.test(orderId)) {
    return jsonResponse(400, { success: false, error: 'Missing or invalid transaction/order ID.' });
  }
  if (eventMerchantId !== merchantId) {
    return jsonResponse(401, { success: false, error: 'Merchant ID mismatch.' });
  }
  if (!Number.isInteger(status)) {
    return jsonResponse(400, { success: false, error: 'Invalid payment status.' });
  }
  if (status !== 100) {
    return jsonResponse(202, { success: true, processed: false, reason: 'Payment is not confirmed.' });
  }
  if (orderAmount === null || paidAmount === null || orderAmount <= 0 || paidAmount <= 0) {
    return jsonResponse(400, { success: false, error: 'Invalid payment amount.' });
  }

  const sanitizedPayload = {
    transaction_id: transactionId,
    order_id: orderId,
    merchant_id: eventMerchantId,
    order_amount: orderAmount,
    order_currency: orderCurrency,
    paid_amount: paidAmount,
    status,
    blockchain_hash: typeof event.BlockchainHash === 'string' ? event.BlockchainHash.slice(0, 256) : null,
    asset: typeof event.Asset === 'string' ? event.Asset.slice(0, 32) : null,
    blockchain: typeof event.Blockchain === 'string' ? event.Blockchain.slice(0, 32) : null,
    time_sent: typeof event.TimeSent === 'string' ? event.TimeSent.slice(0, 64) : null,
  };

  try {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await serviceClient.rpc('process_atlos_postback', {
      p_transaction_id: transactionId,
      p_order_id: orderId,
      p_merchant_id: eventMerchantId,
      p_order_amount: orderAmount,
      p_order_currency: orderCurrency,
      p_paid_amount: paidAmount,
      p_status: status,
      p_sanitized_payload: sanitizedPayload,
    });

    if (error) {
      console.error('ATLOS postback database processing failed:', error.message);
      return jsonResponse(500, { success: false, error: 'Unable to process verified postback.' });
    }

    const result = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    if (result.success === true && (result.processed === true || result.duplicate === true)) {
      return jsonResponse(200, {
        success: true,
        processed: result.processed === true,
        duplicate: result.duplicate === true,
      });
    }

    // A validly signed but unmatched/mismatched payment is recorded for review;
    // respond 2xx to avoid retry storms, but never mark it paid automatically.
    return jsonResponse(202, { success: true, processed: false, review_required: true });
  } catch (error) {
    console.error('ATLOS postback processing exception:', error instanceof Error ? error.message : 'unknown');
    return jsonResponse(500, { success: false, error: 'Unable to process verified postback.' });
  }
});
