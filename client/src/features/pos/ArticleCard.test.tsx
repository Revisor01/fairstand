import { describe, it, expect } from 'vitest';
import type { Product } from '../../db/index.js';
import { shouldTriggerTap } from './ArticleCard.js';

// Wir testen die Tap-Logik als reine Funktion (analog zum checkStockBeforeAdd-Muster).
// Die Funktion shouldTriggerTap(start, end, stock) kapselt:
// - Threshold-Prüfung: dx < 8 && dy < 8
// - Bestand-Prüfung: stock > 0

function makeProduct(stock: number, minStock = 0): Product {
  return {
    id: 'p1',
    shopId: 'shop-1',
    articleNumber: '001',
    name: 'Test Produkt',
    category: 'Kategorie',
    purchasePrice: 100,
    salePrice: 150,
    vatRate: 7,
    stock,
    minStock,
    active: true,
    updatedAt: Date.now(),
  };
}

describe('shouldTriggerTap', () => {
  it('Test 1: gibt true zurück wenn Bewegung 0px (direkt antippen)', () => {
    const product = makeProduct(5);
    const result = shouldTriggerTap({ x: 100, y: 200 }, { x: 100, y: 200 }, product.stock);
    expect(result).toBe(true);
  });

  it('Test 2: gibt true zurück wenn Bewegung 7px (unter Threshold)', () => {
    const product = makeProduct(5);
    const result = shouldTriggerTap({ x: 0, y: 0 }, { x: 7, y: 0 }, product.stock);
    expect(result).toBe(true);
  });

  it('Test 3: gibt false zurück wenn Bewegung > 8px (Scroll-Geste)', () => {
    const product = makeProduct(5);
    const result = shouldTriggerTap({ x: 0, y: 0 }, { x: 0, y: 9 }, product.stock);
    expect(result).toBe(false);
  });

  it('Test 4: gibt false zurück wenn stock <= 0 auch bei 0px Bewegung', () => {
    const product = makeProduct(0);
    const result = shouldTriggerTap({ x: 50, y: 50 }, { x: 50, y: 50 }, product.stock);
    expect(result).toBe(false);
  });

  it('Test 5: gibt false zurück wenn genau 8px Bewegung (an der Grenze, nicht unter)', () => {
    // Threshold ist strict < 8, also 8px soll NICHT triggern
    const result = shouldTriggerTap({ x: 0, y: 0 }, { x: 8, y: 0 }, 5);
    expect(result).toBe(false);
  });
});
