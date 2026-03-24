---
phase: 18-quick-wins-security
plan: 02
subsystem: api
tags: [fastify, pdfjs-dist, security, pdf-parsing, magic-bytes, timeout]

# Dependency graph
requires:
  - phase: 04-rechnungsimport
    provides: PDF-Upload-Endpoint und parseSuedNordKontorPdf() Implementierung
provides:
  - Magic-Byte-Validierung (isPdf) in import.ts vor Parser-Aufruf
  - Promise.race() 30s-Timeout in parseSuedNordKontorPdf()
affects: [pdf-parsing, import-endpoint, server-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isPdf() als Modul-Level-Hilfsfunktion für Magic-Byte-Check
    - _parsePdf() intern + parseSuedNordKontorPdf() als Promise.race()-Wrapper

key-files:
  created: []
  modified:
    - server/src/routes/import.ts
    - server/src/lib/pdfParser.ts

key-decisions:
  - "isPdf() als Modul-Level-Funktion statt inline im Handler — testbar ohne Fastify-Kontext"
  - "PDF_PARSE_TIMEOUT_MS als benannte Konstante (30s) statt magische Zahl"
  - "_parsePdf() nicht exportiert — Timeout-Wrapper ist die einzige oeffentliche API"

patterns-established:
  - "Magic-Byte-Check: Buffer-Prüfung der ersten 4 Bytes (0x25 0x50 0x44 0x46) vor Parser-Aufruf"
  - "Timeout-Wrapper: Promise.race([actualWork, timeoutPromise]) mit benannter Konstante"

requirements-completed: [FIX-02, FIX-03]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 18 Plan 02: PDF-Sicherheitsfixes Summary

**Magic-Byte-Validierung und 30s Promise.race()-Timeout härten den PDF-Upload-Endpoint gegen Nicht-PDF-Uploads und indefinit blockierende Parser-Aufrufe**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-24T20:06:00Z
- **Completed:** 2026-03-24T20:06:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `isPdf()`-Funktion mit %PDF Magic-Byte-Check (0x25 0x50 0x44 0x46) in import.ts — Dateiendungs-Spoofing verhindert
- 400-Antwort bei fehlendem PDF-Header, bevor der Parser überhaupt aufgerufen wird
- `_parsePdf()` als interne Implementierung; `parseSuedNordKontorPdf()` als Promise.race()-Wrapper mit 30s Timeout
- Server bleibt nach Timeout-Abbruch vollständig responsiv — 422-Antwort über bestehenden catch-Block

## Task Commits

Jeder Task wurde atomar committed:

1. **Task 1: Magic-Byte-Validierung in import.ts** - `bfecd44` (fix)
2. **Task 2: Promise.race() 30s-Timeout in pdfParser.ts** - `8936a1e` (fix)

**Plan-Metadaten:** wird separat committed (docs)

## Files Created/Modified

- `server/src/routes/import.ts` — isPdf()-Funktion + 400-Check vor parseSuedNordKontorPdf()-Aufruf
- `server/src/lib/pdfParser.ts` — _parsePdf() intern umbenannt, parseSuedNordKontorPdf() als 30s-Timeout-Wrapper

## Decisions Made

- `isPdf()` als Modul-Level-Funktion außerhalb von `importRoutes` definiert, damit sie ohne Fastify-Kontext testbar ist
- `PDF_PARSE_TIMEOUT_MS = 30_000` als benannte Konstante — kein Magic Number, selbstdokumentierend
- `_parsePdf()` nicht exportiert — die externe API bleibt ausschließlich `parseSuedNordKontorPdf()`, das Timeout-Verhalten ist kapseliert

## Deviations from Plan

None — Plan wurde exakt wie beschrieben umgesetzt.

## Issues Encountered

None.

## User Setup Required

None — keine externen Services oder Umgebungsvariablen erforderlich.

## Next Phase Readiness

- PDF-Endpoint ist gegen Nicht-PDF-Uploads und hängende Parses gehärtet
- Beide Sicherheitsfixes (FIX-02 Magic Bytes, FIX-03 Timeout) abgeschlossen
- Phase 18-03 kann unabhängig davon beginnen

## Self-Check: PASSED

- `server/src/routes/import.ts` — vorhanden, enthält isPdf + Magic-Byte-Check
- `server/src/lib/pdfParser.ts` — vorhanden, enthält _parsePdf + Promise.race + PDF_PARSE_TIMEOUT_MS
- Commit `bfecd44` — vorhanden (Task 1)
- Commit `8936a1e` — vorhanden (Task 2)

---
*Phase: 18-quick-wins-security*
*Completed: 2026-03-24*
