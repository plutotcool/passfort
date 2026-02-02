/**
 * Next.js middleware integration.
 * Drop-in wrapper for Next.js 13+ App Router and Pages Router.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { handlePasswordProtect } from './handler.js';

export interface FormOptions {
  /** Form title/heading */
  title?: string;
  /** Description text */
  description?: string;
  /** Password input placeholder */
  placeholder?: string;
  /** Submit button text */
  buttonText?: string;
  /** Visual theme: "dark" | "light" */
  theme?: 'dark' | 'light';
}

export interface PasswordProtectOptions {
  /**
   * Paths to protect (e.g. ['/admin', '/dashboard']).
   * Use path prefixes - '/admin' protects /admin, /admin/foo, etc.
   */
  paths?: string[];
  /**
   * Protect the entire site except public paths.
   * When true, 'excludePaths' defines what's public.
   */
  protectAll?: boolean;
  /**
   * Paths to exclude when protectAll is true.
   * Default: ['/api', '/_next', '/favicon.ico', '/public']
   */
  excludePaths?: string[];
  /**
   * Block all matched routes with no password form (maintenance mode).
   * Set PASSFORT_BLOCK_ONLY=true in env, or blockOnly: true here.
   * No password required; returns 503 for matched routes.
   */
  blockOnly?: boolean;
  /**
   * Custom matcher - overrides paths/protectAll.
   * Same format as Next.js config.matcher.
   */
  matcher?: string | string[];
  /**
   * Customize the built-in password form (title, description, theme, etc.)
   */
  form?: FormOptions;
  /**
   * Custom login page path. When set, redirects unauthenticated users here
   * instead of showing the built-in form. Your page must have a form that
   * POSTs to the return_url (from query) with password and return_url fields.
   */
  loginPath?: string;
  /**
   * Override env used for config (e.g. for demo: { PASSFORT_PASSWORD: 'demo', PASSFORT_SECRET: '...' }).
   * Merged with process.env so you can supply only the keys you need.
   */
  env?: Record<string, string | undefined>;
}

function pathMatches(
  requestPath: string,
  options: PasswordProtectOptions
): boolean {
  const {
    paths = [],
    protectAll = false,
    blockOnly = false,
    excludePaths = [],
    loginPath,
  } = options;

  const defaultExclude = [
    '/api',
    '/_next',
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
    '/public',
  ];
  const exclude = [
    ...(protectAll || blockOnly ? defaultExclude : []),
    ...excludePaths,
  ];

  for (const ex of exclude) {
    if (requestPath === ex || requestPath.startsWith(ex + '/')) {
      return false;
    }
  }

  if (blockOnly) {
    return true;
  }

  if (protectAll) {
    return true;
  }

  if (paths.length === 0) {
    return true;
  }

  for (const path of paths) {
    if (requestPath === path || requestPath.startsWith(path + '/')) {
      return true;
    }
  }

  // Match loginPath so we handle POST (form submit) and pass through GET
  if (loginPath) {
    const lp = loginPath.startsWith('/') ? loginPath : `/${loginPath}`;
    if (requestPath === lp || requestPath.startsWith(lp + '/')) {
      return true;
    }
  }

  return false;
}

/**
 * Create Next.js middleware with password protection.
 *
 * @example
 * // middleware.ts
 * import { withPasswordProtect } from 'passfort/next';
 *
 * export default withPasswordProtect({
 *   paths: ['/admin', '/preview'],
 * });
 *
 * export const config = {
 *   matcher: ['/admin/:path*', '/preview/:path*'],
 * };
 */
export function withPasswordProtect(options: PasswordProtectOptions = {}) {
  return async function middleware(
    request: NextRequest
  ): Promise<NextResponse> {
    const pathname = request.nextUrl.pathname;

    // Merge env (optionally override for demo: options.env)
    const baseEnv = typeof process !== 'undefined' ? process.env : {};
    const env: Record<string, string | undefined> = options.env
      ? { ...baseEnv, ...options.env }
      : (baseEnv as Record<string, string | undefined>);

    const envProtectAll =
      env.PASSFORT_ALL === 'true' ||
      env.PASSFORT_ALL === '1' ||
      env.PASSWORD_PROTECT_ALL === 'true' ||
      env.PASSWORD_PROTECT_ALL === '1' ||
      env.VERCEL_PASSWORD_PROTECT_ALL === 'true' ||
      env.VERCEL_PASSWORD_PROTECT_ALL === '1';
    const envExcludeStr =
      env.PASSFORT_EXCLUDE_PATHS ??
      env.PASSWORD_PROTECT_EXCLUDE_PATHS ??
      env.VERCEL_PASSWORD_EXCLUDE_PATHS;
    const envExcludePaths = envExcludeStr
      ? envExcludeStr
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
    const envBlockOnly =
      env.PASSFORT_BLOCK_ONLY === 'true' ||
      env.PASSFORT_BLOCK_ONLY === '1' ||
      env.PASSWORD_PROTECT_BLOCK_ONLY === 'true' ||
      env.PASSWORD_PROTECT_BLOCK_ONLY === '1' ||
      env.VERCEL_PASSWORD_BLOCK_ONLY === 'true' ||
      env.VERCEL_PASSWORD_BLOCK_ONLY === '1';

    const resolvedOptions: PasswordProtectOptions = {
      ...options,
      protectAll: options.protectAll ?? (envProtectAll || undefined),
      blockOnly: options.blockOnly ?? (envBlockOnly || undefined),
      excludePaths:
        options.excludePaths?.length || envExcludePaths.length
          ? [...(options.excludePaths ?? []), ...envExcludePaths]
          : options.excludePaths,
    };

    if (!pathMatches(pathname, resolvedOptions)) {
      return NextResponse.next();
    }

    const configOverride =
      options.form || options.loginPath
        ? { form: options.form, loginPath: options.loginPath }
        : undefined;

    const response = await handlePasswordProtect({
      request: request as unknown as Request,
      env,
      config: configOverride ?? undefined,
    });

    if (response === null) {
      return NextResponse.next();
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

export { handlePasswordProtect };
