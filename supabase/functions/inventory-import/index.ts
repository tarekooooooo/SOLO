import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
const MAX_BODY_BYTES = 300_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonObject = Record<string, unknown>;

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
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  const jsonResponse = (status: number, body: JsonObject): Response =>
    new Response(JSON.stringify(body), { status, headers: jsonHeaders });
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
      return jsonResponse(403, { success: false, error: 'استيراد الأكواد متاح لمدير موثّق فقط.' });
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
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    const packageId = typeof body.packageId === 'string' ? body.packageId.trim() : '';
    if (!UUID_PATTERN.test(productId) || !packageId || packageId.length > 100 || !Array.isArray(body.codes)) {
      return jsonResponse(400, { success: false, error: 'معرّف المنتج أو الباقة أو الأكواد غير صالح.' });
    }
    if (body.codes.length < 1 || body.codes.length > 500 || body.codes.some((code) => typeof code !== 'string')) {
      return jsonResponse(400, { success: false, error: 'أرسل من 1 إلى 500 كود نصي في كل دفعة.' });
    }
    const codes = (body.codes as string[]).map((code) => code.trim());
    if (codes.some((code) => !code || code.length > 200 || /[\r\n]/.test(code)) || new Set(codes).size !== codes.length) {
      return jsonResponse(400, { success: false, error: 'توجد أكواد فارغة أو طويلة أو مكررة في الدفعة.' });
    }

    const serviceClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await serviceClient.rpc('admin_import_inventory', {
      p_admin_user_id: user.id,
      p_product_id: productId,
      p_package_id: packageId,
      p_codes: codes,
    });
    if (error || !data || data.success !== true) {
      // Never log or return code values or raw database error details.
      console.error('Inventory import failed; database error code:', error?.code ?? 'unknown');
      return jsonResponse(409, { success: false, error: 'لم تُستورد الأكواد. تحقّق من الباقة وعدم تكرار الأكواد ثم أعد المحاولة.' });
    }

    return jsonResponse(200, {
      success: true,
      inserted_count: Number(data.inserted_count) || 0,
      available_count: Number(data.available_count) || 0,
    });
  } catch {
    return jsonResponse(500, { success: false, error: 'حدث خطأ غير متوقع؛ لم تُعرض أي أكواد.' });
  }
});
