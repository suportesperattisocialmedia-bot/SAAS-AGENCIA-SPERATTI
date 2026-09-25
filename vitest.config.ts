import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000
  }
});
