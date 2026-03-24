# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** Offline-First Progressive Web App (PWA) with Sync-Queue Pattern

**Key Characteristics:**
- Dual-layer architecture: React PWA (frontend) + Fastify API (backend)
- Dexie.js for offline-first local state (IndexedDB)
- Outbox pattern for client-side sync queuing
- Last-Write-Wins (LWW) conflict resolution on server
- Pin-based auth with offline fallback
- Shop-scoped multi-tenancy (single server, multiple iPad locations)

## Layers

**Frontend Presentation Layer:**
- Purpose: React components for POS and admin interfaces
- Location: `client/src/features/`
- Contains: UI screens (POSScreen, AdminScreen), feature-specific components, form logic
- Depends on: Hooks (custom React), DB (Dexie), Sync (engine)
- Used by: App root

**Frontend Business Logic Layer:**
- Purpose: Core offline-first logic, cart state, sale completion, stock validation
- Location: `client/src/features/pos/useCart.ts`, `client/src/features/pos/useSaleComplete.ts`, `client/src/features/auth/useAuth.ts`
- Contains: Hooks for domain logic (not just React state)
- Depends on: DB layer, sync triggers
- Used by: Feature components

**Frontend Sync & Offline Layer:**
- Purpose: Queue operations when offline, replay when online
- Location: `client/src/sync/`
- Contains: `engine.ts` (flushOutbox, downloadProducts), `triggers.ts` (online/offline listeners), `useSyncStatus.ts` (UI feedback)
- Depends on: Dexie DB, fetch API
- Used by: App lifecycle, manual retry UI

**Frontend Local Database Layer:**
- Purpose: Persistent state, offline availability
- Location: `client/src/db/`
- Contains: Dexie schema (8 versions), types, shop context via `setShopId()`
- Depends on: IndexedDB (browser native)
- Used by: All features, sync engine

**Frontend Auth Layer:**
- Purpose: PIN verification, session persistence, offline fallback
- Location: `client/src/features/auth/`
- Contains: `useAuth()` hook (state machine), `serverAuth.ts` (API calls + localStorage), `pinAuth.ts` (PIN entry UI)
- Depends on: Server auth endpoint, idb-keyval for session storage
- Used by: App root component

**Backend Route Layer:**
- Purpose: HTTP endpoint handlers, request validation, response formatting
- Location: `server/src/routes/`
- Contains: Auth, Sync, Products, Reports, Import, Categories, Health, Settings routes
- Depends on: DB layer, services
- Used by: Fastify app instance

**Backend Service Layer:**
- Purpose: Business logic, external integrations
- Location: `server/src/services/` (mailer, reportTemplate)
- Contains: Email generation, report PDF assembly
- Depends on: Nodemailer, template utilities
- Used by: Routes

**Backend Database Layer:**
- Purpose: Schema definition, data persistence
- Location: `server/src/db/`
- Contains: Drizzle ORM schema, seed data, migration setup
- Depends on: SQLite (better-sqlite3)
- Used by: Routes, scheduler

**Backend Scheduler Layer:**
- Purpose: Async tasks (daily/monthly report generation)
- Location: `server/src/scheduler/`
- Contains: Cron-like tasks via toad-scheduler
- Depends on: DB, services (mailer, reportTemplate)
- Used by: Fastify app lifecycle

**Utility & Library Layer:**
- Purpose: Domain-specific utilities
- Location: `server/src/lib/`
- Contains: PDF parsing (pdfParser.ts), crypto (crypto.ts)
- Depends on: pdfjs-dist, Node.js crypto
- Used by: Routes (import), auth

## Data Flow

**Purchase Flow (Online & Offline):**

1. User taps Article → `ArticleCard` → `useCart.addItem()`
2. `useCart` validates stock in local Dexie cache
3. Item added to Redux-like cart state (snapshot of price at tap time)
4. User presses Complete Sale → `completeSale()`
5. Sale object created with current timestamps + `syncedAt: undefined`
6. `OutboxEntry` created with operation='SALE_COMPLETE'
7. Both Sale + OutboxEntry persisted to Dexie
8. UI shows summary, clears cart

**Sync Trigger (Online Detection):**

1. `window.online` event or manual retry
2. `flushOutbox()` executes
3. Fetch `/api/sync` with pending entries
4. Server validates (zod schema), processes in transaction
5. Server responds 200 OK
6. Client deletes outbox entries
7. Client calls `downloadProducts()` to refresh inventory
8. Download updates all `Product` records with LWW merge

**Download-Sync (Server → Client):**

1. Fetch `/api/products?shopId=xxx`
2. For each product: merge with local via `updatedAt` timestamp
3. Newer wins (Last-Write-Wins)
4. Local edits not yet synced are overwritten if server is newer
5. All merged products written back to Dexie

**State Management:**
- Client: React hooks + Dexie for persistence across reloads
- Server: SQLite single file, shop-scoped WHERE clauses
- Conflict resolution: LWW by `updatedAt` timestamp (frontend can observe race conditions)

## Key Abstractions

**Outbox Entry (Reliable Delivery):**
- Purpose: Queue operations when offline, retry with exponential backoff
- Examples: `client/src/db/schema.ts` OutboxEntry interface, `server/src/routes/sync.ts` SyncBatchSchema
- Pattern: Append-only, idempotent processing by operation type, attempt counter

**Product Snapshot (Price Immutability):**
- Purpose: Lock in sale prices at purchase time, prevent price changes retroactively
- Examples: `CartItem.salePrice`, `SaleItem.salePrice` in `client/src/db/schema.ts`
- Pattern: Copy price into cart/sale, never fetch from live product table during sale

**Shop Context (Multi-Tenancy Isolation):**
- Purpose: Single server instance serves multiple shop/location instances
- Examples: `client/src/db/index.ts` `setShopId()`, server all queries filter `WHERE shop_id = ?`
- Pattern: Dynamic shop ID set after login, used in all data layer queries

**Shop-Scoped Indexes (Dexie):**
- Purpose: Isolate data per shop location when multiple shops on same device
- Examples: `products` index `[shopId+active]`, `cartItems` index `productId, shopId`
- Pattern: Compound keys for shop isolation, simple `shopId` filter for queries

**LastWriteWins (LWW) Conflict Resolution:**
- Purpose: Resolve concurrent edits without CRDT complexity
- Examples: `server/src/routes/products.ts` POST products handler uses `onConflictDoUpdate` with `updatedAt` timestamp checks
- Pattern: Server only accepts update if `excluded.updated_at > existing.updated_at`

## Entry Points

**Frontend Entry Point (Browser):**
- Location: `client/src/main.tsx`
- Triggers: Page load
- Responsibilities:
  1. Register sync triggers (online/visibility listeners)
  2. Mount React root with `App` component
  3. Initialize PWA via vite-plugin-pwa

**App Component (State Machine):**
- Location: `client/src/App.tsx`
- Triggers: Component mount + auth state changes
- Responsibilities:
  1. Check stored session validity
  2. Render PinScreen (setup/unlock) or UnlockedApp (POS/Admin)
  3. Request storage persistence (IndexedDB quota)
  4. Download products after login if online

**API Server Entry:**
- Location: `server/src/index.ts`
- Triggers: Node process start
- Responsibilities:
  1. Initialize Fastify with CORS
  2. Register all route groups with `/api` prefix
  3. Register fastify-schedule for toad-scheduler
  4. Run migrations (drizzle-kit migrate)
  5. Seed database if empty
  6. Listen on port 3000 (or `PORT` env var)

## Error Handling

**Strategy:** Graceful degradation with offline fallback

**Patterns:**

**Network Errors (Sync):**
- Catch in `flushOutbox()` → increment attempts counter
- Next online event retries automatically
- Max 5 attempts before entry ignored
- UI shows "Sync failed" status via `useSyncStatus()` hook

**Validation Errors (Server):**
- Zod safeParse catches malformed requests
- Returns 400 + error details
- Client observes failed outbox entries via `useSyncStatus.failedCount`
- Admin can manually trigger retry or clear failed entries

**Offline Auth:**
- Online: PIN checked against server hash
- Offline: Previously stored session validity checked against 2-hour TTL
- No offline PIN verification possible (server hashes unknown client-side)

**Stock Validation:**
- Before add-to-cart: check `product.stock > 0 && available > inCart`
- During checkout: no re-validation (assumes offline purchase is valid)
- After sync: download updates inventory, UI re-checks validity
- Invalid items auto-removed from cart, user notified

## Cross-Cutting Concerns

**Logging:**
- Frontend: No structured logging, console.warn/error for issues
- Server: Fastify logger (request logs, errors via `fastify.log.error()`)

**Validation:**
- Frontend: Reactive checks (stock before add, quantity > 0)
- Server: Zod schemas on all POST/PUT requests

**Authentication:**
- Frontend: PIN → server, store session (shopId, token, expiresAt) in idb-keyval
- Server: SHA-256 PIN hash from database, compare on login
- Offline fallback: 2-hour session TTL without re-auth required

**Pagination & Filtering:**
- Not implemented (small dataset assumptions)
- GET /products returns all products for a shop
- Filtering done client-side in UI (ArticleGrid, ProductList)

---

*Architecture analysis: 2026-03-24*
