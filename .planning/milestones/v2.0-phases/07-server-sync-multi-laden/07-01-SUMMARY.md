---
phase: 07-server-sync-multi-laden
plan: 01
subsystem: auth, database
tags: [drizzle, sqlite, fastify, sha256, seed, multi-laden]

# Dependency graph
requires: []
provides:
  - shops Tabelle in Drizzle-Schema (server/src/db/schema.ts)
  - hashPin() SHA-256-Helper in server/src/lib/crypto.ts
  - POST /api/auth/pin — PIN-Auth-Endpoint mit shopId + token Response
  - ensureShopSeeded() — idempotenter Server-Start-Seed mit Shop + 33 Produkten
affects: [07-02, 07-03, alle nachfolgenden Pläne die shopId/token verwenden]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - hashPin über Web Crypto API (crypto.subtle.digest SHA-256) — keine externe Krypto-Library nötig
    - Idempotenter Seed mit existenz-check vor insert — kein TRUNCATE beim Neustart
    - Token als crypto.randomUUID() — kein JWT-Overhead für einfaches Session-Token

key-files:
  created:
    - server/src/lib/crypto.ts
    - server/src/routes/auth.ts
    - server/src/db/seed.ts
  modified:
    - server/src/db/schema.ts
    - server/src/index.ts

key-decisions:
  - "Web Crypto API (crypto.subtle) für hashPin — kein npm-Package, Node 20 unterstützt nativ"
  - "Token = crypto.randomUUID() ohne server-seitiges Token-Management — client speichert in idb-keyval"
  - "ensureShopSeeded() idempotent via shopId-existenz-check — zweiter Aufruf ist No-Op"
  - "SEED_PRODUCTS direkt aus client/src/db/seed.ts übernommen — identische Daten, kein Divergenzrisiko"

patterns-established:
  - "Krypto-Helfer in server/src/lib/crypto.ts zentralisieren — nie inline oder duplizieren"
  - "Server-Seed vor fastify.listen() aufrufen — garantiert DB-Zustand vor erstem Request"

requirements-completed: [SHOP-01, SHOP-02, SYNC-01]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 07 Plan 01: Server-seitiges Fundament (shops-Tabelle, PIN-Auth, Seed) Summary

**shops-Tabelle in Drizzle + POST /api/auth/pin Endpoint + idempotenter Seed mit Shop "St. Secundus Hennstedt" und 33 Produkten**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-24T10:15:00Z
- **Completed:** 2026-03-24T10:23:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- shops-Tabelle mit id, shop_id (unique), name, pin (SHA-256 Hash), created_at zu Drizzle-Schema hinzugefügt
- POST /api/auth/pin Endpoint: PIN hashen, gegen shops-Tabelle prüfen, shopId + shopName + token zurückgeben (401 bei falschem PIN)
- ensureShopSeeded() beim Server-Start: Shop "St. Secundus Hennstedt" + 33 Produkte, vollständig idempotent
- hashPin() in server/src/lib/crypto.ts zentralisiert — von auth.ts und seed.ts importiert, nirgends dupliziert
- TypeScript-Kompilierung ohne Fehler

## Task Commits

Jeder Task wurde atomisch committed:

1. **Task 1: shops-Tabelle zu Drizzle-Schema hinzufügen** - `d806e05` (feat)
2. **Task 2: PIN-Auth-Endpoint + Server-Seed implementieren** - `2659d51` (feat)

## Files Created/Modified

- `server/src/db/schema.ts` - shops-Tabelle hinzugefügt (id PK, shop_id unique, name, pin, created_at)
- `server/src/lib/crypto.ts` - hashPin() mit Web Crypto API (SHA-256)
- `server/src/routes/auth.ts` - POST /api/auth/pin mit Zod-Validation + Drizzle-Query + token Response
- `server/src/db/seed.ts` - ensureShopSeeded() mit Shop-Daten + allen 33 Produkten aus client/src/db/seed.ts
- `server/src/index.ts` - authRoutes registriert + ensureShopSeeded() vor fastify.listen()

## Decisions Made

- Web Crypto API (crypto.subtle) für hashPin — kein npm-Package nötig, Node 20 unterstützt nativ
- Token = crypto.randomUUID() ohne server-seitiges Token-Management — client speichert in idb-keyval, einfacher als JWT
- ensureShopSeeded() idempotent via shopId-existenz-check — zweiter Aufruf ist No-Op, kein TRUNCATE beim Neustart
- SEED_PRODUCTS 1:1 aus client/src/db/seed.ts übernommen — identische Produktdaten, kein Divergenzrisiko

## Deviations from Plan

Keine — Plan wurde exakt wie beschrieben ausgeführt.

## Issues Encountered

Keine.

## User Setup Required

Keine — kein externer Service, kein ENV-Variable-Setup nötig. PIN 140381 ist im Seed hardcodiert.

## Next Phase Readiness

- Server-Fundament vollständig: shops-Tabelle, PIN-Auth, Seed
- POST /api/auth/pin liefert shopId + token — bereit für Client-seitige PIN-Auth-Integration (Plan 07-02)
- Drizzle-Migration für shops-Tabelle wird automatisch beim nächsten Container-Start ausgeführt (drizzle-kit migrate im Dockerfile)

---
*Phase: 07-server-sync-multi-laden*
*Completed: 2026-03-24*
