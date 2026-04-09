---
phase: 37-ek-wareneingaenge-bestandsanpassung
plan: "03"
subsystem: stock-import
tags: [stock, import, restock, price-history, backend, frontend]
dependency_graph:
  requires: [37-01]
  provides: [stock-adjust-endpoint, purchaseprice-tracking]
  affects: [stock_movements, price_histories, products]
tech_stack:
  added: []
  patterns: [zod-validation, drizzle-transaction, ownership-check]
key_files:
  created: []
  modified:
    - server/src/routes/import.ts
    - client/src/features/admin/import/ImportScreen.tsx
decisions:
  - POST /stock/adjust in import.ts statt eigener Route-Datei — passt logisch zum Import-Flow
  - delta und purchasePriceCents als z.number().int().positive() — verhindert negative/null-Werte
  - price_histories-Eintrag nur bei tatsächlicher EK-Änderung — kein unnötiger Historien-Spam
metrics:
  duration: "~10 min"
  completed: "2026-04-09T10:52:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 37 Plan 03: Stock-Adjust Endpoint mit EK-Preis-Tracking Summary

**One-liner:** POST /api/stock/adjust als restock-Endpoint mit purchasePriceCents-Pflichtfeld und automatischer price_histories-Aktualisierung bei EK-Änderung.

## What Was Built

Neuer `POST /stock/adjust` Endpoint in `server/src/routes/import.ts`, der Wareneingänge als `restock`-Bewegung mit EK-Preis in `stock_movements` speichert. Bei Abweichung vom gespeicherten Produkt-EK wird automatisch ein `price_histories`-Eintrag erstellt und das Produkt aktualisiert. Der `ImportScreen` sendet jetzt `purchasePriceCents` aus der PDF-Zeile mit.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | POST /api/stock/adjust Endpoint erstellen | 52ef962 | server/src/routes/import.ts |
| 2 | ImportScreen sendet purchasePriceCents | 330ebdb | client/src/features/admin/import/ImportScreen.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Security Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-37-05 | Ownership-Check: `adjustProd.shopId !== adj.shopId` vor allen DB-Schreiboperationen |
| T-37-06 | Zod-Schema: `z.number().int().positive()` für delta |
| T-37-07 | Zod-Schema: `z.number().int().positive()` für purchasePriceCents |
| T-37-08 | Expliziter Session-shopId-Vergleich → 403 bei Abweichung |

## Known Stubs

None.

## Threat Flags

None — keine neue Angriffsfläche außer den bereits im Plan modellierten Endpoints.

## Self-Check: PASSED

- server/src/routes/import.ts: FOUND (modified)
- client/src/features/admin/import/ImportScreen.tsx: FOUND (modified)
- Commit 52ef962: FOUND
- Commit 330ebdb: FOUND
- TypeScript server: clean
- TypeScript client: clean
