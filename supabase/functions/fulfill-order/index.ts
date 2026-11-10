import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://solostor.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const MAX_BODY_BYTES = 16_384;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function readBoundedBody(req: Request): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error('missing_body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError('body_too_large');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { success: false, error: 'الطريقة غير مدعومة.' });

  try {
    const authorization = req.headers.get('Authorization');
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!authorization?.startsWith('Bearer ') || !url || !anonKey || !serviceRoleKey) {
      return jsonResponse(503, { success: false, error: 'إعداد الخدمة أو جلسة المدير غير مكتملة.' });
    }

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const token = authorization.slice('Bearer '.length).trim();
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) return jsonResponse(401, { success: false, error: 'سجّل الدخول مجددًا.' });

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError || profile?.role !== 'admin') {
      return jsonResponse(403, { success: false, error: 'تنفيذ الطلب متاح لمدير موثّق فقط.' });
    }

    const contentLength = Number(req.headers.get('Content-Length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonResponse(413, { success: false, error: 'حجم الطلب أكبر من الحد المسموح.' });

    let payload: unknown;
    try {
      payload = JSON.parse(await readBoundedBody(req));
    } catch (error) {
      const isTooLarge = error instanceof RangeError;
      return jsonResponse(isTooLarge ? 413 : 400, { success: false, error: isTooLarge ? 'حجم الطلب أكبر من الحد المسموح.' : 'صيغة الطلب غير صالحة.' });
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return jsonResponse(400, { success: false, error: 'صيغة الطلب غير صالحة.' });
    }

    const body = payload as Record<string, unknown>;
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (!UUID_PATTERN.test(orderId) || notes.length > 1000) {
      return jsonResponse(400, { success: false, error: 'معرّف الطلب أو الملاحظات غير صالحة.' });
    }

    const serviceClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await serviceClient.rpc('admin_fulfill_order', {
      p_admin_user_id: user.id,
      p_order_id: orderId,
      p_notes: notes || null,
    });
    if (error || !data || data.success !== true) {
      console.error('Paid order fulfillment rejected; database error code:', error?.code ?? 'unknown');
      return jsonResponse(409, { success: false, error: 'تعذر تنفيذ الطلب. تأكد من تأكيد الدفع ومخزون الأكواد أو أدخل ملاحظة التنفيذ.' });
    }

    return jsonResponse(200, {
      success: true,
      status: data.status,
      already_completed: data.already_completed === true,
      delivered_code_count: Number(data.delivered_code_count) || 0,
    });
  } catch {
    return jsonResponse(500, { success: false, error: 'حدث خطأ غير متوقع؛ لم يتم تأكيد التنفيذ.' });
  }
});
