import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/examples/**', '**/dist/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'examples/**',
        'tests/**',
        'node_modules/**',
        'dist/**',
        '**/*.{test,spec}.ts',
        '**/*.d.ts',
        '**/index.ts',
        'src/types/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      clean: true,
    },
  },
});
