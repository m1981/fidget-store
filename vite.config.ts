import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 45000,
    hookTimeout: 15000,
    include: ['src/tests/**/*.test.ts'],
    sequence: { shuffle: false },
    reporters: ['verbose']
  }
});
