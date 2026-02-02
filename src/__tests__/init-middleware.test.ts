/**
 * Unit tests for init-middleware (passfort init).
 * AAA pattern; real fs in temp dir to avoid mocking.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  findNextProjectRoot,
  findMiddlewarePath,
  getMiddlewareWritePath,
  generateMiddlewareContent,
  runInit,
  MATCHER_SNIPPET,
  MATCHER_BLOCK_SNIPPET,
} from '../init-middleware.js';
import {
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
  rmSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('init-middleware', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'passfort-init-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('findNextProjectRoot', () => {
    it('returns null when no package.json in start dir', () => {
      expect(findNextProjectRoot(tmpDir)).toBeNull();
    });

    it('returns null when package.json has no next dependency', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'app', dependencies: {} })
      );
      expect(findNextProjectRoot(tmpDir)).toBeNull();
    });

    it('returns root when package.json has next in dependencies', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'app', dependencies: { next: '14.0.0' } })
      );
      expect(findNextProjectRoot(tmpDir)).toBe(tmpDir);
    });

    it('returns root when package.json has next in devDependencies', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'app', devDependencies: { next: '14.0.0' } })
      );
      expect(findNextProjectRoot(tmpDir)).toBe(tmpDir);
    });

    it('walks up to find package.json with next', () => {
      const sub = join(tmpDir, 'app', 'src');
      mkdirSync(sub, { recursive: true });
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'app', dependencies: { next: '14' } })
      );
      expect(findNextProjectRoot(sub)).toBe(tmpDir);
    });

    it('returns null when package.json is invalid JSON', () => {
      writeFileSync(join(tmpDir, 'package.json'), 'not valid json {');
      expect(findNextProjectRoot(tmpDir)).toBeNull();
    });

    it('returns null when walking up reaches root without next', () => {
      const deep = join(tmpDir, 'a', 'b', 'c');
      mkdirSync(deep, { recursive: true });
      expect(findNextProjectRoot(deep)).toBeNull();
    });
  });

  describe('findMiddlewarePath', () => {
    it('returns null when no middleware file exists', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '14' } })
      );
      expect(findMiddlewarePath(tmpDir)).toBeNull();
    });

    it('returns path to middleware.ts at root when present', () => {
      const p = join(tmpDir, 'middleware.ts');
      writeFileSync(p, 'export default function middleware() {}');
      expect(findMiddlewarePath(tmpDir)).toBe(p);
    });

    it('returns path to src/middleware.ts when present and root has none', () => {
      mkdirSync(join(tmpDir, 'src'), { recursive: true });
      const p = join(tmpDir, 'src', 'middleware.ts');
      writeFileSync(p, 'export default function middleware() {}');
      expect(findMiddlewarePath(tmpDir)).toBe(p);
    });

    it('prefers root middleware.ts over src/middleware.ts', () => {
      mkdirSync(join(tmpDir, 'src'), { recursive: true });
      writeFileSync(join(tmpDir, 'middleware.ts'), '');
      writeFileSync(join(tmpDir, 'src', 'middleware.ts'), '');
      expect(findMiddlewarePath(tmpDir)).toBe(join(tmpDir, 'middleware.ts'));
    });

    it('returns root middleware.js when only .js exists', () => {
      const p = join(tmpDir, 'middleware.js');
      writeFileSync(p, 'export default function middleware() {}');
      expect(findMiddlewarePath(tmpDir)).toBe(p);
    });

    it('returns src/middleware.js when only src/middleware.js exists', () => {
      mkdirSync(join(tmpDir, 'src'), { recursive: true });
      const p = join(tmpDir, 'src', 'middleware.js');
      writeFileSync(p, 'export default function middleware() {}');
      expect(findMiddlewarePath(tmpDir)).toBe(p);
    });
  });

  describe('getMiddlewareWritePath', () => {
    it('returns root middleware.ts when no src/app or src/pages', () => {
      expect(getMiddlewareWritePath(tmpDir)).toBe(
        join(tmpDir, 'middleware.ts')
      );
    });

    it('returns src/middleware.ts when src/app exists', () => {
      mkdirSync(join(tmpDir, 'src', 'app'), { recursive: true });
      expect(getMiddlewareWritePath(tmpDir)).toBe(
        join(tmpDir, 'src', 'middleware.ts')
      );
    });

    it('returns src/middleware.ts when src/pages exists', () => {
      mkdirSync(join(tmpDir, 'src', 'pages'), { recursive: true });
      expect(getMiddlewareWritePath(tmpDir)).toBe(
        join(tmpDir, 'src', 'middleware.ts')
      );
    });
  });

  describe('generateMiddlewareContent', () => {
    it('returns protect-all snippet when no options', () => {
      const out = generateMiddlewareContent({});
      expect(out).toContain('protectAll: true');
      expect(out).not.toContain('blockOnly');
      expect(out).toContain('withPasswordProtect');
      expect(out).toContain('matcher:');
    });

    it('returns block-only snippet when block: true', () => {
      const out = generateMiddlewareContent({ block: true });
      expect(out).toContain('blockOnly: true');
      expect(out).toContain('withPasswordProtect');
    });

    it('returns paths-based snippet when paths provided', () => {
      const out = generateMiddlewareContent({
        paths: ['/admin', '/dashboard'],
      });
      expect(out).toContain("paths: ['/admin', '/dashboard']");
      expect(out).toContain("matcher: ['/admin/:path*', '/dashboard/:path*']");
    });

    it('normalizes paths without leading slash', () => {
      const out = generateMiddlewareContent({ paths: ['admin', 'foo'] });
      expect(out).toContain("paths: ['/admin', '/foo']");
      expect(out).toContain("'/admin/:path*'");
      expect(out).toContain("'/foo/:path*'");
    });

    it('snippets are valid strings', () => {
      expect(MATCHER_SNIPPET.trim().length).toBeGreaterThan(0);
      expect(MATCHER_BLOCK_SNIPPET.trim().length).toBeGreaterThan(0);
    });
  });

  describe('runInit', () => {
    function setupNextProject(dir: string) {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'app', dependencies: { next: '14' } })
      );
    }

    it('returns not_next when not in a Next.js project', () => {
      const result = runInit({ startDir: tmpDir });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toBe('not_next');
    });

    it('creates middleware at root when no src/app', () => {
      setupNextProject(tmpDir);
      const result = runInit({ startDir: tmpDir });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.path).toBe(join(tmpDir, 'middleware.ts'));
      expect(existsSync(result.path)).toBe(true);
      const content = readFileSync(result.path, 'utf-8');
      expect(content).toContain('withPasswordProtect');
      expect(content).toContain('protectAll: true');
    });

    it('creates src/middleware.ts when src/app exists', () => {
      setupNextProject(tmpDir);
      mkdirSync(join(tmpDir, 'src', 'app'), { recursive: true });
      const result = runInit({ startDir: tmpDir });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.path).toBe(join(tmpDir, 'src', 'middleware.ts'));
      expect(existsSync(result.path)).toBe(true);
    });

    it('writes block-only content when block: true', () => {
      setupNextProject(tmpDir);
      const result = runInit({ startDir: tmpDir, block: true });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const content = readFileSync(result.path, 'utf-8');
      expect(content).toContain('blockOnly: true');
    });

    it('writes paths-based content when paths provided', () => {
      setupNextProject(tmpDir);
      const result = runInit({
        startDir: tmpDir,
        paths: ['/admin', '/preview'],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const content = readFileSync(result.path, 'utf-8');
      expect(content).toContain("paths: ['/admin', '/preview']");
      expect(content).toContain("'/admin/:path*'");
      expect(content).toContain("'/preview/:path*'");
    });

    it('returns already_set_up when middleware exists and contains passfort', () => {
      setupNextProject(tmpDir);
      const mwPath = join(tmpDir, 'middleware.ts');
      writeFileSync(
        mwPath,
        "import { withPasswordProtect } from 'passfort/next';\nexport default withPasswordProtect({});"
      );
      const result = runInit({ startDir: tmpDir });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toBe('already_set_up');
      expect(result.ok === false && result.path).toBe(mwPath);
    });

    it('returns middleware_exists when middleware exists without passfort', () => {
      setupNextProject(tmpDir);
      const mwPath = join(tmpDir, 'middleware.ts');
      writeFileSync(mwPath, 'export default function middleware() {}');
      const result = runInit({ startDir: tmpDir });
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.reason).toBe('middleware_exists');
      expect(result.ok === false && result.path).toBe(mwPath);
    });

    it('does not overwrite existing middleware', () => {
      setupNextProject(tmpDir);
      const mwPath = join(tmpDir, 'middleware.ts');
      const original =
        'export default function myMiddleware() { return null; }';
      writeFileSync(mwPath, original);
      runInit({ startDir: tmpDir });
      expect(readFileSync(mwPath, 'utf-8')).toBe(original);
    });
  });
});
