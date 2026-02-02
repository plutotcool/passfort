import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkRateLimit,
  resetRateLimitForTesting,
} from '../rate-limit.js';

describe('rate-limit', () => {
  beforeEach(() => {
    resetRateLimitForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when under limit', () => {
    expect(checkRateLimit('192.168.1.1', 10, 60_000)).toBeNull();
    expect(checkRateLimit('192.168.1.1', 10, 60_000)).toBeNull();
  });

  it('returns retry-after seconds when over limit', () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit('192.168.1.1', 10, 60_000)).toBeNull();
    }
    const retry = checkRateLimit('192.168.1.1', 10, 60_000);
    expect(retry).not.toBeNull();
    expect(retry).toBeGreaterThanOrEqual(1);
  });

  it('returns null when maxAttempts is 0 (disabled)', () => {
    expect(checkRateLimit('ip', 0, 60_000)).toBeNull();
  });

  it('returns null when windowMs is 0 (disabled)', () => {
    expect(checkRateLimit('ip', 10, 0)).toBeNull();
  });

  it('resets window when entry expired (entry.resetAt < now)', () => {
    expect(checkRateLimit('k', 2, 100)).toBeNull();
    expect(checkRateLimit('k', 2, 100)).toBeNull();
    expect(checkRateLimit('k', 2, 100)).not.toBeNull();
    vi.advanceTimersByTime(150);
    expect(checkRateLimit('k', 2, 100)).toBeNull();
  });

  it('prunes expired entries when enough time passed', () => {
    checkRateLimit('old-key', 10, 1000);
    vi.advanceTimersByTime(121_000);
    checkRateLimit('new-key', 10, 60_000);
  });
});
