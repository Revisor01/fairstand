---
phase: 24-master-shop-administration
plan: 01
subsystem: database
tags: [drizzle, postgresql, auth, shops, migrations]

# Dependency graph
requires: []
provides:
  - shops-Tabelle mit is_master und active Spalten (PostgreSQL-Schema + Migration)
  - Auth-Route lehnt inaktive Shops mit 403 ab und gibt isMaster-Flag zurück
  - Seed setzt St. Secundus als Master-Shop (Neuanlage + Bestandsupdate)
affects: [25-shop-isolation, plan-02-shops-api]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotenter Seed mit Bestandsupdate: existierende Shops werden auf isMaster geprüft und ggf. aktualisiert"
    - "Manuelle PostgreSQL-Migrations-Datei mit statement-breakpoint Syntax"

key-files:
  created:
    - server/migrations/0003_add_master_shop_fields.sql
  modified:
    - server/src/db/schema.ts
    - server/src/db/seed.ts
    - server/src/routes/auth.ts

key-decisions:
  - "is_master Default false: Neue Shops sind nie automatisch Master — explizite Setzung im Seed"
  - "active Default true: Neue Shops sind standardmäßig aktiv — Deaktivierung ist explizite Admin-Aktion"
  - "403 statt 401 für deaktivierte Shops: Semantisch korrekt — Identität bekannt, aber Zugriff verweigert"

patterns-established:
  - "Seed-Idempotenz: existierende Entitäten werden auf fehlende Felder geprüft und nachgepflegt"

requirements-completed: [SHOP-01, SHOP-02]

# Metrics
duration: 8min
completed: 2026-03-25
---

# Phase 24 Plan 01: Master-Shop Administration — Schema + Auth Summary

**PostgreSQL-Schema um is_master/active erweitert, Migration 0003 erstellt, Seed setzt St. Secundus als Master, Auth-Route blockiert deaktivierte Shops mit 403 und gibt isMaster in der Response zurück.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-25T00:00:00Z
- **Completed:** 2026-03-25T00:08:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- shops-Tabelle hat isMaster (boolean, default false) und active (boolean, default true) in Drizzle-Schema
- PostgreSQL-Migration 0003 mit ALTER TABLE Statements liegt bereit
- Seed ist idempotent: bestehende Instanzen bekommen is_master gesetzt via UPDATE
- Auth-Route gibt 403 (nicht 401) fur deaktivierte Shops und isMaster in der Response

## Task Commits

1. **Task 1: Schema erweitern + Migration erstellen** - `7e0620c` (feat)
2. **Task 2: Seed anpassen + Auth-Route erweitern** - `33b8b37` (feat)

## Files Created/Modified

- `server/src/db/schema.ts` - shops-Tabelle um isMaster + active Felder erweitert
- `server/migrations/0003_add_master_shop_fields.sql` - PostgreSQL-Migration fur neue Spalten
- `server/src/db/seed.ts` - ensureShopSeeded: isMaster:true bei INSERT + Idempotenz-UPDATE
- `server/src/routes/auth.ts` - active-Check (403) + isMaster in Auth-Response

## Decisions Made

- 403 statt 401 fur deaktivierte Shops: 401 bedeutet "unbekannte Identitat", 403 bedeutet "bekannt, aber gesperrt" — semantisch korrekt
- Seed-Idempotenz uber UPDATE: bestehende Produktionsinstanzen benotigen keinen manuellen DB-Eingriff
- Manuelle Migration statt drizzle-kit generate: drizzle-kit lauft im Container, nicht lokal

## Deviations from Plan

Keine — Plan exakt wie beschrieben ausgefuhrt.

## Issues Encountered

Keine. TypeScript-Kompilierung ohne Fehler.

## Next Phase Readiness

- Datenbankgrundlage fur Master-Shop-Verwaltung vollstandig
- Plan 02 (Shops-API + Client) kann auf isMaster-Flag und active-Status aufbauen
- Migration 0003 wird beim nachsten Container-Start via drizzle-kit angewendet

---
*Phase: 24-master-shop-administration*
*Completed: 2026-03-25*
