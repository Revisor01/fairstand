---
phase: 29-export
plan: "02"
subsystem: frontend/reports
tags: [export, csv, pdf, download, frontend]
dependency_graph:
  requires:
    - 29-01 (CSV + PDF Export-Endpoints im Backend)
  provides:
    - Download-Buttons in allen drei Report-Komponenten
  affects:
    - client/src/features/admin/reports/DailyReport.tsx
    - client/src/features/admin/reports/MonthlyReport.tsx
    - client/src/features/admin/reports/SaleDetailModal.tsx
tech_stack:
  added: []
  patterns:
    - fetch + blob download pattern mit URL.createObjectURL
    - Loading-State per Button mit animate-spin Spinner
    - Error-Handling via alert() + console.error
key_files:
  created: []
  modified:
    - client/src/features/admin/reports/DailyReport.tsx
    - client/src/features/admin/reports/MonthlyReport.tsx
    - client/src/features/admin/reports/SaleDetailModal.tsx
decisions:
  - fetch+blob inline pattern ohne separate Helper-Datei — einfach, kein shared state nötig
  - PDF-Beleg-Button nur bei nicht-stornierten Sales — stornierte Belege haben keinen Sinn
  - Download-Buttons disabled wenn keine Daten vorhanden (DailyReport: sales.length === 0)
metrics:
  duration_seconds: 113
  completed_date: "2026-04-01T22:17:20Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
requirements:
  - EXP-01
  - EXP-02
  - EXP-03
---

# Phase 29 Plan 02: Frontend-Download-Buttons (CSV + PDF) Summary

**One-liner:** fetch+blob Download-Buttons in DailyReport (CSV), MonthlyReport Inventur-Tab (CSV + PDF) und SaleDetailModal (PDF-Beleg) verdrahtet mit den Backend-Endpoints aus Plan 01.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DailyReport CSV-Export-Button | 096ceda | DailyReport.tsx |
| 2 | MonthlyReport Inventur-Buttons + SaleDetailModal PDF-Beleg | c93858f | MonthlyReport.tsx, SaleDetailModal.tsx |

## What Was Built

### Task 1: DailyReport CSV-Export-Button
- `downloadingCsv` State + `handleCsvDownload()` inline async function
- Fetch `/api/reports/sales-csv?from={rangeStart}&to={rangeEnd}` mit authFetch
- Blob-Download als `verkaufshistorie-{YYYY-MM-DD}.csv`
- Grüner Button in Toolbar neben Range-Buttons, disabled wenn keine Sales oder Loading
- animate-spin Spinner im Loading-State

### Task 2: MonthlyReport Inventur-Buttons
- `downloadingInventurCsv` + `downloadingInventurPdf` States
- `handleInventurCsvDownload()` + `handleInventurPdfDownload()` Funktionen
- Fetch `/api/reports/inventory-csv?year={year}` und `/api/reports/inventory-pdf?year={year}`
- Blob-Download als `inventur-{year}.csv` und `inventur-{year}.pdf`
- Grüner CSV-Button + blauer PDF-Button, nur sichtbar wenn inventoryData geladen

### Task 2: SaleDetailModal PDF-Beleg-Button
- `downloadingPdf` State + `handleReceiptPdfDownload()` Funktion
- Fetch `/api/sales/{sale.id}/receipt-pdf`
- Blob-Download als `beleg-{ID_SLICE_UPPER}-{YYYY-MM-DD}.pdf`
- Slate-grauer Button im Modal-Footer, nur bei nicht-stornierten Sales sichtbar

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - alle Download-Buttons sind vollständig mit realen Backend-Endpoints verdrahtet.

## Self-Check: PASSED
