import { describe, it, expect } from 'vitest';
import { verifyPassword, createSession, validateSession } from '../auth.js';
import { hashPassword } from '../crypto.js';

describe('verifyPassword', () => {
  it('returns true for correct plain password', async () => {
    const config = {
      secret: 'a'.repeat(16),
      password: 'correct',
    };
    expect(await verifyPassword('correct', config)).toBe(true);
  });

  it('returns false for wrong plain password', async () => {
    const config = {
      secret: 'a'.repeat(16),
      password: 'correct',
    };
    expect(await verifyPassword('wrong', config)).toBe(false);
  });

  it('returns true for correct hashed password', async () => {
    const hash = await hashPassword('secret123');
    const config = { secret: 'a'.repeat(16), hash };
    expect(await verifyPassword('secret123', config)).toBe(true);
  });

  it('returns false for wrong hashed password', async () => {
    const hash = await hashPassword('secret123');
    const config = { secret: 'a'.repeat(16), hash };
    expect(await verifyPassword('wrong', config)).toBe(false);
  });

  it('rejects empty password', async () => {
    const config = { secret: 'a'.repeat(16), password: 'pass' };
    expect(await verifyPassword('', config)).toBe(false);
  });

  it('rejects very long password', async () => {
    const config = { secret: 'a'.repeat(16), password: 'pass' };
    expect(await verifyPassword('x'.repeat(300), config)).toBe(false);
  });

  it('returns false when config has neither password nor hash', async () => {
    const config = { secret: 'a'.repeat(16) } as Parameters<typeof verifyPassword>[1];
    expect(await verifyPassword('anything', config)).toBe(false);
  });
});

describe('createSession / validateSession', () => {
  const secret = 'my-secret-at-least-16';

  it('creates session that validates', async () => {
    const { payload, signature } = await createSession(secret, 3600);
    const cookieValue = `${payload}.${signature}`;
    expect(await validateSession(cookieValue, secret)).toBe(true);
  });

  it('rejects invalid cookie format', async () => {
    expect(await validateSession('', secret)).toBe(false);
    expect(await validateSession('no-dot', secret)).toBe(false);
    expect(await validateSession('.only-signature', secret)).toBe(false);
  });

  it('rejects wrong secret', async () => {
    const { payload, signature } = await createSession(secret, 3600);
    expect(
      await validateSession(`${payload}.${signature}`, 'wrong-secret')
    ).toBe(false);
  });

  it('rejects tampered payload', async () => {
    const { signature } = await createSession(secret, 3600);
    expect(await validateSession(`e=9999999999.${signature}`, secret)).toBe(
      false
    );
  });
});
