---
phase: 38-fifo-inventur
verified: 2026-04-09T00:00:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 38: FIFO-Inventur Verification Report

**Phase Goal:** Der Inventur-Report berechnet den Bestandswert auf Basis exakter historischer EK-Preise pro Wareneingang nach FIFO

**Verified:** 2026-04-09
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
|-----|-------|--------|----------|
| 1 | GET /api/reports/inventory liefert FIFO-basierten Bestandswert pro Artikel | ✓ VERIFIED | Handler ruft `computeFifoInventory()` auf, Response enthält `stock_value_cents` für jeden Article |
| 2 | Pro Artikel wird ein Array remaining_lots mit quantity/ek_cents/moved_at zurückgegeben | ✓ VERIFIED | `FifoLot` Interface definiert, Server gibt `remaining_lots` pro Item, Client empfängt und renderiert |
| 3 | total_stock_value_cents basiert auf FIFO-Chargen, nicht auf aktuellem EK × Bestand | ✓ VERIFIED | `totalStockValueCents = items.reduce((s, i) => s + i.stock_value_cents, 0)` — Summe FIFO-basierter Werte |
| 4 | Artikel ohne EK-Daten in stock_movements fallen auf aktuellen Produkt-EK als Fallback zurück | ✓ VERIFIED | Fallback-Logik auf Zeile 302-304: `if (lotQueue.length === 0 && currentStock > 0) { lotQueue.push(...) }` |
| 5 | InventurTab.tsx zeigt pro Artikel aufklappbare Chargen-Zeilen (z.B. 3x à 1,20 EUR) | ✓ VERIFIED | Zeilen 189-244: `hasLots` Logik, aufklappbare Chargen-Zeilen sortiert nach `moved_at DESC` mit Datum |
| 6 | Hinweis-Text am Tabellenende zeigt 'nach FIFO' statt 'Annäherung' | ✓ VERIFIED | Zeile 313: "Bestandswert nach FIFO — verbleibende Wareneingänge zu historischen EK-Preisen" |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/src/routes/reports.ts` | FIFO-Hilfsfunktion `computeFifoInventory` + aktualisierter /reports/inventory Endpoint | ✓ VERIFIED | Funktion definiert Zeile 38-354, berechnet FIFO-Chargen in TypeScript, wird von 4 Handlern aufgerufen |
| `client/src/features/admin/reports/InventurTab.tsx` | Chargen-Anzeige mit `remaining_lots` Interface + Aufklappung | ✓ VERIFIED | `FifoLot` Interface Zeile 17-21, `remaining_lots` Feld in `InventoryItem` Zeile 35, Rendering Zeile 233-244 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Client (InventurTab.tsx) | `/api/reports/inventory` | `authFetch()` useEffect | ✓ WIRED | Zeile 62: `authFetch(/api/reports/inventory?year=${year})`, Response in State geschrieben |
| Server `/reports/inventory` Handler | `computeFifoInventory()` | Direct async call | ✓ WIRED | Zeile 515: `const result = await computeFifoInventory(shopId, y)` |
| `computeFifoInventory()` | stock_movements table | SQL query | ✓ WIRED | Zeile 88-93: `SELECT...FROM stock_movements WHERE shop_id = ${shopId}` |
| CSV/XLSX/PDF Handlers | `computeFifoInventory()` | Direct async call | ✓ WIRED | CSV Zeile 606, XLSX Zeile 665, PDF Zeile 853: alle rufen `await computeFifoInventory()` auf |

### Requirements Coverage

| Requirement | Phase | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| INVENT-01 | Phase 38 | Bestandswert wird auf Basis exakter EK-Preise pro Wareneingang berechnet (nicht aktueller EK × Bestand) | ✓ SATISFIED | `stockValueCents = remainingLots.reduce((s, l) => s + l.ek_cents * l.quantity, 0)` Zeile 315 |
| INVENT-02 | Phase 38 | Inventur-Report zeigt pro Artikel transparent auf, welche Mengen zu welchem EK im Bestand liegen | ✓ SATISFIED | Client zeigt aufklappbare Chargen-Zeilen: `{lot.quantity}x à {formatEur(lot.ek_cents)}` mit Eingangsdatum |
| INVENT-03 | Phase 38 | Verkäufe reduzieren Wareneingänge nach FIFO (älteste zuerst) | ✓ SATISFIED | FIFO-Logik Zeile 278-290: bei `type === 'sale'` wird `lotQueue[0]` (älteste Charge) zuerst verbraucht |

### Anti-Patterns Found

None — alle Funktionen implementiert, keine Platzhalter oder TODOs gefunden.

### Behavioral Spot-Checks

N/A — Phase produziert keine lauffähigen CLI-Tools oder APIs, die ohne Server getestet werden können. API-Endpoints erfordern Database-Verbindung und Session-Auth.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `/reports/inventory` Handler | `items` array | `computeFifoInventory()` | Yes — iterates through DB results | ✓ FLOWING |
| `computeFifoInventory()` | `inventoryResult` | SQL query auf `products` table | Yes — JOINs sales data | ✓ FLOWING |
| `computeFifoInventory()` | `movementsResult` | SQL query auf `stock_movements` table | Yes — loaded for FIFO calculation | ✓ FLOWING |
| InventurTab.tsx | `inventoryData` state | API response `/api/reports/inventory` | Yes — contains items array | ✓ FLOWING |

---

## Implementation Details

### Phase 38-01: FIFO-Inventur-Kern

**computeFifoInventory Function (server/src/routes/reports.ts, Zeile 38-354)**

- **Queries:** 5 SQL queries laden Produkte, Movements, Preisänderungen, Sales-Details, und Wareneingänge
- **FIFO-Algorithmus in TypeScript (nicht SQL):**
  - Gruppiert Movements nach Produkt-ID
  - Builds Lot-Queue: `restock` + `adjustment (quantity > 0)` mit `purchase_price_cents` erzeugen neue Chargen
  - `sale` + `adjustment (quantity < 0)` verbrauchen älteste Chargen FIFO
  - `return` addiert zur neuesten Charge oder erzeugt neue
- **Fallback:** Produkte ohne Chargen mit `purchase_price_cents` → `[{ ek_cents: current_ek_cents, quantity: current_stock, moved_at: 0 }]`
- **Output:**
  - `items`: Array mit `stock_value_cents` und `remaining_lots` pro Artikel
  - `total_stock_value_cents`: Summe aller FIFO-basierten Bestandswerte
  - `total_purchased_cents`: Summe aller Wareneingänge im Jahr

**Handler Updates:**
- `/reports/inventory` (Zeile 506-522): Wrapper um `computeFifoInventory()`, sendet `items + total_stock_value_cents + total_purchased_cents`
- `/reports/inventory-csv` (Zeile 597-653): nutzt `computeFifoInventory()`, Spalte 9 = `item.stock_value_cents / 100`
- `/reports/inventory-xlsx` (Zeile 656-706): nutzt `computeFifoInventory()`, XLSX-Zelle für Bestandswert = `item.stock_value_cents / 100`
- `/reports/inventory-pdf` (Zeile 844+): nutzt `computeFifoInventory()`, Bilanz-Label aktualisiert auf "Bestandswert (FIFO)"

### Phase 38-02: Inventur-Exports auf FIFO umstellen

**Refactoring:** Alle 3 Export-Handler (CSV, XLSX, PDF) nutzen jetzt `computeFifoInventory()` statt eigener duplizierter DB-Abfragen.

**Bestandswert-Berechnung in allen Exports:**
- CSV Zeile 639: `item.stock_value_cents / 100`
- XLSX Zeile 686: `item.stock_value_cents / 100`
- PDF: Zeile 928 Label-Update auf "Bestandswert (FIFO)"

**isNaN-Checks:** Alle 3 Export-Handler validieren `year` Parameter mit `if (isNaN(y))` (Zeile 604, 663, 851)

### Client Side: InventurTab.tsx (Zeile 1-381)

**Interfaces:**
- `FifoLot`: `{ ek_cents, quantity, moved_at }`
- `InventoryItem` erweitert um: `stock_value_cents` + `remaining_lots: FifoLot[]`

**Rendering:**
- Bestandswert-Spalte (Zeile 231): `formatEur(item.stock_value_cents)`
- `hasLots` Logik (Zeile 189): zeigt sich bei mehreren Chargen oder abweichendem EK
- Aufklappbare Chargen-Zeilen (Zeile 233-244): sortiert nach `moved_at DESC`, zeigt Datum
- Hinweis-Text (Zeile 313): "nach FIFO — verbleibende Wareneingänge zu historischen EK-Preisen"

---

## Verification Checklist

- [x] `computeFifoInventory` Funktion existiert und ist implementiert (nicht Stub)
- [x] Funktion wird von 4 Handlers aufgerufen (1x /inventory, 3x Exports)
- [x] FIFO-Algorithmus in TypeScript: Lot-Queue, FIFO-Verbrauch, Fallback
- [x] Server antwortet mit `remaining_lots` Array pro Artikel
- [x] Server antwortet mit `stock_value_cents` (FIFO-basiert)
- [x] Server antwortet mit `total_stock_value_cents` (Summe FIFO-Werte)
- [x] Client Interface enthält `FifoLot` + `remaining_lots` + `stock_value_cents`
- [x] Client rendert aufklappbare Chargen-Zeilen mit Menge, EK, Datum
- [x] Client zeigt Bestandswert-Spalte als `stock_value_cents`
- [x] CSV/XLSX/PDF Exports nutzen `stock_value_cents`
- [x] Hinweis-Text sagt "nach FIFO", nicht "Annäherung"
- [x] Alte Bestandswert-Berechnung (`current_stock * current_ek_cents`) entfernt
- [x] Alle 4 Handler validieren year-Parameter mit isNaN-Check
- [x] Keine SQL-Duplikate in Export-Handlern
- [x] Requirements INVENT-01, INVENT-02, INVENT-03 erfüllt

---

## Summary

Phase 38 implementiert vollständig die FIFO-basierte Inventurbewertung. Die `computeFifoInventory`-Hilfsfunktion berechnet verbleibende Wareneingangchargen pro Artikel nach FIFO-Algorithmus in TypeScript und gibt historisch korrekte Bestandswerte zurück. Der Client zeigt diese Chargen transparent auf (aufklappbar pro Artikel). Alle Inventur-Endpoints (UI + 3 Exports) nutzen dieselbe Quelle — Konsistenz erreicht.

**Goal Status: ACHIEVED** — Bestandswert basiert auf exakten EK-Preisen pro Wareneingang nach FIFO, nicht auf aktuellem EK × Bestand.

---

*Verified: 2026-04-09*
*Verifier: Claude (gsd-verifier)*
