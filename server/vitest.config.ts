import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Nur die Quelltests laufen lassen — dist/ enthaelt kompilierte Kopien,
    // die sonst zusaetzlich (und veraltet) mitgetestet werden.
    include: ['src/**/*.test.ts'],
  },
});
