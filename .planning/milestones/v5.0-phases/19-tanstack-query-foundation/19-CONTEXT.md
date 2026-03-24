# Phase 19: TanStack Query Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace Dexie-first data fetching with TanStack Query as primary data layer. All product and category reads/writes in Admin go through TQ directly to the server API. POS keeps Dexie as offline fallback via TQ's offlineFirst networkMode. The manual sync button and downloadProducts()/downloadCategories() are NOT removed yet (Phase 20 does cleanup).

</domain>

<decisions>
## Implementation Decisions

### TanStack Query Setup
- Install @tanstack/react-query v5 + devtools
- Create QueryClientProvider wrapper in App.tsx with sensible defaults (staleTime: 30s, gcTime: 5min)
- Two QueryClient configurations are NOT needed — single QueryClient with per-query networkMode overrides

### Query Hooks Architecture
- Create `client/src/hooks/api/useProducts.ts` — useQuery for product list, useMutation for CRUD
- Create `client/src/hooks/api/useCategories.ts` — useQuery for category list, useMutation for CRUD
- All hooks use `getAuthHeaders()` from serverAuth.ts for authenticated requests
- Query keys: `['products', shopId]`, `['categories', shopId]`
- Admin components: networkMode 'online' (server is truth, no stale data)
- POS components: networkMode 'offlineFirst' (cache first, background revalidate)

### Migration Strategy
- ProductList: replace `useLiveQuery(db.products...)` with `useProducts()` TQ hook
- CategoryManager: replace `useLiveQuery(db.categories...)` with `useCategories()` TQ hook
- ProductForm: replace fire-and-forget fetch + Dexie write with useMutation + query invalidation
- StockAdjustModal: replace Dexie transaction + outbox with direct API call + query invalidation
- ArticleGrid (POS): use TQ with offlineFirst — falls back to cached data when offline
- Keep Dexie tables — they become the persistence layer for TQ's offline cache in Phase 21

### What NOT to Change in This Phase
- Do NOT remove downloadProducts()/downloadCategories() yet (Phase 20)
- Do NOT remove the Sync button yet (Phase 20)
- Do NOT change the outbox/sync engine yet (Phase 20)
- Do NOT add WebSocket (Phase 20)
- Focus only on read/write paths through TQ

### Claude's Discretion
- Exact staleTime/gcTime values — optimize for the use case (small dataset, infrequent changes)
- Whether to use suspense queries or loading states
- File organization within hooks/api/

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/features/auth/serverAuth.ts` — `getAuthHeaders()` already exports auth headers (created in Phase 18)
- `client/src/db/index.ts` — Dexie DB, getShopId()
- All API endpoints already return JSON (products, categories, settings, reports)
- Server routes already validate shopId from session (Phase 18 SEC-03)

### Established Patterns
- `useLiveQuery()` from dexie-react-hooks — this is what TQ replaces for reads
- Fire-and-forget fetch for writes — TQ mutations replace this
- `formatEur()` utility for price display
- Lucide icons throughout UI

### Integration Points
- App.tsx needs QueryClientProvider
- Every component using useLiveQuery for products/categories needs migration
- ProductForm, CategoryManager, StockAdjustModal have write paths to migrate
- POSScreen → ArticleGrid chain reads products — needs offlineFirst
- Reports (DailyReport, MonthlyReport) read from Dexie sales — NOT migrated in this phase (sales stay in Dexie)

### Files to Modify
- `client/src/App.tsx` — wrap in QueryClientProvider
- `client/src/features/admin/products/ProductList.tsx` — TQ for product reads
- `client/src/features/admin/products/ProductForm.tsx` — TQ mutations for create/update
- `client/src/features/admin/products/StockAdjustModal.tsx` — TQ mutation for stock adjust
- `client/src/features/admin/products/ProductStats.tsx` — TQ for stats fetch
- `client/src/features/admin/settings/CategoryManager.tsx` — TQ for category CRUD
- `client/src/features/pos/ArticleGrid.tsx` — TQ offlineFirst for POS product display

</code_context>

<specifics>
## Specific Ideas

User explicitly requested: "Wenn wir online sind kann doch alles einfach live laufen. So haben wir doch immer Delay."
— The key insight is eliminating the Dexie-as-primary-source pattern for online mode.
— TanStack Query's automatic revalidation makes data feel "live" without manual sync.

</specifics>

<deferred>
## Deferred Ideas

- WebSocket for push-based invalidation (Phase 20)
- Removing downloadProducts/downloadCategories (Phase 20)
- Removing sync button (Phase 20)
- Removing outbox for online sales (Phase 20)
- Dexie as persistent TQ cache for offline (Phase 21)

</deferred>
