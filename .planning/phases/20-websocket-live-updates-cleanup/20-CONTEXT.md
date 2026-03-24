# Phase 20: WebSocket Live-Updates & Cleanup - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

WebSocket-Verbindung für Live-Updates einführen. Verkäufe/Entnahmen online direkt an Server posten. Altes Sync-System entfernen (downloadProducts, downloadCategories, Sync-Button, Outbox für Online-Modus).

</domain>

<decisions>
## Implementation Decisions

### WebSocket Server (@fastify/websocket)
- Install @fastify/websocket on the server
- Create WebSocket route at `/api/ws` — clients connect after auth
- Server broadcasts JSON messages on data changes: `{ type: 'products_changed' | 'categories_changed' | 'stock_changed', shopId: string }`
- Broadcast triggers: after product CRUD, category CRUD, sale complete, stock adjust
- No payload in broadcast — just invalidation signal. Client refetches via TQ.
- WebSocket connection is authenticated: client sends token as query param `?token=...`

### WebSocket Client
- Create `client/src/hooks/useWebSocket.ts` — connects to `/api/ws?token=...`
- On message: call `queryClient.invalidateQueries(['products', shopId])` or `['categories', shopId]`
- Auto-reconnect on disconnect (exponential backoff: 1s, 2s, 4s, max 30s)
- Connection status visible in header (optional, replaces sync badge)

### Online Direct Sales (LIVE-03)
- When online: completeSale() POSTs directly to `/api/sync` (existing endpoint) — no outbox
- When offline: falls back to outbox (kept for offline)
- completeWithdrawal() same pattern

### Cleanup (LIVE-07)
- Remove `downloadProducts()` and `downloadCategories()` from sync/engine.ts
- Remove Sync button from ProductList header
- Remove `useSyncStatus` hook and sync badge from POSScreen (WebSocket status replaces it)
- Keep outbox + flushOutbox for offline-only path
- Keep Dexie tables (needed for Phase 21 offline cache)

### Dexie as Cache Layer (LIVE-05)
- After TQ fetches products from server, write them to Dexie as cache
- This happens in the queryFn of useProducts/ArticleGrid — after successful fetch, `db.products.where('shopId').equals(shopId).delete()` then `db.products.bulkPut(products)`
- When offline, TQ offlineFirst reads from its own cache (already works from Phase 19)
- Dexie becomes the backup for when TQ cache is cold (app restart while offline)

### Claude's Discretion
- Exact WebSocket message format details
- Reconnect timing parameters
- Whether to show WebSocket connection status in UI

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/hooks/api/useProducts.ts` — TQ hooks from Phase 19, queryFn to extend with Dexie write-through
- `client/src/hooks/api/useCategories.ts` — TQ hooks from Phase 19
- `client/src/sync/engine.ts` — flushOutbox() to keep, downloadProducts/downloadCategories to remove
- `client/src/sync/useSyncStatus.ts` — to remove or replace
- `client/src/features/auth/serverAuth.ts` — getAuthHeaders(), getStoredSession() for token
- `server/src/lib/sessions.ts` — validateSession() for WebSocket auth
- `server/src/routes/sync.ts` — existing /api/sync endpoint for sales

### Established Patterns
- TanStack Query hooks with getAuthHeaders() (Phase 19)
- Fastify plugin registration pattern
- Outbox pattern for offline sales

### Integration Points
- Server: every route that modifies products/categories/stock needs to broadcast via WebSocket
- Server routes: products.ts, categories.ts, sync.ts (after sale/stock adjust)
- Client: App.tsx or auth flow needs to establish WebSocket connection after login
- POSScreen: remove sync badge, optionally show WS connection status
- ProductList: remove sync button

### Files to Create
- `server/src/routes/websocket.ts` — WebSocket route + broadcast helper
- `client/src/hooks/useWebSocket.ts` — WebSocket client hook

### Files to Modify
- `server/src/index.ts` — register @fastify/websocket + WS route
- `server/src/routes/products.ts` — broadcast after mutations
- `server/src/routes/categories.ts` — broadcast after mutations
- `server/src/routes/sync.ts` — broadcast after sale/stock
- `client/src/hooks/api/useProducts.ts` — add Dexie write-through in queryFn
- `client/src/hooks/api/useCategories.ts` — add Dexie write-through in queryFn
- `client/src/features/pos/POSScreen.tsx` — remove sync badge, add WS hook
- `client/src/features/pos/useSaleComplete.ts` — online direct POST, offline outbox fallback
- `client/src/features/admin/products/ProductList.tsx` — remove sync button
- `client/src/sync/engine.ts` — remove downloadProducts/downloadCategories

</code_context>

<specifics>
## Specific Ideas

User: "Was ist mit Websocket?" — explicitly requested live updates.
User: "Wenn wir online sind kann doch alles einfach live laufen" — no delay, no manual sync.

</specifics>

<deferred>
## Deferred Ideas

- Dexie as persistent offline cache for cold start (Phase 21 validates this)
- Online/Offline switch detection and automatic mode change (Phase 21)

</deferred>
