import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    next: 'src/next.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  sourcemap: true,
  target: 'es2022',
  platform: 'neutral',
  external: ['fs', 'path'],
  esbuildOptions(options) {
    options.conditions = ['import'];
  },
});
