---
phase: 03-warenwirtschaft-berichte
plan: 02
subsystem: ui
tags: [react, dexie, dexie-react-hooks, tailwindcss, date-fns, typescript, pwa, offline-first]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Dexie-Schema mit minStock, OutboxEntry STOCK_ADJUST, AdminScreen-Shell, server-seitiger POST /api/products Endpoint"
provides:
  - "Vollstaendige Produktverwaltung: ProductList (alphabetisch + Kategorie-Filter), ProductForm (Anlegen/Bearbeiten mit Cent-Konvertierung + Server-Sync), StockAdjustModal (Delta-Bestandskorrektur + Outbox)"
  - "Mindestbestand-Banner (LowStockBanner) im POS-Screen"
  - "Mindestbestand-Badge am Verwaltung-Button (POSScreen) und am Produkte-Tab (AdminScreen)"
  - "useLowStockCount Hook als wiederverwendbarer reaktiver Mindestbestand-Zaehler"
  - "Tagesuebersicht (DailyReport) mit Verkaeufe/Umsatz/Spenden-Kacheln + Einzelliste + Datumswechsel"
affects: [03-03, phase-04-rechnungsimport]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UnlockedApp-Wrapper-Komponente fuer Hooks die immer aufgerufen werden muessen (React-Hook-Regel)"
    - "Fire-and-forget fetch-Sync bei navigator.onLine nach Dexie-Write (kein Outbox-Pattern fuer Produkt-CRUD)"
    - "Delta-Prinzip bei Bestandskorrektur via db.outbox STOCK_ADJUST (nie Absolutwert)"
    - "useLiveQuery mit Fallback-Default-Array [] fuer sofortige Render-Bereitschaft ohne Lade-Flicker"

key-files:
  created:
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/admin/products/ProductForm.tsx
    - client/src/features/admin/products/StockAdjustModal.tsx
    - client/src/features/pos/LowStockBanner.tsx
    - client/src/hooks/useLowStockCount.ts
    - client/src/features/admin/reports/DailyReport.tsx
  modified:
    - client/src/features/admin/AdminScreen.tsx
    - client/src/features/pos/POSScreen.tsx
    - client/src/App.tsx

key-decisions:
  - "UnlockedApp als separate Komponente: useLowStockCount Hook muss immer aufgerufen werden (React-Hook-Regel verhindert bedingten Aufruf nach if-state-checks)"
  - "lowStockCount als optionale Prop in POSScreen statt Hook direkt — kein Hook-Doppelaufruf, keine IndexedDB-Doppelabfrage"
  - "fire-and-forget fetch-Sync fuer Produkt-CRUD bei navigator.onLine — kein Outbox-Pattern noetig da POST /api/products bereits LWW-Upsert ist"

patterns-established:
  - "Produkt-CRUD-Sync-Pattern: Dexie-Write → navigator.onLine check → fire-and-forget fetch → catch console.warn"
  - "Bestandskorrektur-Pattern: db.transaction('rw') mit products.modify() + outbox.add(STOCK_ADJUST)"

requirements-completed: [WAR-01, WAR-02, WAR-03, WAR-05, WAR-06, POS-08]

# Metrics
duration: 18min
completed: 2026-03-23
---

# Phase 3 Plan 02: Produktverwaltung + Mindestbestand + Tagesuebersicht Summary

**Vollstaendige Produktverwaltungs-UI mit Kategorie-Filter, Bestandskorrektur via Delta-Outbox, Mindestbestand-Banner im POS-Screen plus Badge am Verwaltung-Button, und Tagesuebersicht mit drei Kennzahlen-Kacheln**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-23T13:35:00Z
- **Completed:** 2026-03-23T13:53:00Z
- **Tasks:** 2
- **Files modified:** 9 (6 neu erstellt, 3 aktualisiert)

## Accomplishments

- Produktverwaltung mit alphabetisch sortierter Liste, Kategorie-Filter, Anlegen/Bearbeiten (inkl. Cent-Konvertierung + minStock-Feld + Server-Sync bei Online-Status), Deaktivieren/Aktivieren-Toggle, visueller Bestand-Warnung
- Bestandskorrektur via StockAdjustModal mit Delta-Prinzip und Grund-Freitext, schreibt STOCK_ADJUST in Outbox fuer Sync
- Mindestbestand-Warnung: LowStockBanner oben im POS-Screen + Badge-Zahl am Verwaltung-Button (POSScreen) + Badge am Produkte-Tab (AdminScreen) via useLowStockCount Hook
- Tagesuebersicht: 3 Kennzahlen-Kacheln (Anzahl Verkaeufe, Gesamtumsatz, Gesamtspenden) + sortierte Einzelliste + Datumswechsel (Heute/Gestern/Datepicker)

## Task Commits

Jeder Task wurde atomar committed:

1. **Task 1: Produktverwaltung** - `c2156a7` (feat)
2. **Task 2: Mindestbestand-Banner + Badge + Tagesuebersicht** - `f26bbc0` (feat)

## Files Created/Modified

- `client/src/features/admin/products/ProductList.tsx` - Produktliste: alphabetisch sortiert, Kategorie-Filter, Deaktivieren/Aktivieren-Toggle, Bestand-Warnung rot
- `client/src/features/admin/products/ProductForm.tsx` - Formular Anlegen/Bearbeiten: Cent-Konvertierung per Math.round, minStock-Feld, fire-and-forget Server-Sync
- `client/src/features/admin/products/StockAdjustModal.tsx` - Bestandskorrektur: Delta-Eingabe, Vorschau neuer Bestand, db.outbox.add(STOCK_ADJUST)
- `client/src/features/pos/LowStockBanner.tsx` - Banner-Komponente mit useLowStockProducts Hook
- `client/src/hooks/useLowStockCount.ts` - useLowStockProducts + useLowStockCount Hook (reaktiv via useLiveQuery)
- `client/src/features/admin/reports/DailyReport.tsx` - Tagesuebersicht mit date-fns, 3 Kacheln, Einzeltabelle, Datumswechsel
- `client/src/features/admin/AdminScreen.tsx` - ProductList + DailyReport eingebunden, useLowStockCount Badge am Produkte-Tab
- `client/src/features/pos/POSScreen.tsx` - LowStockBanner eingebunden, lowStockCount Prop fuer Badge am Verwaltung-Button
- `client/src/App.tsx` - UnlockedApp-Komponente mit useLowStockCount, lowStockCount an POSScreen weitergegeben

## Decisions Made

- **UnlockedApp als separate Komponente:** React-Hook-Regeln erlauben keinen bedingten Aufruf nach `if (state === 'locked') return`. useLowStockCount wird in einer eigenen Komponente aufgerufen, die nur beim unlocked-State gerendert wird.
- **lowStockCount als Prop in POSScreen:** Verhindert doppelten useLiveQuery-Aufruf. App.tsx berechnet einmal, POSScreen zeigt Badge.
- **Fire-and-forget fetch fuer Produkt-CRUD:** POST /api/products ist bereits LWW-Upsert — kein Outbox-Pattern noetig. Fehler werden per console.warn geloggt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Refactor] UnlockedApp-Wrapper fuer React-Hook-Konformitaet**
- **Found during:** Task 2 (App.tsx — useLowStockCount einbinden)
- **Issue:** Plan sah direkten Aufruf von `useLowStockCount()` im unlocked-Block von App.tsx vor. React-Hook-Regeln verbieten Hooks nach bedingten Returns. TypeScript-Build haette fehlgeschlagen.
- **Fix:** Eigene `UnlockedApp`-Komponente erstellt, die useLowStockCount aufruft und lowStockCount per Prop an POSScreen weitergibt.
- **Files modified:** client/src/App.tsx, client/src/features/pos/POSScreen.tsx (lowStockCount Prop hinzugefuegt)
- **Verification:** TypeScript-Build fehlerfrei
- **Committed in:** f26bbc0 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — React-Hook-Konformitaet)
**Impact on plan:** Notwendige Strukturaenderung fuer Korrektheit. Kein Scope Creep, funktionaler Output identisch.

## Issues Encountered

Keine weiteren Probleme. TypeScript-Build auf Anhieb fehlerfrei nach dem Refactor.

## User Setup Required

Keine — alle Aenderungen sind rein frontend-seitig, kein neuer externer Dienst, keine Umgebungsvariablen.

## Next Phase Readiness

- Produktverwaltung vollstaendig: WAR-01, WAR-02, WAR-03, WAR-05, WAR-06, POS-08 erfuellt
- Bereit fuer Plan 03: Monats-/Jahresberichte mit Charts (Chartist oder Chart.js), E-Mail-Versand
- Mindestbestand-Hook (useLowStockCount) kann in Plan 03 wiederverwendet werden fuer Dashboard-Widgets

---
*Phase: 03-warenwirtschaft-berichte*
*Completed: 2026-03-23*
