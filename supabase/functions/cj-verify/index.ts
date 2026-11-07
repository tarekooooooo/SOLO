import { corsHeaders } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/auth.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const token = Deno.env.get('CJ_ACCESS_TOKEN')?.trim();
  if (!token) {
    return new Response(JSON.stringify({ success: false, message: 'رمز CJ غير مضبوط في أسرار Supabase.' }), { status: 503, headers: jsonHeaders });
  }

  const startedAt = Date.now();
  try {
    const response = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/list?pageNum=1&pageSize=1',
      { method: 'GET', headers: { 'CJ-Access-Token': token, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(12000) },
    );
    const payload = await response.json().catch(() => ({}));
    const accepted = response.ok && (payload?.code === 200 || payload?.result === true);
    return new Response(JSON.stringify({
      success: accepted,
      latencyMs: Date.now() - startedAt,
      message: accepted ? 'تم التحقق من اتصال CJ من جهة الخادم.' : 'رفض CJ الطلب أو تعذر التحقق من بيانات الاتصال.',
      statusCode: accepted ? undefined : response.status,
    }), { status: accepted ? 200 : 502, headers: jsonHeaders });
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'تعذر الاتصال بـCJ خلال المهلة المحددة.' }), { status: 502, headers: jsonHeaders });
  }
});
