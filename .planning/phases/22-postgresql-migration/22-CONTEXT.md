# Phase 22: PostgreSQL-Migration - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Server-Datenbank von SQLite (better-sqlite3) auf PostgreSQL umstellen. Docker-Compose anpassen, Drizzle-Schema migrieren, Migrationsskript für bestehende Daten erstellen. Client bleibt unverändert.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Drizzle ORM abstrahiert SQL-Dialekt — Schema-Definitionen ändern sich (sqliteTable → pgTable), aber Query-Logik bleibt weitgehend gleich
- Alle Routes nutzen Drizzle-Queries, keine Raw-SQL-Statements (außer in seed.ts und reportScheduler.ts)
- Categories-Route ist bereits vollständig async

### Established Patterns
- DB-Connection in `server/src/db/index.ts` — exportiert `db` und `sqlite` (raw connection)
- Schema in `server/src/db/schema.ts` — 6 Tabellen: products, sales, settings, shops, categories, outboxEvents
- Migrations via `drizzle-kit migrate` im Dockerfile CMD
- Seed-Logik in `server/src/db/seed.ts` — nutzt synchrone better-sqlite3 API (.get(), .all(), .run())
- Routes: sync.ts, products.ts, settings.ts, auth.ts nutzen teils synchrone DB-Calls
- reportScheduler.ts nutzt synchrone DB-Calls

### Integration Points
- `docker-compose.yml` — muss PostgreSQL-Service + Volume hinzufügen, sqlite-data Volume entfernen
- `server/Dockerfile` — DB_PATH env durch DATABASE_URL ersetzen
- `server/package.json` — better-sqlite3 durch pg ersetzen
- `.github/workflows/deploy.yml` — keine Änderungen nötig (baut Images, triggert Portainer Webhook)
- Alle shop_id-basierte Queries bleiben identisch

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
