/**
 * Edge-compatible cryptographic utilities using Web Crypto API.
 * No Node.js crypto - works in Vercel Edge Runtime.
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Encode bytes to base64url (URL-safe, no padding).
 */
function toBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode base64url to bytes.
 */
function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  base64 += '='.repeat(padding);
  const binary = atob(base64);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

/**
 * Hash a password using PBKDF2-SHA256 (Edge-compatible).
 * Returns format: pbkdf2:iterations:salt:hash (all base64url)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    passwordKey,
    HASH_LENGTH * 8
  );

  const hashBytes = new Uint8Array(hash);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${toBase64Url(salt)}:${toBase64Url(hashBytes)}`;
}

/**
 * Verify a password against a PBKDF2 hash string.
 * Hash format: pbkdf2:iterations:salt:hash
 */
export async function verifyPasswordHash(
  password: string,
  hashString: string
): Promise<boolean> {
  try {
    const parts = hashString.split(':');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false;
    }

    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations < 10_000) {
      return false;
    }

    const salt = fromBase64Url(parts[2]);
    const expectedHash = fromBase64Url(parts[3]);

    if (salt.length < 8 || expectedHash.length !== HASH_LENGTH) {
      return false;
    }

    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt,
        iterations,
      },
      passwordKey,
      HASH_LENGTH * 8
    );

    const derivedBytes = new Uint8Array(derived);
    if (derivedBytes.length !== expectedHash.length) return false;

    let result = 0;
    for (let i = 0; i < derivedBytes.length; i++) {
      result |= derivedBytes[i] ^ expectedHash[i];
    }
    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Create HMAC-SHA256 signature (for session cookie signing).
 */
export async function signPayload(
  secret: string,
  payload: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return toBase64Url(new Uint8Array(signature));
}

/**
 * Verify HMAC-SHA256 signature.
 */
export async function verifySignature(
  secret: string,
  payload: string,
  signature: string
): Promise<boolean> {
  const expected = await signPayload(secret, payload);
  return timingSafeEqual(signature, expected);
}
