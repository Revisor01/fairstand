---
phase: 22-postgresql-migration
plan: 01
subsystem: database
tags: [postgresql, drizzle-orm, pg, docker-compose, schema-migration]

requires: []
provides:
  - docker-compose.yml mit postgres:16-alpine Service, Health Check (interval 5s, retries 10)
  - server depends_on postgres condition service_healthy
  - DATABASE_URL env var als Verbindungsstring für alle nachfolgenden Pläne
  - server/src/db/schema.ts mit 6 pgTable-Definitionen (pg-core)
  - server/src/db/index.ts mit pg Pool + drizzle-orm/node-postgres
  - TypeScript-Build ohne Fehler nach vollständiger Migration
affects: [22-02, 22-03, 23-dexie-removal]

tech-stack:
  added: [pg@^8.13, @types/pg@^8]
  patterns:
    - "pg Pool mit connectionString aus DATABASE_URL env var"
    - "drizzle({ client: pool, schema }) statt drizzle({ client: sqlite, schema })"
    - "db.execute(sql`...`) für Raw-SQL (PostgreSQL), nicht db.all()"
    - "await db.transaction(async (tx) => { await tx... }) für Transaktionen"
    - "jsonb_array_elements() + item->>'field' statt json_each() + json_extract()"
    - "EXTRACT(MONTH FROM to_timestamp(ms / 1000)) statt strftime('%m', ...)"

key-files:
  created: []
  modified:
    - docker-compose.yml
    - server/drizzle.config.ts
    - server/package.json
    - server/src/db/schema.ts
    - server/src/db/index.ts
    - server/src/index.ts
    - server/src/routes/sync.ts
    - server/src/routes/reports.ts
    - server/src/scheduler/reportScheduler.ts

key-decisions:
  - "pg Pool (max 20, idleTimeout 30s, connTimeout 5s) statt einzelner Connection — für produktiven Einsatz ausreichend"
  - "sqlite-data Volume beibehalten für Plan 03 Datenmigrationsskript (SQLite-Datei muss lesbar bleiben)"
  - "better-sqlite3 noch nicht entfernt — wird in Plan 03 als separates Standalone-Skript benötigt"
  - "db.execute(sql`...`) statt Drizzle Query Builder für komplexe JSON-Abfragen (reportScheduler, reports)"

patterns-established:
  - "PostgreSQL jsonb-Felder: item->>'field' für Text-Extraktion, (item->>'field')::integer für Zahlen"
  - "Timestamp-Epoch-Umrechnung: to_timestamp(created_at / 1000) da created_at in Millisekunden"
  - "Alle Drizzle-Operationen sind async/await — kein synchrones .run()/.get()/.all() mehr"

requirements-completed: [PG-01, PG-02, PG-03]

duration: 4min
completed: 2026-03-24
---

# Phase 22 Plan 01: PostgreSQL Infrastructure + Schema Migration Summary

**postgres:16-alpine in docker-compose mit Health Check, pg Pool in Drizzle, alle 6 Tabellen von sqliteTable auf pgTable migriert, TypeScript-Build clean**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-24T22:26:17Z
- **Completed:** 2026-03-24T22:29:52Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Docker-Compose um postgres:16-alpine Service mit Health Check ergänzt (max 50s Wartezeit, server wartet auf service_healthy)
- Drizzle-Schema komplett auf pgTable migriert: boolean statt integer(mode:boolean), serial statt integer(autoIncrement), jsonb statt text(mode:json)
- DB-Connection auf pg Pool mit DATABASE_URL umgestellt, pool.end() in Fastify onClose Hook
- Alle route/scheduler-Dateien auf PostgreSQL-kompatible Query-Patterns umgestellt (async/await, db.execute, jsonb-Operatoren)

## Task Commits

1. **Task 1: Docker-Compose + Dockerfile + drizzle.config.ts** - `c54701a` (chore)
2. **Task 2: Schema + DB-Connection + Deviation-Fixes** - `8263647` (feat)

**Plan metadata:** [wird nach STATE-Update ergänzt]

## Files Created/Modified
- `docker-compose.yml` - postgres:16-alpine Service + Volume + depends_on + DATABASE_URL
- `server/drizzle.config.ts` - dialect postgresql, DATABASE_URL
- `server/package.json` - pg + @types/pg hinzugefügt
- `server/src/db/schema.ts` - 6 pgTable-Definitionen (boolean, serial, jsonb)
- `server/src/db/index.ts` - pg Pool + drizzle-orm/node-postgres + pool export
- `server/src/index.ts` - pool.end() in onClose Hook
- `server/src/routes/sync.ts` - async transactions + await statt .run()
- `server/src/routes/reports.ts` - db.execute() + PostgreSQL jsonb/EXTRACT SQL
- `server/src/scheduler/reportScheduler.ts` - await db.select() + db.execute() statt .get()/.all()

## Decisions Made
- sqlite-data Volume beibehalten: Plan 03 (Datenmigration) benötigt die SQLite-Datei als Quelle
- better-sqlite3 bleibt in dependencies: wird in Plan 03 als Standalone-Migrationsskript verwendet
- db.execute(sql`...`) für komplexe JSON-Abfragen gewählt statt Drizzle Query Builder — PostgreSQL jsonb-Syntax (jsonb_array_elements, ->>-Operator) hat kein Drizzle-Equivalent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] sync.ts: SQLite-spezifische .run()-Aufrufe und synchrone Transactions**
- **Found during:** Task 2 (TypeScript-Build nach Schema-Migration)
- **Issue:** Drizzle PostgreSQL-Driver kennt kein .run() — alle Queries müssen await'd werden, db.transaction() erwartet async Callback
- **Fix:** Alle .run()-Aufrufe entfernt, await vor jede Query, transaction-Callbacks auf async umgestellt
- **Files modified:** server/src/routes/sync.ts
- **Verification:** npm run build — kein TypeScript-Fehler
- **Committed in:** 8263647 (Task 2 commit)

**2. [Rule 1 - Bug] reports.ts: db.all() existiert in Drizzle PostgreSQL nicht**
- **Found during:** Task 2 (TypeScript-Build nach Schema-Migration)
- **Issue:** db.all(sql`...`) ist SQLite-only. Zusätzlich verwenden die Queries SQLite-Funktionen: json_each(), json_extract(), strftime()
- **Fix:** db.all() durch await db.execute() ersetzt, SQL auf PostgreSQL umgestellt: jsonb_array_elements(), ->>/::integer-Operatoren, EXTRACT(MONTH FROM to_timestamp())
- **Files modified:** server/src/routes/reports.ts
- **Verification:** npm run build — kein TypeScript-Fehler
- **Committed in:** 8263647 (Task 2 commit)

**3. [Rule 1 - Bug] reportScheduler.ts: .get()/.all() und SQLite-Funktionen**
- **Found during:** Task 2 (TypeScript-Build nach Schema-Migration)
- **Issue:** db.select().from(...).get() ist SQLite-only, db.all(sql`...`) existiert nicht. SQLite strftime/json_each/json_extract in Scheduler-Queries
- **Fix:** db.select().from(...).get() durch await db.select() + [0] ersetzt, db.all() durch await db.execute(), SQL auf PostgreSQL-Syntax umgestellt
- **Files modified:** server/src/scheduler/reportScheduler.ts
- **Verification:** npm run build — kein TypeScript-Fehler
- **Committed in:** 8263647 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (alle Rule 1 — Bugs durch SQLite→PostgreSQL API-Differenzen)
**Impact on plan:** Alle Fixes waren notwendig damit der TypeScript-Build durchläuft. Der Plan-Scope hat sich nicht verändert — die Queries waren bereits in den betroffenen Dateien vorhanden und mussten mit der Schema-Migration konsistent gehalten werden.

## Issues Encountered
Keine unerwarteten Probleme — die SQLite→PostgreSQL API-Differenzen (synchrone vs. async API, SQLite-Funktionen) waren vorhersehbar und konnten direkt behoben werden.

## Next Phase Readiness
- PostgreSQL-Infrastruktur bereit: server/src/db/ ist vollständig PostgreSQL-ready
- Plan 22-02 kann aufbauen: Drizzle-Migrationen generieren + Migrations-Verzeichnis aktualisieren
- Plan 22-03 kann aufbauen: Datenmigration SQLite→PostgreSQL (sqlite-data Volume noch vorhanden)
- Kein Blocker: TypeScript-Build läuft clean durch

---
*Phase: 22-postgresql-migration*
*Completed: 2026-03-24*
