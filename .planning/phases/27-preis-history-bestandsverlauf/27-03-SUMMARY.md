---
phase: 27-preis-history-bestandsverlauf
plan: "03"
subsystem: backend
tags: [fastify, drizzle, sync, stock-movements, price-history, api]

requires:
  - 27-01

provides:
  - "stock_movements Logging in sync.ts für alle 4 Sync-Operationen (SALE_COMPLETE, STOCK_ADJUST, SALE_CANCEL, ITEM_RETURN)"
  - "GET /api/products/:id/price-history Endpoint mit ShopId-Ownership-Check"
  - "GET /api/products/:id/stock-movements Endpoint mit ShopId-Ownership-Check"
affects:
  - 28-preis-history-api

tech-stack:
  added: []
  patterns:
    - "entry.createdAt als movedAt-Zeitstempel (nicht Date.now()) — zeitlich korrekte Protokollierung von Offline-Operationen"
    - "ShopId-Ownership-Check via products-Lookup vor Datenabfrage in History-Endpoints"
    - "desc() Sortierung für chronologische Journal-Ausgabe (neueste zuerst)"

key-files:
  created:
    - server/src/routes/priceHistory.ts
  modified:
    - server/src/routes/sync.ts
    - server/src/index.ts

key-decisions:
  - "movedAt verwendet entry.createdAt statt Date.now() — sichert zeitlich korrekte Protokollierung auch für Offline-Operationen die later syncen"
  - "ShopId-Check in priceHistory.ts via products-Lookup statt direktem shopId-Filter auf price_histories/stock_movements — verhindert Information-Leakage über fremde Produkt-IDs"

requirements-completed:
  - INV-04

duration: 15min
completed: "2026-04-01"
---

# Phase 27 Plan 03: stock_movements Logging + priceHistory-Endpoints Summary

**sync.ts um stockMovements-Logging für alle 4 Sync-Operationen ergänzt und neue priceHistory.ts Route mit GET-Endpoints für Preisänderungs- und Bestandsverlaufs-Journal erstellt**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-01T00:00:00Z
- **Completed:** 2026-04-01T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- `sync.ts`: Import um `stockMovements` ergänzt; alle 4 Operation-Branches protokollieren Bestandsbewegungen mit `entry.createdAt` als Zeitstempel
- SALE_COMPLETE: INSERT mit `type='sale'`, negativer Menge (Ausgang), `referenceSaleId=sale.id`
- STOCK_ADJUST: INSERT mit `type='adjustment'`, Delta als Menge, optionalem Reason
- SALE_CANCEL: INSERT mit `type='return'`, positiver Menge (Restock), `referenceSaleId=cancel.saleId`
- ITEM_RETURN: INSERT mit `type='return'`, positiver Menge, `referenceSaleId=ret.saleId`
- `priceHistory.ts`: Neue Route mit zwei GET-Endpoints, ShopId-Ownership-Check, absteigender Sortierung
- `index.ts`: `priceHistoryRoutes` importiert und registriert
- TypeScript kompiliert fehlerfrei (0 errors)

## Task Commits

1. **Task 1: stock_movements Logging in sync.ts** - `a0885a4` (feat)
2. **Task 2: priceHistory.ts Route + index.ts Registrierung** - `f5522dd` (feat)

## Files Created/Modified

- `server/src/routes/sync.ts` — 4x stockMovements-INSERT, Import ergänzt
- `server/src/routes/priceHistory.ts` — Neue Route mit GET /price-history + GET /stock-movements
- `server/src/index.ts` — priceHistoryRoutes importiert und registriert

## API-Endpoints für Phase 28

| Endpoint | Methode | Beschreibung | Sortierung |
|----------|---------|--------------|-----------|
| `/api/products/:id/price-history` | GET | Alle EK/VK-Preisänderungen für Artikel | neueste zuerst |
| `/api/products/:id/stock-movements` | GET | Alle Bestandsbewegungen für Artikel | neueste zuerst |

Beide Endpoints benötigen Bearer-Token (Auth-Middleware) und prüfen ShopId-Ownership.

## Decisions Made

- `movedAt: entry.createdAt` statt `Date.now()`: Offline-Operationen haben einen "offiziellen" Zeitpunkt der Entstehung. Bei späterer Synchronisation würde `Date.now()` den Sync-Zeitpunkt protokollieren, nicht den Verkaufs-/Buchungszeitpunkt. `entry.createdAt` ist semantisch korrekt.
- ShopId-Check via products-Lookup: Statt direkt mit `shopId`-Filter auf den History-Tabellen zu filtern, wird zuerst das Produkt gesucht und die shopId geprüft. Das verhindert, dass über bekannte Produkt-IDs fremder Shops Daten abgefragt werden können.

## Deviations from Plan

None - Plan wurde exakt wie spezifiziert umgesetzt.

## Known Stubs

None - alle Daten werden aus echten DB-Tabellen abgefragt.

## Self-Check: PASSED

- `server/src/routes/priceHistory.ts` — FOUND
- `server/src/routes/sync.ts` — FOUND (4x stockMovements INSERT)
- `server/src/index.ts` — FOUND (2x priceHistoryRoutes)
- Commits a0885a4, f5522dd — FOUND

---
*Phase: 27-preis-history-bestandsverlauf*
*Completed: 2026-04-01*
