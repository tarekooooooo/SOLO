// Supabase Edge Function: cj-orders-list
// RESTRICTED TO ADMIN USERS ONLY:
// 1. Verifies caller JWT from Authorization header.
// 2. Checks caller role in public.profiles table (must be 'admin').
// 3. Reads CJ_ACCESS_TOKEN strictly from server secrets (never accepts from client).

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'غير مصرح: يجب تسجيل الدخول كمدير نظام للوصول إلى طلبات CJ' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Verify user session
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

  if (authErr || !user) {
    return new Response(
      JSON.stringify({ error: 'رمز الجلسة غير صالح' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Verify admin role on server from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'محظور: هذه العملية تتطلب صلاحية مدير النظام (Admin Only)' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 3. Read CJ Token strictly from server secrets
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
          message: `تم استرجاع ${orders.length} طلب بنجاح من حساب CJ`,
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
