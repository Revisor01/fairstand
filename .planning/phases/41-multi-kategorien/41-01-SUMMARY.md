---
plan: 41-01
phase: 41
subsystem: schema-api-ui
tags: [multi-kategorien, schema, backend, client, pwa]
completed: 2026-04-10T12:14:36Z
duration_minutes: 45
tasks_completed: 6
files_changed: 14

dependency_graph:
  requires: []
  provides: [multi-kategorien-schema, multi-kategorien-api, multi-kategorien-ui]
  affects: [products, categories, pos, admin, import, reports]

tech_stack:
  added: []
  patterns:
    - PostgreSQL text[] fuer Multi-Kategorien (array_replace, array_remove, ANY())
    - Chip-Multi-Select UI fuer Kategorien in ProductForm
    - flatMap + includes() fuer Array-basierte Kategorie-Filter

key_files:
  modified:
    - server/src/db/schema.ts
    - server/src/routes/products.ts
    - server/src/routes/categories.ts
    - server/src/db/seed.ts
    - client/src/db/index.ts
    - client/src/hooks/api/useProducts.ts
    - client/src/features/pos/ArticleGrid.tsx
    - client/src/features/pos/POSScreen.tsx
    - client/src/features/admin/products/ProductForm.tsx
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/admin/products/ProductStats.tsx
    - client/src/features/admin/import/ImportScreen.tsx
    - client/src/features/pos/ArticleCard.test.tsx
    - client/src/features/pos/useCart.test.ts

decisions:
  - PostgreSQL text[] statt Join-Tabelle (einfacher fuer 106 Produkte)
  - Chip-Layout fuer Multi-Select in ProductForm (sky-500 fuer aktive Chips)
  - Alte category-Spalte bleibt in DB als Rollback-Sicherheit (kein DROP in dieser Phase)
  - Mapping in useProducts.ts mit Fallback auf altes category-Feld fuer Deploy-Transition

metrics:
  duration_minutes: 45
  completed_date: "2026-04-10"
  tasks_completed: 6
  files_changed: 14
---

# Phase 41 Plan 01: Multi-Kategorien Umbau Summary

**One-liner:** PostgreSQL text[] fuer Produkt-Kategorien mit Chip-Multi-Select UI, array_replace/ANY() in Backend-Routen und flatMap-basiertem Filter im Client.

## Was wurde gebaut

Vollstaendiger Umbau von `products.category` (text, Single) auf `products.categories` (text[], Multi):

- **Schema** (`server/src/db/schema.ts`): War bereits auf `categories: text('categories').array()` umgestellt — kein weiterer Aenderungsbedarf.
- **Backend** (`products.ts`): Upsert-Insert und LWW-Set nutzen jetzt `categories` statt `category`.
- **Backend** (`categories.ts`): Rename-Handler per `array_replace(categories, old, new)`, Delete-Check per `count(*) WHERE old = ANY(categories)`.
- **Seed** (`seed.ts`): Alle SEED_PRODUCTS-Eintraege auf `categories: ['X']` umgestellt.
- **Client-Type** (`db/index.ts`): `Product.category: string` → `categories: string[]`.
- **Mapping** (`useProducts.ts`): Fallback-Mapping `Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : [])` fuer Deploy-Transition.
- **ArticleGrid**: `flatMap` fuer unique Kategorien, `includes()` fuer Tab-Filter, `some()` fuer Suchfeld.
- **ProductForm**: Chip-Multi-Select ersetzt Single-Select-Dropdown. Klick togglet Kategorie in/aus dem Array.
- **ProductList**: `flatMap` fuer Tabs, `includes()` fuer Filter, `join(', ')` fuer Anzeige.
- **ProductStats**: `categories.join(', ')` in der Kopfzeile.
- **ImportScreen + POSScreen**: `categories: []` statt `category: ''` in neuen Produkt-Objekten.
- **Tests**: Fixtures auf `categories: ['Kategorie']` aktualisiert.

## Commits

| Hash | Beschreibung |
|------|-------------|
| 29c027f | feat(41-01): Backend-Routen auf categories (text[]) umstellen |
| 5efee2d | feat(41-01): Client-Types und POS-Filter auf categories[] umstellen |
| fe9a955 | feat(41-01): Admin-Produkt-UI auf Multi-Kategorien umstellen |
| 4b25be6 | feat(41-01): Import, POS-Proxy und Test-Fixtures auf categories[] aktualisieren |

## Deviations from Plan

### Auto-fixed Issues

Keine automatisch behobenen Bugs.

### Planabweichungen

**1. Drizzle-Kit Migration nicht generiert**
- **Beobachtung:** `npx drizzle-kit generate` meldet "snapshot data is malformed" — bestehende Snapshot-Dateien sind unvollstaendig.
- **Entscheidung:** Keine neue Migration generiert. Die Produktions-DB hat `categories` bereits (laut Plan-Notiz: Spalte manuell per SQL hinzugefuegt). Migration 0001_add_categories.sql ist bereits im Repo.
- **Impact:** Keiner — Spalte ist auf Produktion vorhanden, Schema-Code ist korrekt.

**2. `category`-Spalte nicht gedroppt (plankonform)**
- **Grund:** Laut Plan bewusste Entscheidung fuer Rollback-Sicherheit.
- **Naechster Schritt:** `ALTER TABLE products DROP COLUMN category;` manuell nach stabilem Deploy.

## TypeScript Build

- `server/`: `npx tsc --noEmit` — sauber (kein Output = kein Fehler)
- `client/`: `npx tsc --noEmit` — sauber (kein Output = kein Fehler)

## Known Stubs

Keine. Alle Kategorien werden direkt aus der DB geladen und korrekt angezeigt.

## Threat Flags

Keine neuen sicherheitsrelevanten Oberflaechen eingefuehrt.

## Self-Check: PASSED

- server/src/routes/products.ts: FOUND
- server/src/routes/categories.ts: FOUND
- client/src/db/index.ts: FOUND
- client/src/features/admin/products/ProductForm.tsx: FOUND
- Commits 29c027f, 5efee2d, fe9a955, 4b25be6: FOUND
