// Supabase Edge Function: create-order
// Authenticated endpoint:
// 1. Verifies caller identity strictly via Supabase JWT (Authorization header).
// 2. Extracts authenticated customer_id from auth.getUser() - never trusts client payload.
// 3. Requires mandatory, non-empty idempotencyKey.
// 4. Calls atomic RPC create_order_atomic in database which validates genuine product prices,
//    availability, and stock on the server and commits in a single transaction.
// 5. Does NOT set order as paid or call CJ Dropshipping.

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
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
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
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
      targetPlayerId,
      targetPlayerName,
      shippingAddress,
      items,
    } = body;

    // Enforce mandatory idempotency key
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length < 8) {
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

    // Call atomic RPC: executes under caller's context with server-side pricing & idempotency
    const { data: result, error: rpcErr } = await supabase.rpc('create_order_atomic', {
      p_idempotency_key: idempotencyKey.trim(),
      p_customer_name: customerName || user.user_metadata?.name || 'العميل',
      p_customer_phone: customerPhone || null,
      p_delivery_type: deliveryType || 'instant_code',
      p_target_player_id: targetPlayerId || null,
      p_target_player_name: targetPlayerName || null,
      p_shipping_address: shippingAddress || null,
      p_items: items.map((it: any) => ({
        product_id: it.productId,
        quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
        package_or_variant: it.variant || it.package || null,
      })),
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
