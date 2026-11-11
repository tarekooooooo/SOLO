// Vite-prefixed variables are embedded in the browser bundle. Only the Supabase
// project URL and its public anon/publishable key are allowed for this build.
const REQUIRED_PUBLIC_VARIABLES = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const missing = REQUIRED_PUBLIC_VARIABLES.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`[build-env] Missing required public build variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const supabaseUrlValue = process.env.VITE_SUPABASE_URL.trim();
let supabaseUrl;
try {
  supabaseUrl = new URL(supabaseUrlValue);
} catch {
  console.error('[build-env] VITE_SUPABASE_URL must be a valid URL.');
  process.exit(1);
}

const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(supabaseUrl.hostname);
if (supabaseUrl.protocol !== 'https:' && !(supabaseUrl.protocol === 'http:' && isLocalHost)) {
  console.error('[build-env] VITE_SUPABASE_URL must use HTTPS (HTTP is allowed only for localhost).');
  process.exit(1);
}

const publicKey = process.env.VITE_SUPABASE_ANON_KEY.trim();
if (/^sb_secret_/i.test(publicKey)) {
  console.error('[build-env] VITE_SUPABASE_ANON_KEY contains a Supabase secret-key prefix; use only a publishable/anon key.');
  process.exit(1);
}

// Legacy anon/service-role keys are JWTs. Reject a service-role JWT without
// printing or otherwise exposing its contents.
const keyParts = publicKey.split('.');
if (keyParts.length === 3) {
  try {
    const claims = JSON.parse(Buffer.from(keyParts[1], 'base64url').toString('utf8'));
    if (typeof claims.role === 'string' && claims.role.toLowerCase() === 'service_role') {
      console.error('[build-env] VITE_SUPABASE_ANON_KEY has the service_role claim; use only a publishable/anon key.');
      process.exit(1);
    }
  } catch {
    // Non-JWT public key formats are allowed; no key material is logged.
  }
}

const forbiddenNamePattern = /(?:SERVICE[_-]?(?:ROLE|KEY)|SB[_-]?SECRET|SECRET|PRIVATE|PASSWORD|TOKEN|(?:API|ACCESS)[_-]?KEY)/i;
const forbiddenViteVariables = Object.keys(process.env).filter(
  (name) => /^VITE_/i.test(name) && forbiddenNamePattern.test(name) && Boolean(process.env[name]),
);
if (forbiddenViteVariables.length) {
  console.error(`[build-env] Secret-like Vite variable name(s) are not allowed: ${forbiddenViteVariables.join(', ')}`);
  process.exit(1);
}

console.log('[build-env] Required Supabase public build variables are present; no secret-like Vite variables detected.');
