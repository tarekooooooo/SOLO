// Supabase Edge Function: cj-orders-list
// Fetches merchant's actual CJ orders list securely using server secret CJ_ACCESS_TOKEN.

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const cjToken = Deno.env.get('CJ_ACCESS_TOKEN')?.trim();

  if (!cjToken) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'مفتاح CJ_ACCESS_TOKEN غير مضبوط في أسرار السيرفر',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const cjResponse = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/list?pageNum=1&pageSize=20',
      {
        method: 'GET',
        headers: {
          'CJ-Access-Token': cjToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await cjResponse.json().catch(() => ({}));

    if (data.code === 200 || data.result === true) {
      const orders = data.data?.list || [];
      return new Response(
        JSON.stringify({
          success: true,
          ordersCount: orders.length,
          orders,
          message: `تم جلب ${orders.length} طلب مباشرة من حساب CJ`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          statusCode: data.code,
          message: data.message || 'تعذر جلب الطلبات من CJ',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, message: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
