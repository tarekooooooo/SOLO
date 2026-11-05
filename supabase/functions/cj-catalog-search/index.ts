// Supabase Edge Function: cj-catalog-search
// Searches real products from CJ Dropshipping using server secret CJ_ACCESS_TOKEN.

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
    let keyword = 'gaming';
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (body.keyword) keyword = String(body.keyword).slice(0, 50);
    } else {
      const url = new URL(req.url);
      const q = url.searchParams.get('keyword');
      if (q) keyword = q.slice(0, 50);
    }

    const encoded = encodeURIComponent(keyword);
    const cjResponse = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/list?productName=${encoded}&pageNum=1&pageSize=8`,
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
      const list = data.data?.list || [];
      return new Response(
        JSON.stringify({
          success: true,
          productsCount: list.length,
          products: list,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: data.message || 'فشل البحث في كتالوج CJ',
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
