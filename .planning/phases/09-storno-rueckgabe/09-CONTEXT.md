# Phase 9: Storno & Rückgabe - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Verkäufe stornieren und einzelne Artikel zurückgeben. Bestand wird automatisch zurückgebucht. Einstiegspunkt ist die Tagesübersicht (HIST-01 aus Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- STOR-01: Vollständiger Verkauf aus Tagesübersicht stornierbar — Bestand wird zurückgebucht
- STOR-02: Einzelne Artikel aus einem Verkauf als Rückgabe buchbar — nur deren Bestand ändert sich
- Technische Details (Soft-Delete vs. Hard-Delete, Storno-Markierung, Server-Sync der Stornierung) at Claude's discretion

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/features/admin/reports/DailyReport.tsx` — Tagesübersicht mit anklickbaren Verkäufen (Phase 8)
- `client/src/features/admin/reports/SaleDetailModal.tsx` — Verkaufsdetail-Modal (Phase 8)
- `server/src/routes/sync.ts` — Sync mit SALE_COMPLETE + STOCK_ADJUST Operations
- `client/src/sync/engine.ts` — Outbox flush + download

### Integration Points
- SaleDetailModal → Storno/Rückgabe-Buttons hinzufügen
- DailyReport → stornierte Verkäufe visuell markieren
- Server: neuer Endpoint oder Outbox-Operation für Storno
- Bestandskorrektur: stock + quantity zurückbuchen

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
