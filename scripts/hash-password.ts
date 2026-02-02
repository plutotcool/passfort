#!/usr/bin/env npx tsx
/**
 * Generate PBKDF2 hash for password (production use).
 * Run: npx tsx scripts/hash-password.ts "your-password"
 */

import { hashPassword } from '../src/crypto.js';

const password = process.argv[2];
if (!password) {
  console.error('Usage: npx tsx scripts/hash-password.ts "your-password"');
  process.exit(1);
}

const hash = await hashPassword(password);
console.log('\nAdd this to your Vercel environment variables:\n');
console.log(`PASSWORD_PROTECT_HASH=${hash}`);
console.log(
  '\nAlso set PASSWORD_PROTECT_SECRET (min 16 chars) for session signing.'
);
console.log('Generate one: openssl rand -base64 24\n');
