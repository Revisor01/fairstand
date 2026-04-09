---
phase: 37-ek-wareneingaenge-bestandsanpassung
plan: 01
subsystem: database
tags: [drizzle, postgres, schema, stock_movements, migration]

# Dependency graph
requires: []
provides:
  - "stock_movements-Tabelle hat nullable Spalte purchase_price_cents (integer)"
  - "stockMovements-Schema dokumentiert 'restock' als gültigen type-Wert"
affects:
  - 37-ek-wareneingaenge-bestandsanpassung
  - 38-fifo-inventur

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nullable integer-Spalten ohne .notNull() für optionale Felder in Drizzle ORM"

key-files:
  created: []
  modified:
    - server/src/db/schema.ts

key-decisions:
  - "purchasePriceCents ohne .notNull() — explizit nullable, da Verkäufe und Korrekturen keinen EK-Preis tragen"
  - "Spalte nach reason und vor movedAt eingefügt — logische Gruppierung: Metadaten vor Zeitstempel"

patterns-established:
  - "Neue Bewegungstypen werden im type-Kommentar von stockMovements dokumentiert"

requirements-completed:
  - EINGANG-01
  - ANPASS-02

# Metrics
duration: 5min
completed: 2026-04-09
---

# Phase 37 Plan 01: DB-Schema — purchase_price_cents in stock_movements Summary

**Nullable Spalte `purchase_price_cents` (integer) zu `stock_movements` hinzugefügt und `restock` als gültiger Bewegungstyp im Schema dokumentiert**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-09T10:44:00Z
- **Completed:** 2026-04-09T10:49:24Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `stockMovements`-Schema um `purchasePriceCents: integer('purchase_price_cents')` erweitert (nullable, kein `.notNull()`)
- type-Kommentar aktualisiert: `'restock'` als neuer gültiger Bewegungstyp dokumentiert
- TypeScript-Kompilierung fehlerfrei bestätigt — keine Breaking Changes

## Task Commits

1. **Task 1: purchase_price_cents zu stockMovements hinzufügen** - `c4a86a2` (feat)

## Files Created/Modified
- `server/src/db/schema.ts` - Neue Spalte `purchasePriceCents` und aktualisierter type-Kommentar in `stockMovements`

## Decisions Made
- `purchasePriceCents` ist nullable (kein `.notNull()`), da Verkäufe, Korrekturen und Rückgaben keinen EK-Preis tragen — nur `restock`-Bewegungen füllen diesen Wert
- Spalte nach `reason` und vor `movedAt` platziert — Metadaten vor Zeitstempel ist das bestehende Muster im Schema

## Deviations from Plan

None — Plan wurde exakt wie beschrieben ausgeführt.

## Issues Encountered

None

## User Setup Required

None — drizzle-kit migrate läuft automatisch beim nächsten Container-Start via `npx drizzle-kit migrate && node dist/index.js` im Dockerfile. Keine manuelle Migration nötig.

## Next Phase Readiness

- DB-Schema bereit für Plan 37-02: sync.ts kann `purchasePriceCents` bei `restock`-Bewegungen schreiben
- DB-Schema bereit für Plan 37-03: StockAdjustModal kann EK-Preis-Änderung als `restock`-Bewegung buchen
- Plan 38 (FIFO-Inventur) kann auf `purchase_price_cents` in `stock_movements` aufbauen

---
*Phase: 37-ek-wareneingaenge-bestandsanpassung*
*Completed: 2026-04-09*
