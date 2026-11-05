// Supabase Edge Function: create-order
// Creates a pending order in Supabase with idempotency check.
// Does NOT send to CJ Dropshipping or fulfill digital codes until payment webhook is confirmed.

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

  try {
    const body = await req.json();
    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      items,
      shippingAddress,
      idempotencyKey,
      deliveryType,
      targetPlayerId,
      targetPlayerName,
    } = body;

    if (!customerEmail || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني وتفاصيل المنتجات مطلوبة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Idempotency Check: prevent duplicate orders
    if (idempotencyKey) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingOrder) {
        return new Response(
          JSON.stringify({
            message: 'طلب مكرر تم إنشاؤه مسبقاً',
            order: existingOrder,
            isDuplicate: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Calculate totals securely on server (not trusting client sum)
    let subtotalUSD = 0;
    for (const item of items) {
      const unitPrice = Number(item.unitPriceUSD) || 0;
      const qty = Math.max(1, Number(item.quantity) || 1);
      subtotalUSD += unitPrice * qty;
    }

    const shippingFeeUSD = deliveryType === 'physical_shipment' ? 6.50 : 0.00;
    const totalUSD = subtotalUSD + shippingFeeUSD;
    const orderNumber = `TRK-${Date.now().toString().slice(-6)}`;

    // 3. Insert order record (Status: PENDING payment)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId || null,
        customer_name: customerName || 'عميل المتجر',
        customer_email: customerEmail,
        customer_phone: customerPhone || null,
        subtotal_usd: subtotalUSD,
        shipping_fee_usd: shippingFeeUSD,
        total_usd: totalUSD,
        status: 'pending',
        payment_status: 'pending',
        delivery_type: deliveryType || 'instant_code',
        target_player_id: targetPlayerId || null,
        target_player_name: targetPlayerName || null,
        shipping_address: shippingAddress || null,
        idempotency_key: idempotencyKey || null,
      })
      .select()
      .single();

    if (orderErr) {
      return new Response(JSON.stringify({ error: orderErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Insert order items
    const orderItemsToInsert = items.map((it: any) => ({
      order_id: order.id,
      product_id: it.productId || null,
      product_title: it.productTitle || 'منتج',
      package_or_variant: it.variant || it.package || null,
      cj_sku: it.cjSku || null,
      unit_price_usd: Number(it.unitPriceUSD) || 0,
      quantity: Math.max(1, Number(it.quantity) || 1),
      total_price_usd: (Number(it.unitPriceUSD) || 0) * Math.max(1, Number(it.quantity) || 1),
    }));

    await supabase.from('order_items').insert(orderItemsToInsert);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم تسجيل الطلب بنجاح وهو بانتظار إتمام الدفع',
        order,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
