---
phase: 22-postgresql-migration
plan: "03"
subsystem: database
tags: [postgresql, sqlite, migration, better-sqlite3, pg, drizzle]

requires:
  - phase: 22-01
    provides: PostgreSQL Drizzle-Schema mit pg-Treiber, DATABASE_URL Konfiguration

provides:
  - Standalone Datenmigrationsskript server/scripts/migrate-from-sqlite.ts (alle 5 Tabellen, idempotent)
  - server/package.json vollständig ohne better-sqlite3 (PG-05 erfüllt)
  - TypeScript-Build ohne SQLite-Abhängigkeiten

affects:
  - 23-dexie-removal (Deployment-Kontext: SQLite-Migration vor Dexie-Entfernung ausführen)

tech-stack:
  added: []
  patterns:
    - "Migrationsskript standalone: kein Import aus server/src/, eigene pg Pool Instanz, better-sqlite3 dynamisch importiert"
    - "Idempotenz via SELECT vor INSERT — Skript sicher mehrfach ausführbar"
    - "tsconfig.json include: [src] schließt scripts/ automatisch vom Build aus"

key-files:
  created:
    - server/scripts/migrate-from-sqlite.ts
  modified:
    - server/package.json
    - server/package-lock.json

key-decisions:
  - "Migrationsskript in server/scripts/ statt server/src/ — bleibt außerhalb TypeScript-Build (tsconfig include: [src])"
  - "better-sqlite3 dynamisch importiert (await import) statt statischer Import — Skript läuft nur wenn Library installiert ist, gibt verständliche Fehlermeldung falls nicht"
  - "ON CONFLICT (id) DO NOTHING für alle 5 Tabellen — Idempotenz ohne Datenverlust bei Wiederholung"
  - "Boolean(row.active) explizit für SQLite 0/1 → PostgreSQL boolean Konvertierung"
  - "JSON.parse(row.items) für SQLite text → PostgreSQL jsonb Konvertierung bei sales"

patterns-established:
  - "Migrationsskripte liegen in server/scripts/ als standalone executables mit tsx"

requirements-completed:
  - PG-04
  - PG-05

duration: 8min
completed: 2026-03-24
---

# Phase 22 Plan 03: PostgreSQL-Migration Summary

**Standalone SQLite→PostgreSQL Migrationsskript mit idempotenten INSERT...ON CONFLICT DO NOTHING Queries für alle 5 Tabellen; better-sqlite3 vollständig aus server/package.json entfernt (PG-05)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T22:35:00Z
- **Completed:** 2026-03-24T22:43:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- server/scripts/migrate-from-sqlite.ts als vollständig eigenständiges Migrationswerkzeug erstellt
- Alle 5 Tabellen in FK-korrekter Reihenfolge: shops → categories → products → sales → settings
- PG-05 erfüllt: better-sqlite3 und @types/better-sqlite3 vollständig aus server/package.json entfernt
- TypeScript-Build grün — tsconfig.json include: [src] schließt scripts/ automatisch aus
- server/src/ war bereits SQLite-frei (kein Cleanup nötig)

## Task Commits

1. **Task 1: standalone SQLite→PostgreSQL Migrationsskript erstellen** - `16bcbc5` (feat)
2. **Task 2: better-sqlite3 vollständig aus server/package.json entfernen** - `3bd7849` (chore)

## Files Created/Modified

- `server/scripts/migrate-from-sqlite.ts` - Standalone Migrationsskript mit pg Pool + better-sqlite3 dynamisch importiert
- `server/package.json` - better-sqlite3 und @types/better-sqlite3 entfernt
- `server/package-lock.json` - Nach npm install aktualisiert

## Decisions Made

- better-sqlite3 dynamisch importiert (await import()) statt statisch — gibt verständliche Fehlermeldung falls Library nicht installiert, verhindert Startup-Fehler in Produktions-Container
- tsconfig.json include: [src] schließt scripts/ bereits aus — kein Anpassen der tsconfig nötig
- ON CONFLICT (id) DO NOTHING statt INSERT OR IGNORE — PostgreSQL-native Syntax

## Deviations from Plan

Keine — Plan exakt wie spezifiziert ausgeführt. server/src/ war bereits SQLite-frei, kein zusätzlicher Cleanup nötig.

## Issues Encountered

Keine.

## User Setup Required

**Für Produktion (einmaliger Schritt vor dem neuen Deployment):**

```bash
# SQLite-Datei aus altem Volume sichern, dann:
SQLITE_PATH=/pfad/zur/fairstand.db \
DATABASE_URL=postgresql://fairstand:password@localhost:5432/fairstand \
npx tsx server/scripts/migrate-from-sqlite.ts
```

Voraussetzung: `better-sqlite3` lokal installiert (`npm install better-sqlite3`), da das Skript außerhalb des Docker-Containers ausgeführt wird.

## Next Phase Readiness

- Phase 22 (PostgreSQL-Migration) vollständig abgeschlossen: Docker-Compose mit PostgreSQL, Drizzle pgTable-Schema, pg-Treiber im Server, Standalone-Migrationsskript
- Phase 23 (Dexie-Entfernung) kann beginnen: Server ist vollständig SQLite-frei, Client nutzt noch Dexie für Offline-Cache
- Bekannter Hinweis aus STATE.md: idb-keyval (Session-Storage) in Phase 23 ersetzen durch localStorage oder In-Memory

---
*Phase: 22-postgresql-migration*
*Completed: 2026-03-24*
