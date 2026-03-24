# Codebase Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```
fairstand/                          # Monorepo root (pnpm workspaces)
├── client/                         # React PWA (vite)
│   ├── public/                     # Static assets (icons, logos)
│   ├── src/
│   │   ├── App.tsx                # Root component (state machine)
│   │   ├── main.tsx               # Entry point (PWA registration)
│   │   ├── index.css              # Tailwind CSS imports
│   │   ├── db/                    # Dexie schema & types
│   │   ├── features/              # Feature-based organization
│   │   │   ├── auth/              # PIN auth & session
│   │   │   ├── pos/               # Point-of-sale (cart, payment)
│   │   │   └── admin/             # Admin panel (products, reports, import)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── sync/                  # Offline-first sync engine
│   │   └── components/            # Reusable UI components (currently empty)
│   ├── dist/                       # Build output (git ignored)
│   ├── dev-dist/                   # Vite dev server cache (git ignored)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts             # PWA + Tailwind setup
│   └── index.html
├── server/                         # Fastify API (Node.js)
│   ├── src/
│   │   ├── index.ts               # Fastify app setup
│   │   ├── db/
│   │   │   ├── index.ts           # better-sqlite3 connection
│   │   │   ├── schema.ts          # Drizzle ORM table definitions
│   │   │   ├── seed.ts            # Initial shop seeding
│   │   │   └── migrations/        # Drizzle migration files (auto-generated)
│   │   ├── routes/                # HTTP endpoint handlers
│   │   │   ├── auth.ts            # POST /login, POST /logout
│   │   │   ├── sync.ts            # POST /sync (outbox replay)
│   │   │   ├── products.ts        # GET/POST /products, image upload
│   │   │   ├── categories.ts      # GET/POST /categories
│   │   │   ├── reports.ts         # GET /reports/daily, /monthly
│   │   │   ├── import.ts          # POST /import/parse (PDF)
│   │   │   ├── settings.ts        # GET/POST /settings
│   │   │   └── health.ts          # GET /health
│   │   ├── services/              # Business logic & external APIs
│   │   │   ├── mailer.ts          # Email via Nodemailer
│   │   │   └── reportTemplate.ts  # PDF/HTML report generation
│   │   ├── scheduler/             # Async tasks (cron-like)
│   │   │   └── reportScheduler.ts # Daily/monthly report emails
│   │   └── lib/                   # Utilities
│   │       ├── pdfParser.ts       # Süd-Nord-Kontor invoice parsing
│   │       └── crypto.ts          # PIN hashing (SHA-256)
│   ├── data/                       # SQLite database file (volume-mounted)
│   │   └── fairstand.db           # Single SQLite database file
│   ├── dist/                       # Compiled JS output (git ignored)
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile                 # Multi-stage build: frontend → backend
├── .planning/                      # GSD planning artifacts
│   ├── codebase/                  # Architecture & structure docs
│   ├── debug/
│   ├── milestones/
│   ├── phases/
│   └── research/
├── .github/
│   └── workflows/                 # GitHub Actions CI/CD
├── package.json                   # Monorepo root (workspaces: client, server)
└── CLAUDE.md                      # Project constraints & conventions
```

## Directory Purposes

**client/src/db:**
- Purpose: Offline-first database schema & utilities
- Contains: Dexie class definition, TypeScript interfaces, shop context
- Key files: `schema.ts` (8 versions of schema evolution), `index.ts` (db instance + shop ID context)

**client/src/features/auth:**
- Purpose: PIN-based authentication and session management
- Contains: `useAuth()` hook (state machine), `serverAuth.ts` (login/logout + idb-keyval), `pinAuth.ts` (UI)
- Key files: `useAuth.ts` (auth flow logic), `serverAuth.ts` (offline fallback logic)

**client/src/features/pos:**
- Purpose: Point-of-sale interface (main cash register flow)
- Contains: ArticleGrid, CartPanel, PaymentFlow, NumPad
- Key files: `useCart.ts` (cart state machine), `useSaleComplete.ts` (finalize purchase), `POSScreen.tsx` (main layout)

**client/src/features/admin:**
- Purpose: Admin management panel (products, reports, import, settings)
- Contains: ProductList, DailyReport, MonthlyReport, ImportScreen, CategoryManager
- Key files: `AdminScreen.tsx` (tab navigation), `import/` (PDF upload & parsing UI)

**client/src/hooks:**
- Purpose: Reusable custom React hooks for domain logic
- Contains: `useLowStockCount.ts` (query products below minStock threshold)

**client/src/sync:**
- Purpose: Offline-first sync engine
- Contains: `engine.ts` (flushOutbox, downloadProducts), `triggers.ts` (online/offline listeners), `useSyncStatus.ts` (UI state)
- Key files: `engine.ts` (core sync logic), `triggers.ts` (event listener setup in main.tsx)

**server/src/db:**
- Purpose: Database schema and connection management
- Contains: Drizzle ORM table definitions, SQLite connection, migrations
- Key files: `schema.ts` (products, sales, settings, shops, categories, outboxEvents), `seed.ts` (initial shop creation)

**server/src/routes:**
- Purpose: HTTP endpoints and request handling
- Contains: Auth, Sync, Products, Reports, Import, etc.
- Key files: `sync.ts` (outbox processing), `products.ts` (LWW upsert), `import.ts` (PDF upload handler)

**server/src/services:**
- Purpose: Business logic and external integrations
- Contains: Email sending, report PDF generation
- Key files: `mailer.ts` (Nodemailer setup), `reportTemplate.ts` (HTML/PDF templates)

**server/src/scheduler:**
- Purpose: Scheduled async tasks
- Contains: Daily/monthly report generation and email delivery
- Key files: `reportScheduler.ts` (toad-scheduler tasks)

**server/src/lib:**
- Purpose: Utility functions and domain-specific libraries
- Contains: PDF parsing, crypto utilities
- Key files: `pdfParser.ts` (Süd-Nord-Kontor invoice parsing via pdfjs-dist)

## Key File Locations

**Entry Points:**
- `client/src/main.tsx`: Frontend entry (PWA registration, React mount)
- `client/src/App.tsx`: Auth state machine, route between PinScreen and main app
- `server/src/index.ts`: Fastify app initialization, route registration

**Configuration:**
- `client/vite.config.ts`: Vite build + PWA manifest setup
- `client/tsconfig.json`: TypeScript compiler options
- `server/tsconfig.json`: Node.js TypeScript config
- `package.json`: Monorepo root with workspaces

**Core Logic:**
- `client/src/db/schema.ts`: Dexie database schema (all table definitions & types)
- `client/src/features/pos/useCart.ts`: Cart state machine (reducer pattern)
- `client/src/sync/engine.ts`: Offline sync implementation (flushOutbox, downloadProducts)
- `server/src/routes/sync.ts`: Outbox processing and idempotent sale insertion
- `server/src/routes/products.ts`: LWW product upsert logic
- `server/src/lib/pdfParser.ts`: Süd-Nord-Kontor invoice parsing

**Testing:**
- `client/src/features/pos/useCart.test.ts`: Cart state machine tests
- `client/src/features/pos/ArticleCard.test.tsx`: Article card component tests
- `server/src/lib/pdfParser.test.ts`: PDF parsing tests

## Naming Conventions

**Files:**
- Feature screens: `[Feature]Screen.tsx` (e.g., POSScreen, AdminScreen)
- Custom hooks: `use[DomainConcept].ts` (e.g., useAuth, useCart, useSyncStatus)
- Test files: `[name].test.ts` or `[name].test.tsx` (co-located with source)
- Utility functions: `[name].ts` (e.g., pdfParser.ts, crypto.ts)
- Route handlers: `[resource].ts` (e.g., products.ts, auth.ts)

**Directories:**
- Feature directories: `[feature]/` lowercase (e.g., pos/, admin/, auth/)
- Sub-feature directories: `[domain]/` (e.g., admin/products/, admin/reports/)
- Shared logic: `hooks/`, `lib/`, `services/`, `components/`

**Exports & Interfaces:**
- React components: PascalCase (e.g., `export function POSScreen()`)
- Hooks: camelCase starting with `use` (e.g., `export function useAuth()`)
- Interfaces: PascalCase with I prefix or contextual name (e.g., `Product`, `Sale`, `CartItem`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_ATTEMPTS`, `IMAGES_DIR`)

## Where to Add New Code

**New Feature Screen:**
- Primary code: `client/src/features/[feature]/[Feature]Screen.tsx`
- Hooks: `client/src/features/[feature]/use[DomainLogic].ts`
- Tests: `client/src/features/[feature]/use[DomainLogic].test.ts`
- Components: Inline or in `client/src/features/[feature]/` subdirectory

**New Backend Route:**
- Implementation: `server/src/routes/[resource].ts` with `export async function [resource]Routes(fastify: FastifyInstance)`
- Register in: `server/src/index.ts` with `await fastify.register([resource]Routes, { prefix: '/api' })`
- Schemas: Inline zod schemas at top of route file or separate utility file if reused

**New Database Table:**
- Define in: `server/src/db/schema.ts` using Drizzle `sqliteTable()`
- Create migration: Run `drizzle-kit generate` (auto-generates from schema)
- Client-side equivalent: Add Dexie table in `client/src/db/schema.ts` version increment

**New Custom Hook:**
- Location: `client/src/hooks/use[Concept].ts` OR `client/src/features/[feature]/use[Concept].ts`
- If cross-feature: place in `client/src/hooks/`
- If feature-specific: place in feature directory

**Shared Utilities:**
- Frontend: `client/src/lib/` (if created) or inline in feature
- Server: `server/src/lib/` for domain-specific utilities
- Validation schemas: Inline in routes or shared via `server/src/lib/schemas.ts` (not yet created)

## Special Directories

**client/public:**
- Purpose: Static assets served as-is by Vite
- Generated: No
- Committed: Yes (icons, logos referenced in manifest)

**server/data:**
- Purpose: SQLite database file persistence
- Generated: Yes (SQLite creates fairstand.db)
- Committed: No (database content, not schema)
- Volume-mounted in Docker: `/app/data` → `server/data` on host

**client/dist & server/dist:**
- Purpose: Compiled build output
- Generated: Yes (by `npm run build`)
- Committed: No

**server/migrations:**
- Purpose: Drizzle-kit auto-generated SQL migration files
- Generated: Yes (by `drizzle-kit generate`)
- Committed: Yes (for schema version control)

**.planning/**
- Purpose: GSD planning artifacts (not source code)
- Generated: By GSD tools
- Committed: Yes

## Important Patterns & Conventions

**Database Versioning (Dexie):**
All changes increment `version()` call in `client/src/db/schema.ts`. Each version includes upgrade migration in `.upgrade()` callback.

**Shop Context (Multi-Tenancy):**
All database queries filter by `shopId`. Set via `setShopId()` after login. Retrieve via `getShopId()` in logic.

**Zod Validation:**
All POST/PUT requests validated with `safeParse()` in route handlers. Errors returned as 400 with flattened schema details.

**Responsive Design:**
Tailwind CSS v4 with touch-first approach. Button min-height 44px, large tap targets. No hover states (touch doesn't have hover).

**TypeScript Strict Mode:**
Both client and server use strict TypeScript. No implicit any, all functions typed.

---

*Structure analysis: 2026-03-24*
