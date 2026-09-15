import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['lib/**/*.test.ts', 'seed/**/*.test.ts', 'app/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    pool: 'forks',
  },
});
