/**
 * Centralized API & Supabase Edge Functions configuration for SOLO.
 * Frontend on Cloudflare Pages invokes Supabase Edge Functions directly or via relative proxy in dev.
 * All sensitive keys (CJ_ACCESS_TOKEN, payment secrets) reside strictly in Supabase Server Secrets.
 */

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Edge Functions endpoint URL
export const FUNCTIONS_BASE_URL = (
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '')
).replace(/\/$/, '');

/**
 * Returns the URL for invoking a Supabase Edge Function
 * In local dev without Supabase deployed, falls back to local relative path
 */
export function getFunctionUrl(functionName: string): string {
  if (FUNCTIONS_BASE_URL) {
    return `${FUNCTIONS_BASE_URL}/${functionName}`;
  }
  // Local fallback mapping
  const localMap: Record<string, string> = {
    'cj-verify': '/api/cj/verify',
    'cj-orders-list': '/api/cj/orders-list',
    'cj-catalog-search': '/api/cj/product-search',
    'create-order': '/api/orders/create',
    'review-manual-payment': '/api/admin/review-manual-payment',
    'atlos-webhook': '/api/payment/atlos-webhook',
  };
  return localMap[functionName] || `/api/${functionName}`;
}
