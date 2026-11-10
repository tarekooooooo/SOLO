import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

type AdminAuthResult =
  | { ok: true; client: ReturnType<typeof createClient>; user: { id: string; email?: string | null } }
  | { ok: false; response: Response };

export async function requireAdmin(req: Request): Promise<AdminAuthResult> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'يلزم تسجيل الدخول بصلاحية مدير.' }), {
        status: 401,
        headers: jsonHeaders,
      }),
    };
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'إعداد Supabase الخلفي غير مكتمل.' }), {
        status: 503,
        headers: jsonHeaders,
      }),
    };
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const token = authorization.slice('Bearer '.length).trim();
  const { data: { user }, error: userError } = await client.auth.getUser(token);
  if (userError || !user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'جلسة تسجيل الدخول غير صالحة أو منتهية.' }), {
        status: 401,
        headers: jsonHeaders,
      }),
    };
  }

  const { data: profile, error: roleError } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (roleError || profile?.role !== 'admin') {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'هذه العملية متاحة لمدير موثّق فقط.' }), {
        status: 403,
        headers: jsonHeaders,
      }),
    };
  }

  return { ok: true, client, user: { id: user.id, email: user.email } };
}
