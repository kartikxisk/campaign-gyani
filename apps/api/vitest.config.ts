import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite()],
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
