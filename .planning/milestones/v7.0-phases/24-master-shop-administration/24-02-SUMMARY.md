---
phase: 24-master-shop-administration
plan: 02
subsystem: api, ui, auth
tags: [fastify, react, tanstack-query, drizzle, typescript, shops, master-guard]

# Dependency graph
requires:
  - phase: 24-01
    provides: isMaster flag in shops table, auth response includes isMaster, DB schema for shops
provides:
  - Master-only /api/shops CRUD endpoints (GET, POST, PATCH)
  - ShopsManager React component (list, create, activate/deactivate)
  - isMaster stored in localStorage session after login
  - Conditional Shops tab in AdminScreen for master shops
affects:
  - 25-shop-isolation (uses master admin to manage shops before isolating sortiment)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - requireMaster guard function: async DB lookup to verify isMaster before each shops route handler
    - visibleTabs pattern: dynamic tab array computed from isMaster state in AdminScreen
    - isMaster ?? false defensive fallback for backward-compatible session reads

key-files:
  created:
    - server/src/routes/shops.ts
    - client/src/features/admin/shops/ShopsManager.tsx
  modified:
    - server/src/index.ts
    - client/src/features/auth/serverAuth.ts
    - client/src/features/admin/AdminScreen.tsx

key-decisions:
  - "requireMaster does a DB lookup per request — no JWT claim, always authoritative"
  - "Master-Shop cannot be deactivated via PATCH (400 guard)"
  - "Shops tab is conditionally added to visibleTabs array, not toggled via CSS visibility"

patterns-established:
  - "requireMaster: async DB guard pattern for route-level role check without JWT extension"
  - "visibleTabs: computed tab array from session state instead of inline conditionals in JSX"

requirements-completed:
  - SHOP-02
  - SHOP-03

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 24 Plan 02: Master-Shop Administration (Client + Server) Summary

**Master-only /api/shops CRUD with ShopsManager UI, isMaster session field, and conditional Shops tab in AdminScreen**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-25T00:06:00Z
- **Completed:** 2026-03-25T00:08:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- New `server/src/routes/shops.ts` with GET/POST/PATCH endpoints, all protected by `requireMaster` DB guard
- New `ShopsManager.tsx` component with shop list, create form (name/shopId/pin), and activate/deactivate toggle
- `StoredSession` interface extended with `isMaster: boolean`, saved from auth response on login
- `AdminScreen` shows Shops tab only when `isMaster` is true, computed via `visibleTabs` array

## Task Commits

1. **Task 1: Server-Route /api/shops (Master-only CRUD)** - `8782a11` (feat)
2. **Task 2: Client — Session + ShopsManager + AdminScreen-Tab** - `ed5e5df` (feat)

## Files Created/Modified

- `server/src/routes/shops.ts` - GET/POST/PATCH /api/shops with requireMaster guard
- `server/src/index.ts` - Registered shopsRoutes with /api prefix
- `client/src/features/admin/shops/ShopsManager.tsx` - Shop management UI
- `client/src/features/auth/serverAuth.ts` - Added isMaster to StoredSession and serverLogin
- `client/src/features/admin/AdminScreen.tsx` - Conditional Shops tab via visibleTabs

## Decisions Made

- `requireMaster` does a DB lookup on every request instead of embedding isMaster in the JWT — always authoritative, no stale token risk
- Master-Shop cannot be deactivated (400 guard in PATCH) to prevent lockout
- `visibleTabs` computed array pattern is cleaner than inline JSX conditionals for conditional tabs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Master admin is fully functional: login as master, see Shops tab, create shops with PIN, deactivate shops
- Phase 25 (shop isolation) can now build on this — shops exist and can be managed by master
- Deactivated shops cannot log in (403 from auth.ts, unchanged from Plan 01)

---
*Phase: 24-master-shop-administration*
*Completed: 2026-03-25*
