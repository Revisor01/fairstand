---
phase: 20-websocket-live-updates-cleanup
plan: "03"
subsystem: client
tags: [websocket, tanstack-query, cleanup, live-updates]
dependency_graph:
  requires: [20-01, 20-02]
  provides: [LIVE-07]
  affects: [client/src/hooks, client/src/App.tsx, client/src/sync/engine.ts, client/src/features/pos, client/src/features/admin]
tech_stack:
  added: []
  patterns: [exponential-backoff-with-jitter, tq-invalidation-via-websocket]
key_files:
  created:
    - client/src/hooks/useWebSocket.ts
  modified:
    - client/src/App.tsx
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/pos/POSScreen.tsx
    - client/src/sync/engine.ts
decisions:
  - useWebSocket in UnlockedApp statt AppInner — liegt innerhalb QueryClientProvider, Hook braucht useQueryClient()
  - getShopId() in try/catch im onmessage-Handler — wirft wenn Shop nicht gesetzt, statt globalen Fehler
  - engine.ts auf reines flushOutbox() reduziert — Download-Sync vollständig via TQ + WebSocket-Invalidation
metrics:
  duration_seconds: 155
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 5
---

# Phase 20 Plan 03: WebSocket-Client + Cleanup Summary

**One-liner:** useWebSocket-Hook mit Exponential Backoff und TQ-Invalidation; Sync-Button, Sync-Badge und downloadProducts/downloadCategories vollständig entfernt.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | useWebSocket.ts — Hook mit Auto-Reconnect und TQ-Invalidation | 6f66fe8 | client/src/hooks/useWebSocket.ts (neu), client/src/App.tsx |
| 2 | Cleanup — Sync-Button, Sync-Badge, downloadProducts/downloadCategories | 0af7949 | ProductList.tsx, POSScreen.tsx, engine.ts |

## What Was Built

**Task 1 — useWebSocket.ts:**

Neuer Hook `useWebSocket()` in `client/src/hooks/useWebSocket.ts`:
- Verbindet sich via WebSocket mit `/api/ws?token=...` nach Login
- Invalidiert `['products', shopId]` bei `products_changed` und `stock_changed`
- Invalidiert `['categories', shopId]` bei `categories_changed`
- Nur Nachrichten für den eigenen Shop werden verarbeitet (shopId-Check)
- Exponential Backoff: 1s → 2s → 4s → ... → max 30s, plus 0–500ms Jitter
- Cleanup bei Unmount: WebSocket schließen, Timer abbrechen
- Aufgerufen in `UnlockedApp` (innerhalb `QueryClientProvider`)

`App.tsx` bereinigt: `downloadProducts`-Import und startup-`useEffect` entfernt, durch `useWebSocket()` ersetzt.

**Task 2 — Cleanup:**

- `ProductList.tsx`: Sync-Button, `handleDownloadSync()`, `syncing`/`syncResult`-State, `downloadProducts`-Import und `RefreshCw`-Icon-Import entfernt. Header enthält nur noch "+ Neu"-Button.
- `POSScreen.tsx`: Sync-Badge-Block, `useSyncStatus`/`resetFailedEntries`-Import und `syncStatus`-Hook-Aufruf entfernt. `RefreshCw`-Import entfernt.
- `engine.ts`: `downloadProducts()`, `downloadCategories()`, `ServerProduct`-Interface, fire-and-forget download nach outbox flush sowie zugehörige Imports (`getShopId`, `Product`, `Category`) entfernt. `flushOutbox()` bleibt vollständig erhalten.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing error handling] getShopId() try/catch im onmessage-Handler**
- **Found during:** Task 1
- **Issue:** `getShopId()` wirft einen Fehler wenn kein Shop gesetzt ist (z.B. Race-Condition beim Reconnect). Der Plan-Code hatte keinen Try/Catch darum.
- **Fix:** `getShopId()` in eigenem try/catch-Block im `onmessage`-Handler — bei Fehler wird die Nachricht lautlos ignoriert.
- **Files modified:** client/src/hooks/useWebSocket.ts
- **Commit:** 6f66fe8

Alle anderen Aufgaben wurden exakt wie geplant umgesetzt.

## Known Stubs

None — alle Daten fließen live über WebSocket-Invalidation oder direkt aus TanStack Query.

## Self-Check: PASSED

- [x] `client/src/hooks/useWebSocket.ts` existiert
- [x] Commit 6f66fe8 existiert (feat(20-03): add useWebSocket hook...)
- [x] Commit 0af7949 existiert (refactor(20-03): remove sync button...)
- [x] TypeScript ohne Fehler
- [x] `downloadProducts`/`downloadCategories` nirgendwo mehr in `client/src/`
- [x] `useSyncStatus` nicht mehr in POSScreen
- [x] `flushOutbox` erhalten in engine.ts
