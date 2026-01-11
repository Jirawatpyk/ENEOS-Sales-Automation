import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        'src/__tests__',
        'src/types/**',
        '**/*.d.ts',
        'vitest.config.ts',
      ],
      // Coverage thresholds (increase as more tests are added)
      // Current: ~30% - Target: 70%+
      thresholds: {
        lines: 25,
        functions: 60,
        branches: 60,
        statements: 25,
      },
      // Fail CI if coverage drops
      reportsDirectory: './coverage',
      clean: true,
    },
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
