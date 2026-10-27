import { describe, expect, it } from 'vitest';
import { SaleSchema, StockAdjustSchema, SyncBatchSchema } from './sync.js';

// Ausgelieferte Kassen schicken ihre Warteschlange in genau dieser Form;
// die Validierung darf sie nach einem Update der Bibliothek nicht anders bewerten.
const sale = {
  id: 'sale-1',
  shopId: 'st-clemens',
  items: [
    { productId: 'p1', articleNumber: 'A-1', name: 'Kaffee', salePrice: 650, purchasePrice: 400, quantity: 2 },
  ],
  totalCents: 1300,
  paidCents: 2000,
  changeCents: 700,
  donationCents: 0,
  createdAt: 1_793_000_000_000,
};

describe('Sync-Validierung', () => {
  it('nimmt einen gültigen Stapel an und lässt Zusatzfelder weg', () => {
    const result = SyncBatchSchema.safeParse({
      entries: [{ operation: 'SALE_COMPLETE', payload: sale, shopId: 'st-clemens', createdAt: 1_793_000_000_000, extra: 1 }],
    });
    expect(result.success).toBe(true);
    expect(result.data?.entries[0]).toEqual({
      operation: 'SALE_COMPLETE',
      payload: sale,
      shopId: 'st-clemens',
      createdAt: 1_793_000_000_000,
    });
  });

  it('nimmt einen Verkauf ohne optionale Felder an', () => {
    const result = SaleSchema.safeParse(sale);
    expect(result.success).toBe(true);
    expect(result.data?.type).toBeUndefined();
  });

  it('lehnt Menge 0, Kommabeträge und unbekannte Operationen ab', () => {
    const zeroQty = SaleSchema.safeParse({ ...sale, items: [{ ...sale.items[0], quantity: 0 }] });
    expect(zeroQty.success).toBe(false);

    const fraction = StockAdjustSchema.safeParse({ productId: 'p1', delta: 1.5, shopId: 'st-clemens' });
    expect(fraction.success).toBe(false);

    const op = SyncBatchSchema.safeParse({
      entries: [{ operation: 'DELETE_ALL', payload: {}, shopId: 'st-clemens', createdAt: 1 }],
    });
    expect(op.success).toBe(false);
  });

  it('liefert Fehler in der Form formErrors/fieldErrors', () => {
    const result = SyncBatchSchema.safeParse({ entries: 'kein Array' });
    expect(result.success).toBe(false);
    const flat = result.error!.flatten();
    expect(Object.keys(flat).sort()).toEqual(['fieldErrors', 'formErrors']);
    expect(flat.formErrors).toEqual([]);
    expect(Object.keys(flat.fieldErrors)).toEqual(['entries']);
    expect(flat.fieldErrors.entries).toHaveLength(1);
  });
});
