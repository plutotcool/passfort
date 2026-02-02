#!/usr/bin/env node
/**
 * CLI for passfort - hash generation, matcher snippet, init (add middleware).
 */

import { hashPassword } from './crypto.js';
import {
  MATCHER_SNIPPET,
  MATCHER_BLOCK_SNIPPET,
  PROXY_SNIPPET,
  PROXY_BLOCK_SNIPPET,
  runInit,
} from './init-middleware.js';

const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'hash') {
  const password = args[1];
  if (!password) {
    console.error('Usage: passfort hash "your-password"');
    process.exit(1);
  }
  const hash = await hashPassword(password);
  console.log('\nAdd to your Vercel environment variables:\n');
  console.log(`PASSFORT_HASH=${hash}`);
  console.log('(or PASSWORD_PROTECT_HASH for backward compatibility)\n');
  console.log('Also set PASSFORT_SECRET (min 16 chars):');
  console.log('  openssl rand -base64 24\n');
  process.exit(0);
}

if (cmd === 'matcher') {
  const block = args.includes('--block') || args.includes('-b');
  const useProxy = args.includes('--proxy') || args.includes('-p');
  const fileHint = useProxy ? 'proxy.ts (Next 16+)' : 'middleware.ts';
  if (block) {
    console.log(
      `\n# Block entire site (maintenance mode). Paste into ${fileHint}\n`
    );
    console.log(useProxy ? PROXY_BLOCK_SNIPPET : MATCHER_BLOCK_SNIPPET);
    console.log('');
  } else {
    console.log(`\n# Protect entire site. Paste into ${fileHint}\n`);
    console.log(useProxy ? PROXY_SNIPPET : MATCHER_SNIPPET);
    console.log(
      '\nThen set PASSFORT_PASSWORD and PASSFORT_SECRET in Vercel.\n'
    );
  }
  process.exit(0);
}

if (cmd === 'init') {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
passfort init - Create middleware.ts (or proxy.ts) and add passfort

  npx passfort init              Protect entire site (middleware)
  npx passfort init --proxy      Next 16+: create proxy.ts
  npx passfort init --paths=/admin,/dashboard
  npx passfort init --block      Maintenance mode (503)

Options:
  --paths=/a,/b   Protect only these paths
  --block         Block entire site with 503 (no form)
  --proxy         Create proxy.ts for Next 16+ (named export proxy)
`);
    process.exit(0);
  }
  const cwd = process.cwd();
  const block = args.includes('--block') || args.includes('-b');
  const useProxy = args.includes('--proxy') || args.includes('-p');
  const pathsArg = args.find((a) => a.startsWith('--paths='));
  const paths = pathsArg
    ? pathsArg
        .slice('--paths='.length)
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : undefined;

  const result = runInit({ startDir: cwd, block, paths, useProxy });

  if (result.ok) {
    console.log('Created ' + result.path);
    if (block) {
      console.log(
        'Block-only mode (503). Set PASSFORT_BLOCK_ONLY=true in production if you use env-based config.'
      );
    } else {
      console.log(
        'Set PASSFORT_PASSWORD and PASSFORT_SECRET in your environment (e.g. Vercel).'
      );
    }
    process.exit(0);
  }

  if (result.reason === 'not_next') {
    console.error(
      'Not a Next.js project (no package.json with next dependency found from ' +
        cwd
    );
    process.exit(1);
  }
  if (result.reason === 'already_set_up') {
    console.log('passfort is already set up in ' + result.path);
    process.exit(0);
  }
  if (result.reason === 'middleware_exists') {
    console.log('middleware already exists at ' + result.path);
    console.log(
      "Use 'npx passfort matcher' to see the snippet and merge manually, or back up the file and run 'npx passfort init' again."
    );
    process.exit(1);
  }
  if (result.reason === 'proxy_exists') {
    console.log('proxy already exists at ' + result.path);
    console.log(
      "Use 'npx passfort matcher --proxy' to see the snippet and merge manually, or back up the file and run 'npx passfort init --proxy' again."
    );
    process.exit(1);
  }

  process.exit(1);
}

if (cmd === '--help' || cmd === '-h' || !cmd) {
  console.log(`
passfort - Password protection for Vercel

Commands:
  init [options]        Create middleware.ts or proxy.ts and add passfort
  hash <password>       Generate PBKDF2 hash for production use
  matcher [options]     Print snippet for middleware.ts or proxy.ts

Init options:
  --paths=/admin,/foo   Protect specific paths only (default: entire site)
  --block               Block entire site with 503 (maintenance mode)
  --proxy               Next 16+: create proxy.ts (named export proxy)

Matcher options:
  --block               Block-only (503) snippet
  --proxy               Proxy snippet for proxy.ts (Next 16+)

Quick start:
  1. pnpm add @tommyvez/passfort
  2. npx passfort init              # create middleware (entire site protected)
     or npx passfort init --proxy   # Next 16+: create proxy.ts
  3. Set env: PASSFORT_PASSWORD, PASSFORT_SECRET

Manual: npx passfort matcher        # paste into middleware.ts
        npx passfort matcher --proxy   # paste into proxy.ts (Next 16+)

Production:
  npx passfort hash "mypassword"
  Set PASSFORT_HASH and PASSFORT_SECRET in Vercel
`);
  process.exit(0);
}

console.error(`Unknown command: ${cmd}`);
process.exit(1);
