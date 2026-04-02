/**
 * Core request handler - framework-agnostic.
 * Uses standard Web API Request/Response.
 */

import { loadConfig } from './config.js';
import { verifyPassword, createSession, validateSession } from './auth.js';
import { getPasswordFormHtml } from './password-form.html.js';
import { checkRateLimit } from './rate-limit.js';
import type { PasswordProtectConfig } from './config.js';

const COOKIE_NAME = '__password_protect';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export interface HandleOptions {
  request: Request;
  /** Full config override, or partial merge with env-loaded config */
  config?: Partial<PasswordProtectConfig> | null;
  env?: Record<string, string | undefined>;
}

/**
 * Handle a request - returns Response if handled (auth required or form submitted),
 * or null if request should continue to the app.
 */
export async function handlePasswordProtect(
  options: HandleOptions
): Promise<Response | null> {
  const { request, config: configOverride, env } = options;
  const baseConfig = loadConfig(env as Record<string, string | undefined>);
  const config = baseConfig
    ? { ...baseConfig, ...configOverride }
    : (configOverride as PasswordProtectConfig);

  if (!config) {
    return null;
  }

  // Block-only (maintenance mode): no form, no auth, just 503
  if (config.blockOnly) {
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Access not permitted</title></head><body style="background:#000;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><p style="color:oklch(0.708 0 0);padding:0 20px;box-sizing:border-box;text-align:center;line-height:1.4;font-size:0.875rem">Access to this page is not permitted at the moment.</p></body></html>`,
      {
        status: 503,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Retry-After': '300',
        },
      }
    );
  }

  if (!config.secret) {
    return null;
  }

  const url = new URL(request.url);

  // Logout: clear session cookie and redirect to home (full-page nav ensures browser applies Set-Cookie)
  if (request.method === 'GET' && url.searchParams.get('passfort_logout') === '1') {
    const clearCookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${url.protocol === 'https:' ? '; Secure' : ''}`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}/`,
        'Set-Cookie': clearCookie,
        'Cache-Control': 'no-store',
      },
    });
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const sessionCookie = parseCookie(cookieHeader, COOKIE_NAME);

  if (sessionCookie) {
    const valid = await validateSession(sessionCookie, config.secret);
    if (valid) {
      return null;
    }
  }

  if (config.mode === 'basic') {
    return await handleBasicAuth(request, config);
  }

  // Custom login page: let GET through so the app can render it
  if (config.loginPath && request.method === 'GET') {
    const loginPath = config.loginPath.startsWith('/')
      ? config.loginPath
      : `/${config.loginPath}`;
    if (url.pathname === loginPath || url.pathname === `${loginPath}/`) {
      return null;
    }
  }

  if (request.method === 'POST') {
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';
    const maxAttempts = config.rateLimitMax ?? 10;
    const windowMs = config.rateLimitWindowMs ?? 60_000;
    const retryAfterSec = checkRateLimit(clientIp, maxAttempts, windowMs);
    if (retryAfterSec !== null) {
      return new Response(null, {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'Cache-Control': 'no-store',
        },
      });
    }

    const formData = await request.formData().catch(() => null);
    const password = formData?.get('password');
    const returnUrl =
      (formData?.get('return_url') as string) || url.pathname || '/';

    if (typeof password === 'string') {
      const valid = await verifyPassword(password, config);
      if (valid) {
        const { payload, signature } = await createSession(
          config.secret,
          config.sessionDuration ?? COOKIE_MAX_AGE
        );
        const cookieValue = `${payload}.${signature}`;
        const maxAge = config.sessionDuration ?? COOKIE_MAX_AGE;
        // Same-origin path only: reject protocol-relative (//) to prevent open redirect
        const redirectPath =
          (returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`) || '/';
        const safePath = redirectPath.startsWith('//') ? '/' : redirectPath;
        const redirectUrl = new URL(safePath, url.origin).toString();
        const isSecure = url.protocol === 'https:';
        const cookieFlags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}`;

        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectUrl,
            'Set-Cookie': `${COOKIE_NAME}=${cookieValue}; ${cookieFlags}`,
          },
        });
      }
    }
  }

  // Redirect to custom login page if configured
  if (config.loginPath) {
    const loginPath = config.loginPath.startsWith('/')
      ? config.loginPath
      : `/${config.loginPath}`;
    const returnUrl = encodeURIComponent(url.pathname + url.search);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${loginPath}?return_url=${returnUrl}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const formOptions = config.form ?? {};
  return new Response(
    getPasswordFormHtml({
      error: request.method === 'POST',
      returnUrl: url.pathname + url.search,
      title: formOptions.title,
      description: formOptions.description,
      placeholder: formOptions.placeholder,
      buttonText: formOptions.buttonText,
      theme: formOptions.theme,
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
}

async function handleBasicAuth(
  request: Request,
  config: PasswordProtectConfig
): Promise<Response | null> {
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Basic ')) {
    try {
      const base64 = authHeader.slice(6);
      const decoded = atob(base64);
      const colonIndex = decoded.indexOf(':');
      if (colonIndex > 0) {
        const password = decoded.slice(colonIndex + 1);
        const valid = await verifyPassword(password, config);
        if (valid) {
          return null;
        }
      }
    } catch {
      // Invalid base64, fall through to 401
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Password Protected"',
      'Cache-Control': 'no-store',
    },
  });
}

/** Parse a specific cookie value from Cookie header. */
function parseCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name && valueParts.length > 0) {
      return valueParts.join('=').trim();
    }
  }
  return null;
}
