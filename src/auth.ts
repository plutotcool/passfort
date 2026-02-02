/**
 * Password verification and session validation.
 */

import {
  verifyPasswordHash,
  timingSafeEqual,
  signPayload,
  verifySignature,
} from './crypto.js';
import type { PasswordProtectConfig } from './config.js';

/**
 * Verify a submitted password against config.
 */
export async function verifyPassword(
  submitted: string,
  config: PasswordProtectConfig
): Promise<boolean> {
  if (!submitted || submitted.length > 256) {
    return false;
  }

  if (config.hash) {
    return verifyPasswordHash(submitted, config.hash);
  }

  if (config.password) {
    return timingSafeEqual(submitted, config.password);
  }

  return false;
}

/**
 * Create a signed session payload for cookie.
 */
export async function createSession(
  secret: string,
  durationSeconds: number
): Promise<{ payload: string; signature: string }> {
  const expires = Math.floor(Date.now() / 1000) + durationSeconds;
  const payload = `e=${expires}`;
  const signature = await signPayload(secret, payload);
  return { payload, signature };
}

/**
 * Validate a session cookie value.
 */
export async function validateSession(
  cookieValue: string,
  secret: string
): Promise<boolean> {
  if (!cookieValue || !secret) return false;

  const [payload, signature] = cookieValue.split('.');
  if (!payload || !signature) return false;

  const valid = await verifySignature(secret, payload, signature);
  if (!valid) return false;

  const match = payload.match(/e=(\d+)/);
  if (!match) return false;

  const expires = parseInt(match[1], 10);
  return Date.now() / 1000 < expires;
}
