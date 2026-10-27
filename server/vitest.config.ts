import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Nur Quelltests, dist/ enthält veraltete kompilierte Kopien.
    include: ['src/**/*.test.ts'],
  },
});
