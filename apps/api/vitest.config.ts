import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [swc.vite()],
  resolve: { alias: { '@cg/shared': resolve(__dirname, '../../packages/shared/src/index.ts') }, extensions: ['.ts', '.js', '.json'] },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    pool: 'forks',
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
