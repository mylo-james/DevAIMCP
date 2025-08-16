import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['seed/**/*', 'node_modules/**/*', 'dist/**/*'],
    environment: 'node',
    globals: true,
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'seed/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        'coverage/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
