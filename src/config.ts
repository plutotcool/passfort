/**
 * Configuration parsing and validation.
 */

export interface FormOptions {
  /** Page title and heading (default: "Password Required") */
  title?: string;
  /** Description text below heading (default: "This page is protected...") */
  description?: string;
  /** Password input placeholder (default: "Password") */
  placeholder?: string;
  /** Submit button text (default: "Continue") */
  buttonText?: string;
  /** Visual theme: "dark" | "light" (default: "dark") */
  theme?: 'dark' | 'light';
}

export interface PasswordProtectConfig {
  /** Plain password (quick start) - use hash in production */
  password?: string;
  /** PBKDF2 hash: pbkdf2:iterations:salt:hash */
  hash?: string;
  /** Secret for signing session cookies (required unless blockOnly) */
  secret?: string;
  /** Session duration in seconds (default: 7 days) */
  sessionDuration?: number;
  /** Auth mode: 'form' (default) or 'basic' */
  mode?: 'form' | 'basic';
  /** Customize the built-in password form */
  form?: FormOptions;
  /** Custom login path – redirect here instead of showing built-in form */
  loginPath?: string;
  /** Protect entire site (from env: PASSFORT_ALL=true) */
  protectAll?: boolean;
  /** Paths to exclude when protectAll (from env: PASSFORT_EXCLUDE_PATHS) */
  excludePaths?: string[];
  /** Block all matched routes with no form (maintenance mode). No password required. */
  blockOnly?: boolean;
  /** Max password attempts per client per window (0 = disabled). Default 10. */
  rateLimitMax?: number;
  /** Rate limit window in ms. Default 60000. */
  rateLimitWindowMs?: number;
}

const DEFAULT_SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days
const MIN_SECRET_LENGTH = 16;

/**
 * Load and validate config from environment variables.
 * When PASSFORT_ENABLED=false (or 0), returns null so protection is off without code changes.
 */
export function loadConfig(
  env: Record<string, string | undefined> = process.env
): PasswordProtectConfig | null {
  const enabled =
    env.PASSFORT_ENABLED ??
    env.PASSWORD_PROTECT_ENABLED ??
    env.VERCEL_PASSWORD_ENABLED;
  if (enabled === 'false' || enabled === '0') {
    return null;
  }

  const blockOnly =
    env.PASSFORT_BLOCK_ONLY === 'true' ||
    env.PASSFORT_BLOCK_ONLY === '1' ||
    env.PASSWORD_PROTECT_BLOCK_ONLY === 'true' ||
    env.PASSWORD_PROTECT_BLOCK_ONLY === '1' ||
    env.VERCEL_PASSWORD_BLOCK_ONLY === 'true' ||
    env.VERCEL_PASSWORD_BLOCK_ONLY === '1';

  if (blockOnly) {
    return {
      blockOnly: true,
      secret: undefined,
      sessionDuration: DEFAULT_SESSION_DURATION,
    };
  }

  const secret =
    env.PASSFORT_SECRET ??
    env.PASSWORD_PROTECT_SECRET ??
    env.VERCEL_PASSWORD_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    return null;
  }

  const password =
    env.PASSFORT_PASSWORD ??
    env.PASSWORD_PROTECT_PASSWORD ??
    env.VERCEL_PASSWORD;
  const hash =
    env.PASSFORT_HASH ?? env.PASSWORD_PROTECT_HASH ?? env.VERCEL_PASSWORD_HASH;

  if (!password && !hash) {
    return null;
  }

  const durationStr =
    env.PASSFORT_SESSION_DURATION ??
    env.PASSWORD_PROTECT_SESSION_DURATION ??
    env.VERCEL_PASSWORD_SESSION_DURATION;
  const sessionDuration = durationStr
    ? parseInt(durationStr, 10)
    : DEFAULT_SESSION_DURATION;

  const mode = (env.PASSFORT_MODE ??
    env.PASSWORD_PROTECT_MODE ??
    env.VERCEL_PASSWORD_MODE ??
    'form') as 'form' | 'basic';

  const form: FormOptions = {};
  const formTitle = env.PASSFORT_FORM_TITLE ?? env.PASSWORD_PROTECT_FORM_TITLE;
  const formDesc =
    env.PASSFORT_FORM_DESCRIPTION ?? env.PASSWORD_PROTECT_FORM_DESCRIPTION;
  const formPlaceholder =
    env.PASSFORT_FORM_PLACEHOLDER ?? env.PASSWORD_PROTECT_FORM_PLACEHOLDER;
  const formButton =
    env.PASSFORT_FORM_BUTTON ?? env.PASSWORD_PROTECT_FORM_BUTTON;
  const formTheme = env.PASSFORT_FORM_THEME ?? env.PASSWORD_PROTECT_FORM_THEME;
  if (formTitle) form.title = formTitle;
  if (formDesc) form.description = formDesc;
  if (formPlaceholder) form.placeholder = formPlaceholder;
  if (formButton) form.buttonText = formButton;
  if (formTheme === 'light') form.theme = 'light';

  const loginPath =
    env.PASSFORT_LOGIN_PATH ??
    env.PASSWORD_PROTECT_LOGIN_PATH ??
    env.VERCEL_PASSWORD_LOGIN_PATH;

  const protectAll =
    env.PASSFORT_ALL === 'true' ||
    env.PASSFORT_ALL === '1' ||
    env.PASSWORD_PROTECT_ALL === 'true' ||
    env.PASSWORD_PROTECT_ALL === '1' ||
    env.VERCEL_PASSWORD_PROTECT_ALL === 'true' ||
    env.VERCEL_PASSWORD_PROTECT_ALL === '1';

  const excludePathsStr =
    env.PASSFORT_EXCLUDE_PATHS ??
    env.PASSWORD_PROTECT_EXCLUDE_PATHS ??
    env.VERCEL_PASSWORD_EXCLUDE_PATHS;
  const excludePaths = excludePathsStr
    ? excludePathsStr
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : undefined;

  const rateLimitMaxStr =
    env.PASSFORT_RATE_LIMIT_MAX ?? env.PASSWORD_PROTECT_RATE_LIMIT_MAX;
  const rateLimitWindowStr =
    env.PASSFORT_RATE_LIMIT_WINDOW_MS ??
    env.PASSWORD_PROTECT_RATE_LIMIT_WINDOW_MS;
  const rateLimitMax = rateLimitMaxStr
    ? parseInt(rateLimitMaxStr, 10)
    : 10;
  const rateLimitWindowMs = rateLimitWindowStr
    ? parseInt(rateLimitWindowStr, 10)
    : 60_000;

  return {
    password: password ?? undefined,
    hash: hash ?? undefined,
    secret: secret ?? undefined,
    sessionDuration: Number.isFinite(sessionDuration)
      ? sessionDuration
      : DEFAULT_SESSION_DURATION,
    mode: mode === 'basic' ? 'basic' : 'form',
    form: Object.keys(form).length > 0 ? form : undefined,
    loginPath: loginPath ?? undefined,
    protectAll: protectAll || undefined,
    excludePaths,
    rateLimitMax:
      Number.isFinite(rateLimitMax) && rateLimitMax >= 0 ? rateLimitMax : 10,
    rateLimitWindowMs:
      Number.isFinite(rateLimitWindowMs) && rateLimitWindowMs > 0
        ? rateLimitWindowMs
        : 60_000,
  };
}
