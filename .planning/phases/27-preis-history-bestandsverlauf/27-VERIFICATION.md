---
phase: 27-preis-history-bestandsverlauf
verified: 2026-04-01T18:40:00Z
status: passed
score: 6/6 must-haves verified
---

# Phase 27: Preis-History & Bestandsverlauf Verification Report

**Phase Goal:** Jede EK/VK-Änderung und jede Bestandsbewegung wird lückenlos in der Datenbank protokolliert — das Fundament für alle Auswertungen in Phase 28

**Verified:** 2026-04-01T18:40:00Z  
**Status:** PASSED — Alle Must-Haves verifiziert, Phase-Goal vollständig erreicht

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Tabelle `price_histories` existiert mit Spalten id, shop_id, product_id, field, old_value, new_value, changed_at | ✓ VERIFIED | `server/src/db/schema.ts` Zeilen 70-78: Export mit allen 7 Spalten |
| 2 | Tabelle `stock_movements` existiert mit Spalten id, shop_id, product_id, type, quantity, reference_sale_id, reason, moved_at | ✓ VERIFIED | `server/src/db/schema.ts` Zeilen 80-89: Export mit allen 8 Spalten |
| 3 | Migration SQL-Datei existiert und kann via `npm run migrate` angewendet werden | ✓ VERIFIED | `server/migrations/0005_add_price_history_and_stock_movements.sql` mit CREATE TABLE Statements |
| 4 | POST /products loggt EK/VK-Änderungen automatisch in price_histories (nur bei existierenden Produkten, nur bei Änderung) | ✓ VERIFIED | `server/src/routes/products.ts` Zeilen 63-92: db.transaction mit SELECT existing + bedingtem INSERT |
| 5 | DELETE /sales/:id loggt Hard-Delete-Restock mit type='hard_delete' in stock_movements (nur wenn nicht storniert) | ✓ VERIFIED | `server/src/routes/sales.ts` Zeilen 68-86: stockMovements INSERT innerhalb `if (!sale.cancelledAt)` Block |
| 6 | sync.ts loggt Bestandsbewegungen für alle 4 Operationen (SALE_COMPLETE, STOCK_ADJUST, SALE_CANCEL, ITEM_RETURN) mit entry.createdAt als Zeitstempel | ✓ VERIFIED | `server/src/routes/sync.ts`: 4× stockMovements INSERT mit type='sale', 'adjustment', 'return' und `movedAt: entry.createdAt` |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/src/db/schema.ts` | priceHistories + stockMovements Definitionen | ✓ VERIFIED | Lines 70-89: Beide Tabellen mit vollständigem Schema exportiert |
| `server/migrations/0005_add_price_history_and_stock_movements.sql` | CREATE TABLE SQL für beide Tabellen | ✓ VERIFIED | 20 Zeilen: priceHistories (Lines 1-9) und stockMovements (Lines 11-20) |
| `server/src/routes/products.ts` | POST /products mit priceHistories Logging | ✓ VERIFIED | Lines 63-92: db.transaction mit bedingtem Logging für purchasePrice + salePrice |
| `server/src/routes/sales.ts` | DELETE /sales mit stockMovements hard_delete Logging | ✓ VERIFIED | Lines 66-91: Restock-Loop loggt jede Bewegung mit type='hard_delete' |
| `server/src/routes/sync.ts` | stock_movements Logging in allen 4 Operationen | ✓ VERIFIED | 4× INSERT (SALE_COMPLETE Zeile 125-132, STOCK_ADJUST Zeile 166-172, SALE_CANCEL Zeile 208-214, ITEM_RETURN Zeile 248-254) |
| `server/src/routes/priceHistory.ts` | GET /products/:id/price-history + GET /products/:id/stock-movements | ✓ VERIFIED | Lines 8-26 und 32-52: Beide Endpoints mit ShopId-Ownership-Check und desc() Sortierung |
| `server/src/index.ts` | priceHistoryRoutes registriert | ✓ VERIFIED | Line 17 (import) und Line 80 (register) |

**All artifacts:** VERIFIED

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `schema.ts` priceHistories | `products.ts` POST Handler | `import { priceHistories }` | ✓ WIRED | Line 5: Import vorhanden; Line 73, 83: INSERT-Calls |
| `schema.ts` stockMovements | `sales.ts` DELETE Handler | `import { stockMovements }` | ✓ WIRED | Line 4: Import vorhanden; Line 76: INSERT-Call |
| `schema.ts` stockMovements | `sync.ts` Handlers | `import { stockMovements }` | ✓ WIRED | Line 5: Import vorhanden; 4× INSERT-Calls (Zeilen 125, 166, 208, 248) |
| `schema.ts` priceHistories, stockMovements | `priceHistory.ts` GET Endpoints | `import { priceHistories, stockMovements }` | ✓ WIRED | Line 4: Import vorhanden; Line 24, 48: SELECT-Calls |
| `priceHistory.ts` | `index.ts` Route-Registrierung | `fastify.register(priceHistoryRoutes)` | ✓ WIRED | Line 17 (import), Line 80 (register) |

**All key links:** VERIFIED

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `products.ts` POST Handler | `existing.purchasePrice`, `existing.salePrice` | `tx.select().from(products)` | DB Query mit WHERE filter | ✓ FLOWING |
| `sales.ts` DELETE Handler | `item.productId`, `sale.id` | Function parameters + DB lookup | Real product/sale references | ✓ FLOWING |
| `sync.ts` SALE_COMPLETE | `item.productId`, `sale.id`, `entry.shopId` | DB lookup + input payload | Real transaction data | ✓ FLOWING |
| `sync.ts` STOCK_ADJUST | `adj.productId`, `adj.delta`, `entry.shopId` | Validated payload | Real adjustment values from client | ✓ FLOWING |
| `sync.ts` SALE_CANCEL | `item.productId`, `cancel.saleId` | DB lookup + input | Real sale reference | ✓ FLOWING |
| `sync.ts` ITEM_RETURN | `ret.productId`, `ret.saleId`, `ret.quantity` | Validated payload | Real return values | ✓ FLOWING |
| `priceHistory.ts` GET /price-history | `priceHistories.*` | `db.select().from(priceHistories).where(eq(...))` | DB Query mit productId filter | ✓ FLOWING |
| `priceHistory.ts` GET /stock-movements | `stockMovements.*` | `db.select().from(stockMovements).where(eq(...))` | DB Query mit productId filter | ✓ FLOWING |

**Data-flow assessment:** Alle Komponenten beziehen ihre Daten aus realen Quellen (DB Queries, validierte Payloads) — KEINE Hardcoded-Werte oder Static-Returns.

### Code Quality Checks

**Anti-Patterns Scan:**

| File | Pattern Search | Result | Status |
|------|---|---|---|
| products.ts, sales.ts, sync.ts, priceHistory.ts | TODO/FIXME/placeholder/PLACEHOLDER | Keine Treffer | ✓ CLEAN |
| priceHistory.ts | `return null`, `return {}`, `return []` | Keine Treffer | ✓ CLEAN |
| sync.ts | `entry.createdAt` in movedAt-Feldern | 4 Treffer | ✓ CORRECT (nicht Date.now()) |
| priceHistory.ts | Ownership-Check via shopId | 2× `product.shopId !== session.shopId` Check | ✓ VERIFIED |

**TypeScript Compilation:**

```
cd /Users/simonluthe/Documents/fairstand/server && npx tsc --noEmit
→ 0 Fehler
```

✓ PASSED

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| **PRICE-01** | 27-01, 27-02 | Jede EK/VK-Änderung wird automatisch in einer price_history-Tabelle geloggt | ✓ SATISFIED | `priceHistories` Tabelle (27-01), POST /products loggt (27-02) |
| **INV-04** | 27-01, 27-02, 27-03 | User kann pro Artikel ein Stock-Movement-Journal einsehen | ✓ SATISFIED | `stockMovements` Tabelle (27-01), Hard-Delete Logging (27-02), sync Logging + GET Endpoint (27-03) |

**Requirements mapping (REQUIREMENTS.md):**
- PRICE-01: ✓ Marked as Complete in Phase 27
- INV-04: ✓ Marked as Complete in Phase 27

---

## Implementation Summary

### Three-Plan Structure

Phase 27 wurde in drei zusammenhängenden Plänen umgesetzt:

**Plan 27-01: Schema-Erweiterung (Database Layer)**
- Zwei neue Audit-Tabellen in Drizzle-Schema definiert
- PostgreSQL Migration 0005 generiert und deployed
- Fundament für alle nachfolgenden Logging-Implementierungen

**Plan 27-02: App-Layer Audit-Logging (Route Handlers)**
- POST /products mit Price-Change-Detection und tx.insert(priceHistories)
- DELETE /sales/:id mit Hard-Delete-Restock und tx.insert(stockMovements)
- Beide atomar per db.transaction

**Plan 27-03: Sync-Logging + History-Endpoints**
- sync.ts um 4× stockMovements Logging ergänzt (SALE_COMPLETE, STOCK_ADJUST, SALE_CANCEL, ITEM_RETURN)
- Neue Route `priceHistory.ts` mit zwei GET-Endpoints
- Beide Endpoints mit ShopId-Ownership-Checks

### Critical Design Decisions Verified

1. **Price History Logging nur bei existierenden Produkten** ✓
   - Neues Produkt = keinen "alten Preis" → kein Log-Eintrag
   - Verifiziert in products.ts Zeile 71: `if (existing) { ... }`

2. **Hard-Delete nur für nicht-stornierte Sales** ✓
   - Stornierte Sales haben keine Restock-Bewegung (bereits rückgebucht)
   - Verifiziert in sales.ts Zeile 68: `if (!sale.cancelledAt) { ... }`

3. **Korrekte Zeitstempel (entry.createdAt statt Date.now())** ✓
   - Offline-Operationen müssen ihren ursprünglichen Zeitpunkt behalten
   - sync.ts: 4 Vorkommen mit Kommentar `// entry.createdAt, nicht Date.now()`
   - Verifiziert in Zeilen 131, 172, 214, 254

4. **ShopId-Ownership-Check in Endpoints** ✓
   - Verhindert Cross-Shop-Daten-Lecks über bekannte Produkt-IDs
   - priceHistory.ts: Beide Endpoints führen products-Lookup durch vor Datenzugriff

### Test Coverage

Keine Unit-Tests in den Plänen vorgesehen (fokussiert auf Schema + API-Integration). Folgende Szenarien sind durch die Implementierung abgedeckt:

| Szenario | Implementation | Verifikation |
|----------|---|---|
| Produkt wird zum ersten Mal angelegt | POST /products mit new product | `if (existing)` prüft auf null |
| Preis wird geändert (existing product) | POST /products mit existierendem ID + neuer price | `insert(priceHistories)` mit oldValue vs newValue |
| Hard-Delete von nicht-stornierten Sale | DELETE /sales/:id mit !sale.cancelledAt | `insert(stockMovements)` mit type='hard_delete' |
| Hard-Delete von stornierten Sale | DELETE /sales/:id mit sale.cancelledAt | INSERT skipped wegen if-Bedingung |
| SALE_COMPLETE im Sync | POST /sync mit SALE_COMPLETE | `insert(stockMovements)` mit type='sale' |
| STOCK_ADJUST im Sync | POST /sync mit STOCK_ADJUST | `insert(stockMovements)` mit type='adjustment' |
| SALE_CANCEL im Sync | POST /sync mit SALE_CANCEL | `insert(stockMovements)` mit type='return' |
| ITEM_RETURN im Sync | POST /sync mit ITEM_RETURN | `insert(stockMovements)` mit type='return' |
| GET /price-history für Produkt | GET /api/products/:id/price-history | DB Query mit productId filter, desc(changedAt) sort |
| GET /stock-movements für Produkt | GET /api/products/:id/stock-movements | DB Query mit productId filter, desc(movedAt) sort |

---

## Phase Completeness Assessment

✓ **All three plans executed successfully**
- 27-01: Database Schema Extension (PASSED)
- 27-02: App-Layer Audit Logging (PASSED)
- 27-03: Sync-Logging + History Endpoints (PASSED)

✓ **All must-haves verified**
- 6/6 observable truths verified
- 7/7 artifacts verified (exist + substantive + wired)
- 5/5 key links verified (wired)
- 8/8 data-flow traces verified (real data flowing)

✓ **Requirements satisfied**
- PRICE-01: Complete (schema + logging)
- INV-04: Complete (schema + logging + endpoints)

✓ **No blockers or gaps**
- No TODO/FIXME comments
- No stub implementations
- TypeScript compiles without errors
- All imports and registrations in place

---

## Readiness for Phase 28

Phase 27 provides the complete audit infrastructure for Phase 28 (Inventur-Auswertung):

1. **Database Layer:** `price_histories` and `stock_movements` tables ready for queries
2. **API Layer:** GET /api/products/:id/price-history and GET /api/products/:id/stock-movements endpoints available
3. **Data Accuracy:** All operations logged with correct timestamps and ownership checks
4. **Requirements:** PRICE-01 and INV-04 fully satisfied

Phase 28 can proceed immediately with report generation and aggregation queries against these audit tables.

---

*Verified: 2026-04-01T18:40:00Z*  
*Verifier: Claude (gsd-verifier)*
