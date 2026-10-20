import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
  resolve: {
    // Let tests import the TS sources despite the .js specifiers used for the CJS build.
    extensions: ['.ts', '.js', '.json'],
  },
});
