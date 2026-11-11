import { createClient } from 'jsr:@supabase/supabase-js@2';
import { constantTimeEqualsText } from '../_shared/paymento.ts';
import { processPendingPaymentoCallbacks } from '../_shared/paymento-processor.ts';

const jsonHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
function jsonResponse(status: number, value: Record<string, unknown>): Response {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders });
}

// Invoke only from a trusted scheduler or server using the Supabase service-role
// bearer key. Keep the key in the scheduler's secret store, never in the browser.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse(405, { success: false, error: 'Method not allowed.' });

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const paymentoApiKey = Deno.env.get('PAYMENTO_API_KEY');
  const paymentoSecret = Deno.env.get('PAYMENTO_SECRET_KEY');
  if (!serviceRoleKey || !supabaseUrl || !paymentoApiKey || !paymentoSecret) {
    return jsonResponse(503, { success: false, error: 'Paymento processor is not configured.' });
  }

  const authorization = req.headers.get('Authorization') || '';
  const suppliedKey = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  if (!constantTimeEqualsText(suppliedKey, serviceRoleKey)) {
    return jsonResponse(401, { success: false, error: 'Unauthorized.' });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const summary = await processPendingPaymentoCallbacks(serviceClient, paymentoApiKey, 10);
    return jsonResponse(200, { success: true, ...summary });
  } catch {
    return jsonResponse(503, { success: false, error: 'Could not process stored Paymento callbacks.' });
  }
});
