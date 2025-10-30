// vitest.config.js - Vitest configuration with Deepkit type compiler support

import { deepkitType } from '@deepkit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [deepkitType()],
    test: {
        // Set environment variable to prevent app from auto-running during tests
        env: {
            deepkit_test_mode: 'true',
        },
        // Coverage configuration matching c8 settings
        coverage: {
            provider: 'v8',
            reporter: ['lcov', 'text'],
            all: true,
            include: ['src/**/*.ts'],
            exclude: [
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/__mocks__/**',
                '**/mocks/**',
                '**/mock/**',
                '**/index.ts',
                '**/index.js',
                '**/index.mjs',
                '**/index.cjs',
            ],
            // NOTE: Coverage thresholds disabled due to Deepkit type compiler interaction with V8 coverage
            // The Deepkit plugin transforms code in a way that prevents accurate coverage tracking
            // TODO: Investigate alternative coverage solutions or Deepkit+Vitest configuration
            thresholds: {
                lines: 0,
                functions: 0,
                branches: 0,
                statements: 0,
                perFile: false,
            },
            reportsDirectory: './coverage',
            clean: true,
        },
        // Ensure proper environment for Node.js APIs
        environment: 'node',
        // Test file patterns
        // NOTE: CI tests run via scripts/run-ci-tests.js (not through Vitest)
        include: ['src/**/*.test.ts'],
        // Test timeout for slow integration tests
        testTimeout: 30000,
        // Global setup if needed
        globals: false, // Explicit imports for better IDE support
    },
});
