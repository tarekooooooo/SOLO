import { corsHeaders } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const shortText = (value: unknown): string | null => typeof value === 'string' ? value.slice(0, 300) : null;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const token = Deno.env.get('CJ_ACCESS_TOKEN')?.trim();
  if (!token) return new Response(JSON.stringify({ success: false, message: 'رمز CJ غير مضبوط في أسرار Supabase.' }), { status: 503, headers: jsonHeaders });

  try {
    const response = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/list?pageNum=1&pageSize=20',
      {
        method: 'GET',
        headers: { 'CJ-Access-Token': token, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12000),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || (payload?.code !== 200 && payload?.result !== true)) {
      return new Response(JSON.stringify({ success: false, message: 'تعذر جلب الطلبات من CJ.' }), { status: 502, headers: jsonHeaders });
    }

    const list = Array.isArray(payload?.data?.list) ? payload.data.list.slice(0, 20) : [];
    const orders = list.map((order: Record<string, unknown>) => ({
      orderId: shortText(order.orderId ?? order.id),
      orderNumber: shortText(order.orderNumber ?? order.orderNum),
      status: shortText(order.orderStatus ?? order.status),
      trackingNumber: shortText(order.logisticTrackingNumber ?? order.trackingNumber),
      createdAt: shortText(order.createDate ?? order.createdAt),
    }));
    return new Response(JSON.stringify({ success: true, ordersCount: orders.length, orders }), { status: 200, headers: jsonHeaders });
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'تعذر الاتصال بـCJ خلال المهلة المحددة.' }), { status: 502, headers: jsonHeaders });
  }
});
