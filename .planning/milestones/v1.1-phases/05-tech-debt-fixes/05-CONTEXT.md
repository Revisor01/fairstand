# Phase 5: Tech Debt Fixes - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Vier bekannte technische Schulden aus v1.0 beheben: LWW-Sync-Konfliktauflösung, Produkt-Deaktivierung Server-Sync, Download-Sync Server→Client, extra_donation_cents im Monatsbericht.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure/tech-debt phase. Four well-defined bugs with clear fix locations:
- TD-01: `server/src/routes/sync.ts` — onConflictDoNothing → Timestamp LWW
- TD-02: `client/src/features/pos/` + `server/src/routes/products.ts` — PATCH deactivate endpoint
- TD-03: `client/src/sync/engine.ts` + new server endpoint — download-sync mechanism
- TD-04: `client/src/features/admin/reports/MonthlyReport.tsx` — render extra_donation_cents

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/src/routes/sync.ts` — existing sync endpoint with onConflictDoNothing
- `client/src/sync/engine.ts` — client-side sync engine
- `server/src/routes/products.ts` — product CRUD routes
- `client/src/features/admin/reports/MonthlyReport.tsx` — monthly report with extra_donation_cents in type but not rendered

### Established Patterns
- Fastify route handlers in `server/src/routes/`
- Dexie.js for client-side IndexedDB
- Drizzle ORM for server-side SQLite
- TanStack Query for server state

### Integration Points
- Sync endpoint: `POST /api/sync`
- Products: `GET/PATCH /api/products`
- Reports: existing MonthlyReport component

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
