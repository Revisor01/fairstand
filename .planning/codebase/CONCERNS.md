# Codebase Concerns

**Analysis Date:** 2026-03-24

## Tech Debt

**Report Scheduler — Missing Storno-Filterung:**
- Issue: Scheduled reports (monthly + yearly) in `server/src/scheduler/reportScheduler.ts` do not filter out cancelled sales with `AND cancelled_at IS NULL`
- Files: `server/src/scheduler/reportScheduler.ts` (lines 29, 40, 48, 90, 103)
- Impact: Monthly and yearly email reports will include stornierte Verkäufe in totals, costs, and top-articles. Numbers will be inflated compared to manual API queries that already have the filter
- Fix approach: Add `AND sales.cancelled_at IS NULL` to all four SQL queries in reportScheduler.ts (same pattern as reports.ts routes which correctly filter)

**CORS Security — Wildcard Default:**
- Issue: CORS configured with default wildcard (`origin: '*'`) when env var not set
- Files: `server/src/index.ts` line 18
- Impact: Any external site can make requests to the API. In production (church LAN access), this may be acceptable, but still a security oversight
- Fix approach: Replace `*` default with explicit origin list or require explicit configuration in Docker environment. For now document this as requiring env var in deployment
- Current state: Deployment likely sets `CORS_ORIGIN` explicitly, but code default is permissive

## Known Bugs

**None currently active.** All identified bugs from Phase 15 research have been implemented:
- ✓ Reports.ts now filters `cancelled_at IS NULL` (verified in code)
- ✓ Cart persistence with Dexie v7 cartItems table implemented in `client/src/db/schema.ts` + `useCart.ts`
- ✓ Cart validation on mount checks `product.active` status

---

## Security Considerations

**SMTP Credentials Exposure Risk:**
- Risk: Mailer service stores SMTP credentials in environment variables without rotation mechanism
- Files: `server/src/services/mailer.ts`
- Current mitigation: env vars are not committed to git, only passed at runtime via Docker
- Recommendations:
  - Document that SMTP credentials should use strong passwords
  - Consider adding credential rotation capability (currently not possible — would require app restart)
  - Log successful sends but avoid logging actual recipient email patterns in production

**PDF Upload File Handling:**
- Risk: 10MB max file size is enforced, but no virus scanning or content validation beyond PDF format check
- Files: `server/src/routes/import.ts` (line 8, 18-19)
- Current mitigation: File extension check (`.pdf`), size limit, try-catch on parsing
- Recommendations:
  - Validate that uploaded PDF is actually a valid PDF (currently only filename is checked)
  - Consider adding timeout on PDF parsing to prevent DoS via malformed PDFs
  - Log failed parse attempts for audit

**PIN Authentication — Simple 4-Digit Code:**
- Risk: 4-digit PIN (10,000 possible combinations) is single factor for shop access
- Files: `client/src/features/auth/pinAuth.ts`, `server/src/routes/auth.ts`
- Current mitigation: No public internet exposure (church LAN only), single-device app, no network attack surface
- Recommendations:
  - Document that this is acceptable only for trusted, physically-controlled devices (iPad in church)
  - Consider adding rate limiting on failed PIN attempts (currently not implemented server-side)
  - Consider longer PIN for production

---

## Performance Bottlenecks

**PDF Parsing — No Timeout:**
- Problem: `parseSuedNordKontorPdf()` can hang indefinitely on malformed or adversarial PDFs
- Files: `server/src/lib/pdfParser.ts`, `server/src/routes/import.ts`
- Cause: pdf.js library has no built-in timeout, and pdfjs-dist parsing is synchronous in the getTextContent loop
- Improvement path:
  - Wrap PDF parsing in Promise.race() with setTimeout to abort after 30s
  - Add parse progress tracking to reject very large PDFs earlier
  - Consider offloading to worker thread if parse times exceed 5s

**Cart Persistence Write-on-Change:**
- Problem: Every cart mutation (add, remove, update quantity) triggers Dexie write to IndexedDB
- Files: `client/src/features/pos/useCart.ts` (lines 149-169)
- Cause: useEffect dependency on `state.items` fires on every reducer dispatch
- Current impact: Acceptable for typical carts (< 20 items), but rapid clicking could cause stalls
- Improvement path: Debounce persist writes by 500ms to batch mutations, or use a flush callback approach

**Report Generation — Full Table Scans:**
- Problem: Monthly/yearly report queries do full table scan of all sales for a shop
- Files: `server/src/routes/reports.ts`, `server/src/scheduler/reportScheduler.ts`
- Cause: JSON extraction from items column requires iterating all sales rows
- Current impact: Acceptable for single small shop, would degrade with 10K+ sales/year
- Improvement path:
  - Create denormalized `sales_summaries` table updated on each sale write
  - Or: pre-aggregate reports weekly/monthly to avoid full scans
  - For now, acceptable given use case

---

## Fragile Areas

**PDF Parser Table Layout Recognition:**
- Files: `server/src/lib/pdfParser.ts` (lines 44-60, 126-242)
- Why fragile: Relies on position-based row grouping (Y-coordinate tolerance of 2pt) and index-based column extraction. Changes to Süd-Nord-Kontor invoice layout could break parsing silently
- Safe modification:
  - Keep tolerance tuning localized to `groupByRows(items, tolerance)` call
  - Add test suite with actual invoice PDFs (currently only unit tests, check if pdfParser.test.ts covers layout changes)
  - Document expected invoice format in pdfParser.ts header
- Test coverage: `server/src/lib/pdfParser.test.ts` exists but should be verified for real invoice samples

**Shop-Based Data Isolation:**
- Files: All routes and sync logic depend on `shopId` parameter being correctly passed client-side
- Why fragile: No server-side enforcement that a client can only sync/read data for their assigned shop_id. If frontend sends wrong shopId, server will return data for other shop
- Safe modification:
  - Add authentication to associate logged-in device with a specific shop_id
  - Validate shopId against authenticated session on every request
  - Currently relies on client-side honor system (PIN doesn't validate against shop, just unlocks device)
- Current state: Acceptable for single-shop deployment (church has one Fairstand), but would be critical issue for multi-shop SaaS

**Cart Item Price Snapshots:**
- Files: `client/src/features/pos/useCart.ts` (line 54, comment at line 132)
- Why fragile: Cart stores `salePrice` snapshot at add-time. If product prices change during transaction (e.g., admin adjusts price) or after reload, cart still reflects old price. No validation that snapshot is "current"
- Safe modification:
  - Keep snapshot approach (by design per Phase-01), but validate cart items after reload that product still exists
  - useCart.ts already does this (lines 119-135), but silently removes deleted items without informing user
  - Improvement: Show toast notification when invalid items are cleaned up
- Test coverage: useCart hook tests should cover reload scenario with price changes

**Dexie Version 8 Categories Table:**
- Files: `client/src/db/schema.ts` (version 8, added categories table)
- Why fragile: Version 8 adds `categories` table but no upgrade handler. If a user had data in v7 and upgrades to v8, the categories table starts empty
- Safe modification:
  - Current: categories are downloaded from server on-demand, so empty table is OK
  - But: if offline, no categories are available. Add fallback or pre-seed with defaults
- Improvement path: Add upgrade handler in v8 to fetch categories from server on first load

---

## Scaling Limits

**Single-Shop Hardcoded in Scheduler:**
- Files: `server/src/scheduler/reportScheduler.ts` (line 9: `const SHOP_ID = 'st-secundus-hennstedt'`)
- Current capacity: Works for single shop (Hennstedt)
- Limit: If app scales to multiple Fairstand shops, scheduler will only send reports for this one shop
- Scaling path: Refactor scheduler to iterate over all shops, query `settings.report_monthly` per shop
- Priority: Low (unlikely to expand), but note for future

**SQLite Single Writer:**
- Files: `server/src/db/index.ts` (uses better-sqlite3)
- Current capacity: Handles single concurrent transaction fine
- Limit: If multiple workers/processes write simultaneously, SQLite will lock/fail (though Fastify runs single-threaded Node)
- Scaling path: If horizontal scaling needed, migrate to PostgreSQL
- Current state: Acceptable for single-instance Docker deployment

**In-Memory Outbox Flush Guard:**
- Files: `client/src/sync/engine.ts` (lines 4-9: `let flushing = false`)
- Current capacity: Single App instance
- Limit: If same Fairstand App opened in multiple browser tabs/windows, flushing flag is shared but could race
- Scaling path: Use Dexie-based lock (CAS operation) instead of global variable
- Current risk: Low (app designed for single iPad, unlikely multi-tab access)

---

## Dependencies at Risk

**pdf-parse is Unmaintained (NOT USED):**
- Risk: Legacy code or docs might reference pdf-parse
- Current stack: Project uses `pdfjs-dist` (actively maintained by Mozilla) ✓
- No action needed

**pdfjs-dist Canvas Dependency:**
- Risk: pdfjs-dist v5.x may require `canvas` native module for server-side PDF processing
- Files: `server/src/lib/pdfParser.ts` (uses pdfjs-dist)
- Current state: Canvas is not imported or used; text extraction works without it
- Check: Verify that Docker image can run pdfParser without canvas native dependencies (likely OK since we only call `getTextContent()`, not rendering)

---

## Missing Critical Features

**No Rate Limiting on API:**
- Problem: Endpoints like `/api/sync` and `/import/parse` have no rate limiting
- Blocks: Could be abused to fill up database or crash sync system
- Impact: Low for church LAN use (trusted environment), but note for future
- Recommendation: Add @fastify/rate-limit with generous defaults if app is exposed to internet

**No Offline Indication on Admin Reports:**
- Problem: MonthlyReport, DailyReport, SaleDetailModal load data from Dexie but don't show whether data is stale (last synced when?)
- Blocks: Admin might make decisions based on out-of-date reports
- Impact: Medium (reports could be hours old if offline)
- Recommendation: Show "Last updated: X minutes ago" + warning if data > 1 hour old

**No Soft Delete / Undo for Cancelled Sales:**
- Problem: Once a sale is marked `cancelled_at`, it's effectively hidden from reports but not truly deleted. No way to un-cancel or restore
- Blocks: If admin cancels wrong transaction, must manually edit database
- Impact: Low (rare scenario)
- Recommendation: Add `uncancelSale` mutation or UI toggle to restore a cancelled sale

---

## Test Coverage Gaps

**PDF Parser Edge Cases:**
- Untested: Multi-page invoices (parser loops through pages but test coverage unknown), invoices with very long product names, invoices with unusual VAT rates
- Files: `server/src/lib/pdfParser.ts`, `server/src/lib/pdfParser.test.ts`
- Risk: Parser could fail silently on edge cases, returning empty or malformed rows
- Priority: Medium — PDF imports are semi-frequent admin task

**Cart Validation After Product Changes:**
- Untested: Cart contains item X, admin deactivates product X, app reloads — does cart correctly remove it with notification?
- Files: `client/src/features/pos/useCart.ts` (loadAndValidate function), should have integration test
- Risk: User might see "ghost" cart items that don't exist or are disabled
- Priority: High — users rely on cart correctness

**Sync Conflict Resolution:**
- Untested: What happens if app goes offline during checkout, then reconnects while checkout is being completed on another device (theoretical, but possible race)
- Files: `client/src/sync/engine.ts`, `server/src/routes/sync.ts`
- Risk: Sale could be synced twice or partially
- Priority: Low (single-device app, race unlikely), but note as architectural assumption

**Email Send Failures:**
- Untested: What happens if SMTP send fails after report query but before email? Scheduler silently swallows errors
- Files: `server/src/scheduler/reportScheduler.ts` (line 66 logs but doesn't retry), `server/src/services/mailer.ts`
- Risk: Reports are generated but never received, no audit trail of failure
- Priority: Low (SMTP config is usually reliable), but should add error logging

**Password/PIN Brute Force:**
- Untested: No rate limiting on PIN attempts server-side
- Files: `server/src/routes/auth.ts`
- Risk: Theoretically could brute-force 10K PIN combinations (though client-side locked to one device)
- Priority: Low for LAN-only deployment, but note for future if exposed

---

## Known Workarounds

**Cart Doesn't Persist Across Full App Reload (Before Phase 15):**
- Status: ✓ FIXED in Phase 15 with Dexie v7 cartItems table
- Was: useCart used only useReducer, in-memory state lost on reload
- Now: Cart loads from Dexie on mount, persists after every change

**Reports Include Cancelled Sales (Before Phase 15):**
- Status: PARTIALLY FIXED
  - ✓ reports.ts routes filter correctly with `AND cancelled_at IS NULL`
  - ✗ reportScheduler.ts still missing this filter (see Tech Debt above)
- Was: All report queries included cancelled sales inflating numbers
- Now: API reports correct, but scheduled emails still wrong

---

## Metadata

**Confidence breakdown:**
- Tech Debt: HIGH (directly observable in reportScheduler.ts)
- Known Bugs: None active — all Phase 15 issues resolved
- Security: MEDIUM (CORS wildcard is configuration issue, not code bug)
- Performance: MEDIUM (identified bottlenecks are acceptable for current scale)
- Fragile Areas: MEDIUM (dependencies on client-side correctness for shopId isolation)
- Scaling Limits: HIGH (clearly documented single-shop + single-instance limits)
- Dependencies: HIGH (verified that pdfjs-dist is current, pdf-parse is not used)
- Test Gaps: MEDIUM (some edge cases untested, but core functionality has coverage)

**Research date:** 2026-03-24
**Valid until:** 2026-06-24 (stable codebase, known issues are architectural not dependency-related)
