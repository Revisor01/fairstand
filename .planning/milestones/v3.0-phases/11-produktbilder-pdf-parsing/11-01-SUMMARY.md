---
phase: 11-produktbilder-pdf-parsing
plan: "01"
subsystem: api
tags: [pdf-parsing, pdfjs-dist, sqlite, drizzle, migration, vitest]

requires:
  - phase: 04-rechnungsimport
    provides: parseSuedNordKontorPdf-Interface + importRoutes

provides:
  - PDF-Parser der beide Rechnungsformate (mit/ohne separate Positionsnummer-Zeile + Rabatt-Spalte) korrekt parst
  - imageUrl-Spalte im products-Schema (nullable)
  - Migration 0002_image_url.sql fuer SQLite ALTER TABLE
  - ProductSchema + LWW-Upsert in products.ts um imageUrl erweitert

affects:
  - 11-02 (Produktbilder-Upload baut auf imageUrl-Spalte auf)
  - import.ts (parseSuedNordKontorPdf-Interface unveraendert, abwaertskompatibel)

tech-stack:
  added:
    - vitest (Dev-Dependency fuer Unit-Tests im Server-Package)
  patterns:
    - Von-hinten-Zaehlen fuer Euro/Prozent-Spalten in PDF-Zeilen
    - Positionsnummer-Zeile getrennt von Datenzeile verarbeiten

key-files:
  created:
    - server/src/lib/pdfParser.test.ts
    - server/migrations/0002_image_url.sql
  modified:
    - server/src/lib/pdfParser.ts
    - server/src/db/schema.ts
    - server/src/routes/products.ts
    - server/migrations/meta/_journal.json

key-decisions:
  - "PDF-Layout: Positionsnummer (1., 2., ...) steht in eigener Zeile, Daten in naechster Zeile — beide Formate (2552709 + 2600988) folgen diesem Muster"
  - "Von-hinten-Strategie: letztes Euro-Item = Gesamt, vorletztes = Preis/St., letztes Prozent-Item = MwSt — Rabatt-% dazwischen wird ignoriert ohne parseWarning"
  - "isInvoiceRow erkennt Zeile mit nur N. als Positionsnummer-Zeile, nicht mehr als Hauptdatenzeile"

patterns-established:
  - "PDF-Daten-Parsing: Positionsnummer-Zeile und Datenzeile getrennt verarbeiten"
  - "Vitest fuer Server-Unit-Tests, beide echten PDFs als Test-Fixtures"

requirements-completed:
  - PDF-01
  - IMG-01

duration: 15min
completed: 2026-03-24
---

# Phase 11 Plan 01: PDF-Parser Format-Erkennung + imageUrl-Migration Summary

**PDF-Parser auf spaltenbasierte Von-hinten-Strategie umgestellt: beide Rechnungsformate (2552709 mit Rabatt, 2600988 ohne) parsen korrekt; imageUrl als nullable Spalte in products-Schema + Migration**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-24T12:43:00Z
- **Completed:** 2026-03-24T12:47:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- PDF-Parser erkennt Positionsnummer-Zeile (allein auf eigener Y-Koordinate) und verarbeitet Datenzeile getrennt — beide Rechnungsformate werden ohne parseWarning geparst
- Alle 11 Vitest-Tests bestehen: Menge, Artikelnummer, Preis und Bezeichnung (ohne %-/€-Tokens) korrekt fuer beide Formate
- imageUrl-Spalte in products-Tabelle (schema.ts + Migration 0002) + ProductSchema und LWW-Upsert in products.ts erweitert

## Task Commits

1. **Task 1: PDF-Parser Format-Erkennung + Rabatt-Spalten-Support** - `60d4e9d` (feat)
2. **Task 2: Schema imageUrl + Migration** - `adf99ef` (feat)

## Files Created/Modified

- `server/src/lib/pdfParser.ts` - Parser neu geschrieben: Positionsnummer getrennt von Datenzeile, Von-hinten-Strategie fuer Preis/MwSt
- `server/src/lib/pdfParser.test.ts` - 11 Vitest-Tests fuer beide Rechnungsformate (neu erstellt)
- `server/src/db/schema.ts` - imageUrl: text('image_url') nullable nach active-Spalte
- `server/migrations/0002_image_url.sql` - ALTER TABLE products ADD image_url text
- `server/migrations/meta/_journal.json` - Eintrag fuer Migration 0002 hinzugefuegt
- `server/src/routes/products.ts` - imageUrl in ProductSchema + .values() + LWW-Set-Block

## Decisions Made

- **PDF-Layout erkannt:** Beide Rechnungsformate (2552709 und 2600988) trennen die Positionsnummer in eine eigene Y-Zeile, die echten Spaltendaten folgen in der naechsten Zeile. Der bisherige Parser behandelte die Nummer als Teil der Hauptzeile und versuchte mainRow.slice(1) — was leer war.
- **Von-hinten-Strategie:** Statt hartcodierter Spaltenindizes wird von hinten gezaehlt: letztes €-Item = Gesamt, vorletztes €-Item = Preis/St., letztes %-Item = MwSt. Ein Rabatt-%-Item (z.B. "30 %") zwischen Bezeichnung und Preis/St. wird ignoriert — kein parseWarning.
- **Interface unveraendert:** ParsedInvoiceRow und parseSuedNordKontorPdf-Signatur bleiben identisch, import.ts-Kompatibilitaet gewahrt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Format A (2600988) war ebenfalls defekt — nicht nur Format B**
- **Found during:** Task 1 (PDF-Parser-Analyse)
- **Issue:** Der Plan beschrieb Format A als "funktionierend" und Format B als "defekt". Tatsaechlich folgen beide Formate dem gleichen Layout: Positionsnummer in eigener Zeile. Beide waren defekt.
- **Fix:** Einheitlicher Fix fuer beide Formate — Positionsnummer-Zeile allein erkennen, naechste Zeile als Datenzeile verwenden.
- **Verification:** 11 Vitest-Tests bestehen fuer beide Formate.
- **Committed in:** 60d4e9d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — Bug)
**Impact on plan:** Fix war notwendig fuer Korrektheit, kein Scope Creep. Interface unveraendert.

## Issues Encountered

- pdfjs-dist Worker-Konfiguration in Vitest-Umgebung: `GlobalWorkerOptions.workerSrc` muss gesetzt sein. Da der Parser diese Zeile bereits hatte, war keine Aenderung noetig — Warnungen ("Ensure standardFontDataUrl") sind harmlose Font-Hinweise, kein Fehler.

## Next Phase Readiness

- Plan 11-02 (Produktbilder-Upload) kann imageUrl-Spalte direkt nutzen
- Parser ist fuer beide aktuellen Rechnungsformate stabil; neue Formate koennen mit Test-PDFs als Fixtures abgedeckt werden
- Keine Blocker

---
*Phase: 11-produktbilder-pdf-parsing*
*Completed: 2026-03-24*

## Self-Check: PASSED

- FOUND: server/src/lib/pdfParser.ts
- FOUND: server/src/lib/pdfParser.test.ts
- FOUND: server/src/db/schema.ts
- FOUND: server/migrations/0002_image_url.sql
- FOUND: server/src/routes/products.ts
- FOUND commit 60d4e9d (Task 1)
- FOUND commit adf99ef (Task 2)
