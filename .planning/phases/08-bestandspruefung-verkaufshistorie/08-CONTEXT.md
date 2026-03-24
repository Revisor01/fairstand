# Phase 8: Bestandsprüfung & Verkaufshistorie - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Bestandsanzeige im Kassen-Grid (Preis groß, Bestand klein), Überverkauf-Blockade, anklickbare Tagesübersicht mit Verkaufsdetails, Artikel-Verkaufsstatistik.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — Requirements sind klar und konkret:
- BEST-01: Artikel-Grid zeigt Preis groß + Bestand klein
- BEST-02: Warenkorb blockiert bei Überverkauf (mehr Stück als im Bestand)
- HIST-01: Tagesübersicht anklickbar → Detailansicht mit Artikeln, Mengen, Preisen
- HIST-02: Pro-Artikel-Statistik: wie oft verkauft, Umsatz, Zeitraum

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/features/pos/ArticleGrid.tsx` — Produkt-Grid, zeigt aktuell nur Name + Preis
- `client/src/features/pos/useCart.ts` — Cart-Hook mit addItem()
- `client/src/features/admin/reports/MonthlyReport.tsx` — bestehende Report-Ansicht
- `server/src/routes/reports.ts` — bestehende Report-Endpoints (monthly, yearly)

### Established Patterns
- useLiveQuery für reaktive Dexie-Queries
- getShopId() für dynamische Shop-Zuordnung (Phase 7)
- Server-Endpoints unter /api/ mit Fastify

### Integration Points
- ArticleGrid.tsx — Bestand anzeigen + Blockade
- useCart.ts — addItem muss Bestand prüfen
- Tagesübersicht — existiert teilweise, muss anklickbar werden
- Server: evtl. neuer Endpoint für Artikel-Statistik

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
