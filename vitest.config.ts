import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolveAlias, sharedTestOptions } from './vitest.shared.js';

export default defineConfig({
  configLoader: 'runner',
  plugins: [react()],
  resolve: {
    alias: resolveAlias,
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    exclude: ['@solvera/pace-core', 'react-router-dom'],
  },
  test: {
    ...sharedTestOptions,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
    },
  },
});
