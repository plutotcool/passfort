/**
 * Init middleware logic: find Next.js project, detect/create middleware.ts.
 * Used by CLI `passfort init`; exported for testing.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const PACKAGE_IMPORT = "@tommyvez/passfort/next";

export const MATCHER_SNIPPET = `import { withPasswordProtect } from '${PACKAGE_IMPORT}';

export default withPasswordProtect({ protectAll: true });

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
`;

export const MATCHER_BLOCK_SNIPPET = `import { withPasswordProtect } from '${PACKAGE_IMPORT}';

export default withPasswordProtect({ protectAll: true, blockOnly: true });

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
`;

export const PROXY_SNIPPET = `import { withPasswordProtect } from '${PACKAGE_IMPORT}';

export const proxy = withPasswordProtect({ protectAll: true });

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
`;

export const PROXY_BLOCK_SNIPPET = `import { withPasswordProtect } from '${PACKAGE_IMPORT}';

export const proxy = withPasswordProtect({ protectAll: true, blockOnly: true });

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
`;

/**
 * Walk up from startDir to find a directory containing package.json with a next dependency.
 */
export function findNextProjectRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  for (let i = 0; i < 20; i++) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps && (deps.next || deps['next'])) return dir;
      } catch {
        // ignore parse errors
      }
    }
    const parent = resolve(dir, '..');
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/**
 * Return path to existing middleware file if present (root or src/middleware.ts|.js).
 */
export function findMiddlewarePath(root: string): string | null {
  const atRoot = join(root, 'middleware.ts');
  if (existsSync(atRoot)) return atRoot;
  if (existsSync(join(root, 'middleware.js')))
    return join(root, 'middleware.js');
  const atSrc = join(root, 'src', 'middleware.ts');
  if (existsSync(atSrc)) return atSrc;
  if (existsSync(join(root, 'src', 'middleware.js')))
    return join(root, 'src', 'middleware.js');
  return null;
}

/**
 * Path where middleware should be written: src/middleware.ts if src/app or src/pages exists, else root middleware.ts.
 */
export function getMiddlewareWritePath(root: string): string {
  const hasSrcApp =
    existsSync(join(root, 'src', 'app')) ||
    existsSync(join(root, 'src', 'pages'));
  return hasSrcApp
    ? join(root, 'src', 'middleware.ts')
    : join(root, 'middleware.ts');
}

/**
 * Generate middleware file content for the given options.
 */
export function generateMiddlewareContent(opts: {
  block?: boolean;
  paths?: string[];
}): string {
  if (opts.block) return MATCHER_BLOCK_SNIPPET.trim();
  if (opts.paths && opts.paths.length > 0) {
    const pathList = opts.paths
      .map((p) => `'${p.startsWith('/') ? p : '/' + p}'`)
      .join(', ');
    const matcherList = opts.paths
      .map((p) => `'${p.startsWith('/') ? p : '/' + p}/:path*'`)
      .join(', ');
    return `import { withPasswordProtect } from '${PACKAGE_IMPORT}';

export default withPasswordProtect({
  paths: [${pathList}],
});

export const config = {
  matcher: [${matcherList}],
};
`;
  }
  return MATCHER_SNIPPET.trim();
}

/**
 * Generate proxy.ts file content for the given options (Next 16+).
 */
export function generateProxyContent(opts: {
  block?: boolean;
  paths?: string[];
}): string {
  if (opts.block) return PROXY_BLOCK_SNIPPET.trim();
  if (opts.paths && opts.paths.length > 0) {
    const pathList = opts.paths
      .map((p) => `'${p.startsWith('/') ? p : '/' + p}'`)
      .join(', ');
    const matcherList = opts.paths
      .map((p) => `'${p.startsWith('/') ? p : '/' + p}/:path*'`)
      .join(', ');
    return `import { withPasswordProtect } from '${PACKAGE_IMPORT}';

export const proxy = withPasswordProtect({
  paths: [${pathList}],
});

export const config = {
  matcher: [${matcherList}],
};
`;
  }
  return PROXY_SNIPPET.trim();
}

/**
 * Return path to existing proxy file if present (root or src/proxy.ts|.js).
 */
export function findProxyPath(root: string): string | null {
  const atRoot = join(root, 'proxy.ts');
  if (existsSync(atRoot)) return atRoot;
  if (existsSync(join(root, 'proxy.js'))) return join(root, 'proxy.js');
  const atSrc = join(root, 'src', 'proxy.ts');
  if (existsSync(atSrc)) return atSrc;
  if (existsSync(join(root, 'src', 'proxy.js')))
    return join(root, 'src', 'proxy.js');
  return null;
}

/**
 * Path where proxy should be written: src/proxy.ts if src/app or src/pages exists, else root proxy.ts.
 */
export function getProxyWritePath(root: string): string {
  const hasSrcApp =
    existsSync(join(root, 'src', 'app')) ||
    existsSync(join(root, 'src', 'pages'));
  return hasSrcApp
    ? join(root, 'src', 'proxy.ts')
    : join(root, 'proxy.ts');
}

function contentHasPassfort(content: string): boolean {
  return (
    content.includes('withPasswordProtect') ||
    content.includes('@tommyvez/passfort/next') ||
    content.includes('passfort/next')
  );
}

export type InitResult =
  | { ok: true; path: string }
  | {
      ok: false;
      reason:
        | 'not_next'
        | 'middleware_exists'
        | 'proxy_exists'
        | 'already_set_up';
      path?: string;
    };

/**
 * Run init: find Next.js root, ensure no conflicting middleware/proxy, write file.
 * When useProxy is true, creates proxy.ts (Next 16+); otherwise middleware.ts.
 */
export function runInit(options: {
  startDir: string;
  block?: boolean;
  paths?: string[];
  useProxy?: boolean;
}): InitResult {
  const { startDir, block, paths, useProxy } = options;
  const root = findNextProjectRoot(startDir);
  if (!root) return { ok: false, reason: 'not_next' };

  if (useProxy) {
    const existingPath = findProxyPath(root);
    if (existingPath) {
      const content = readFileSync(existingPath, 'utf-8');
      if (contentHasPassfort(content)) {
        return { ok: false, reason: 'already_set_up', path: existingPath };
      }
      return { ok: false, reason: 'proxy_exists', path: existingPath };
    }
    const outPath = getProxyWritePath(root);
    const content = generateProxyContent({ block, paths });
    writeFileSync(outPath, content + '\n', 'utf-8');
    return { ok: true, path: outPath };
  }

  const existingPath = findMiddlewarePath(root);
  if (existingPath) {
    const content = readFileSync(existingPath, 'utf-8');
    if (contentHasPassfort(content)) {
      return { ok: false, reason: 'already_set_up', path: existingPath };
    }
    return { ok: false, reason: 'middleware_exists', path: existingPath };
  }

  const outPath = getMiddlewareWritePath(root);
  const content = generateMiddlewareContent({ block, paths });
  writeFileSync(outPath, content + '\n', 'utf-8');
  return { ok: true, path: outPath };
}
