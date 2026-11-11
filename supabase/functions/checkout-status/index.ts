import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const headers = { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed.' }), {
      status: 405,
      headers,
    });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    return new Response(JSON.stringify({ success: false, error: 'Checkout status is unavailable.' }), {
      status: 503,
      headers,
    });
  }

  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await serviceClient
    .from('store_settings')
    .select('checkout_enabled')
    .eq('singleton', true)
    .maybeSingle();

  if (error) {
    console.error('Could not read checkout status:', error.message);
    return new Response(JSON.stringify({ success: false, error: 'Checkout status is unavailable.' }), {
      status: 503,
      headers,
    });
  }

  const checkoutEnabled = data?.checkout_enabled === true;
  const merchantId = Deno.env.get('ATLOS_MERCHANT_ID') || '';
  const webhookSecretConfigured = Boolean(Deno.env.get('ATLOS_API_SECRET'));
  const atlosEnabled = checkoutEnabled && Boolean(merchantId) && webhookSecretConfigured;

  return new Response(JSON.stringify({
    success: true,
    checkout_enabled: checkoutEnabled,
    atlos_enabled: atlosEnabled,
    atlos_merchant_id: atlosEnabled ? merchantId : null,
  }), { status: 200, headers });
});
