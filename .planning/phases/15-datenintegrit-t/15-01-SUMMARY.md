---
phase: 15-datenintegrit-t
plan: 01
subsystem: api
tags: [fastify, sqlite, reports, cancelled_at, sql-filter]

# Dependency graph
requires:
  - phase: 09-storno-rueckgabe
    provides: cancelled_at-Spalte in der sales-Tabelle (Drizzle-Schema, INTEGER NULL)
provides:
  - Alle fuenf Report-SQL-Queries filtern stornierte Verkauefe via AND cancelled_at IS NULL heraus
affects:
  - 15-02 (falls weitere Datenintegritaets-Korrekturen folgen)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cancelled_at IS NULL als WHERE-Klausel-Filter in allen report-Queries nach created_at-Filtern"

key-files:
  created: []
  modified:
    - server/src/routes/reports.ts

key-decisions:
  - "IS NULL statt = 0 fuer cancelled_at-Filter: SQLite speichert cancelledAt als INTEGER NULL (nicht als 0 bei nicht-storniert)"

patterns-established:
  - "Alle neuen Report-Queries muessen AND cancelled_at IS NULL als Standard-Klausel enthalten"

requirements-completed:
  - DAT-01
  - DAT-02

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 15 Plan 01: Storno-Filter in Report-SQL-Queries Summary

**Sechs AND cancelled_at IS NULL-Filter in alle fuenf SQL-Report-Queries eingefuegt, damit stornierte Verkauefe nicht mehr in Umsatz, Marge, EK-Kosten, Spenden, Top-Artikel und Produktstatistiken einfliessen**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-24T14:38:00Z
- **Completed:** 2026-03-24T14:43:41Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- summary-Query (/reports/monthly): zaehlt und summiert nur nicht-stornierte Verkauefe
- costResult-Query (/reports/monthly): berechnet EK-Kosten nur aus nicht-stornierten Verkauefe
- topArticles-Query (/reports/monthly): Top-5-Ranking enthaelt keine Artikel aus Stornos
- months-Query (/reports/yearly): Monats-Umsatz ohne stornierte Verkauefe
- monthlyCosts-Query (/reports/yearly): Monats-EK-Kosten ohne stornierte Verkauefe
- result-Query (/reports/product/:id/stats): Produktstatistik ohne stornierte Verkauefe

## Task Commits

Jeder Task wurde atomisch committed:

1. **Task 1: Monatsbericht-Queries um Storno-Filter ergaenzen** - `195b711` (fix)
2. **Task 2: Jahresbericht- und Produktstatistik-Queries um Storno-Filter ergaenzen** - `c386bfa` (fix)

**Plan metadata:** (wird in diesem Commit erstellt)

## Files Created/Modified

- `server/src/routes/reports.ts` - Sechs AND cancelled_at IS NULL / AND sales.cancelled_at IS NULL Filter in alle fuenf Report-SQL-Queries eingefuegt (Zeilen 27, 43, 56, 100, 118, 166)

## Decisions Made

- `IS NULL` statt `= 0` fuer cancelled_at: Das Drizzle-Schema speichert `cancelledAt?: number` als SQLite INTEGER NULL wenn nicht storniert. `= 0` waere falsch und wuerde niemals matchen.

## Deviations from Plan

Keine — Plan exakt wie geschrieben ausgefuehrt. Alle sechs Filter (drei summary/costResult/topArticles fuer monthly, zwei months/monthlyCosts fuer yearly, eine result fuer product stats) wurden wie beschrieben eingefuegt.

## Issues Encountered

Keine.

## User Setup Required

Keine — keine externe Konfiguration erforderlich.

## Next Phase Readiness

- DAT-01 (Marge/EK korrekt) und DAT-02 (Stornos herausgerechnet) erfuellt
- Backend-Berichte zeigen jetzt korrekte Zahlen ohne Storno-Verzerrung
- Bereit fuer 15-02 (falls weitere Datenintegritaets-Korrekturen geplant)

## Self-Check: PASSED

- `server/src/routes/reports.ts` vorhanden: JA
- `15-01-SUMMARY.md` vorhanden: JA
- Commit 195b711 vorhanden: JA (fix: filter cancelled sales from monthly report queries)
- Commit c386bfa vorhanden: JA (fix: filter cancelled sales from yearly and product stats queries)

---
*Phase: 15-datenintegrit-t*
*Completed: 2026-03-24*
