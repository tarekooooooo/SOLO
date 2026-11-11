const allowedOrigins = new Set([
  'https://solo-5kv.pages.dev',
]);

export function isAllowedOrigin(origin?: string | null): origin is string {
  if (!origin) return false;
  return allowedOrigins.has(origin);
}

export function getCorsHeaders(origin?: string | null) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : 'https://solo-5kv.pages.dev';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// Backward-compatible default for functions that do not yet reflect the request origin.
export const corsHeaders = getCorsHeaders('https://solo-5kv.pages.dev');
