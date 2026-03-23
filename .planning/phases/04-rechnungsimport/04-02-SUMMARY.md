---
phase: 04-rechnungsimport
plan: 02
subsystem: ui
tags: [react, typescript, dexie, idb-keyval, tailwind, import, pdf, offline]

requires:
  - phase: 04-01
    provides: POST /api/import/parse Endpoint und ParsedInvoiceRow-Interface

provides:
  - ImportScreen: Upload-Flow, Matching gegen Dexie, Bestandsbuchung via Outbox
  - UploadZone: Drag-and-Drop + Datei-Button mit Online-Check
  - ReviewTable: Editierbare Tabelle mit bg-green-50/bg-orange-50 Farbcodierung und Checkboxen
  - Import-Tab als 4. Tab im Admin-Bereich

affects:
  - AdminScreen
  - Dexie products/outbox
  - flushOutbox Sync-Engine

tech-stack:
  added: [idb-keyval (Import-Historie)]
  patterns:
    - Matching via Map(articleNumber.toLowerCase().trim())
    - STOCK_ADJUST Outbox-Eintrag mit positivem Delta fuer Wareneingang
    - idb-keyval fuer Import-Historie (Key: import-history, max 50 Eintraege)
    - defaultValue + onBlur fuer Euro-Felder in Tabelle (unkontrollierte Inputs)

key-files:
  created:
    - client/src/features/admin/import/ImportScreen.tsx
    - client/src/features/admin/import/UploadZone.tsx
    - client/src/features/admin/import/ReviewTable.tsx
  modified:
    - client/src/features/admin/AdminScreen.tsx

key-decisions:
  - "defaultValue + onBlur statt value + onChange fuer Euro-Felder in ReviewTable — vermeidet Cursor-Springen beim Tippen in unkontrollierten Decimal-Inputs"
  - "MatchedRow-Interface in ReviewTable.tsx exportiert — ImportScreen importiert es von dort statt doppelter Definition"
  - "Import-Tab zwischen Berichte und Einstellungen eingefuegt — logische Reihenfolge Produkte > Berichte > Import > Einstellungen"

patterns-established:
  - "Offline-Check per navigator.onLine in UploadZone analog MonthlyReport — frühes Abfangen ohne Fetch-Fehler"
  - "Fire-and-forget fetch fuer neue Produkte bei Online-Status — konsistent mit ProductForm"
  - "Outbox STOCK_ADJUST mit positivem delta fuer Warenzugaenge — konsistent mit bestehendem Sync-Pattern"

requirements-completed: [IMP-03, IMP-04, IMP-05]

duration: 8min
completed: 2026-03-23
---

# Phase 04 Plan 02: Frontend Import-UI Summary

**Drag-and-Drop PDF-Upload mit editierbarer Review-Tabelle, Dexie-Matching und STOCK_ADJUST Outbox-Buchung nach manueller Freigabe — integriert als 4. Import-Tab im Admin-Bereich**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-23T18:07:38Z
- **Completed:** 2026-03-23T18:15:00Z
- **Tasks:** 3 (inkl. Task 3: checkpoint:human-verify — approved)
- **Files modified:** 4

## Accomplishments

- UploadZone mit Drag-and-Drop, Datei-Button, Online-Check (offline: klare Meldung) und Client-seitiger Validierung (nur .pdf, max 10 MB)
- ReviewTable mit editierbaren Feldern (Menge, Artikelnr., Bezeichnung, EK, EVP, MwSt), bg-green-50 fuer bekannte Artikel und bg-orange-50 fuer neue, Checkboxen pro Zeile und alle-an/aus, Parse-Warnungen als Amber-Zeilen
- ImportScreen mit vollstaendigem State-Management: Upload-Handler, Matching via Map gegen Dexie, Commit-Handler (neue Produkte anlegen + fire-and-forget Sync + STOCK_ADJUST Outbox + lokaler Bestandsupdate + flushOutbox), Import-Historie in idb-keyval
- Import-Tab als 4. Tab in AdminScreen, AdminTab-Typ auf 4 Werte erweitert

## Task Commits

1. **Task 1: ImportScreen, UploadZone und ReviewTable Komponenten erstellen** - `f770cf7` (feat)
2. **Task 2: Import-Tab in AdminScreen integrieren** - `38b3562` (feat)

## Files Created/Modified

- `client/src/features/admin/import/UploadZone.tsx` — Drag-and-Drop + Datei-Button + Online-Check
- `client/src/features/admin/import/ReviewTable.tsx` — Editierbare Tabelle mit Farbcodierung, Checkboxen, MatchedRow-Interface exportiert
- `client/src/features/admin/import/ImportScreen.tsx` — Haupt-State-Management, Upload, Matching, Freigabe, Import-Historie
- `client/src/features/admin/AdminScreen.tsx` — AdminTab-Typ erweitert, Import-Tab eingefuegt

## Decisions Made

- `defaultValue + onBlur` statt kontrollierter Inputs fuer Euro-Felder in ReviewTable — vermeidet Cursor-Springen bei Dezimal-Eingabe
- `MatchedRow`-Interface in ReviewTable.tsx exportiert und in ImportScreen importiert — Single Source of Truth
- Import-Tab zwischen Berichte und Einstellungen eingefuegt — logische Position im Admin-Workflow

## Deviations from Plan

Keine — Plan exakt wie spezifiziert umgesetzt.

## Issues Encountered

Keine.

## User Setup Required

Keine externe Konfiguration erforderlich.

## Next Phase Readiness

- Import-Flow vollstaendig implementiert und durch Nutzerin visuell verifiziert (Task 3 approved)
- Phase 04 abgeschlossen
- Offen: PDF-Parsing-Validierung mit echter Sued-Nord-Kontor Rechnung (dokumentierter Blocker in STATE.md)

## Self-Check: PASSED

- ImportScreen.tsx: FOUND
- UploadZone.tsx: FOUND
- ReviewTable.tsx: FOUND
- 04-02-SUMMARY.md: FOUND
- Commit f770cf7: FOUND
- Commit 38b3562: FOUND

---
*Phase: 04-rechnungsimport*
*Completed: 2026-03-23*
