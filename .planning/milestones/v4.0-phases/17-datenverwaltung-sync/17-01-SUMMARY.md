---
phase: 17-datenverwaltung-sync
plan: 01
subsystem: database, api, ui
tags: [dexie, sqlite, drizzle, fastify, categories, sync]

# Dependency graph
requires:
  - phase: 07-server-sync-multi-laden
    provides: getShopId(), shopId-Isolation, downloadProducts()-Muster
  - phase: 14-online-first-architektur
    provides: fetch-vor-transaction Pattern für Dexie-Sync
provides:
  - categories-Tabelle (Server + Client Dexie v8)
  - GET/POST/PATCH/DELETE /api/categories Routen
  - downloadCategories() in engine.ts
  - Kategorie-Verwaltungs-Modal in ProductList
  - Kategorie-Dropdown in ProductForm statt Freitext-Input
affects:
  - 17-02 (nächster Plan: weitere Datenverwaltungsfeatures)
  - ProductForm (Kategorie ist jetzt select statt text-input)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Kategorie-Bulk-Update: PATCH /categories/:id aktualisiert alle Produkte mit altem Namen via Drizzle update+where"
    - "DELETE-Guard: 409 zurückgeben wenn Referenzen existieren (count-query vor delete)"
    - "downloadCategories folgt downloadProducts-Muster: fetch → db.transaction → bulkPut mit vorherigem delete"

key-files:
  created:
    - server/src/db/migrations/0005_add_categories.sql
    - server/src/routes/categories.ts
  modified:
    - server/src/db/schema.ts
    - server/src/index.ts
    - client/src/db/schema.ts
    - client/src/db/index.ts
    - client/src/sync/engine.ts
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/admin/products/ProductForm.tsx

key-decisions:
  - "Dexie v8 ohne .upgrade()-Handler: neue categories-Tabelle braucht kein Upgrade — Dexie legt sie leer an"
  - "Category im db/index.ts re-exportiert: engine.ts importiert Category-Type über db/index.js (Single Source of Truth)"
  - "DELETE gibt 409 zurück (nicht 400): HTTP-Semantik — Konflikt durch Abhängigkeit, nicht User-Fehler"
  - "PATCH Bulk-Update in categories-Route: alle Produkte mit altem Kategorienamen werden atomar aktualisiert"
  - "Kategorie-Dropdown zeigt Fallback-Option für verwaiste Kategorien: value aus Produkt bleibt auswählbar"

patterns-established:
  - "Referenz-Guard vor delete: count-query → 409 wenn count > 0"
  - "Bulk-Rename-Pattern: PATCH auf Entität aktualisiert abhängige Entitäten in gleicher Route"

requirements-completed:
  - VRW-01

# Metrics
duration: 3min
completed: 2026-03-24
---

# Phase 17 Plan 01: Zentrales Kategorie-Management Summary

**categories-Tabelle mit 4 REST-Routen, Dexie v8 + downloadCategories-Sync, CRUD-Modal in ProductList und Dropdown-Auswahl in ProductForm**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T15:07:12Z
- **Completed:** 2026-03-24T15:10:16Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Server-seitige categories-Tabelle (Schema + Migration 0005) mit GET/POST/PATCH/DELETE-Routen
- PATCH aktualisiert alle Produkte mit altem Kategorienamen via Bulk-Update
- DELETE gibt 409 zurück wenn Produkte die Kategorie verwenden
- Dexie v8 mit categories EntityTable + Category-Interface + downloadCategories() in engine.ts
- ProductList mit Kategorie-Verwaltungs-Modal (Liste, Umbenennen via prompt, Löschen, Hinzufügen)
- ProductForm mit Kategorie-Dropdown statt Freitext-Input; verwaiste Kategorien bleiben als Fallback sichtbar

## Task Commits

1. **Task 1: Server-Schema + Migration + categories-Routen** - `1794f8d` (feat)
2. **Task 2: Dexie v8 + downloadCategories + Kategorie-UI** - `7ed3249` (feat)

**Plan metadata:** (wird durch gsd-tools erstellt)

## Files Created/Modified

- `server/src/db/schema.ts` - categories-Tabelle ergänzt
- `server/src/db/migrations/0005_add_categories.sql` - CREATE TABLE categories
- `server/src/routes/categories.ts` - GET/POST/PATCH/DELETE Routen mit Bulk-Update + 409-Guard
- `server/src/index.ts` - categoryRoutes registriert
- `client/src/db/schema.ts` - Category-Interface, EntityTable, version(8)
- `client/src/db/index.ts` - Category type re-exportiert
- `client/src/sync/engine.ts` - downloadCategories() exportiert
- `client/src/features/admin/products/ProductList.tsx` - Kategorie-Modal + Button + CRUD-Handler
- `client/src/features/admin/products/ProductForm.tsx` - Kategorie-Dropdown + downloadCategories-Trigger

## Decisions Made

- Dexie v8 ohne `.upgrade()` Handler — neue Tabelle braucht keinen Upgrade-Handler
- `Category` in `db/index.ts` re-exportiert — Single Source of Truth, engine.ts importiert darüber
- HTTP 409 für DELETE bei Produkt-Nutzung — korrekter HTTP-Statuscode für Referenzkonflikt
- Fallback-Option im Dropdown für verwaiste Produktkategorien

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Category in db/index.ts re-exportiert**
- **Found during:** Task 2 (downloadCategories in engine.ts)
- **Issue:** engine.ts importiert `Category` aus `../db/index.js`, aber `Category` war nicht in db/index.ts re-exportiert
- **Fix:** `Category` dem bestehenden re-export in db/index.ts hinzugefügt
- **Files modified:** client/src/db/index.ts
- **Verification:** TypeScript-Kompilierung ohne Fehler
- **Committed in:** 7ed3249 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing export)
**Impact on plan:** Notwendig für korrekte TypeScript-Imports. Kein Scope-Creep.

## Issues Encountered

None

## User Setup Required

None - keine externe Konfiguration erforderlich. Die categories-Tabelle wird beim nächsten Deployment durch die Migration 0005 angelegt (Docker-Entrypoint führt drizzle-kit migrate aus).

## Next Phase Readiness

- Kategorie-Management vollständig implementiert, bereit für Plan 17-02
- Bestehende Produkte ohne Kategorie erscheinen im Dropdown als "-- keine Kategorie --"
- downloadCategories() kann von anderen Stellen (z.B. App.tsx nach Login) aufgerufen werden

---
*Phase: 17-datenverwaltung-sync*
*Completed: 2026-03-24*
