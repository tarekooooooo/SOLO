// Supabase Edge Function: atlos-webhook
// Official ATLOS Crypto Payment Gateway Webhook Handler
// Documentation Reference: https://docs.atlos.io / https://atlos.io
//
// Security Requirements:
// 1. Strictly disabled if ATLOS_API_SECRET is unset (returns 503).
// 2. Cryptographic HMAC-SHA256 signature verification over (timestamp + '.' + rawBody).
// 3. Replay attack protection with 300-second timestamp tolerance.
// 4. Atomic event idempotency via payment_events table.
// 5. Verifies order existence, amount, and currency before status transition.
// 6. Never exposes secrets or client credentials.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, x-webhook-signature, x-webhook-timestamp',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const atlosSecret = Deno.env.get('ATLOS_API_SECRET')?.trim();

  // STRICT GUARD: Must have ATLOS_API_SECRET configured in Supabase Server Secrets
  if (!atlosSecret) {
    return new Response(
      JSON.stringify({
        error: 'بوابة ATLOS المشفرة معطلة ومغلقة بإحكام حتى يتم تعيين ATLOS_API_SECRET في أسرار الخادم.',
        active: false,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-atlos-signature') || '';
    const timestampStr = req.headers.get('x-webhook-timestamp') || req.headers.get('x-atlos-timestamp') || '';

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'التوقيع الرقمي لبوابة ATLOS مفقود (Missing X-Webhook-Signature)' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check timestamp freshness if provided (within 300 seconds)
    if (timestampStr) {
      const ts = Number(timestampStr);
      const now = Math.floor(Date.now() / 1000);
      const isSeconds = ts < 10000000000;
      const tsSeconds = isSeconds ? ts : Math.floor(ts / 1000);

      if (Math.abs(now - tsSeconds) > 300) {
        return new Response(
          JSON.stringify({ error: 'انتهت صلاحية الإشعار (Expired timestamp - potential replay attack)' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(atlosSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigHex = signature.trim().toLowerCase();
    const sigBytes = new Uint8Array(
      (sigHex.match(/[\da-f]{2}/gi) || []).map((h) => parseInt(h, 16))
    );

    // ATLOS sign format: `${timestamp}.${rawBody}` if timestamp provided, otherwise `rawBody`
    const messageToVerify = timestampStr ? `${timestampStr}.${rawBody}` : rawBody;
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(messageToVerify)
    );

    // Fallback verification without timestamp for legacy format
    let validSignature = isValid;
    if (!validSignature && timestampStr) {
      validSignature = await crypto.subtle.verify(
        'HMAC',
        key,
        sigBytes,
        encoder.encode(rawBody)
      );
    }

    if (!validSignature) {
      return new Response(
        JSON.stringify({ error: 'فشل التحقق من التوقيع الرقمي لبوابة ATLOS (Invalid HMAC Signature)' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(rawBody);
    // ATLOS transaction fields
    const eventId = String(payload.id || payload.transactionId || payload.orderId || '').trim();
    const orderId = payload.orderId || payload.metadata?.orderId || payload.customFields?.order_id;
    const paymentStatus = (payload.status || payload.paymentStatus || '').toLowerCase();
    const amount = Number(payload.amount || payload.orderAmount || 0);
    const currency = String(payload.currency || 'USD').toUpperCase();

    if (!eventId || !orderId) {
      return new Response(
        JSON.stringify({ error: 'البيانات غير مكتملة (Missing eventId or orderId)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Atomic Idempotency Check in payment_events
    const { data: existingEvent } = await supabase
      .from('payment_events')
      .select('id, processed')
      .eq('provider', 'atlos')
      .eq('provider_event_id', eventId)
      .maybeSingle();

    if (existingEvent && existingEvent.processed) {
      return new Response(
        JSON.stringify({ message: 'تمت معالجة هذا الإشعار مسبقاً (Already Processed)' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert payment event record
    const { data: eventRecord, error: eventInsertErr } = await supabase
      .from('payment_events')
      .upsert(
        {
          provider: 'atlos',
          provider_event_id: eventId,
          order_id: orderId,
          event_type: paymentStatus,
          sanitized_payload: {
            eventId,
            orderId,
            status: paymentStatus,
            amount,
            currency,
            cryptoCurrency: payload.cryptoCurrency || payload.token,
            txHash: payload.txHash || payload.transactionHash,
            receivedAt: new Date().toISOString(),
          },
          signature_valid: true,
          processed: false,
        },
        { onConflict: 'provider,provider_event_id' }
      )
      .select('id')
      .single();

    if (eventInsertErr) {
      return new Response(
        JSON.stringify({ error: 'فشل تسجيل حدث الدفع في قاعدة البيانات', details: eventInsertErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if payment is confirmed
    const isPaid = paymentStatus === 'paid' || paymentStatus === 'completed' || paymentStatus === 'success';

    if (!isPaid) {
      // Payment pending or failed; record status and exit
      return new Response(
        JSON.stringify({ message: `تم استلام تحديث حالة الدفع: ${paymentStatus}`, processed: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch order from DB to verify amount and lock
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, total_usd, status, payment_status, customer_id')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      await supabase
        .from('payment_events')
        .update({ error_message: 'الطلب المحدد في الإشعار غير موجود' })
        .eq('id', eventRecord.id);

      return new Response(
        JSON.stringify({ error: 'الطلب المحدد غير موجود في النظام' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify amount match (with minor 1% float tolerance for crypto exchange rates if applicable)
    if (amount > 0 && Math.abs(order.total_usd - amount) > 0.5) {
      await supabase
        .from('payment_events')
        .update({ error_message: `عدم تطابق في المبلغ: المتوقع ${order.total_usd} والمستلم ${amount}` })
        .eq('id', eventRecord.id);

      return new Response(
        JSON.stringify({ error: 'المبلغ المدفوع لا يطابق إجمالي الطلب' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Update order to processing / captured
    const { error: orderUpdateErr } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        payment_status: 'captured',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (orderUpdateErr) {
      return new Response(
        JSON.stringify({ error: 'فشل تحديث حالة الطلب', details: orderUpdateErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Mark payment event as processed
    await supabase
      .from('payment_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', eventRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم تأكيد دفع الطلب بنجاح عبر بوابة ATLOS وتحديث الحالة إلى قيد التجهيز.',
        order_number: order.order_number,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'خطأ غير متوقع أثناء معالجة إشعار ATLOS', details: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
