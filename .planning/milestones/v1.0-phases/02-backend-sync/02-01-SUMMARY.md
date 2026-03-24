---
phase: 02-backend-sync
plan: 01
subsystem: database, api
tags: [drizzle-orm, better-sqlite3, sqlite, fastify, zod, migrations]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Fastify-Server-Grundgerüst mit healthRoutes und Docker-Setup

provides:
  - Drizzle-Schema mit drei Tabellen (products, sales, outbox_events) in server/src/db/schema.ts
  - DB-Singleton via better-sqlite3 + drizzle() in server/src/db/index.ts
  - POST /api/sync Endpoint mit idempotenter SALE_COMPLETE-Verarbeitung
  - Initiale SQLite-Migration (automatisch beim Container-Start via drizzle-kit migrate)

affects:
  - 02-02 (Client-seitige Sync-Engine nutzt diesen Endpoint)
  - 03-reports (Umsatzdaten landen via sales-Tabelle in der Server-DB)

# Tech tracking
tech-stack:
  added:
    - drizzle-orm (bereits in package.json, jetzt aktiv genutzt)
    - better-sqlite3 (synchroner SQLite-Driver, jetzt aktiv genutzt)
    - drizzle-kit (Migration-Generator, bereits in devDependencies)
  patterns:
    - Drizzle-Tabellendefinitionen mit sqliteTable (text, integer)
    - DB-Singleton als Module-Level-Export
    - db.transaction((tx) => {...}) für atomare Multi-Table-Operationen
    - onConflictDoNothing() für idempotente INSERT-Operationen
    - sql`${col} - ${val}` für Delta-Updates (nie Absolutwerte)
    - Zod-Validation am Endpoint-Eingang vor DB-Zugriff

key-files:
  created:
    - server/src/db/schema.ts
    - server/src/db/index.ts
    - server/src/routes/sync.ts
    - server/migrations/0000_sloppy_mister_fear.sql
    - server/migrations/meta/
  modified:
    - server/src/index.ts
    - server/Dockerfile

key-decisions:
  - "db.transaction((tx) => {...}) statt db.transaction(() => { db... })() — Drizzle-Transaktions-API gibt void zurück, nicht eine aufrufbare Funktion"
  - "onConflictDoNothing() für idempotente Sale-Insertion — doppelter POST mit gleichem id wird lautlos ignoriert"
  - "Stock-Delta via sql-Template: stock = stock - quantity — verhindert Absolutwert-Überschreibung bei Concurrent-Sync"
  - "Produkt-Fallback bei unbekanntem Produkt: INSERT mit leerer category, purchasePrice=0, vatRate=7 — Daten werden später via Produktsync überschrieben"

patterns-established:
  - "Zod-Schema für jeden Request-Body am Eingang validieren, safeParse nutzen"
  - "Outbox-Entries als Batch verarbeiten, Fehler pro Entry loggen ohne Abbruch"
  - "Migration automatisch beim Container-Start: drizzle-kit migrate vor node dist/index.js"

requirements-completed: [WAR-04, OFF-03, OFF-04]

# Metrics
duration: 2min
completed: 2026-03-23
---

# Phase 02 Plan 01: Backend Sync Endpoint Summary

**Drizzle-Schema mit drei SQLite-Tabellen, idempotenter POST /api/sync Endpoint und automatische Container-Migration via drizzle-kit**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-23T10:10:03Z
- **Completed:** 2026-03-23T10:12:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Drizzle-Schema (products, sales, outbox_events) mit exakter Spiegelung der Client-Dexie-Typen
- POST /api/sync Endpoint mit Zod-Validierung, idempotenter SALE_COMPLETE-Verarbeitung und Delta-Stock-Reduktion
- Dockerfile aktualisiert: migrations/ wird kopiert, drizzle-kit migrate läuft automatisch beim Container-Start

## Task Commits

Jeder Task wurde atomisch committet:

1. **Task 1: Drizzle-Schema + DB-Singleton + Migration** - `8b89447` (feat)
2. **Task 2: POST /api/sync Endpoint + Dockerfile-Migration** - `9fa0af6` (feat)

## Files Created/Modified

- `server/src/db/schema.ts` - Drizzle-Tabellendefinitionen: products, sales, outboxEvents
- `server/src/db/index.ts` - DB-Singleton via better-sqlite3 + drizzle()
- `server/migrations/0000_sloppy_mister_fear.sql` - Initiale SQLite-Migration (3 CREATE TABLE)
- `server/migrations/meta/` - drizzle-kit Metadaten
- `server/src/routes/sync.ts` - POST /api/sync mit Zod-Validierung, idempotenter Verarbeitung
- `server/src/index.ts` - syncRoutes mit prefix /api registriert
- `server/Dockerfile` - migrations/ kopieren, CMD auf drizzle-kit migrate + node umgestellt

## Decisions Made

- `db.transaction((tx) => {...})` statt `db.transaction(() => { db... })()`: Drizzle's Transaktions-API gibt void zurück, nicht eine aufrufbare Funktion. Plan-Code hatte IIFE-Syntax, die TypeScript korrekt ablehnt.
- `onConflictDoNothing()` für idempotente Sale-Insertion: doppelter POST mit gleichem id wird lautlos ignoriert
- Stock-Delta via SQL-Template-Expression: verhindert Absolutwert-Überschreibung bei mehrfachem Sync
- Produkt-Fallback mit leerer category und vatRate=7: unbekannte Produkte werden minimal angelegt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] db.transaction Aufruf-Syntax korrigiert**
- **Found during:** Task 2 (POST /api/sync Endpoint)
- **Issue:** Plan enthielt `db.transaction(() => { db.insert... })()` mit IIFE-Aufruf. Drizzle's `db.transaction()` führt die Funktion synchron aus und gibt void zurück — kein aufrufbares Ergebnis. TypeScript-Fehler TS2349: "This expression is not callable."
- **Fix:** Syntax auf `db.transaction((tx) => { tx.insert... })` umgestellt — kein IIFE, tx-Parameter statt db für Operationen innerhalb der Transaktion
- **Files modified:** server/src/routes/sync.ts
- **Verification:** `npx tsc --noEmit` gibt keinen Fehler
- **Committed in:** `9fa0af6` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Notwendige Korrektur der Drizzle-Transaktions-API-Nutzung. Kein Scope-Creep.

## Issues Encountered

- Drizzle-Kit generiert Migrations-Dateinamen mit zufälligem Suffix (0000_sloppy_mister_fear.sql statt 0000_initial.sql) — funktional identisch, nur anders benannt. Plan erwähnte 0000_initial.sql als erwarteten Namen.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich. DB_PATH-Fallback `./data/fairstand.db` greift im Container.

## Next Phase Readiness

- POST /api/sync ist bereit für Client-seitige Sync-Engine (Phase 02-02)
- TypeScript-Build fehlerfrei
- Docker-Container führt Migration automatisch aus, kein manueller SQL-Schritt nötig
- Stock-Delta-Logik korrekt implementiert (OFF-04 erfüllt)

---

*Phase: 02-backend-sync*
*Completed: 2026-03-23*
