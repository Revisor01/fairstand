---
phase: 38-fifo-inventur
plan: "01"
subsystem: reports
tags: [fifo, inventory, backend, frontend]
dependency_graph:
  requires: [phase-37-ek-wareneingaenge]
  provides: [fifo-inventory-endpoint, fifo-inventory-ui]
  affects: [reports.ts, InventurTab.tsx]
tech_stack:
  added: []
  patterns: [fifo-queue-typescript, lot-based-inventory]
key_files:
  created: []
  modified:
    - server/src/routes/reports.ts
    - client/src/features/admin/reports/InventurTab.tsx
decisions:
  - FIFO in TypeScript (nicht SQL) — Lot-Queue flexibler und einfacher zu debuggen als SQL-Window-Functions
  - Fallback auf current_ek_cents x current_stock wenn keine stock_movements mit purchase_price_cents vorhanden
  - isNaN-Check für year Query-Param ergänzt (T-38-01 Threat-Mitigation)
metrics:
  duration_minutes: 15
  completed_date: "2026-04-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 38 Plan 01: FIFO-Inventur-Kern Summary

FIFO-Inventurberechnung: `computeFifoInventory` berechnet verbleibende Wareneingangchargen pro Artikel nach FIFO-Algorithmus in TypeScript und gibt historisch korrekte Bestandswerte sowie aufklappbare Chargen-Zeilen im InventurTab zurück.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | FIFO-Hilfsfunktion + /reports/inventory aktualisieren | 294ef35 | server/src/routes/reports.ts |
| 2 | InventurTab.tsx mit Chargen-Anzeige aktualisieren | db12b77 | client/src/features/admin/reports/InventurTab.tsx |

## What Was Built

### computeFifoInventory (server/src/routes/reports.ts)

Eine neue async-Hilfsfunktion vor `reportRoutes`, die den vollständigen FIFO-Inventuralgorithmus implementiert:

- Lädt alle `stock_movements` für den Shop (alle Zeiten, sortiert nach `moved_at ASC`)
- Pro Produkt wird eine Lot-Queue aufgebaut: `restock` und `adjustment` mit `purchase_price_cents` erzeugen neue Chargen, `sale`/`adjustment` mit negativer Menge verbrauchen älteste Chargen (FIFO), `return` addiert zur neuesten Charge
- Fallback: kein Charge mit EK-Daten → `[{ ek_cents: current_ek_cents, quantity: current_stock, moved_at: 0 }]`
- `stock_value_cents` pro Artikel = Summe aller verbleibenden Chargen × EK
- `total_stock_value_cents` = Summe aller `stock_value_cents`
- `total_purchased_cents` wird jetzt aus `stock_movements` mit `purchase_price_cents` berechnet (statt aus Preisperioden)
- Preisperioden-Logik bleibt vollständig erhalten

Der `/reports/inventory` Handler ist jetzt ein schlanker Wrapper:
```typescript
const result = await computeFifoInventory(shopId, y);
return reply.send({ year: y, items: result.items, ... });
```

### InventurTab.tsx

- Neues `FifoLot` Interface + `stock_value_cents` und `remaining_lots` Felder in `InventoryItem`
- Bestandswert-Spalte: `formatEur(item.stock_value_cents)` statt `current_stock * current_ek_cents`
- `hasLots` Logik: aufklappbar wenn mehrere Chargen oder eine Charge mit abweichendem EK
- Chargen-Zeilen (sortiert nach `moved_at DESC`): `Nx à X,XX EUR (Eingang: TT.MM.JJ)`
- Chargen-Zeilen erscheinen VOR den Perioden-Zeilen
- Hinweis-Text: "Bestandswert nach FIFO — verbleibende Wareneingänge zu historischen EK-Preisen"

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — alle Felder sind vollständig verdrahtet.

## Threat Flags

Keine neuen Security-relevanten Surfaces eingeführt. T-38-01 (year Query-Param isNaN-Check) wurde als Rule-2-Mitigation inline ergänzt.

## Self-Check: PASSED

- server/src/routes/reports.ts: vorhanden
- client/src/features/admin/reports/InventurTab.tsx: vorhanden
- Commit 294ef35: vorhanden
- Commit db12b77: vorhanden
