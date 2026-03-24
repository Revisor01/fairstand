---
phase: 05-tech-debt-fixes
plan: 02
subsystem: sync
tags: [dexie, offline-sync, download, lww, pwa]

requires:
  - phase: 02-backend-sync
    provides: "GET /api/products endpoint, outbox upload sync"
  - phase: 05-01
    provides: "LWW upsert in sync route, PATCH toggle active"
provides:
  - "downloadProducts function for server-to-client product sync"
  - "Manual 'Daten laden' button in ProductList"
  - "Auto-download on app start when online"
affects: [sync, products, offline]

tech-stack:
  added: []
  patterns:
    - "Snake-case to camelCase mapping for server responses"
    - "LWW comparison in client-side download sync"

key-files:
  created: []
  modified:
    - client/src/sync/engine.ts
    - client/src/features/admin/products/ProductList.tsx

key-decisions:
  - "ServerProduct interface for snake_case mapping — Drizzle returns snake_case, client uses camelCase"
  - "LWW per-product comparison instead of bulk overwrite — preserves local edits that are newer"
  - "Auto-download at module load via navigator.onLine check — covers app start and reload scenarios"

patterns-established:
  - "Download-Sync pattern: fetch server data, map keys, LWW compare, upsert"

requirements-completed: [TD-03]

duration: 2min
completed: 2026-03-23
---

# Phase 05 Plan 02: Download-Sync Summary

**Download-Sync Server-to-Client mit LWW-Vergleich und manuellem Daten-laden-Button in Produktverwaltung**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-23T18:40:55Z
- **Completed:** 2026-03-23T18:42:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- downloadProducts function fetches all products from server, maps snake_case to camelCase, upserts with LWW
- Automatic download trigger on app start when online
- Manual "Daten laden" button in ProductList header with loading state and result feedback

## Task Commits

Each task was committed atomically:

1. **Task 1: downloadProducts-Funktion in engine.ts** - `2213703` (feat)
2. **Task 2: Manueller "Daten laden" Button in ProductList** - `4d601b9` (feat)

## Files Created/Modified
- `client/src/sync/engine.ts` - Added downloadProducts function, ServerProduct interface, auto-trigger at app start
- `client/src/features/admin/products/ProductList.tsx` - Added "Daten laden" button, sync state, result display

## Decisions Made
- ServerProduct interface maps Drizzle snake_case response to client camelCase Product interface
- LWW comparison per product (updatedAt) instead of blind bulk overwrite
- Auto-download fires at module load time via navigator.onLine guard, errors silently caught
- Sync result stays visible until next sync or navigation (intentional for user feedback)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Download-Sync complete, fresh clients can now load product data from server
- Bidirectional sync operational: upload via outbox, download via downloadProducts
- All v1.1 tech debt items addressed

---
*Phase: 05-tech-debt-fixes*
*Completed: 2026-03-23*

## Self-Check: PASSED
