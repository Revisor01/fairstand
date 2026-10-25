import { describe, it, expect } from 'vitest';
import type { CartItem, Product } from '../../db/index.js';

// useCart ist ein Hook; geprüft wird deshalb checkStock, das dieselbe
// Bestandsregel wie addItem anwendet.

import { checkStockBeforeAdd } from './useCart.js';

function makeProduct(id: string, stock: number): Product {
  return {
    id,
    shopId: 'shop-1',
    articleNumber: '001',
    name: 'Test Produkt',
    categories: ['Kategorie'],
    purchasePrice: 100,
    salePrice: 150,
    vatRate: 7,
    stock,
    minStock: 0,
    active: true,
    updatedAt: Date.now(),
  };
}

function makeCartItem(productId: string, quantity: number): CartItem {
  return {
    productId,
    articleNumber: '001',
    name: 'Test Produkt',
    salePrice: 150,
    quantity,
  };
}

describe('checkStockBeforeAdd', () => {
  it('gibt { added: true } zurück wenn stock > 0 und kein Artikel im Warenkorb', () => {
    const product = makeProduct('p1', 3);
    const result = checkStockBeforeAdd(product, []);
    expect(result).toEqual({ added: true });
  });

  it('gibt { added: false, reason: out_of_stock } zurück wenn stock === 0', () => {
    const product = makeProduct('p1', 0);
    const result = checkStockBeforeAdd(product, []);
    expect(result).toEqual({ added: false, reason: 'out_of_stock' });
  });

  it('gibt { added: false, reason: out_of_stock } zurück wenn inCart >= stock (gleiche Menge)', () => {
    const product = makeProduct('p1', 1);
    const cartItems = [makeCartItem('p1', 1)];
    const result = checkStockBeforeAdd(product, cartItems);
    expect(result).toEqual({ added: false, reason: 'out_of_stock' });
  });

  it('gibt { added: true } zurück wenn stock > inCart (noch Platz)', () => {
    const product = makeProduct('p1', 5);
    const cartItems = [makeCartItem('p1', 3)];
    const result = checkStockBeforeAdd(product, cartItems);
    expect(result).toEqual({ added: true });
  });

  it('gibt { added: false, reason: out_of_stock } zurück wenn inCart === stock', () => {
    const product = makeProduct('p1', 5);
    const cartItems = [makeCartItem('p1', 5)];
    const result = checkStockBeforeAdd(product, cartItems);
    expect(result).toEqual({ added: false, reason: 'out_of_stock' });
  });

  it('gibt { added: true } zurück wenn stock negativ ist nicht der Fall aber anderer Produkt im Warenkorb', () => {
    const product = makeProduct('p1', 3);
    const cartItems = [makeCartItem('p2', 10)]; // anderes Produkt
    const result = checkStockBeforeAdd(product, cartItems);
    expect(result).toEqual({ added: true });
  });
});
