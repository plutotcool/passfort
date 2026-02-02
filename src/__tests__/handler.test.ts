import { describe, it, expect, beforeEach } from 'vitest';
import { handlePasswordProtect } from '../handler.js';
import { resetRateLimitForTesting } from '../rate-limit.js';

const SECRET = 'test-secret-min-16-chars';

function makeRequest(
  url: string,
  options: {
    method?: string;
    cookie?: string;
    body?: FormData;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = 'GET', cookie, body, headers: extraHeaders } = options;
  const headers = new Headers(extraHeaders);
  if (cookie) headers.set('cookie', cookie);
  return new Request(url, { method, headers, body });
}

beforeEach(() => {
  resetRateLimitForTesting();
});

describe('handlePasswordProtect', () => {
  it('returns null when config is missing', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin'),
      env: {},
    });
    expect(res).toBeNull();
  });

  it('uses config override when env yields no config', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin'),
      env: {},
      config: {
        secret: SECRET,
        password: 'testpass',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it('returns null when config has no secret (and not blockOnly)', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin'),
      env: {},
      config: { password: 'x', blockOnly: false },
    });
    expect(res).toBeNull();
  });

  it('returns 503 when blockOnly is set (no form, no password)', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/'),
      env: { PASSFORT_BLOCK_ONLY: 'true' },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(503);
    const text = await res?.text();
    expect(text).toContain('Temporarily unavailable');
    expect(text).not.toContain('Password');
  });

  it('returns password form when unauthenticated', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin'),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
    expect(await res?.text()).toContain('Password Required');
  });

  it('returns 302 with Set-Cookie on correct password', async () => {
    const form = new FormData();
    form.set('password', 'testpass');
    form.set('return_url', '/admin');

    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin', {
        method: 'POST',
        body: form,
      }),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(302);
    expect(res?.headers.get('Location')).toContain('/admin');
    expect(res?.headers.get('Set-Cookie')).toContain('__password_protect');
  });

  it('rejects protocol-relative return_url (open redirect) and redirects to /', async () => {
    const form = new FormData();
    form.set('password', 'testpass');
    form.set('return_url', '//evil.com/path');

    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin', {
        method: 'POST',
        body: form,
      }),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(302);
    const location = res?.headers.get('Location') ?? '';
    expect(location).toMatch(/^https?:\/\/localhost/);
    expect(location).not.toContain('evil.com');
  });

  it('returns 401 form on wrong password', async () => {
    const form = new FormData();
    form.set('password', 'wrong');
    form.set('return_url', '/admin');

    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin', {
        method: 'POST',
        body: form,
      }),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
    expect(await res?.text()).toContain('Incorrect password');
  });

  it('returns null when valid session cookie present', async () => {
    const form = new FormData();
    form.set('password', 'testpass');
    form.set('return_url', '/admin');

    const loginRes = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin', {
        method: 'POST',
        body: form,
      }),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
      },
    });

    const cookie = loginRes?.headers.get('Set-Cookie') ?? '';
    const match = cookie.match(/__password_protect=([^;]+)/);
    const cookieValue = match?.[1];

    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin', {
        cookie: `__password_protect=${cookieValue}`,
      }),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
      },
    });
    expect(res).toBeNull();
  });

  it('returns customized form with form options', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin'),
      env: {},
      config: {
        secret: SECRET,
        password: 'testpass',
        form: {
          title: 'Enter Key',
          description: 'Private preview.',
          theme: 'light',
        },
      },
    });
    expect(res).not.toBeNull();
    const html = await res?.text();
    expect(html).toContain('Enter Key');
    expect(html).toContain('Private preview.');
  });

  it('redirects to loginPath when configured', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin'),
      env: {},
      config: {
        secret: SECRET,
        password: 'testpass',
        loginPath: '/login',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(302);
    expect(res?.headers.get('Location')).toContain('/login?return_url=');
  });

  it('returns null for GET when path is loginPath (custom login page)', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/login'),
      env: {},
      config: {
        secret: SECRET,
        password: 'testpass',
        loginPath: '/login',
      },
    });
    expect(res).toBeNull();
  });

  it('returns null for GET when path is loginPath with trailing slash', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/login/'),
      env: {},
      config: {
        secret: SECRET,
        password: 'testpass',
        loginPath: '/login',
      },
    });
    expect(res).toBeNull();
  });

  it('redirects to loginPath with return_url when unauthenticated POST and loginPath set', async () => {
    const form = new FormData();
    form.set('password', 'wrong');
    form.set('return_url', '/admin');
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin', { method: 'POST', body: form }),
      env: {},
      config: {
        secret: SECRET,
        password: 'testpass',
        loginPath: '/login',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(302);
    expect(res?.headers.get('Location')).toContain('/login?return_url=');
  });

  it('returns 429 when rate limit exceeded', async () => {
    const env = {
      PASSWORD_PROTECT_SECRET: SECRET,
      PASSWORD_PROTECT_PASSWORD: 'testpass',
      PASSFORT_RATE_LIMIT_MAX: '3',
      PASSFORT_RATE_LIMIT_WINDOW_MS: '60000',
    };
    for (let i = 0; i < 3; i++) {
      const form = new FormData();
      form.set('password', 'wrong');
      form.set('return_url', '/admin');
      const res = await handlePasswordProtect({
        request: makeRequest('http://localhost/admin', {
          method: 'POST',
          body: form,
          headers: { 'x-real-ip': '192.168.1.1' },
        }),
        env,
      });
      expect(res?.status).toBe(401);
    }
    const form = new FormData();
    form.set('password', 'wrong');
    form.set('return_url', '/admin');
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/admin', {
        method: 'POST',
        body: form,
        headers: { 'x-real-ip': '192.168.1.1' },
      }),
      env,
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(429);
    expect(res?.headers.get('Retry-After')).toBeDefined();
    expect(res?.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns null when Basic auth with correct password', async () => {
    const creds = btoa('user:testpass');
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/api', {
        headers: { Authorization: `Basic ${creds}` },
      }),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
        PASSFORT_MODE: 'basic',
      },
    });
    expect(res).toBeNull();
  });

  it('returns 401 when Basic auth with wrong password', async () => {
    const creds = btoa('user:wrong');
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/api', {
        headers: { Authorization: `Basic ${creds}` },
      }),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
        PASSFORT_MODE: 'basic',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
    expect(res?.headers.get('WWW-Authenticate')).toContain('Basic');
  });

  it('returns 401 when Basic auth with invalid base64', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/api', {
        headers: { Authorization: 'Basic not-valid-base64!!' },
      }),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
        PASSFORT_MODE: 'basic',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it('returns 401 when Basic auth with no colon (colonIndex <= 0)', async () => {
    const creds = btoa('nocolon');
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/api', {
        headers: { Authorization: `Basic ${creds}` },
      }),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
        PASSFORT_MODE: 'basic',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it('returns 401 when no Basic auth header', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/api'),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
        PASSFORT_MODE: 'basic',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it('clears session cookie and redirects to home on GET with passfort_logout=1', async () => {
    const res = await handlePasswordProtect({
      request: makeRequest('http://localhost/demo?passfort_logout=1'),
      env: {
        PASSWORD_PROTECT_SECRET: SECRET,
        PASSWORD_PROTECT_PASSWORD: 'testpass',
      },
    });
    expect(res).not.toBeNull();
    expect(res?.status).toBe(302);
    const setCookie = res?.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toContain('__password_protect=;');
    expect(setCookie).toContain('Max-Age=0');
    const location = res?.headers.get('Location') ?? '';
    expect(location).toBe('http://localhost/');
  });
});
