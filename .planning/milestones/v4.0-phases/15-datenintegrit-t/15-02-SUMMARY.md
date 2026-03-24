---
phase: 15-datenintegrit-t
plan: "02"
subsystem: frontend/pos
tags: [cart, dexie, persistence, validation, offline]
dependency_graph:
  requires: []
  provides: [cart-persistence, cart-validation, invalid-item-toast]
  affects: [client/src/db/schema.ts, client/src/features/pos/useCart.ts, client/src/features/pos/POSScreen.tsx]
tech_stack:
  added: []
  patterns: [dexie-persist-load-validate, loaded-flag-race-condition-guard]
key_files:
  created: []
  modified:
    - client/src/db/schema.ts
    - client/src/db/index.ts
    - client/src/features/pos/useCart.ts
    - client/src/features/pos/POSScreen.tsx
decisions:
  - "getShopId() aus db/index.js statt serverAuth.ts — Single Source of Truth für Shop-ID im Frontend"
  - "loaded-Flag zwingend: verhindert Race-Condition wenn persist-Effect vor loadAndValidate feuert"
  - "Preis-Snapshot beim Reload beibehalten — konsistent mit Phase-01-Entscheidung (salePrice nie aus DB aktualisieren)"
metrics:
  duration: "2 Minuten"
  completed_date: "2026-03-24"
  tasks_completed: 3
  files_changed: 4
requirements_addressed: [DAT-03, VAL-01]
---

# Phase 15 Plan 02: Warenkorb-Persistenz und Validierung Summary

**One-liner:** Dexie-basierte Cart-Persistenz mit Shop-Isolation, Mount-Validierung gegen aktive Produkte und Toast-Feedback bei entfernten Geister-Artikeln.

## Was wurde gebaut

DAT-03 (Warenkorb überlebt Page-Reload) und VAL-01 (Geister-Artikel aus Cart entfernen) vollständig implementiert durch drei aufeinander aufbauende Änderungen.

## Commits

| Task | Commit | Beschreibung |
|------|--------|--------------|
| Task 1 | 9b8e156 | Dexie version(7) + PersistedCartItem + cartItems-Tabelle |
| Task 2 | 6e3d01b | useCart LOAD-Action + loadAndValidate + persist-Effect |
| Task 3 | ca75822 | POSScreen Toast für entfernte ungültige Artikel |

## Kern-Änderungen

### client/src/db/schema.ts
- Neues `PersistedCartItem`-Interface: erweitert `SaleItem` mit `shopId: string`
- `FairstandDB.cartItems`: `EntityTable<PersistedCartItem, 'productId'>`
- `version(7).stores()`: `cartItems: 'productId, shopId'` — `productId` ist PK, `shopId` ist Index für Shop-Isolation

### client/src/db/index.ts
- `PersistedCartItem` aus Schema re-exportiert

### client/src/features/pos/useCart.ts
- `LOAD`-Action im `CartAction`-Typ und Reducer
- `loaded`-State-Flag: verhindert dass der persist-Effect vor `loadAndValidate` feuert und Dexie leert
- `loadAndValidate`-Effect (Mount, leere Deps): lädt gespeicherte Items, prüft Produkt-Existenz und `active`-Status, behält Preis-Snapshot
- `persist`-Effect (`[state.items, loaded]`): schreibt Cart nach jeder Änderung in Dexie (Shop-isoliert)
- Return-Wert: `invalidItems: string[]` + `clearInvalidItems()`

### client/src/features/pos/POSScreen.tsx
- `useEffect` auf `cart.invalidItems`: zeigt stockError-Toast mit Artikelnamen für 4 Sekunden
- `cart.clearInvalidItems()` nach Toast-Setzen verhindert doppeltes Feuern

## Technische Entscheidungen

| Entscheidung | Grund |
|---|---|
| `getShopId()` aus `db/index.js` | Einzige Source of Truth für Shop-ID; `serverAuth.ts` hat keine synchrone `getShopId()`-Funktion |
| `loaded`-Flag | Ohne Flag würde der persist-Effect mit leerem initialState feuern bevor `loadAndValidate` fertig ist (Cart-Datenverlust bei Reload) |
| Preis-Snapshot beibehalten | Phase-01-Entscheidung: `salePrice` beim Hinzufügen gefreezed, nie aus DB aktualisieren |
| `productId` als Primary Key in cartItems | Jedes Produkt max. einmal im Cart — Quantity-Tracking über `quantity`-Feld |
| Bestehender `stockError`-State wiederverwendet | Kein neuer State nötig — Toast ist identisch styled wie Stock-Fehler-Toast |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] getShopId() Importpfad korrigiert**
- **Found during:** Task 2
- **Issue:** Plan referenziert `getShopId()` aus `../auth/serverAuth.js` — diese Funktion existiert dort nicht. Die korrekte synchrone `getShopId()` ist in `../../db/index.js`
- **Fix:** Import aus `../../db/index.js` (zusammen mit `db`)
- **Files modified:** `client/src/features/pos/useCart.ts`
- **Commit:** 6e3d01b

## Known Stubs

Keine Stubs — alle Funktionalitäten vollständig verdrahtet.

## TypeScript-Build

TypeScript-Build (`npx tsc --noEmit`) nach jedem Task erfolgreich — keine Fehler.

## Self-Check: PASSED
