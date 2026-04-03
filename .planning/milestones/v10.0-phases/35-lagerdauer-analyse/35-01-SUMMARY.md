---
phase: 35-lagerdauer-analyse
plan: 01
subsystem: ui, api
tags: [react, tailwind, postgres, drizzle, sql-lateral-join]

# Dependency graph
requires: []
provides:
  - "GET /products liefert last_sale_at (Unix-ms oder null) pro Produkt via LATERAL JOIN"
  - "ProductList zeigt Lagerdauer-Badge pro Artikel (Nie verkauft / Ladenhüter / N Tage)"
  - "Ladenhüter-Kategorie-Filter mit amber Styling und Anzahl-Badge"
affects: [36-ek-preiswarnung]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "db.execute(sql\`...\`) für komplexe LATERAL JOIN Abfragen statt Drizzle ORM-Query-Builder"
    - "getDaysSinceLastSale-Helper-Funktion für clientseitige Alternsberechnung aus Unix-ms-Timestamp"

key-files:
  created: []
  modified:
    - server/src/routes/products.ts
    - client/src/db/index.ts
    - client/src/hooks/api/useProducts.ts
    - client/src/features/admin/products/ProductList.tsx

key-decisions:
  - "db.execute(sql\`...\`) statt Drizzle ORM für LATERAL JOIN — ORM unterstützt LATERAL JOINs nicht nativ"
  - "Ladenhüter-Schwellwert: 90 Tage (>3 Monate ohne Verkauf)"
  - "lastSaleAt als optional im Product-Interface — Rückwärtskompatibilität mit gecachten Daten"

patterns-established:
  - "LATERAL JOIN Pattern: db.execute(sql) mit rows.rows für Raw-SQL in Fastify Routes"
  - "Ladenhüter-Badge: amber-100/amber-700, Nie-verkauft-Badge: slate-100/slate-500"

requirements-completed: [ANA-01, ANA-02]

# Metrics
duration: 15min
completed: 2026-04-03
---

# Phase 35 Plan 01: Lagerdauer-Analyse Summary

**PostgreSQL LATERAL JOIN berechnet last_sale_at pro Produkt; ProductList zeigt Ladenhüter-Badge und Kategorie-Filter mit 90-Tage-Schwellwert**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-03T22:05:00Z
- **Completed:** 2026-04-03T22:20:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- GET /products ersetzt einfaches db.select() durch LATERAL JOIN-Abfrage, die MAX(created_at) exkl. stornierter Verkäufe als last_sale_at liefert
- Product-Interface und mapServerProduct um lastSaleAt erweitert (optional, rückwärtskompatibel)
- getDaysSinceLastSale-Hilfsfunktion berechnet Tage seit letztem Verkauf clientseitig
- Ladenhüter-Kategorie-Filter (amber) erscheint automatisch wenn Produkte mit >90 Tage oder nie verkauft vorhanden
- Badges pro Produktzeile: "Nie verkauft" (grau), "Ladenhüter · N Tage" (orange), "N Tage" (gelb, 31-90d), kein Badge ≤30d

## Task Commits

1. **Task 1: Backend — last_sale_at pro Produkt berechnen** - `36b1665` (feat)
2. **Task 2: Frontend — Lagerdauer anzeigen und Ladenhüter markieren** - `3aca3cb` (feat)

**Plan metadata:** wird separat committed (docs)

## Files Created/Modified
- `server/src/routes/products.ts` - GET /products mit LATERAL JOIN statt einfachem SELECT
- `client/src/db/index.ts` - lastSaleAt-Feld im Product-Interface ergänzt
- `client/src/hooks/api/useProducts.ts` - last_sale_at -> lastSaleAt Mapping in mapServerProduct
- `client/src/features/admin/products/ProductList.tsx` - Ladenhüter-Filter, Zähler und Badges

## Decisions Made
- `db.execute(sql\`...\`)` statt Drizzle ORM für den LATERAL JOIN — der ORM-Query-Builder unterstützt keine LATERAL JOINs. Muster bereits in sales.ts verwendet.
- lastSaleAt als `optional` im Product-Interface, da gecachte Daten im Client noch kein Feld haben könnten.
- Stornierte Verkäufe (`cancelled_at IS NOT NULL`) werden explizit ausgeschlossen — nur echte Verkäufe zählen für Lagerdauer.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Root-level `npm run build` existiert nicht (kein workspace build-script). Build aus den Unterverzeichnissen `client/` und `server/` direkt ausgeführt — beide erfolgreich ohne TypeScript-Fehler.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Lagerdauer-Analyse vollständig implementiert (ANA-01, ANA-02 erfüllt)
- Phase 36 (EK-Preiswarnung) kann direkt starten — hat keine Abhängigkeit auf diese Phase

---
*Phase: 35-lagerdauer-analyse*
*Completed: 2026-04-03*
