# Phase 27: Preis-History & Bestandsverlauf - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Jede EK/VK-Änderung und jede Bestandsbewegung wird lückenlos in der Datenbank protokolliert — das Fundament für alle Auswertungen in Phase 28. Neue DB-Tabellen: price_history, stock_movements. Automatisches Logging bei Preisänderungen (DB-Trigger oder App-Layer) und bei allen Bestandsbewegungen (Verkauf, Storno, Nachbuchung, Korrektur, Rückgabe).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Key considerations:
- PostgreSQL Trigger vs. App-Layer für price_history (Trigger bevorzugt laut Research — atomar, automatisch)
- stock_movements als separate Tabelle mit Referenzen auf sales/outbox_events
- Drizzle ORM Migration für neue Tabellen
- API-Endpoint für Stock-Movement-Journal pro Artikel

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Drizzle ORM Schema in server/src/db/schema.ts — bestehende Tabellen (products, sales, categories, shops, settings, outbox_events)
- Product CRUD Routes in server/src/routes/products.ts — hier müssen price_history-Einträge bei PUT/PATCH geloggt werden
- Sync Routes in server/src/routes/sync.ts — SALE_COMPLETE, STOCK_ADJUST, SALE_CANCEL, ITEM_RETURN Operationen, hier müssen stock_movements geloggt werden

### Established Patterns
- Cents-Integer für alle Preise
- shopId-Isolation in allen Queries
- Drizzle-Migrations via drizzle-kit in server/migrations/

### Integration Points
- products.ts PUT/PATCH → price_history INSERT
- sync.ts SALE_COMPLETE/STOCK_ADJUST/SALE_CANCEL/ITEM_RETURN → stock_movements INSERT
- Neuer GET-Endpoint für stock_movements pro Artikel

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.

</deferred>
