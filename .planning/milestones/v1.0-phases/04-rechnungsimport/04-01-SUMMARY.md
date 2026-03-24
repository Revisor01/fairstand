---
phase: 04-rechnungsimport
plan: "01"
subsystem: backend
tags: [pdf-parsing, pdfjs-dist, fastify-multipart, invoice-import]
dependency_graph:
  requires: []
  provides: [POST /api/import/parse, parseSuedNordKontorPdf, ParsedInvoiceRow]
  affects: [server/src/index.ts]
tech_stack:
  added: [pdfjs-dist@5.5.207, "@fastify/multipart@9.4.0"]
  patterns: [coordinate-based PDF parsing, multipart file upload, buffer strategy]
key_files:
  created:
    - server/src/lib/pdfParser.ts
    - server/src/routes/import.ts
  modified:
    - server/package.json
    - server/src/index.ts
decisions:
  - "pdfjs-dist/legacy/build/pdf.mjs Import-Pfad fuer Node.js — Standard-Import schlaegt wegen Browser-Worker-Abhaengigkeiten fehl"
  - "GlobalWorkerOptions.workerSrc = '' deaktiviert Worker explizit fuer serverseitiges Parsing"
  - "Buffer-Strategie (toBuffer()) statt Disk-Write — kein temporaeres Volume noetig"
  - "importRoutes registriert @fastify/multipart intern, nicht global — kein Plugin-Konflikt mit anderen Routen"
  - "Spalten-Erkennung via Item-Position (Index) statt fixer X-Koordinaten — robuster gegen unterschiedliche Skalierungen"
  - "parseWarning statt Exception bei Parsing-Problemen — Zeile wird trotzdem zurueckgegeben"
metrics:
  duration: "2 minutes"
  completed: "2026-03-23"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 04 Plan 01: PDF-Parsing Backend — Summary

## One-Liner

Koordinatenbasierter PDF-Parser (pdfjs-dist) mit Fastify-Multipart-Upload-Endpoint fuer Sued-Nord-Kontor-Rechnungen, exportiert ParsedInvoiceRow[] mit EVP-Extraktion aus Bezeichnungsspalte.

## What Was Built

### Task 1: pdfParser.ts Library (Commit: 0684be6)

`server/src/lib/pdfParser.ts` implementiert koordinatenbasiertes PDF-Parsing:

- `ParsedInvoiceRow` Interface: lineNumber, quantity, articleNumber, name, purchasePriceCents, evpCents, vatRate, parseWarning
- `parseSuedNordKontorPdf(buffer: Buffer)`: Iteriert alle PDF-Seiten via `pdf.numPages`, ruft `getTextContent()` auf, gruppiert Items nach Y-Koordinate, erkennt Rechnungszeilen via `/^\d+\./`, sammelt bis zu 2 Fortsetzungszeilen fuer mehrzeilige Bezeichnungen
- `groupByRows(items, tolerance=2)`: Y-Koordinaten-Gruppierung mit 2-Punkt-Toleranz, Y absteigend, X aufsteigend
- `extractEvp(designation)`: Regex `/EVP\s*€\s*([\d]+[,.][\d]{2})/i` auf zusammengefuegter Bezeichnung, entfernt `(Hersteller, EVP € X,XX)`-Klammer
- `parseEuroCents(str)`: "€ 2,35" → 235 (Komma→Punkt, Math.round)
- `parseMwSt(str)`: Gibt nur 7 oder 19 zurueck, null bei anderem Wert

Installierte Pakete: `pdfjs-dist@5.5.207`, `@fastify/multipart@9.4.0`

### Task 2: Import-Route (Commit: d569df6)

`server/src/routes/import.ts` implementiert POST /api/import/parse:

- `@fastify/multipart` intern registriert (10 MB Limit, 1 Datei)
- Ablehnung bei fehlender Datei → 400
- Ablehnung bei Nicht-PDF (Dateiendung) → 400
- Parse-Fehler → 422 mit detail-Feld
- Erfolg → `{ rows: ParsedInvoiceRow[], filename: string }`

`server/src/index.ts` um `importRoutes` Import und Registrierung mit `{ prefix: '/api' }` erweitert — nach settingsRoutes, vor fastifySchedule.

## Verification

TypeScript kompiliert ohne Fehler (`npx tsc --noEmit` → kein Output).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @ts-expect-error Direktive entfernt**
- **Found during:** Task 1 TypeScript-Verifikation
- **Issue:** `@ts-expect-error` Kommentar war ueberfluessig — pdfjs-dist hat eigene Typdefinitionen fuer den Legacy-Build-Pfad
- **Fix:** Kommentar entfernt, TypeScript kompiliert ohne weitere Anpassung
- **Files modified:** server/src/lib/pdfParser.ts
- **Commit:** 0684be6 (inline fix vor Commit)

**2. [Rule 2 - Improvement] Spalten-Erkennung via Item-Index statt fixer X-Koordinaten**
- **Found during:** Task 1 Implementierung
- **Issue:** Plan beschrieb X-Koordinaten-Reihenfolge, aber RESEARCH.md Open Question 1 stellt fest dass exakte X-Werte unbekannt sind ohne Live-Test
- **Fix:** Spalten werden via Item-Index bestimmt (Item 0=Nummer, 1=Menge, 2=Artikelnummer, dann dynamisch Euro/Prozent-Items von hinten identifiziert). Robuster gegen verschiedene Skalierungen und PDF-Generatoren.
- **Files modified:** server/src/lib/pdfParser.ts

## Known Stubs

Keine. Der Parser gibt vollstaendig implementierte Logik zurueck. EVP-Extraktion, mehrzeilige Bezeichnungen und alle Spalten sind implementiert. Echttest mit Originaldokumenten wird in 04-02 (Frontend) benoetigt.

## Self-Check: PASSED

- FOUND: server/src/lib/pdfParser.ts
- FOUND: server/src/routes/import.ts
- FOUND commit 0684be6: feat(04-01): add pdfjs-dist and @fastify/multipart, create pdfParser.ts
- FOUND commit d569df6: feat(04-01): add POST /api/import/parse endpoint for PDF upload
