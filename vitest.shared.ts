import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * `.test.ts` files that use renderHook, document, or DOM APIs and require happy-dom.
 * Add paths relative to project root when a hook unit test needs DOM.
 */
export const domUnitTestTsFiles: string[] = [
  // Example: 'src/hooks/useMyHook.test.ts',
];

export const resolveAlias = {
  '@test-utils': path.resolve(repoRoot, 'src/test-utils.ts'),
  '@': path.resolve(repoRoot, './src'),
};

export const coverageConfig = {
  provider: 'v8' as const,
  reporter: ['text', 'html'],
  include: ['src/**/*.ts', 'src/**/*.tsx'],
  exclude: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.integration.test.ts',
    '**/*.integration.test.tsx',
    '**/*.spec.ts',
    '**/index.ts',
    '**/dist/**',
    '**/coverage/**',
    '**/node_modules/**',
    'src/main.tsx',
  ],
  thresholds: {
    'src/features/**/*Helpers.ts': { statements: 90, lines: 90 },
    'src/features/**/stateHelpers.ts': { statements: 90, lines: 90 },
    'src/features/**/rules.ts': { statements: 90, lines: 90 },
    'src/features/**/shared.ts': { statements: 90, lines: 90 },
    'src/features/**/deletePolicy.ts': { statements: 90, lines: 90 },
  },
};

export const sharedTestOptions = {
  pool: 'threads' as const,
  testTimeout: 10000,
  hookTimeout: 10000,
  teardownTimeout: 5000,
  globals: false,
  css: false,
  deps: {
    optimizer: {
      web: {
        include: ['react', 'react-dom', '@testing-library/react', '@testing-library/user-event'],
      },
    },
  },
};

export const unitInclude = ['src/**/*.test.ts', 'src/**/*.spec.ts'];

export const unitExclude = [
  '**/*.integration.test.ts',
  '**/*.integration.test.tsx',
  ...domUnitTestTsFiles,
];

export const domInclude = [
  'src/**/*.test.tsx',
  'src/**/*.spec.tsx',
  'src/**/*.integration.test.ts',
  'src/**/*.integration.test.tsx',
  ...domUnitTestTsFiles,
];
