// Supabase Edge Function: create-order
// Authenticated endpoint:
// 1. Verifies caller identity strictly via Supabase JWT (Authorization header).
// 2. Extracts authenticated customer_id from auth.getUser() - never trusts client payload.
// 3. Requires mandatory, non-empty idempotencyKey.
// 4. Calls atomic RPC create_order_atomic in database which validates genuine product prices,
//    availability, and stock on the server and commits in a single transaction.
// 5. Does NOT set order as paid or call CJ Dropshipping.

import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'غير مصرح: يجب تسجيل الدخول وإرسال رمز المصادقة (Bearer Token)' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Client bound to caller's JWT
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Verify token and extract verified user id from session
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.slice('Bearer '.length).trim());
  if (authErr || !user) {
    return new Response(
      JSON.stringify({ error: 'جلسة تسجيل الدخول غير صالحة أو منتهية' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const {
      idempotencyKey,
      customerName,
      customerPhone,
      deliveryType,
      paymentMethod,
      paymentReference,
      targetPlayerId,
      targetPlayerName,
      items,
    } = body;

    // Enforce mandatory idempotency key
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length < 8 || idempotencyKey.trim().length > 128) {
      return new Response(
        JSON.stringify({ error: 'مفتاح عدم التكرار (idempotencyKey) إلزامي وفريد بطول 8 محارف على الأقل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'يجب اختيار منتج واحد على الأقل لإتمام الطلب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const manualMethods = ['libyana', 'almadar', 'bank_transfer', 'payoneer'];
    const supportedMethods = [...manualMethods, 'atlos_crypto'];
    if (!supportedMethods.includes(paymentMethod)) {
      return new Response(
        JSON.stringify({ error: 'وسيلة الدفع غير متاحة حاليًا.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (paymentMethod === 'atlos_crypto' && (!Deno.env.get('ATLOS_MERCHANT_ID') || !Deno.env.get('ATLOS_API_SECRET'))) {
      return new Response(
        JSON.stringify({ error: 'بوابة ATLOS غير جاهزة على الخادم؛ لم يتم إنشاء طلب.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (paymentMethod === 'atlos_crypto' && paymentReference != null) {
      return new Response(
        JSON.stringify({ error: 'لا تقبل مرجع دفع من المتصفح لوسيلة ATLOS.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (manualMethods.includes(paymentMethod) && (typeof paymentReference !== 'string' || paymentReference.trim().length < 3 || paymentReference.trim().length > 200)) {
      return new Response(
        JSON.stringify({ error: 'مرجع التحويل مطلوب ويجب ألا يتجاوز 200 محرف.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (deliveryType === 'physical_shipment') {
      return new Response(
        JSON.stringify({ error: 'الطلبات المادية متوقفة حتى احتساب عرض شحن حي من CJ.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedDeliveryTypes = ['instant_code', 'direct_id_recharge', 'manual_service'];
    if (!allowedDeliveryTypes.includes(deliveryType)) {
      return new Response(
        JSON.stringify({ error: 'نوع التسليم غير صالح.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const safeCustomerName = typeof customerName === 'string' ? customerName.trim() : String(user.user_metadata?.name || '').trim();
    const safeCustomerPhone = customerPhone == null ? null : (typeof customerPhone === 'string' ? customerPhone.trim() : null);
    if (safeCustomerPhone && safeCustomerPhone.length > 40) {
      return new Response(
        JSON.stringify({ error: 'رقم الهاتف أطول من الحد المسموح.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    for (const field of [targetPlayerId, targetPlayerName]) {
      if (field != null && (typeof field !== 'string' || field.length > 120)) {
        return new Response(
          JSON.stringify({ error: 'بيانات اللاعب غير صالحة.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const normalizedItems: Array<{ product_id: string; quantity: number; package_or_variant: string | null }> = [];
    for (const item of items) {
      const quantity = Number(item?.quantity);
      if (typeof item?.productId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.productId)) {
        return new Response(
          JSON.stringify({ error: 'معرّف منتج غير صالح.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return new Response(
          JSON.stringify({ error: 'الكمية يجب أن تكون عددًا صحيحًا بين 1 و10.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const packageOrVariant = item?.packageOrVariant;
      if (packageOrVariant != null && (typeof packageOrVariant !== 'string' || packageOrVariant.length > 150)) {
        return new Response(
          JSON.stringify({ error: 'خيار المنتج غير صالح.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      normalizedItems.push({
        product_id: item.productId,
        quantity,
        package_or_variant: packageOrVariant || null,
      });
    }

    // Call atomic RPC: executes under caller's context with server-side pricing & idempotency
    const { data: result, error: rpcErr } = await supabase.rpc('create_order_atomic', {
      p_idempotency_key: idempotencyKey.trim(),
      p_customer_name: safeCustomerName || 'العميل',
      p_customer_phone: safeCustomerPhone,
      p_delivery_type: deliveryType,
      p_payment_method: paymentMethod,
      p_payment_reference: manualMethods.includes(paymentMethod) ? paymentReference.trim() : null,
      p_payment_receipt_url: null,
      p_target_player_id: targetPlayerId || null,
      p_target_player_name: targetPlayerName || null,
      p_shipping_address: null,
      p_items: normalizedItems,
    });

    if (rpcErr) {
      return new Response(
        JSON.stringify({ error: rpcErr.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: result.is_duplicate ? 200 : 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `فشل معالجة الطلب: ${errorMsg}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
