---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Pure Online
status: ready_to_plan
stopped_at: null
last_updated: "2026-03-24T22:00:00.000Z"
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.
**Current focus:** Milestone v6.0 — Pure Online (Phase 22: PostgreSQL-Migration)

## Current Position

Phase: 22 of 23 (PostgreSQL-Migration)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-24 — Roadmap v6.0 erstellt (2 Phasen, 13 Requirements)

Progress: [░░░░░░░░░░] 0%

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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v6.0 Roadmap]: PostgreSQL zuerst (Phase 22) — Server bleibt funktional, Client unverändert; Dexie-Entfernung danach (Phase 23)
- [v6.0 Roadmap]: 2 Phasen bei coarse-Granularität — klare Boundary: Server heile, dann Client heile
- [v5.0]: TanStack Query als primäre Datenschicht, Dexie nur noch Offline-Cache nach Phase 21
- [v5.0]: WebSocket-Token via Query-Param (WebSocket-Upgrade-Requests erlauben keine custom Header)
- [Phase 21]: flushOutbox() hat optionalen QueryClient-Parameter — engine.ts bleibt React-frei

### Pending Todos

None yet.

### Blockers/Concerns

- PG-04 (SQLite → PostgreSQL Migrationsskript): Datentransfer muss für Produktion sicher sein — bestehende Verkaufshistorie und Bestand darf nicht verloren gehen
- Nach Dexie-Entfernung (Phase 23): idb-keyval wird aktuell für Session-Storage verwendet — muss durch alternatives Mechanism ersetzt werden (localStorage oder In-Memory)

## Session Continuity

Last session: 2026-03-24T22:00:00.000Z
Stopped at: Roadmap v6.0 erstellt — bereit für /gsd:plan-phase 22
Resume file: None
