---
phase: 29-export
plan: 01
subsystem: api
tags: [pdfkit, csv-stringify, fastify, export, pdf, csv]

# Dependency graph
requires:
  - phase: 28-inventur
    provides: Inventur-Query-Pattern (three-query inventory, EK-breakdown map)
provides:
  - GET /reports/sales-csv — Verkaufshistorie als CSV (EXP-01)
  - GET /reports/inventory-csv — Inventur als CSV mit Summenzeile (EXP-02)
  - GET /reports/inventory-pdf — Inventur als PDF-Tabelle für Jahresabschluss (EXP-02)
  - GET /sales/:id/receipt-pdf — Einzelverkauf-Beleg als PDF (EXP-03)
affects: [29-02-frontend, future-export-phases]

# Tech tracking
tech-stack:
  added: [pdfkit@0.18, csv-stringify@6.7, @types/pdfkit@0.17]
  patterns:
    - Server-side CSV-Streaming via csv-stringify direkt in Fastify reply
    - PDFDocument.end() vor reply.send(doc) — wichtig für korrekte PDF-Übertragung
    - BOM + Semikolon-Delimiter für Excel-kompatible CSV-Exports
    - Inventur-Queries dupliziert (kein Extract) für bessere Lesbarkeit

key-files:
  created: []
  modified:
    - server/src/routes/reports.ts
    - server/src/routes/sales.ts
    - server/package.json

key-decisions:
  - "CSV-Streaming via csv-stringify direkt in Fastify reply statt Buffer-Accumulation"
  - "PDFKit server-side für PDF-Generierung — kein Client-side Rendering"
  - "Inventur-Queries in Exports dupliziert, nicht extrahiert — bleibt lesbar ohne Abstraktion"
  - "doc.end() muss vor reply.send(doc) aufgerufen werden (PDFKit-Pitfall)"

patterns-established:
  - "CSV-Export: delimiter ';', bom: true, quoted: true für Excel-Kompatibilität"
  - "PDF-Export: PDFDocument.end() vor reply.send(doc)"

requirements-completed: [EXP-01, EXP-02, EXP-03]

# Metrics
duration: 15min
completed: 2026-04-01
---

# Phase 29 Plan 01: Export-Backend Summary

**Vier Export-Endpoints mit pdfkit + csv-stringify: Verkaufshistorie-CSV, Inventur-CSV mit Summenzeile, Inventur-PDF für Kirchenkreis-Jahresabschluss, Einzelverkauf-Beleg-PDF**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-01T22:09:58Z
- **Completed:** 2026-04-01T22:13:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- CSV-Export-Endpoints für Verkaufshistorie und Inventur mit UTF-8 BOM + Semikolon (Excel-kompatibel)
- Inventur-PDF mit Shop-Name, Artikeltabelle, EK-Breakdown-Bestandswert und Gesamtsumme
- Einzelbeleg-PDF mit Artikeln, Summen, Wechselgeld und Spendenhervorhebung (grün)
- Alle vier Endpoints TypeScript-sauber, streaming-basiert

## Task Commits

1. **Task 1: CSV-Export-Endpoints** - `ab92b42` (feat)
2. **Task 2: PDF-Export-Endpoints** - `9634e52` (feat)

## Files Created/Modified
- `server/src/routes/reports.ts` - Drei neue Endpoints: sales-csv, inventory-csv, inventory-pdf
- `server/src/routes/sales.ts` - Neuer Endpoint: receipt-pdf
- `server/package.json` - pdfkit, csv-stringify, @types/pdfkit hinzugefügt

## Decisions Made
- CSV-Streaming direkt in Fastify reply via csv-stringify (kein Buffer-Akkumulieren)
- PDFKit server-side: doc.end() muss vor reply.send(doc) aufgerufen werden
- Inventur-Queries in CSV + PDF dupliziert, nicht in Hilfsfunktion extrahiert — Lesbarkeit hat Vorrang bei 3 ähnlichen Endpoints
- yearNum statt y als Variable für Jahres-Integer im inventory-pdf-Endpoint (Konflikt mit let y für PDF-Layout-Koordinaten)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Variable-Konflikt `y` in inventory-pdf-Endpoint behoben**
- **Found during:** Task 2 (TypeScript-Kompilierung)
- **Issue:** `const y = Number(year)` und `let y = 110` (PDF-Layout-Koordinate) im gleichen Funktionsscope — TypeScript-Fehler TS2451
- **Fix:** `const y` umbenannt zu `const yearNum` im inventory-pdf-Endpoint
- **Files modified:** server/src/routes/reports.ts
- **Verification:** `npx tsc --noEmit` ohne Fehler
- **Committed in:** 9634e52 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minimale Namenskorrektur, kein Scope-Creep.

## Issues Encountered
None — nach Variable-Umbennenung kompiliert TypeScript fehlerfrei.

## User Setup Required
None - keine externen Dienste.

## Next Phase Readiness
- Alle vier Export-Endpoints bereit für Frontend-Integration (Plan 29-02)
- CSV-Endpoints: Semikolon-Delimiter, UTF-8 BOM, quoted=true — direkt von Excel öffenbar
- PDF-Endpoints: application/pdf Content-Type, attachment Content-Disposition

## Self-Check: PASSED
- server/src/routes/reports.ts: FOUND
- server/src/routes/sales.ts: FOUND
- .planning/phases/29-export/29-01-SUMMARY.md: FOUND
- Commit ab92b42: FOUND
- Commit 9634e52: FOUND

---
*Phase: 29-export*
*Completed: 2026-04-01*
