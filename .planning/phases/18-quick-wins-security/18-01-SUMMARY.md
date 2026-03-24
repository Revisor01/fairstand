---
phase: 18-quick-wins-security
plan: 01
subsystem: api
tags: [cors, security, scheduler, reports, fastify, sqlite]

# Dependency graph
requires:
  - phase: 15-datenintegrit-t
    provides: "cancelled_at IS NULL Muster in reports.ts als Referenz"
provides:
  - "Storno-Filter in Scheduler-Reports (5 SQL-Queries mit cancelled_at IS NULL)"
  - "CORS fail-closed — Server startet nicht ohne CORS_ORIGIN env var"
affects: [phase-19, phase-20, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cancelled_at IS NULL als Pflicht-Filter auf allen sales-Queries"
    - "CORS fail-closed: Env-Var zwingend, kein Wildcard-Fallback"
    - "Kommaseparierte Origins in einer Env-Var für mehrere erlaubte Domains"

key-files:
  created: []
  modified:
    - server/src/scheduler/reportScheduler.ts
    - server/src/index.ts

key-decisions:
  - "Scheduler-Queries folgen jetzt exakt dem Muster aus reports.ts (cancelled_at IS NULL)"
  - "CORS_ORIGIN ist zwingend — fail closed verhindert versehentlichen Wildcard-Betrieb"
  - "Requests ohne Origin-Header bleiben erlaubt (curl, Server-zu-Server-Calls)"

patterns-established:
  - "Alle SQL-Queries auf der sales-Tabelle müssen cancelled_at IS NULL enthalten"
  - "Env-Var-Validierung am Server-Start: fehlt Pflicht-Var, Fehler statt Fallback"

requirements-completed: [FIX-01, SEC-01]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 18 Plan 01: Quick Wins Security Summary

**Report-Scheduler filtert jetzt stornierte Verkäufe (5 SQL-Queries), CORS akzeptiert keinen Wildcard-Default mehr sondern verlangt explizite CORS_ORIGIN Env-Var**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T20:10:00Z
- **Completed:** 2026-03-24T20:18:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Alle 5 SQL-Queries in reportScheduler.ts mit `AND cancelled_at IS NULL` ergänzt — Monats- und Jahresberichte enthalten keine stornierten Verkäufe mehr
- CORS-Konfiguration in index.ts von Wildcard-Fallback auf fail-closed umgestellt — Server wirft beim Start einen Fehler wenn CORS_ORIGIN nicht gesetzt ist
- TypeScript-Build fehlerfrei nach beiden Änderungen

## Task Commits

Jeder Task wurde atomisch committed:

1. **Task 1: Storno-Filter in reportScheduler.ts** - `3ee1bae` (fix)
2. **Task 2: CORS fail-closed in index.ts** - `138dcef` (in 18-03 Commit integriert, da paralleler Agent index.ts gleichzeitig bearbeitet hat)

## Files Created/Modified

- `server/src/scheduler/reportScheduler.ts` - 5 WHERE-Klauseln mit `AND cancelled_at IS NULL` ergänzt (Monat: summary, EK-Kosten, top-Artikel; Jahr: Monatsübersicht, EK-Kosten)
- `server/src/index.ts` - CORS von `origin: process.env.CORS_ORIGIN ?? '*'` auf explizite Origin-Validierung mit Fehler bei fehlender Env-Var umgestellt

## Decisions Made

- Requests ohne Origin-Header (curl, Server-zu-Server) bleiben erlaubt — kein Breaking Change für interne Healthchecks und Deployment-Automation
- Kommaseparierte Origins in einer Env-Var (`CORS_ORIGIN=https://a.de,http://localhost:5173`) statt JSON-Array — einfacher in Docker-Compose zu konfigurieren

## Deviations from Plan

Task 2 (CORS-Änderung in index.ts): Meine Edit-Änderung wurde von einem parallel laufenden Agenten (18-03: Rate-Limiting + Session-Store + Auth-Middleware) in seinen Commit `138dcef` integriert, da er index.ts zur gleichen Zeit bearbeitete. Die Änderung ist vollständig und korrekt enthalten — nur der Commit-Hash weicht vom erwarteten einzelnen Task-Commit ab.

Keine funktionalen Abweichungen vom Plan.

## Issues Encountered

Keine technischen Probleme. Der parallele Ausführungskontext führte dazu, dass index.ts zwischen meinem Read und meinem Edit von einem anderen Agenten modifiziert wurde — der zweite Read-Zyklus hat die aktuelle Version korrekt erfasst.

## User Setup Required

**Deployment-Aktion erforderlich:** Die Env-Var `CORS_ORIGIN` muss in der Docker-Konfiguration gesetzt sein, sonst startet der Server nicht mehr.

Beispiel für docker-compose.yml oder Portainer:
```
CORS_ORIGIN=https://fairstand.godsapp.de
```

Mehrere Origins (z.B. für lokale Entwicklung):
```
CORS_ORIGIN=https://fairstand.godsapp.de,http://localhost:5173
```

## Next Phase Readiness

- Phase 18-02 (PDF-Parser-Timeout) und 18-03 (Rate-Limiting) können unabhängig fortgesetzt werden
- CORS und Storno-Filter sind abgeschlossen — keine offenen Punkte aus diesem Plan

---
*Phase: 18-quick-wins-security*
*Completed: 2026-03-24*
