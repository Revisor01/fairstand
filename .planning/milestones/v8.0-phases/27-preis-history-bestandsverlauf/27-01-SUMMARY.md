---
phase: 27-preis-history-bestandsverlauf
plan: "01"
subsystem: database
tags: [drizzle, postgresql, schema, migration, price-history, stock-movements]

requires: []
provides:
  - "priceHistories Tabellen-Definition in schema.ts (serial PK, shopId, productId, field, oldValue, newValue, changedAt)"
  - "stockMovements Tabellen-Definition in schema.ts (serial PK, shopId, productId, type, quantity, referenceSaleId nullable, reason nullable, movedAt)"
  - "Migration 0005_add_price_history_and_stock_movements.sql mit CREATE TABLE Statements"
affects:
  - 27-02
  - 27-03
  - 28-preis-history-api
  - 29-inventur-rechnungsexport

tech-stack:
  added: []
  patterns:
    - "serial PK für Auto-Increment Audit-Tabellen (kein UUID overhead)"
    - "bigint mit mode: 'number' für Timestamps in allen neuen Tabellen"
    - "nullable text-Felder für optionale FK-Referenzen (referenceSaleId) ohne Drizzle-relations"

key-files:
  created:
    - server/migrations/0005_add_price_history_and_stock_movements.sql
  modified:
    - server/src/db/schema.ts

key-decisions:
  - "Migration manuell geschrieben statt via drizzle-kit generate — legacy SQLite-Snapshots (0000, 0001) im postgresql-Projekt machen drizzle-kit generieren fehlerhaft (malformed snapshot)"
  - "Beide Tabellen in einer Migration-Datei kombiniert (0005) statt zwei separaten, da drizzle-kit einen einzigen Schema-Diff erzeugen würde"
  - "referenceSaleId als nullable text ohne Drizzle-Relation-Definition — FK nur zur Nachverfolgbarkeit, kein JOIN-Pattern nötig"

patterns-established:
  - "Audit-Tabellen: serial PK, shopId + productId als notNull text, timestamp als bigint mode:number"

requirements-completed:
  - PRICE-01
  - INV-04

duration: 10min
completed: "2026-04-01"
---

# Phase 27 Plan 01: Schema-Erweiterung — priceHistories + stockMovements Summary

**Drizzle-Schema um zwei Audit-Tabellen erweitert (price_histories, stock_movements) und PostgreSQL-Migration 0005 generiert — Fundament fuer Preisaenderungs-Logging und Bestandsverlauf**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-01T00:00:00Z
- **Completed:** 2026-04-01T00:10:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `priceHistories` Tabelle in schema.ts exportiert: protokolliert EK/VK-Preisaenderungen mit altem/neuem Wert und Zeitstempel
- `stockMovements` Tabelle in schema.ts exportiert: protokolliert Bestandsbewegungen (sale/adjustment/correction/return/hard_delete) mit optionaler Sale-Referenz
- Migration 0005 manuell erstellt (drizzle-kit generate wegen legacy SQLite-Snapshots nicht nutzbar) und _journal.json auf idx=5 aktualisiert
- TypeScript kompiliert fehlerfrei (0 errors)

## Task Commits

1. **Task 1: Schema-Erweiterung** - `aa8e36f` (feat)
2. **Task 2: Drizzle-Migration generieren** - `3aaedb6` (chore)

## Files Created/Modified

- `server/src/db/schema.ts` — priceHistories + stockMovements Tabellen hinzugefuegt
- `server/migrations/0005_add_price_history_and_stock_movements.sql` — CREATE TABLE fuer beide Tabellen
- `server/migrations/meta/_journal.json` — idx=5 Eintrag ergaenzt

## Decisions Made

- Migration manuell geschrieben: `drizzle-kit generate` schlug fehl wegen "malformed" legacy SQLite-Snapshots (0000, 0001) in einem jetzt postgresql-konfigurierten Projekt. SQL wurde manuell im gleichen Format der bestehenden Migrations geschrieben.
- Beide Tabellen in einer Migration-Datei (0005): Konsistent mit wie drizzle-kit einen einzigen Schema-Diff zusammenfasst.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] drizzle-kit generate fehlgeschlagen — Migration manuell erstellt**
- **Found during:** Task 2 (Drizzle-Migrationen generieren)
- **Issue:** `npx drizzle-kit generate` gibt "migrations/meta/0000_snapshot.json data is malformed" aus. Die Snapshots 0000 und 0001 haben noch `"dialect": "sqlite"` obwohl das Projekt jetzt `postgresql` ist — Legacy-Artefakte aus der Migration von SQLite zu PostgreSQL (Phase 06).
- **Fix:** Migration-SQL manuell geschrieben im exakten Format der bestehenden Migrations. _journal.json manuell um idx=5 ergaenzt.
- **Files modified:** server/migrations/0005_add_price_history_and_stock_movements.sql, server/migrations/meta/_journal.json
- **Verification:** `grep "CREATE TABLE" migrations/0005_*.sql` findet beide Tabellen; `cat migrations/meta/_journal.json | grep -c '"idx"'` = 6
- **Committed in:** 3aaedb6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** drizzle-kit war nicht nutzbar, aber Ergebnis ist identisch — korrekte SQL-Migration im richtigen Format. Kein Scope Creep.

## Issues Encountered

- Legacy SQLite-Snapshots (0000, 0001) in postgresql-Projekt verursachen drizzle-kit-Fehler. Empfehlung fuer zukuenftige Pläne: Snapshots in migrations/meta/ auf postgresql-Format aktualisieren oder drizzle-kit Snapshots neu generieren lassen.

## User Setup Required

None - keine externe Konfiguration noetig. Migration wird beim naechsten `npm run migrate` angewendet.

## Next Phase Readiness

- `priceHistories` und `stockMovements` koennen in 27-02 und 27-03 aus schema.ts importiert werden
- Migration 0005 ist bereit fuer Deployment (wird via npm run migrate beim Docker-Start angewendet)
- TypeScript-Typen sind vollstaendig korrekt — keine Anpassungen in anderen Dateien noetig

---
*Phase: 27-preis-history-bestandsverlauf*
*Completed: 2026-04-01*
