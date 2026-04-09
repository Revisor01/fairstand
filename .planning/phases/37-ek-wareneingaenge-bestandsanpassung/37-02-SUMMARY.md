---
phase: 37-ek-wareneingaenge-bestandsanpassung
plan: "02"
subsystem: sync-handler, stock-adjust-ui
tags: [stock-movements, purchase-price, ek-preis, stock-adjust, modal]
dependency_graph:
  requires: [37-01]
  provides: [STOCK_ADJUST-mit-EK-Preis, StockAdjustModal-Toggle]
  affects: [server/src/routes/sync.ts, client/src/features/admin/products/StockAdjustModal.tsx, client/src/hooks/api/useProducts.ts]
tech_stack:
  added: []
  patterns: [Zod-optional-field, React-conditional-UI, purchasePriceCents-fallback]
key_files:
  created: []
  modified:
    - server/src/routes/sync.ts
    - client/src/features/admin/products/StockAdjustModal.tsx
    - client/src/hooks/api/useProducts.ts
decisions:
  - "Toggle 'Preis anpassen' erscheint nur bei positivem Delta — negative Korrekturen brauchen keinen EK"
  - "Ohne Toggle sendet Client undefined; Server nutzt Produkt-EK als Fallback (adj.purchasePriceCents ?? adjustProd.purchasePrice)"
  - "Bei delta <= 0 setzt Server purchasePriceCents = null unabhängig vom Payload (Threat T-37-04)"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_modified: 3
---

# Phase 37 Plan 02: STOCK_ADJUST EK-Preis-Erweiterung Summary

**One-liner:** STOCK_ADJUST-Fluss mit purchasePriceCents — Server-Fallback auf Produkt-EK, Toggle-UI im Modal nur bei positivem Delta.

## What Was Built

Der STOCK_ADJUST-Fluss wurde durchgängig um `purchasePriceCents` erweitert:

1. **Server (sync.ts):** `StockAdjustSchema` akzeptiert jetzt optionales `purchasePriceCents`. Bei positivem Delta wird der Wert aus dem Payload übernommen, oder der aktuelle Produkt-EK als Fallback gesetzt. Bei Delta <= 0 wird `null` gesetzt — unabhängig vom Payload (Sicherheits-Invariante T-37-04).

2. **Client Hook (useProducts.ts):** `useAdjustStock` übergibt `purchasePriceCents` im STOCK_ADJUST-Payload an den Server.

3. **Modal (StockAdjustModal.tsx):** Neuer Toggle "Preis anpassen" erscheint nur bei positivem Delta. Ohne Toggle: Server nutzt automatisch den aktuellen Produkt-EK. Mit Toggle: EK-Eingabefeld (Startwert = aktueller Produkt-EK) mit Validierung > 0.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | STOCK_ADJUST Handler um purchasePriceCents erweitern | 10505c0 | server/src/routes/sync.ts |
| 2 | StockAdjustModal + useAdjustStock mit EK-Toggle | 1a7bc3f | StockAdjustModal.tsx, useProducts.ts |

## Decisions Made

- Toggle "Preis anpassen" nur bei positivem Delta — negative Korrekturen/Abgänge brauchen keinen EK-Preis
- Server-Fallback-Logik: `adj.purchasePriceCents ?? adjustProd.purchasePrice` — kein leerer EK bei Zugängen ohne Override
- Validierung im Client: parseFloat > 0, sonst Fehlermeldung vor dem Speichern

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

Keine neuen Angriffsflächen. T-37-03 und T-37-04 aus dem Threat Register wurden wie geplant mitigiert:
- Zod validiert `purchasePriceCents` als `z.number().int().optional()`
- Server setzt bei delta <= 0 immer `null`, unabhängig vom Client-Payload

## Self-Check: PASSED

- FOUND: server/src/routes/sync.ts
- FOUND: client/src/features/admin/products/StockAdjustModal.tsx
- FOUND: client/src/hooks/api/useProducts.ts
- FOUND commit: 10505c0
- FOUND commit: 1a7bc3f
