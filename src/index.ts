/**
 * vercel-password - Free password protection for Vercel deployments
 *
 * No $150/month Vercel Pro required. Works on Hobby plan.
 *
 * @packageDocumentation
 */

export { handlePasswordProtect } from './handler.js';
export { loadConfig } from './config.js';
export type { PasswordProtectConfig, FormOptions } from './config.js';
export { hashPassword, verifyPasswordHash } from './crypto.js';
export { verifyPassword } from './auth.js';
