// Supabase Edge Function: review-manual-payment
// Server-Authoritative Admin Manual Payment Approval / Rejection
//
// Security & Business Rules:
// 1. Authenticates admin identity strictly via Supabase JWT.
// 2. Enforces public.is_admin() server-side permission checks.
// 3. Atomically invokes review_manual_payment RPC in database (FOR UPDATE lock).
// 4. Logs every administrative decision in admin_audit_logs with admin ID, timestamp, and notes.
// 5. Prevents double approval or modifying completed orders.
// 6. Zero client trust: does not allow client to dictate order status.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'الطريقة غير مسموحة' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'رمز الجلسة مفقود (Missing Authorization Header)' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Client bound to user's JWT so auth.uid() and public.is_admin() evaluate properly
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'جلسة المستخدم غير صالحة أو منتهية' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { orderId, decision, notes } = body;

    if (!orderId || !decision) {
      return new Response(JSON.stringify({ error: 'البيانات غير مكتملة (orderId and decision are required)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (decision !== 'approve' && decision !== 'reject') {
      return new Response(JSON.stringify({ error: 'القرار غير صالح، يجب أن يكون approve أو reject' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call server-side atomic RPC
    const { data, error } = await supabase.rpc('review_manual_payment', {
      p_order_id: orderId,
      p_decision: decision,
      p_notes: notes || (decision === 'approve' ? 'تم تأكيد استلام الحوالة من قبل الإدارة' : 'تم رفض الحوالة لعدم تطابق الإشعار'),
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message || 'فشلت معالجة مراجعة الدفع' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'خطأ غير متوقع في معالجة مراجعة الدفع', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
