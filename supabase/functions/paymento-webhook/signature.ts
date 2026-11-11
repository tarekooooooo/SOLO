export async function verifyPaymentoSignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  secretKey: string,
): Promise<boolean> {
  if (!signatureHeader || !secretKey) return false;
  const signatureHex = signatureHeader.trim();
  if (!/^[0-9A-F]{64}$/.test(signatureHex)) return false;

  const signature = new Uint8Array(32);
  for (let index = 0; index < signature.length; index += 1) {
    signature[index] = Number.parseInt(signatureHex.slice(index * 2, index * 2 + 2), 16);
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    // Web Crypto's verify operation compares the HMAC in constant time.
    return await crypto.subtle.verify('HMAC', key, signature, rawBody);
  } catch {
    return false;
  }
}
