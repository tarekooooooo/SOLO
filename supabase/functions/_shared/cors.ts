const allowedOrigins = new Set([
  'https://solo-5kv.pages.dev',
  'https://solostor.netlify.app',
]);

export function getCorsHeaders(origin?: string | null) {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://solostor.netlify.app';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// Backward-compatible default for functions that do not yet reflect the request origin.
export const corsHeaders = getCorsHeaders('https://solostor.netlify.app');
