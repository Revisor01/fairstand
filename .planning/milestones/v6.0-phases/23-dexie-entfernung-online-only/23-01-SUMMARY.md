---
phase: 23-dexie-entfernung-online-only
plan: "01"
subsystem: client/db
tags: [dexie, refactor, offline-removal, hooks, cart]
dependency_graph:
  requires: []
  provides:
    - db/index.ts ohne FairstandDB — nur Typen + getShopId/setShopId
    - useProducts ohne Dexie write-through/fallback
    - useCategories ohne Dexie write-through/fallback
    - useCart als reiner React-State
    - App.tsx ohne Sync-Trigger
  affects:
    - client/src/features/pos/useCart.ts
    - client/src/hooks/api/useProducts.ts
    - client/src/hooks/api/useCategories.ts
    - client/src/App.tsx
tech_stack:
  removed:
    - Dexie.js write-through-Cache in useProducts/useCategories
    - Dexie.js cart-Persistenz in useCart
    - flushOutbox/registerSyncTriggers (engine.ts/triggers.ts)
    - FairstandDB-Klasse (schema.ts)
  patterns:
    - Server als Single Source of Truth — kein lokaler DB-Fallback
    - useReducer als einziger Cart-State (kein Side-Effect-Persist)
key_files:
  created: []
  modified:
    - client/src/db/index.ts
    - client/src/hooks/api/useProducts.ts
    - client/src/hooks/api/useCategories.ts
    - client/src/features/pos/useCart.ts
    - client/src/App.tsx
  deleted:
    - client/src/db/schema.ts
    - client/src/sync/engine.ts
    - client/src/sync/triggers.ts
decisions:
  - "Dexie-Typen direkt in db/index.ts definiert statt re-exportiert — schema.ts nicht mehr nötig"
  - "useCart updateQuantity ohne Stock-Check — Stock-Validation bleibt beim addItem via checkStockBeforeAdd"
  - "dexie-react-hooks in DailyReport/useLowStockCount/useSyncStatus verbleiben bis Plan 03"
metrics:
  duration: "2 Minuten"
  completed: "2026-03-24T22:49:00Z"
  tasks_completed: 2
  files_modified: 5
  files_deleted: 3
---

# Phase 23 Plan 01: Dexie-Kern-Entfernung Summary

**One-liner:** Dexie-Kern entfernt — schema.ts/engine.ts/triggers.ts gelöscht, db/index.ts auf Typen+shopId reduziert, useProducts/useCategories/useCart/App.tsx ohne Dexie-Code.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | db/schema.ts löschen, db/index.ts reduzieren, Sync-Dateien löschen | `10133ba` | schema.ts (del), engine.ts (del), triggers.ts (del), db/index.ts |
| 2 | useProducts/useCategories Dexie entfernen + useCart React-State + App.tsx | `8b08669` | useProducts.ts, useCategories.ts, useCart.ts, App.tsx |

## What Was Built

Plan 01 entfernt den Dexie-Kern aus der Client-Codebase:

**Gelöschte Dateien:**
- `client/src/db/schema.ts` — FairstandDB-Klasse (8 Versionen, alle Tabellen-Definitionen)
- `client/src/sync/engine.ts` — flushOutbox-Logik mit Outbox-Queue
- `client/src/sync/triggers.ts` — registerSyncTriggers (online/visibilitychange/interval)

**Vereinfachte Dateien:**
- `db/index.ts` — Typen direkt definiert (Category, Product, SaleItem, CartItem, Sale), kein Dexie-Import, kein `db`-Export, nur `getShopId`/`setShopId`
- `useProducts.ts` — direkte Server-Fetch in queryFn, kein try/catch-Fallback, kein write-through
- `useCategories.ts` — identische Vereinfachung wie useProducts
- `useCart.ts` — reiner useReducer ohne Persistenz-Effects, kein `loaded`-State, updateQuantity ohne DB-Lookup
- `App.tsx` — `registerSyncTriggers`-Import und -Aufruf entfernt, `useQueryClient` in UnlockedApp entfernt

## Deviations from Plan

None — Plan executed exactly as written.

dexie-react-hooks-Imports in DailyReport.tsx, useLowStockCount.ts, useSyncStatus.ts sind bewusst für Plan 03 belassen (laut Plan-Verifikationshinweis).

## Known Stubs

None — keine Stubs eingeführt. Alle Datenpfade zeigen auf den Server.

## Self-Check: PASSED

| Check | Status |
|-------|--------|
| schema.ts gelöscht | FOUND |
| engine.ts gelöscht | FOUND |
| triggers.ts gelöscht | FOUND |
| db/index.ts vorhanden | FOUND |
| useProducts.ts vorhanden | FOUND |
| useCategories.ts vorhanden | FOUND |
| useCart.ts vorhanden | FOUND |
| App.tsx vorhanden | FOUND |
| Commit 10133ba | FOUND |
| Commit 8b08669 | FOUND |
