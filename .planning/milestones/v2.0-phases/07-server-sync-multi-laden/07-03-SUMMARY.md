---
phase: 07-server-sync-multi-laden
plan: "03"
subsystem: sync, client
tags: [react, typescript, dexie, getShopId, engine, downloadProducts, SHOP_ID-migration]
dependency_graph:
  requires:
    - "07-01: shops table, POST /api/auth/pin, ensureShopSeeded()"
    - "07-02: serverAuth.ts, getShopId/setShopId in db/index.ts, useAuth auf serverAuth"
  provides:
    - "App.tsx: kein seedIfEmpty, downloadProducts nach Login"
    - "engine.ts: dynamische shopId via getShopId(), Download nach Flush"
    - "Alle Client-Komponenten: getShopId() statt hardcodierter SHOP_ID"
    - "Phase 7 komplett: Server-Sync + Multi-Laden"
  affects:
    - "Alle Client-Komponenten mit Produktdaten oder shopId-Referenz"
tech_stack:
  added: []
  patterns:
    - "getShopId() als zentrale Shop-Context-Quelle — wirft wenn kein Login, garantiert Correctness"
    - "downloadProducts() fire-and-forget nach Flush — kein blocking nach Sync"
    - "UnlockedApp-Mount-Effect für initialen Download statt Startup-Autorun in engine.ts"
key_files:
  created: []
  modified:
    - client/src/sync/engine.ts
    - client/src/App.tsx
    - client/src/features/pos/ArticleGrid.tsx
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/pos/useSaleComplete.ts
    - client/src/hooks/useLowStockCount.ts
    - client/src/features/admin/products/ProductForm.tsx
    - client/src/features/admin/products/StockAdjustModal.tsx
    - client/src/features/admin/reports/DailyReport.tsx
    - client/src/features/admin/reports/MonthlyReport.tsx
    - client/src/features/admin/settings/SettingsForm.tsx
    - client/src/features/admin/import/ImportScreen.tsx
    - client/src/db/seed.ts
decisions:
  - "seedIfEmpty() aus App.tsx entfernt — Server ist ab v2.0 Single Source of Truth für Produkte"
  - "Startup-Download aus engine.ts entfernt — App.tsx UnlockedApp übernimmt nach Login via useEffect"
  - "SHOP_ID in allen 13 Dateien durch getShopId() ersetzt — vollständige Eliminierung, kein Restrisiko"
  - "downloadProducts() nach Outbox-Flush: fire-and-forget, verhindert stale Daten nach Upload-Sync"
metrics:
  duration: "15 min"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_modified: 13
requirements:
  - SYNC-03
  - SYNC-04
  - SHOP-03
---

# Phase 07 Plan 03: Client SHOP_ID Migration + Engine Sync Summary

**One-liner:** SHOP_ID aus allen 13 Client-Dateien entfernt, getShopId() überall verdrahtet; engine.ts laedt nach Flush; App.tsx laedt Produkte nach Login statt seedIfEmpty()

## Objective

Alle Client-Dateien mit SHOP_ID-Import auf getShopId() umstellen; seedIfEmpty() entfernen; Sync-Engine nach Flush downloaden.

## Tasks Executed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | engine.ts auf getShopId() + Download nach Flush | edd3db0 | client/src/sync/engine.ts |
| 2 | App.tsx + alle SHOP_ID-Consumer umstellen | a491a76 | 12 Dateien |

## Decisions Made

- **seedIfEmpty() entfernt:** App.tsx hatte seedIfEmpty() als Fallback-Datenschicht. Mit Server als Single Source of Truth ist das obsolet — Produkte kommen per downloadProducts() nach Login.
- **Startup-Download in engine.ts entfernt:** Der bisherige fire-and-forget am Dateiende lief vor dem Login (kein shopId gesetzt). App.tsx UnlockedApp-Mount ist der korrekte Zeitpunkt.
- **Download nach Outbox-Flush:** Nach erfolgreichem Upload holt die Engine automatisch den aktuellen Stand vom Server — verhindert stale Daten ohne expliziten Nutzeraufruf.
- **13 Dateien statt 4:** Der Plan nannte 4 Dateien. Tatsächlich hatten 13 Dateien SHOP_ID-Imports. Alle wurden vollständig migriert (Deviation Rule 1).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 9 zusätzliche Dateien mit SHOP_ID-Import**
- **Found during:** Task 2
- **Issue:** Der Plan listete 4 Dateien (App.tsx, ArticleGrid, ProductList + engine.ts aus Task 1). Tatsächlich hatten 9 weitere Dateien SHOP_ID-Imports: useSaleComplete.ts, useLowStockCount.ts, ProductForm.tsx, StockAdjustModal.tsx, DailyReport.tsx, MonthlyReport.tsx, SettingsForm.tsx, ImportScreen.tsx, seed.ts
- **Fix:** Alle 9 Dateien vollständig auf getShopId() umgestellt
- **Files modified:** useSaleComplete.ts, useLowStockCount.ts, ProductForm.tsx, StockAdjustModal.tsx, DailyReport.tsx, MonthlyReport.tsx, SettingsForm.tsx, ImportScreen.tsx, seed.ts
- **Commit:** a491a76

## Verification Results

```
grep -rn "SHOP_ID" client/src/ → KEIN TREFFER
grep "seedIfEmpty" client/src/App.tsx → KEIN TREFFER
grep "getShopId" client/src/sync/engine.ts → 2 Treffer (Import + fetch-URL)
grep "downloadProducts.*catch" client/src/sync/engine.ts → 1 Treffer (nach Flush)
tsc --project client/tsconfig.json --noEmit → KEIN FEHLER
tsc --project server/tsconfig.json --noEmit → KEIN FEHLER
```

## Phase 07 Status

Alle 3 Pläne der Phase 07-server-sync-multi-laden abgeschlossen:
- Plan 01: shops-Tabelle, PIN-Auth API, ensureShopSeeded()
- Plan 02: serverAuth.ts, setShopId/getShopId, useAuth auf Server-Auth umgestellt
- Plan 03: SHOP_ID vollständig eliminiert, App + Engine verdrahtet

## Known Stubs

Keine — alle Produktdaten kommen per Server-Download, kein lokaler Seed mehr als Fallback.

## Self-Check: PASSED

- FOUND: edd3db0 (engine.ts Commit)
- FOUND: a491a76 (alle SHOP_ID Consumer Commit)
- FOUND: engine.ts
- FOUND: App.tsx
- SHOP_ID occurrences remaining: 0
