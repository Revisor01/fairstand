import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveSeedPin } from './seedPin.js';

describe('resolveSeedPin', () => {
  it('nimmt eine PIN aus 4 bis 8 Ziffern an', () => {
    expect(resolveSeedPin({ INITIAL_SHOP_PIN: '4711' })).toBe('4711');
    expect(resolveSeedPin({ INITIAL_SHOP_PIN: ' 12345678 ' })).toBe('12345678');
  });

  it('bricht ohne PIN ab', () => {
    expect(() => resolveSeedPin({})).toThrow('INITIAL_SHOP_PIN');
  });

  it('bricht bei ungültiger PIN ab', () => {
    expect(() => resolveSeedPin({ INITIAL_SHOP_PIN: '123' })).toThrow('INITIAL_SHOP_PIN');
    expect(() => resolveSeedPin({ INITIAL_SHOP_PIN: '123456789' })).toThrow('INITIAL_SHOP_PIN');
    expect(() => resolveSeedPin({ INITIAL_SHOP_PIN: 'abcd' })).toThrow('INITIAL_SHOP_PIN');
  });

  it('der Seed enthält keine fest eingetragene PIN', () => {
    const seed = readFileSync(new URL('../db/seed.ts', import.meta.url), 'utf8');
    expect(seed).not.toMatch(/SHOP_PIN\s*=\s*['"]\d+['"]/);
  });
});
