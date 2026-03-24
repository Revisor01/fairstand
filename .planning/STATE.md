---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Pure Online
status: unknown
stopped_at: Completed 22-01-PLAN.md
last_updated: "2026-03-24T22:31:17.458Z"
progress:
  total_phases: 17
  completed_phases: 0
  total_plans: 3
  completed_plans: 2
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.
**Current focus:** Phase 22 — PostgreSQL-Migration

## Current Position

Phase: 22 (PostgreSQL-Migration) — EXECUTING
Plan: 3 of 3

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 22-postgresql-migration P01 | 4 | 2 tasks | 9 files |
| Phase 22-postgresql-migration P02 | 5 | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v6.0 Roadmap]: PostgreSQL zuerst (Phase 22) — Server bleibt funktional, Client unverändert; Dexie-Entfernung danach (Phase 23)
- [v6.0 Roadmap]: 2 Phasen bei coarse-Granularität — klare Boundary: Server heile, dann Client heile
- [v5.0]: TanStack Query als primäre Datenschicht, Dexie nur noch Offline-Cache nach Phase 21
- [v5.0]: WebSocket-Token via Query-Param (WebSocket-Upgrade-Requests erlauben keine custom Header)
- [Phase 21]: flushOutbox() hat optionalen QueryClient-Parameter — engine.ts bleibt React-frei
- [Phase 22-postgresql-migration]: pg Pool (max 20) + DATABASE_URL statt SQLite-Datei; sqlite-data Volume beibehalten für Plan 03 Datenmigration; better-sqlite3 noch nicht entfernt
- [Phase 22-postgresql-migration]: db.execute(sql) für komplexe JSON-Abfragen statt Drizzle Query Builder — PostgreSQL jsonb-Syntax hat kein Drizzle-Äquivalent
- [Phase 22-02]: await db.execute(sql).rows statt db.all() — node-postgres kennt kein .all()
- [Phase 22-02]: const [row] = await db.select() mit Array-Destructuring statt .get() — idiomatisch fuer PG-Drizzle

### Pending Todos

None yet.

### Blockers/Concerns

- PG-04 (SQLite → PostgreSQL Migrationsskript): Datentransfer muss für Produktion sicher sein — bestehende Verkaufshistorie und Bestand darf nicht verloren gehen
- Nach Dexie-Entfernung (Phase 23): idb-keyval wird aktuell für Session-Storage verwendet — muss durch alternatives Mechanism ersetzt werden (localStorage oder In-Memory)

## Session Continuity

Last session: 2026-03-24T22:31:17.454Z
Stopped at: Completed 22-01-PLAN.md
Resume file: None
