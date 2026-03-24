# External Integrations

**Analysis Date:** 2026-03-24

## APIs & External Services

**Email Reporting:**
- Nodemailer (SMTP) - Sends monthly sales/donation reports as HTML email
  - SDK/Client: `nodemailer` v8.0.3
  - Configuration: `src/services/mailer.ts` handles Nodemailer transporter creation
  - Auth: Environment variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
  - Status: Optional — if SMTP not configured, email reports are disabled (`isMailConfigured()` check)
  - Used by: `src/scheduler/reportScheduler.ts` (scheduled job that runs monthly)
  - Output: HTML-formatted report with sales summary, cost breakdown, top articles

**No Third-Party API Integrations:**
- No Stripe, Supabase, AWS, or cloud service integrations
- No OAuth/external auth providers (custom PIN-based authentication)
- No external CMS or product data sources
- All business logic and data stays on-premises

## Data Storage

**Primary Database:**
- SQLite (better-sqlite3)
  - Location: `/app/data/fairstand.db` (mounted volume in Docker)
  - Client: `better-sqlite3` v11 (synchronous driver on server)
  - ORM: Drizzle ORM 0.40.x for schema and queries
  - Schema file: `src/db/schema.ts`
  - Migrations: Auto-run on startup via `drizzle-kit migrate` (migrations in `/migrations` directory)
  - Tables: `products`, `sales`, `settings`, `outbox_events`, `shops`, `categories`
  - Row-level isolation: All tables include `shopId` column for multi-shop support

**Client-Side Storage (Offline-First):**
- IndexedDB (via Dexie.js 4.3.0)
  - Database name: `'fairstand-db'`
  - Schema: `src/db/schema.ts` (mirrors server schema)
  - Tables: `products`, `sales`, `outbox`, `cartItems`, `categories`
  - Persistence: Survives app restart (localStorage not used due to 5 MB limit)
  - Data sync: Outbox pattern sends queued operations to server when online

**Configuration/Auth Storage:**
- idb-keyval (simple key-value IndexedDB)
  - Stores: Auth tokens, current shop ID, PIN hash verification state
  - Client paths: Various feature files (`src/features/auth/*.ts`, `src/features/admin/import/ImportScreen.tsx`)
  - Not synced to server (local-only client state)

**File Storage:**
- Local filesystem only
  - No external file hosting (S3, Wasabi, etc.)
  - Product images: `imageUrl` field can reference local or external URLs (no upload mechanism current)
  - PDF invoices: Uploaded to `/api/import/parse` endpoint, parsed server-side, discarded after import (no storage)

**Caching:**
- Service Worker (Workbox)
  - Precaches entire app shell (JS, CSS, HTML, icons, fonts)
  - Runtime caching: API responses (`/api/*`) use `NetworkFirst` strategy with 5-second timeout
  - Cache name: `'api-cache'`
  - Fallback: Workbox background sync queues failed POSTs for retry when online

## Authentication & Identity

**Auth Provider:**
- Custom PIN-based (no OAuth, no external identity provider)
  - Implementation: `src/routes/auth.ts` validates PIN against `shops` table
  - Flow:
    1. User enters 4-8 digit PIN
    2. PIN hashed with SHA-256 (server: `src/lib/crypto.ts`)
    3. Hash compared against `shops.pin` database entry
    4. Server returns: `shopId`, `shopName`, and ephemeral `token` (random UUID)
  - Token storage: Client stores token in `idb-keyval` (no JWT, no expiry, stateless on server)
  - No server-side session storage (tokens are not validated — shop isolation via `shopId` in request body)
  - Authorization: Client sends `shopId` with every request (not cryptographically verified, relies on network security)

## Monitoring & Observability

**Error Tracking:**
- Not detected — no Sentry, Rollbar, or similar integration

**Logging:**
- Server: Fastify built-in logger (configured with `logger: true` in `src/index.ts`)
  - Log format: Pino (Fastify's default logger)
  - Output: stdout (captured by Docker container logging)
  - Error details: PDF parsing errors logged before 422 response

**Client:**
- No centralized logging — development console only
- Sync status exposed via `useSyncStatus()` hook for UI feedback

## CI/CD & Deployment

**Hosting:**
- Docker (Hetzner server: `server.godsapp.de`, IP `213.109.162.132`)
- Container orchestration: Docker Compose with Traefik reverse proxy
- Network: Both client and server containers on `traefik` external network
- Restart policy: `unless-stopped`

**CI Pipeline:**
- Not detected in `.github/workflows/` (repo exists but workflows not found during analysis)
- Manual deployment process:
  1. Code push to repo
  2. `docker-compose build` locally or on server
  3. `docker-compose up -d` via Docker or Portainer
  4. Traefik automatically routes `fairstand.godsapp.de` to containers

**Image Registries:**
- No external registry (images built locally, not pushed to Docker Hub or other registry)

## Environment Configuration

**Required Environment Variables (Docker Compose):**
```
PORT=3000
CORS_ORIGIN=https://fairstand.godsapp.de
TZ=Europe/Berlin
SMTP_HOST=<mail server hostname>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<account email>
SMTP_PASS=<account password>
SMTP_FROM=Fairstand <noreply@fairstand.godsapp.de>
```

**Optional:**
- `DB_PATH` - SQLite database path (default: `./data/fairstand.db`)
  - Not set in docker-compose.yml — uses default

**Secrets Location:**
- `.env` file (not checked into git)
- Docker Compose environment variables (SMTP credentials, CORS origin)
- No `.env.example` found — credentials must be manually configured during deployment

**Development Defaults:**
- CORS_ORIGIN fallback: `*` (open CORS if env not set)
- DB_PATH fallback: `./data/fairstand.db`
- SMTP disabled by default (optional feature)

## Webhooks & Callbacks

**Incoming:**
- None detected — no webhook endpoints for external services

**Outgoing:**
- Email reports only (via Nodemailer → SMTP server)
- No webhooks to external services

**Sync Mechanism (Internal):**
- Client-initiated POST to `/api/sync` with batch of queued operations
- Server processes operations and responds with status
- No server-to-client push notifications

## Reverse Proxy & TLS

**Traefik (Internal Proxy):**
- Server-side reverse proxy at `127.0.0.1:8888` (internal Docker network)
- Routes traffic from Apache vHost (KeyHelp) to containers
- Docker Compose labels:
  - Client: `Host(fairstand.godsapp.de)` → port 80 (Nginx serving built app)
  - Server: `Host(fairstand.godsapp.de) && PathPrefix(/api)` → port 3000 (Fastify API)

**TLS/HTTPS:**
- Handled by Apache reverse proxy (not in container)
- ACME certificate management: KeyHelp/Apache (not in docker-compose)
- Traefik label `priority=100` ensures API routes take precedence over static routes

**CORS:**
- Fastify CORS plugin allows single origin: `process.env.CORS_ORIGIN`
- Credentials: Not applicable (tokens passed via request body, not cookies)

---

*Integration audit: 2026-03-24*
