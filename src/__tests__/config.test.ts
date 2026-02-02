import { describe, it, expect } from 'vitest';
import { loadConfig } from '../config.js';

const MIN_SECRET = 'a'.repeat(16);

describe('loadConfig', () => {
  it('returns null when PASSFORT_ENABLED is false (disable without code change)', () => {
    expect(
      loadConfig({
        PASSFORT_ENABLED: 'false',
        PASSWORD_PROTECT_SECRET: MIN_SECRET,
        PASSWORD_PROTECT_PASSWORD: 'pass',
      })
    ).toBeNull();
    expect(
      loadConfig({
        PASSFORT_ENABLED: '0',
        PASSWORD_PROTECT_SECRET: MIN_SECRET,
        PASSWORD_PROTECT_PASSWORD: 'pass',
      })
    ).toBeNull();
  });

  it('returns config when PASSFORT_ENABLED is true or unset', () => {
    const env = {
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
    };
    expect(loadConfig(env)).not.toBeNull();
    expect(loadConfig({ ...env, PASSFORT_ENABLED: 'true' })).not.toBeNull();
    expect(loadConfig({ ...env, PASSFORT_ENABLED: '1' })).not.toBeNull();
  });

  it('returns blockOnly config when PASSFORT_BLOCK_ONLY is set (no secret/password required)', () => {
    const config = loadConfig({ PASSFORT_BLOCK_ONLY: 'true' });
    expect(config).not.toBeNull();
    expect(config?.blockOnly).toBe(true);
    expect(config?.secret).toBeUndefined();
  });

  it('returns null when secret is missing', () => {
    expect(loadConfig({})).toBeNull();
    expect(loadConfig({ PASSWORD_PROTECT_PASSWORD: 'pass' })).toBeNull();
  });

  it('returns null when secret is too short', () => {
    expect(
      loadConfig({
        PASSWORD_PROTECT_SECRET: 'short',
        PASSWORD_PROTECT_PASSWORD: 'pass',
      })
    ).toBeNull();
  });

  it('returns null when neither password nor hash is set', () => {
    expect(
      loadConfig({
        PASSWORD_PROTECT_SECRET: MIN_SECRET,
      })
    ).toBeNull();
  });

  it('returns config with plain password', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'mypassword',
    });
    expect(config).not.toBeNull();
    expect(config?.password).toBe('mypassword');
    expect(config?.secret).toBe(MIN_SECRET);
    expect(config?.mode).toBe('form');
  });

  it('returns config with hash', () => {
    const hash = 'pbkdf2:100000:abc:def';
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_HASH: hash,
    });
    expect(config).not.toBeNull();
    expect(config?.hash).toBe(hash);
  });

  it('accepts VERCEL_ prefixed env vars', () => {
    const config = loadConfig({
      VERCEL_PASSWORD_SECRET: MIN_SECRET,
      VERCEL_PASSWORD: 'pass',
    });
    expect(config).not.toBeNull();
    expect(config?.password).toBe('pass');
    expect(config?.secret).toBe(MIN_SECRET);
  });

  it('parses session duration', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
      PASSWORD_PROTECT_SESSION_DURATION: '3600',
    });
    expect(config?.sessionDuration).toBe(3600);
  });

  it('defaults to 7 days when duration invalid', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
      PASSWORD_PROTECT_SESSION_DURATION: 'not-a-number',
    });
    expect(config?.sessionDuration).toBe(60 * 60 * 24 * 7);
  });

  it('supports basic mode', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
      PASSWORD_PROTECT_MODE: 'basic',
    });
    expect(config?.mode).toBe('basic');
  });

  it('parses form options from env', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
      PASSWORD_PROTECT_FORM_TITLE: 'Enter Key',
      PASSWORD_PROTECT_FORM_DESCRIPTION: 'Private area.',
      PASSWORD_PROTECT_FORM_THEME: 'light',
    });
    expect(config?.form?.title).toBe('Enter Key');
    expect(config?.form?.description).toBe('Private area.');
    expect(config?.form?.theme).toBe('light');
  });

  it('parses loginPath from env', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
      PASSWORD_PROTECT_LOGIN_PATH: '/login',
    });
    expect(config?.loginPath).toBe('/login');
  });

  it('parses protectAll from env', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
      PASSWORD_PROTECT_ALL: 'true',
    });
    expect(config?.protectAll).toBe(true);
  });

  it('parses excludePaths from env', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
      PASSWORD_PROTECT_EXCLUDE_PATHS: '/login,/public',
    });
    expect(config?.excludePaths).toEqual(['/login', '/public']);
  });

  it('accepts PASSFORT_ prefixed env vars', () => {
    const config = loadConfig({
      PASSFORT_SECRET: MIN_SECRET,
      PASSFORT_PASSWORD: 'mypass',
    });
    expect(config).not.toBeNull();
    expect(config?.password).toBe('mypass');
    expect(config?.secret).toBe(MIN_SECRET);
  });

  it('parses rate limit env and defaults to 10 / 60000', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
    });
    expect(config?.rateLimitMax).toBe(10);
    expect(config?.rateLimitWindowMs).toBe(60_000);
  });

  it('uses default rateLimitWindowMs when invalid or zero', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
      PASSFORT_RATE_LIMIT_WINDOW_MS: '0',
    });
    expect(config?.rateLimitWindowMs).toBe(60_000);
  });

  it('parses custom rate limit from env', () => {
    const config = loadConfig({
      PASSWORD_PROTECT_SECRET: MIN_SECRET,
      PASSWORD_PROTECT_PASSWORD: 'pass',
      PASSFORT_RATE_LIMIT_MAX: '5',
      PASSFORT_RATE_LIMIT_WINDOW_MS: '120000',
    });
    expect(config?.rateLimitMax).toBe(5);
    expect(config?.rateLimitWindowMs).toBe(120_000);
  });
});
