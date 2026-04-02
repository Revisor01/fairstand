---
phase: 30-admin-verwaltung
plan: 01
subsystem: api
tags: [fastify, postgresql, drizzle-orm, delete-endpoint, unique-constraint]

requires:
  - phase: 27-preis-history-bestandsverlauf
    provides: priceHistories und stockMovements Tabellen, die bei Product-Delete bereinigt werden müssen

provides:
  - DELETE /api/products/:id Endpoint mit Ownership-Check, Verkaufshistorie-Check und Cascade-Delete
  - Unique-Constraint für article_number+shop_id (Migration 0006)
  - POST /api/products gibt 409 bei doppelter Artikelnummer (Unique-Constraint-Fehlerbehandlung)

affects: [30-admin-verwaltung/30-02, frontend-product-management]

tech-stack:
  added: []
  patterns:
    - "jsonb @> Operator für Array-Containment-Prüfung in PostgreSQL"
    - "try/catch um db.transaction für PostgreSQL error code 23505 (unique violation)"
    - "Cascade-Delete in Transaction: priceHistories + stockMovements + products"

key-files:
  created:
    - server/migrations/0006_add_article_number_unique.sql
  modified:
    - server/src/db/schema.ts
    - server/src/db/migrations/meta/_journal.json
    - server/src/routes/products.ts

key-decisions:
  - "Migration im server/migrations/ Verzeichnis erstellt (drizzle-kit), nicht in server/src/db/migrations/ (altes manuelles System)"
  - "Verkaufshistorie-Check via jsonb @> Containment-Operator statt JOIN — effizienter und korrekt für JSONB-Array"
  - "Cascade-Delete: priceHistories und stockMovements werden vor Produkt in einer Transaction gelöscht"

patterns-established:
  - "PostgreSQL unique violation (code 23505) im try/catch abfangen, 409 zurückgeben"
  - "jsonb @> Operator für Array-Containment: sql`${sales.items}::jsonb @> ${JSON.stringify([{...}])}::jsonb`"

requirements-completed: [ADMIN-02]

duration: 6min
completed: 2026-04-02
---

# Phase 30 Plan 01: Admin-Verwaltung Backend Summary

**DELETE /api/products/:id Endpoint mit Verkaufshistorie-Schutz (409) und Cascade-Delete, plus PostgreSQL Unique-Constraint auf Artikelnummer+Shop**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-02T09:00:00Z
- **Completed:** 2026-04-02T09:05:46Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Neuer DELETE /api/products/:id Endpoint: Ownership-Check (403), Not-Found (404), Verkaufshistorie-Schutz (409), Cascade-Delete (priceHistories + stockMovements + product) in einer PostgreSQL-Transaction
- Migration 0006 mit `CREATE UNIQUE INDEX IF NOT EXISTS products_article_number_shop_id_idx` auf `products(article_number, shop_id)` — verhindert Duplikate pro Shop
- POST /products gibt jetzt 409 zurück wenn PostgreSQL error code 23505 (unique violation) auftritt

## Task Commits

1. **Task 1: Migration — Unique-Constraint article_number+shop_id** - `e876076` (feat)
2. **Task 2: DELETE /api/products/:id Endpoint mit Verkaufshistorie-Check** - `be8cd04` (feat)

## Files Created/Modified

- `server/migrations/0006_add_article_number_unique.sql` - PostgreSQL UNIQUE INDEX auf article_number+shop_id
- `server/migrations/meta/_journal.json` - drizzle-kit Journal um Eintrag 0006 ergänzt
- `server/src/db/schema.ts` - products-Tabelle mit `articleNumberShopIdx: uniqueIndex(...)` ergänzt
- `server/src/routes/products.ts` - DELETE-Endpoint + try/catch für 409 + sales/stockMovements imports

## Decisions Made

- **Migration in server/migrations/ (drizzle-kit):** Das Dockerfile führt `npx drizzle-kit migrate` aus und kopiert `./migrations` ins Image. Das alte `server/src/db/migrations/` Verzeichnis ist nicht mehr aktiv — Migration muss im richtigen Verzeichnis liegen.
- **jsonb @> Containment-Operator:** Für den Verkaufshistorie-Check wird `items::jsonb @> '[{"productId":"..."}]'::jsonb` verwendet. Korrekt für PostgreSQL JSONB-Arrays ohne n+1 Problem.
- **Cascade in Transaction:** priceHistories und stockMovements werden vor dem Produkt in einer atomaren Transaction gelöscht — verhindert Foreign-Key-artige Inkonsistenzen auch ohne DB-Level-FK.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration in korrektem Verzeichnis erstellt**
- **Found during:** Task 1 (Migration anlegen)
- **Issue:** Plan referenzierte `server/src/db/migrations/0006_add_article_number_unique.sql`, aber das Dockerfile nutzt `server/migrations/` (drizzle-kit). Migration im falschen Verzeichnis würde beim Deployment nicht ausgeführt.
- **Fix:** Migration in `server/migrations/0006_add_article_number_unique.sql` erstellt und `_journal.json` aktualisiert. Das `server/src/db/migrations/`-Verzeichnis ist das alte, nicht mehr aktive System.
- **Files modified:** server/migrations/0006_add_article_number_unique.sql, server/migrations/meta/_journal.json
- **Verification:** Dockerfile zeigt `COPY --from=build /app/migrations ./migrations` und `CMD npx drizzle-kit migrate` — korrektes Verzeichnis bestätigt
- **Committed in:** e876076 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — falsches Migrations-Verzeichnis)
**Impact on plan:** Kritische Korrektur. Migration im alten Verzeichnis wäre beim Deployment nie ausgeführt worden.

## Issues Encountered

Keine weiteren Probleme — TypeScript compiliert ohne Fehler.

## Known Stubs

Keine — alle Änderungen sind vollständig implementiert und produzieren korrektes Verhalten.

## Next Phase Readiness

- Backend-Endpoint ist bereit für Plan 02 (Frontend): DELETE-Button in Produktverwaltung kann `DELETE /api/products/:id` aufrufen
- 409-Antwort enthält verständliche Fehlermeldung die direkt im UI anzeigbar ist
- Unique-Constraint auf DB-Ebene schützt auch bei direkten DB-Zugriffen

---
*Phase: 30-admin-verwaltung*
*Completed: 2026-04-02*
