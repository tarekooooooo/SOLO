export async function verifyAtlosSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  apiSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !apiSecret) return false;

  let signature: Uint8Array;
  try {
    const decoded = atob(signatureHeader.trim());
    signature = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return false;
  }

  if (signature.length !== 32) return false;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify('HMAC', key, signature, rawBody);
  } catch {
    return false;
  }
}
