// Supabase Edge Function: cj-verify
// Verifies CJ Dropshipping API credentials using server secret CJ_ACCESS_TOKEN.
// The secret is never exposed to the frontend.

import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  // Read CJ Token securely from Supabase Vault / Environment Secrets only
  const cjToken = Deno.env.get('CJ_ACCESS_TOKEN')?.trim();

  if (!cjToken) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'مفتاح CJ_ACCESS_TOKEN غير مضبوط في أسرار Supabase (Supabase Vault)',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const cjResponse = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/list?pageNum=1&pageSize=1',
      {
        method: 'GET',
        headers: {
          'CJ-Access-Token': cjToken,
          'Content-Type': 'application/json',
        },
      }
    );

    const latency = Date.now() - startTime;
    const data = await cjResponse.json().catch(() => ({}));

    if (cjResponse.ok && (data.code === 200 || data.result === true)) {
      return new Response(
        JSON.stringify({
          success: true,
          latencyMs: latency,
          message: 'تم التحقق بنجاح من مفتاح CJ المحفوظ في أسرار السيرفر!',
          keyMasked: `****...${cjToken.slice(-4)}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          latencyMs: latency,
          statusCode: data?.code || cjResponse.status,
          message: data?.message || 'فشل التحقق من مفتاح CJ',
          rawResponse: data,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        success: false,
        message: `تعذر الاتصال بسيرفر CJ: ${errorMsg}`,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
