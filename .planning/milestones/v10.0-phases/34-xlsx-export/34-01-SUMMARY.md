---
phase: 34-xlsx-export
plan: 01
subsystem: api, ui
tags: [xlsx, sheetjs, export, reports, inventur, verkaufshistorie]

# Dependency graph
requires:
  - phase: 27-preis-history-bestandsverlauf
    provides: inventory-csv and sales-csv endpoints as pattern base
provides:
  - GET /api/reports/inventory-xlsx — Inventur-Export als Excel-Datei
  - GET /api/reports/sales-xlsx — Verkaufshistorie-Export als Excel-Datei
  - "Inventur Excel" Button in InventurTab neben CSV/PDF
  - "Excel" Button in DailyReport neben CSV
affects: [future-report-phases, export-features]

# Tech tracking
tech-stack:
  added: [xlsx@0.18.5 (SheetJS Community Edition)]
  patterns: [XLSX.utils.aoa_to_sheet + XLSX.write(buf, {type:'buffer', bookType:'xlsx'}) Pattern für Server-side Excel-Generierung]

key-files:
  created: []
  modified:
    - server/src/routes/reports.ts
    - client/src/features/admin/reports/InventurTab.tsx
    - client/src/features/admin/reports/DailyReport.tsx

key-decisions:
  - "SheetJS (xlsx@0.18.5) als XLSX-Bibliothek — Standard, types inklusive, kein @types nötig"
  - "aoa_to_sheet (array-of-arrays) statt json_to_sheet — ermöglicht gemischte Typen (Strings + Numbers) und Bilanz-Leerzeilen"
  - "Button-Farbe bg-green-700 (dunkler als emerald-600) für visuelle Unterscheidbarkeit der drei Export-Buttons"
  - "Zahlen als Number-Typ (nicht String) in XLSX-Zellen — Excel erkennt sie dann als echte Zahlen, nicht Text"

patterns-established:
  - "XLSX-Endpoint Pattern: identische SQL-Query wie CSV-Pendant, XLSX.utils.aoa_to_sheet, reply.send(buffer) mit korrektem Content-Type"
  - "Frontend Download-Button Pattern: useState+Handler+Button identisch zu CSV/PDF-Buttons"

requirements-completed: [EXP-04, EXP-05]

# Metrics
duration: 12min
completed: 2026-04-03
---

# Phase 34 Plan 01: XLSX-Export Summary

**XLSX-Export via SheetJS für Inventur und Verkaufshistorie — zwei neue Server-Endpoints und zwei neue Download-Buttons mit je einem deutschen Bilanzblock**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-03T22:00:00Z
- **Completed:** 2026-04-03T22:12:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- xlsx (SheetJS) als Server-Dependency installiert und TypeScript-kompatibel eingebunden
- GET /api/reports/inventory-xlsx implementiert mit vollständiger Inventurtabelle inkl. Bilanzzeilen
- GET /api/reports/sales-xlsx implementiert mit spaltenidentischer Struktur zur Verkaufshistorie-CSV
- "Inventur Excel"-Button (green-700) in InventurTab als dritter Button neben CSV und PDF
- "Excel"-Button (green-700) in DailyReport neben dem bestehenden CSV-Button

## Task Commits

Jeder Task wurde atomar committed:

1. **Task 1: xlsx-Bibliothek installieren und Server-Endpoints erstellen** - `7ea194f` (feat)
2. **Task 2: Excel-Download-Buttons im Frontend hinzufügen** - `851a407` (feat)

## Files Created/Modified
- `server/src/routes/reports.ts` — XLSX-Import + zwei neue Endpoints inventory-xlsx und sales-xlsx
- `client/src/features/admin/reports/InventurTab.tsx` — State, Handler und Button für Inventur Excel
- `client/src/features/admin/reports/DailyReport.tsx` — State, Handler und Button für Verkaufshistorie Excel

## Decisions Made
- SheetJS `aoa_to_sheet` (Array-of-Arrays) statt `json_to_sheet`: Erlaubt gemischte Typen in Zellen — Zahlen als echte Number-Werte, Leerzeilen für Bilanzblock, keine Spaltennamen-Bindung nötig
- Zahlen in XLSX als `Number((cents / 100).toFixed(2))` — Excel behandelt sie als Zahlen, nicht als Text; Formeln und Summen funktionieren direkt
- Button-Farbe `bg-green-700` (dunkleres Grün) statt `bg-emerald-600` (CSV) — visuell unterscheidbar bei drei nebeneinanderstehenden Buttons

## Deviations from Plan

Keine — Plan wurde exakt wie beschrieben ausgeführt.

## Issues Encountered

Keine.

## User Setup Required

Keine externe Konfiguration erforderlich. xlsx ist eine reine Build-Dependency, die bereits im Docker-Image gebaut wird.

## Next Phase Readiness

- XLSX-Export vollständig, beide Anforderungen EXP-04 und EXP-05 erfüllt
- Muster für weitere XLSX-Exporte etabliert (aoa_to_sheet + buffer reply)
- Keine Blocker für Phase 35 (Lagerdauer-Analyse)

---
*Phase: 34-xlsx-export*
*Completed: 2026-04-03*
