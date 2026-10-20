import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(__dirname, '.'), '@cg/shared': resolve(__dirname, '../../packages/shared/src/index.ts'), '@cg/ui': resolve(__dirname, '../../packages/ui/src/index.ts') }, extensions: ['.ts', '.tsx', '.js', '.json'] },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
});
