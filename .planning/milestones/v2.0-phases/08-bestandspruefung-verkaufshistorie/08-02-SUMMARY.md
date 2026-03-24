---
phase: 08-bestandspruefung-verkaufshistorie
plan: 02
subsystem: ui, api
tags: [react, typescript, dexie, fastify, sqlite, date-fns, modal]

# Dependency graph
requires:
  - phase: 08-01
    provides: useCart mit AddItemResult, Bestandsanzeige auf Artikelkacheln
provides:
  - SaleDetailModal mit Artikel-Breakdown (Name, Menge, Preis × Menge pro SaleItem)
  - DailyReport-Zeilen antippbar mit onPointerDown + selectedSale-State
  - GET /api/reports/product/:id/stats?shopId=xxx&months=N Endpoint
  - ProductStats-Komponente mit Kennzahlen-Kacheln und Zeitraum-Auswahl
  - Statistik-Button in Produktliste (view state 'stats')
affects: [phase-09, reports, admin]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sale-Objekt als Prop an Modal übergeben — kein eigenes Dexie-Query im Modal nötig"
    - "view-State-Erweiterung in ProductList für neue Unter-Ansichten (form/stock/stats)"
    - "navigator.onLine-Check vor Server-Fetch für saubere Offline-Hinweise"

key-files:
  created:
    - client/src/features/admin/reports/SaleDetailModal.tsx
    - client/src/features/admin/products/ProductStats.tsx
  modified:
    - client/src/features/admin/reports/DailyReport.tsx
    - client/src/features/admin/products/ProductList.tsx
    - server/src/routes/reports.ts

key-decisions:
  - "Sale-Objekt als Prop an SaleDetailModal übergeben — offline-fähig ohne eigenes Dexie-Query im Modal"
  - "ProductStats fetcht vom Server und zeigt Hinweis bei offline — Statistik ist Server-Side-Only"
  - "Statistik-Button zwischen Bearbeiten und Bestand eingefügt — logische Position in der Button-Gruppe"

patterns-established:
  - "Modal bekommt Daten als Prop, kein eigenes Query — vermeidet doppelte Datenbank-Abfragen"
  - "view-State in ListViews erweitern statt neue Route anlegen — passend zu App-Architektur ohne Router"

requirements-completed: [HIST-01, HIST-02]

# Metrics
duration: 10min
completed: 2026-03-24
---

# Phase 08 Plan 02: Anklickbare Tagesübersicht und Artikel-Statistik Summary

**Tippbare Verkaufszeilen in DailyReport mit SaleDetailModal (Artikel-Breakdown offline) und serverseitiger Artikel-Statistik via ProductStats-Komponente mit GET /api/reports/product/:id/stats**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-24T10:38:00Z
- **Completed:** 2026-03-24T10:48:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- DailyReport-Tabellenzeilen sind antippbar — Tipp öffnet SaleDetailModal mit vollständigem Artikel-Breakdown
- SaleDetailModal zeigt Name, Menge, Preis × Menge pro SaleItem sowie Gesamtbetrag und ggf. Spende — vollständig offline aus Dexie-Daten
- Neuer GET /api/reports/product/:id/stats Endpoint mit konfigurierbarem Zeitraum (1–24 Monate) gibt sale_count, total_qty, revenue_cents zurück
- ProductStats-Komponente zeigt Kennzahlen in drei Kacheln mit Zeitraum-Auswahl (1/3/6/12 Monate)
- Statistik-Button in Produktliste führt zu ProductStats — Offline-Hinweis wenn navigator.onLine false

## Task Commits

1. **Task 1: SaleDetailModal + DailyReport tippbare Zeilen** - `487d0f6` (feat)
2. **Task 2: Server-Endpoint Artikel-Statistik + ProductStats + ProductList-Integration** - `70384d3` (feat)

**Plan metadata:** (folgt nach SUMMARY-Commit)

## Files Created/Modified
- `client/src/features/admin/reports/SaleDetailModal.tsx` - neues Modal: Artikel-Liste mit Menge/Preis, Footer mit Summen
- `client/src/features/admin/reports/DailyReport.tsx` - selectedSale-State, onPointerDown auf Tabellenzeilen, Modal-Rendering
- `client/src/features/admin/products/ProductStats.tsx` - neue Komponente: Kennzahlen-Kacheln, Zeitraum-Buttons, Offline-Hinweis
- `client/src/features/admin/products/ProductList.tsx` - view-State 'stats' ergänzt, openStats-Funktion, Statistik-Button
- `server/src/routes/reports.ts` - neuer GET /reports/product/:id/stats Endpoint mit JSON-Array-Auflösung

## Decisions Made
- Sale-Objekt als Prop an SaleDetailModal übergeben — kein eigenes Dexie-Query im Modal nötig, da DailyReport die Daten bereits aus useLiveQuery hat
- ProductStats fetcht nur bei navigator.onLine — klarer Hinweis statt failed fetch, konsistent mit MonthlyReport-Muster aus Phase 03
- Statistik-Button zwischen Bearbeiten und Bestand platziert — logische Gruppierung in bestehender Button-Zeile

## Deviations from Plan

None — Plan exakt wie spezifiziert ausgeführt.

## Issues Encountered
- utils.js existiert nicht, tatsächliche Datei ist utils.ts — Import-Pfad im Plan korrekt (`.js` Extension bleibt für ESM-Auflösung durch TypeScript)

## User Setup Required
None — keine externen Dienste, keine Umgebungsvariablen.

## Next Phase Readiness
- HIST-01 und HIST-02 erfüllt: Tagesübersicht antippbar, Artikel-Statistik verfügbar
- Phase 09 (Bestandskorrektur / STOR-01) kann auf Phase 08 aufbauen
- Keine offenen Blocker

## Self-Check: PASSED
- FOUND: client/src/features/admin/reports/SaleDetailModal.tsx
- FOUND: client/src/features/admin/products/ProductStats.tsx
- FOUND: .planning/phases/08-bestandspruefung-verkaufshistorie/08-02-SUMMARY.md
- FOUND: commit 487d0f6 (Task 1)
- FOUND: commit 70384d3 (Task 2)

---
*Phase: 08-bestandspruefung-verkaufshistorie*
*Completed: 2026-03-24*
