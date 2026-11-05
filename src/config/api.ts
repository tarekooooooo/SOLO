/**
 * Centralized API configuration for TAREK STOR.
 * In production on Netlify, requests will route to the Express backend hosted on Render
 * via the VITE_API_BASE_URL environment variable.
 * In development, it falls back to the current window origin or empty string (relative path).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Helper to build full API endpoint URL
 * @param endpoint Relative API endpoint (e.g. '/api/cj/verify')
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
