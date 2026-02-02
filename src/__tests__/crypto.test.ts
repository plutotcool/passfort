import { describe, it, expect } from 'vitest';
import {
  timingSafeEqual,
  hashPassword,
  verifyPasswordHash,
  signPayload,
  verifySignature,
} from '../crypto.js';

describe('timingSafeEqual', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqual('hello', 'hello')).toBe(true);
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(timingSafeEqual('hello', 'world')).toBe(false);
    expect(timingSafeEqual('a', 'b')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(timingSafeEqual('hi', 'hello')).toBe(false);
    expect(timingSafeEqual('hello', 'hi')).toBe(false);
  });

  it('returns false for non-string inputs', () => {
    expect(
      timingSafeEqual('a' as unknown as string, 1 as unknown as string)
    ).toBe(false);
    expect(timingSafeEqual(null as unknown as string, 'a')).toBe(false);
  });
});

describe('hashPassword', () => {
  it('returns pbkdf2 format string', async () => {
    const hash = await hashPassword('testpassword');
    expect(hash).toMatch(/^pbkdf2:\d+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
  });

  it('produces different hashes for same password (different salts)', async () => {
    const hash1 = await hashPassword('same');
    const hash2 = await hashPassword('same');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPasswordHash', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPasswordHash('correct', hash)).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPasswordHash('wrong', hash)).toBe(false);
  });

  it('returns false for invalid hash format', async () => {
    expect(await verifyPasswordHash('any', 'invalid')).toBe(false);
    expect(await verifyPasswordHash('any', 'pbkdf2:1000:bad')).toBe(false);
  });

  it('returns false when iterations are below 10000', async () => {
    const lowIterHash =
      'pbkdf2:5000:AAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(await verifyPasswordHash('any', lowIterHash)).toBe(false);
  });

  it('returns false when salt decodes to fewer than 8 bytes', async () => {
    const badSaltHash =
      'pbkdf2:100000:aaaa:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(await verifyPasswordHash('any', badSaltHash)).toBe(false);
  });

  it('returns false when expectedHash length is not 32', async () => {
    const badHashLen =
      'pbkdf2:100000:AAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAA';
    expect(await verifyPasswordHash('any', badHashLen)).toBe(false);
  });

  it('returns false for malformed base64 in salt or hash (no throw)', async () => {
    const badBase64 = 'pbkdf2:100000:!!!invalid!!!:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    expect(await verifyPasswordHash('any', badBase64)).toBe(false);
  });
});

describe('signPayload / verifySignature', () => {
  it('produces verifiable signature', async () => {
    const secret = 'my-secret-key';
    const payload = 'e=1234567890';
    const signature = await signPayload(secret, payload);
    expect(signature).toBeTruthy();
    expect(await verifySignature(secret, payload, signature)).toBe(true);
  });

  it('rejects wrong signature', async () => {
    const secret = 'my-secret-key';
    const payload = 'e=1234567890';
    const signature = await signPayload(secret, payload);
    expect(await verifySignature(secret, payload, signature + 'x')).toBe(false);
  });

  it('rejects signature with wrong secret', async () => {
    const signature = await signPayload('secret1', 'payload');
    expect(await verifySignature('secret2', 'payload', signature)).toBe(false);
  });
});
