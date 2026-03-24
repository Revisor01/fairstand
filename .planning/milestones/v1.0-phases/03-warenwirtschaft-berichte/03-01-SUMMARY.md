---
phase: 03-warenwirtschaft-berichte
plan: "01"
subsystem: backend-schema + admin-shell
tags: [schema-migration, drizzle, dexie, backend-routes, admin-ui]
dependency_graph:
  requires: []
  provides: [server/routes/products, server/routes/reports, server/routes/settings, client/features/admin/AdminScreen]
  affects: [server/src/db/schema.ts, client/src/db/schema.ts, client/src/App.tsx, server/src/routes/sync.ts]
tech_stack:
  added: []
  patterns: [LWW-Upsert via onConflictDoUpdate mit excluded.updated_at, Delta-Update fuer STOCK_ADJUST, Dexie-v2-Migration mit upgrade-Callback]
key_files:
  created:
    - server/src/routes/products.ts
    - server/src/routes/reports.ts
    - server/src/routes/settings.ts
    - server/migrations/0001_mushy_joystick.sql
    - client/src/features/admin/AdminScreen.tsx
  modified:
    - server/src/db/schema.ts
    - server/src/routes/sync.ts
    - server/src/index.ts
    - client/src/db/schema.ts
    - client/src/App.tsx
    - client/src/features/pos/POSScreen.tsx
    - docker-compose.yml
decisions:
  - "drizzle-kit migrate schlaegt lokal fehl wegen fehlender better-sqlite3 Native Binary (arm64 macOS) — Migration laeuft im Docker-Container beim Deployment, SQL-File ist korrekt generiert"
  - "onSwitchToAdmin als optionale Prop in POSScreen — rueckwaertskompatibel, kein Breaking Change"
  - "StockAdjustSchema auf Modul-Ebene in sync.ts definiert — nicht im Loop, konsistent mit SaleSchema"
metrics:
  duration: "~20 min"
  completed: "2026-03-23T13:32:09Z"
  tasks: 2
  files: 13
---

# Phase 03 Plan 01: Schema-Migration, Backend-Routes und Admin-Geruest

Drizzle-Schema mit minStock + settings-Tabelle, STOCK_ADJUST-Sync-Handler, Produkt-CRUD-API, Report-Aggregationen (Umsatz/EK-Kosten/Marge/Spenden/Top-5) und Admin-Shell mit Tab-Navigation.

## What Was Built

### Task 1: Server-Schema + Backend-Routes

- **server/src/db/schema.ts:** `minStock: integer('min_stock').notNull().default(0)` in products-Tabelle ergaenzt; neue `settings`-Tabelle (key PK, value, shopId).
- **Migration 0001:** `ALTER TABLE products ADD min_stock` + `CREATE TABLE settings` — korrekt generiert via drizzle-kit.
- **server/src/routes/sync.ts:** STOCK_ADJUST-Handler implementiert — liest Delta, aktualisiert `products.stock` per SQL-Template-Expression (`stock + delta`), protokolliert Event in outboxEvents. `StockAdjustSchema` auf Modul-Ebene neben SaleSchema.
- **server/src/routes/products.ts:** CRUD — GET (alle Produkte eines Shops), POST (LWW-Upsert via `excluded.updated_at`), PATCH `/activate` und `/deactivate`.
- **server/src/routes/reports.ts:** `/reports/monthly` (Umsatz, EK-Kosten via JOIN auf products.purchase_price, Marge, Spenden, Top-5-Artikel per json_each) und `/reports/yearly` (12 Monate mit cost_cents + margin_cents).
- **server/src/routes/settings.ts:** GET (alle Settings eines Shops) und PUT (Upsert).
- **server/src/index.ts:** productRoutes, reportRoutes, settingsRoutes registriert.
- **docker-compose.yml:** TZ=Europe/Berlin und SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASS/SMTP_FROM ergaenzt.

### Task 2: Client-Schema + Admin-Shell

- **client/src/db/schema.ts:** `minStock: number` im Product-Interface; Dexie v2-Migration mit `upgrade`-Callback der `minStock = 0` fuer bestehende Produkte setzt.
- **client/src/App.tsx:** `activeView: 'pos' | 'admin'` State, Toggle zwischen POSScreen und AdminScreen.
- **client/src/features/admin/AdminScreen.tsx:** Admin-Shell mit Tab-Navigation (Produkte | Berichte | Einstellungen), aktiver Tab sky-500, Zurueck-zur-Kasse-Button.
- **client/src/features/pos/POSScreen.tsx:** Optionale `onSwitchToAdmin` Prop und Verwaltung-Button im Header ergaenzt.

## Deviations from Plan

### Auto-added

**1. [Rule 2 - Missing Functionality] Verwaltung-Button im POSScreen**
- **Found during:** Task 2
- **Issue:** App.tsx uebergibt `onSwitchToAdmin` an POSScreen, aber POSScreen akzeptierte die Prop nicht und hatte keinen Button zum Wechseln.
- **Fix:** `onSwitchToAdmin?: () => void` als optionale Prop ergaenzt, Verwaltung-Button im Header hinzugefuegt.
- **Files modified:** client/src/features/pos/POSScreen.tsx
- **Commit:** 226bd88

## Known Stubs

- **AdminScreen.tsx:** Alle drei Tabs (Produkte, Berichte, Einstellungen) zeigen Platzhalter-Text — werden in Plan 02, 03, 04 implementiert. Die Tab-Navigation selbst funktioniert.

## Commits

| Hash | Message |
|------|---------|
| 6d63049 | feat(03-01): schema-migration + backend-routes + STOCK_ADJUST-handler |
| 226bd88 | feat(03-01): client-schema-migration + admin-shell + pos-admin-toggle |

## Self-Check: PASSED

Files verified:
- server/src/db/schema.ts: FOUND
- server/src/routes/products.ts: FOUND
- server/src/routes/reports.ts: FOUND
- server/src/routes/settings.ts: FOUND
- server/migrations/0001_mushy_joystick.sql: FOUND
- client/src/features/admin/AdminScreen.tsx: FOUND
- client/src/App.tsx (activeView): FOUND
- docker-compose.yml (SMTP_HOST): FOUND

Commits verified:
- 6d63049: FOUND
- 226bd88: FOUND

TypeScript-Build: CLIENT OK, SERVER OK
