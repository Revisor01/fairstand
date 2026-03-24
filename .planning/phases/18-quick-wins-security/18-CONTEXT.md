# Phase 18: Quick Wins & Security - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Bekannte Bugs und Sicherheitslücken beseitigen bevor die Architektur angefasst wird. Sechs unabhängige Fixes: Report-Scheduler Storno-Filter, PDF-Parser Timeout + Validierung, CORS explizite Origins, PIN Rate-Limiting, ShopId Server-Validierung.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

Specific guidance from CONCERNS.md:
- FIX-01: Add `AND sales.cancelled_at IS NULL` to all 4 SQL queries in reportScheduler.ts (same pattern as reports.ts)
- FIX-02: Wrap PDF parsing in Promise.race() with 30s timeout
- FIX-03: Validate PDF magic bytes (%PDF) before parsing, not just file extension
- SEC-01: Replace CORS `*` default with explicit CORS_ORIGIN env var requirement, fail closed
- SEC-02: @fastify/rate-limit on /api/auth/pin — max 5 attempts per minute per IP
- SEC-03: Middleware that extracts shopId from auth token/session and rejects mismatched requests

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/src/scheduler/reportScheduler.ts` — 4 SQL queries need cancelled_at filter
- `server/src/routes/reports.ts` — already has correct filter pattern to copy from
- `server/src/routes/import.ts` — PDF upload handler, needs timeout + magic byte check
- `server/src/lib/pdfParser.ts` — parseSuedNordKontorPdf() needs Promise.race wrapper
- `server/src/index.ts` — CORS configuration (line 18)
- `server/src/routes/auth.ts` — PIN verification endpoint

### Established Patterns
- Fastify plugin system for middleware
- Zod for request validation
- better-sqlite3 synchronous queries in transaction blocks

### Integration Points
- @fastify/rate-limit needs to be installed as new dependency
- Auth middleware needs to extract shopId from session and compare with request params

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. All fixes are documented in .planning/codebase/CONCERNS.md with exact file locations and fix approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
