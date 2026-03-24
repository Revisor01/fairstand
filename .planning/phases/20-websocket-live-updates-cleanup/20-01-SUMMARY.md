---
phase: 20-websocket-live-updates-cleanup
plan: 01
subsystem: api
tags: [websocket, fastify, broadcast, live-updates, realtime]

# Dependency graph
requires:
  - phase: 18-quick-wins-security
    provides: In-Memory Session Store mit validateSession()
  - phase: 17-datenverwaltung-sync
    provides: categories-Routen (POST/PATCH/DELETE)
provides:
  - WebSocket-Endpoint /api/ws mit Token-Auth via Query-Param
  - broadcast()-Hilfsfunktion für shopId-basierte Invalidierungs-Signale
  - Broadcast-Aufrufe in products.ts, categories.ts und sync.ts
affects:
  - 20-02 (Client-seitige WebSocket-Integration mit TanStack Query Invalidierung)
  - 20-03 (End-to-End Live-Updates Tests)

# Tech tracking
tech-stack:
  added:
    - "@fastify/websocket ^11.2.0 — WebSocket-Support für Fastify"
    - "@types/ws — TypeScript-Typen für ws-Paket"
  patterns:
    - "broadcast() als Modul-Level-Funktion mit shopId-Filter — kein Plugin-State, direkt importierbar"
    - "broadcast nach reply.send() — Antwort zum Client bevor Broadcast losgeht"
    - "hasStockChanged-Flag im Sync-Batch — ein broadcast pro Batch, nicht pro Entry"

key-files:
  created:
    - server/src/routes/websocket.ts
  modified:
    - server/src/index.ts
    - server/src/routes/products.ts
    - server/src/routes/categories.ts
    - server/src/routes/sync.ts
    - server/package.json

key-decisions:
  - "websocketRoutes registriert @fastify/websocket intern via fastify.register — kein globales Plugin in index.ts nötig"
  - "Token via Query-Param /api/ws?token=... statt Authorization-Header — WebSocket-Upgrade-Requests können keine custom Header setzen"
  - "close(1008) für Policy Violation bei fehlendem/ungültigem Token — korrektester WebSocket-Close-Code"
  - "hasStockChanged-Flag in sync.ts: ein broadcast pro Batch statt pro Entry — verhindert unnötige Invalidierungsflut"
  - "broadcast() nach reply.send() in products.ts — HTTP-Antwort priorisiert, Broadcast fire-and-forget"

patterns-established:
  - "Broadcast-Aufruf nach reply.send(): HTTP first, dann WebSocket-Signal"
  - "shopId-basiertes Client-Routing: Map<string, Set<WebSocket>> — nur Clients desselben Shops erhalten Signal"

requirements-completed: [LIVE-04]

# Metrics
duration: 15min
completed: 2026-03-24
---

# Phase 20 Plan 01: WebSocket-Infrastruktur Summary

**@fastify/websocket-Endpoint /api/ws mit Token-Auth, shopId-basiertem broadcast() und Invalidierungs-Signalen aus products, categories und sync**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-24T20:50:00Z
- **Completed:** 2026-03-24T21:05:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- WebSocket-Endpoint /api/ws mit Token-Validierung via Query-Param und close(1008) bei ungültigem Token
- broadcast()-Funktion mit shopId-Filter (Map<string, Set<WebSocket>>) — nur relevante Clients erhalten Signal
- Broadcast-Aufrufe in allen drei datenmutierenden Routen: products_changed, categories_changed, stock_changed

## Task Commits

Jeder Task wurde atomar committed:

1. **Task 1: @fastify/websocket installieren + websocket.ts mit broadcast()** - `633936f` (feat)
2. **Task 2: Broadcast-Aufrufe in products.ts, categories.ts und sync.ts** - `e0a2156` (feat)

## Files Created/Modified

- `server/src/routes/websocket.ts` — Neu: WebSocket-Route, clients-Map, broadcast(), BroadcastMessage-Typ
- `server/src/index.ts` — websocketRoutes-Import + Registrierung vor anderen Routen
- `server/src/routes/products.ts` — broadcast('products_changed') nach POST + PATCH activate/deactivate
- `server/src/routes/categories.ts` — broadcast('categories_changed') nach POST/PATCH/DELETE; auch 'products_changed' nach PATCH
- `server/src/routes/sync.ts` — broadcast('stock_changed') nach Batch mit SALE_COMPLETE oder STOCK_ADJUST
- `server/package.json` — @fastify/websocket ^11.2.0 + @types/ws

## Decisions Made

- Token via Query-Param (/api/ws?token=...) statt Authorization-Header: WebSocket-Upgrade-Requests können keine custom Header setzen
- websocketRoutes registriert @fastify/websocket intern via fastify.register — kein globales Plugin nötig
- hasStockChanged-Flag im Sync-Batch: ein broadcast pro Batch statt pro Entry — verhindert unnötige Invalidierungsflut
- broadcast() nach reply.send() — HTTP-Antwort zuerst, Broadcast fire-and-forget

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @types/ws als devDependency installiert**
- **Found during:** Task 1 (TypeScript-Kompilierung)
- **Issue:** `import type { WebSocket } from 'ws'` erzeugte TS7016-Fehler, da @types/ws fehlte
- **Fix:** `npm install --save-dev @types/ws`
- **Files modified:** server/package.json, server/package-lock.json
- **Verification:** `npx tsc --noEmit` ohne Fehler
- **Committed in:** 633936f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fehlende Type-Deklarationen blockierten Build. Fix notwendig, kein Scope Creep.

## Issues Encountered

Keine weiteren Probleme.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WebSocket-Endpoint ist betriebsbereit und token-gesichert
- broadcast() ist aus allen Mutation-Routen aufrufbar
- Plan 20-02 kann Client-seitige WebSocket-Verbindung + TanStack Query Invalidierung implementieren

---
*Phase: 20-websocket-live-updates-cleanup*
*Completed: 2026-03-24*
