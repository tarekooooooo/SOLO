import { corsHeaders } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const asString = (value: unknown): string | null => typeof value === 'string' ? value.slice(0, 500) : null;
const asNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const token = Deno.env.get('CJ_ACCESS_TOKEN')?.trim();
  if (!token) return new Response(JSON.stringify({ success: false, message: 'رمز CJ غير مضبوط في أسرار Supabase.' }), { status: 503, headers: jsonHeaders });

  try {
    let keyword = 'gaming';
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.keyword === 'string') keyword = body.keyword.trim().slice(0, 50);
    } else {
      keyword = new URL(req.url).searchParams.get('keyword')?.trim().slice(0, 50) || keyword;
    }
    if (!keyword) return new Response(JSON.stringify({ success: false, message: 'كلمة البحث مطلوبة.' }), { status: 400, headers: jsonHeaders });

    const url = new URL('https://developers.cjdropshipping.com/api2.0/v1/product/list');
    url.searchParams.set('productName', keyword);
    url.searchParams.set('pageNum', '1');
    url.searchParams.set('pageSize', '8');
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'CJ-Access-Token': token, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || (payload?.code !== 200 && payload?.result !== true)) {
      return new Response(JSON.stringify({ success: false, message: 'تعذر البحث في كتالوج CJ.' }), { status: 502, headers: jsonHeaders });
    }

    const list = Array.isArray(payload?.data?.list) ? payload.data.list.slice(0, 8) : [];
    const products = list.map((item: Record<string, unknown>) => ({
      productId: asString(item.pid ?? item.productId ?? item.product_id),
      name: asString(item.productName ?? item.name),
      sku: asString(item.productSku ?? item.sku),
      imageUrl: asString(item.productImage ?? item.image),
      price: asNumber(item.sellPrice ?? item.nowPrice ?? item.price),
    }));
    return new Response(JSON.stringify({ success: true, productsCount: products.length, products }), { status: 200, headers: jsonHeaders });
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'تعذر الاتصال بكتالوج CJ خلال المهلة المحددة.' }), { status: 502, headers: jsonHeaders });
  }
});
