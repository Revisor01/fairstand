---
phase: 25-shop-sortiment-isolation
plan: 01
subsystem: backend-security
tags: [security, shop-isolation, ownership-check, settings, products]
dependency_graph:
  requires: []
  provides: [shopId-ownership-in-product-mutations, settings-composite-unique-key]
  affects: [server/src/routes/products.ts, server/src/routes/settings.ts, server/src/db/schema.ts]
tech_stack:
  added: []
  patterns: [ownership-check-before-mutation, composite-unique-index-for-row-isolation]
key_files:
  created:
    - server/migrations/0004_settings_composite_unique.sql
  modified:
    - server/src/routes/products.ts
    - server/src/routes/settings.ts
    - server/src/db/schema.ts
    - server/migrations/meta/_journal.json
decisions:
  - "Settings-PK von key allein auf Composite Unique Index (key, shopId) umgestellt — erlaubt mehreren Shops denselben Setting-Key unabhaengig zu verwenden"
  - "Journal-Dialekt von sqlite auf postgresql aktualisiert und 0003/0004 nachregistriert — war noetig weil drizzle-kit generate wegen alter SQLite-Snapshots blockiert war"
metrics:
  duration: "~10 Minuten"
  completed: "2026-03-25"
  tasks: 2
  files: 5
---

# Phase 25 Plan 01: Shop-Sortiment-Isolation (Route-Handler) Summary

**One-liner:** shopId-Ownership-Checks in allen PATCH/POST-Produktendpunkten und Composite-Unique-Key auf settings(key, shopId) fuer vollstaendige Shop-Isolation.

## What Was Built

### Task 1 — Ownership-Check in PATCH deactivate, activate und POST image (commit: cb18678)

Drei Endpoints in `server/src/routes/products.ts` hatten keinen shopId-Ownership-Check — jeder authentifizierte Shop konnte Produkte anderer Shops deaktivieren, reaktivieren oder das Bild ueberschreiben.

Pattern (identisch fuer alle drei Endpoints):
1. Produkt via `db.select().from(products).where(eq(products.id, id)).limit(1)` laden
2. 404 falls nicht gefunden
3. 403 falls `product.shopId !== session.shopId`
4. Mutation erst nach Pruefung

Betroffene Endpoints: `PATCH /products/:id/deactivate`, `PATCH /products/:id/activate`, `POST /products/:id/image`

### Task 2 — settings Composite Unique Key (commit: e69be43)

**Problem:** `settings.key` war der alleinige Primary Key — zwei Shops mit dem Key `admin_email` wuerden sich beim Upsert gegenseitig ueberschreiben.

**Loesung:**
- `schema.ts`: `key: text('key').primaryKey()` → `key: text('key').notNull()` + `uniqueIndex('settings_key_shop_id_idx').on(table.key, table.shopId)`
- `settings.ts`: `target: settings.key` → `target: [settings.key, settings.shopId]`
- Migration `0004_settings_composite_unique.sql`: `DROP CONSTRAINT settings_pkey` + `CREATE UNIQUE INDEX settings_key_shop_id_idx`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] drizzle-kit generate war wegen SQLite-Snapshots blockiert**
- **Found during:** Task 2, Schritt 3 (DB-Migration generieren)
- **Issue:** `migrations/meta/_journal.json` und `0000_snapshot.json`/`0001_snapshot.json` waren noch im SQLite-Dialekt vom früheren Stack — `drizzle-kit generate` meldete "data is malformed"
- **Fix:** Migration `0004_settings_composite_unique.sql` manuell erstellt; `_journal.json` auf Dialekt `postgresql` umgestellt und fehlende Eintraege fuer 0003 und 0004 nachregistriert
- **Files modified:** `server/migrations/0004_settings_composite_unique.sql`, `server/migrations/meta/_journal.json`
- **Commit:** e69be43

## Known Stubs

None — keine Stub-Werte in den geaenderten Dateien.

## Verification Results

1. `grep -c "Zugriff verweigert" server/src/routes/products.ts` → 4 (POST, PATCH deactivate, PATCH activate, POST image)
2. `grep -n "product.shopId !== session.shopId"` → Zeilen 104, 120, 137 (alle drei Endpoints)
3. `grep "uniqueIndex" server/src/db/schema.ts` → settings_key_shop_id_idx vorhanden
4. `grep "target: \[settings" server/src/routes/settings.ts` → Composite target vorhanden
5. `npx tsc --noEmit` → Kein Fehler

## Self-Check: PASSED
