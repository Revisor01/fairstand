# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- TypeScript 5.x - Complete codebase (client, server, shared types), strict mode enabled
- JavaScript (ES2022) - Server target (Node.js 22), ESM modules throughout

**Secondary:**
- CSS - Tailwind-generated styles on client (no manual CSS files)
- Shell - Docker entrypoint scripts

## Runtime

**Environment:**
- Node.js 22 (Alpine Linux container image: `node:22-alpine`)
- Browser environment: Modern browsers with Service Worker and IndexedDB support (iOS Safari, Chrome, Firefox)

**Package Manager:**
- npm (workspace monorepo structure)
- Lockfile: `package-lock.json` present in both `/client` and `/server`

## Frameworks

**Core:**
- React 19.x - Client UI framework, component-based architecture
- Fastify 5.7.x - Backend REST API framework, async-first, excellent TypeScript integration

**Frontend Specific:**
- React Router 7.x - Client-side routing (used in App navigation)
- Workbox 7.4.0 - Service Worker caching and background sync (via `vite-plugin-pwa`)
- Vite 6.x - Frontend build tool and dev server, ESM native

**Backend Specific:**
- Drizzle ORM 0.40.x - Type-safe SQLite schema and query builder
- better-sqlite3 11.x - Synchronous SQLite driver for Node.js
- Nodemailer 8.0.3 - SMTP-based email delivery

**Testing:**
- Vitest 3.x (client), Vitest 4.1.1 (server) - Unit test framework

**Build/Dev:**
- tsx 4.x - TypeScript executor for development (server `npm run dev`)
- drizzle-kit 0.30.x - Schema migrations and database CLI
- @vitejs/plugin-react 4.x - React Fast Refresh integration
- @tailwindcss/vite 4.x - Tailwind CSS integration via Vite plugin

## Key Dependencies

**Critical (Offline-First Architecture):**
- dexie 4.3.0 - IndexedDB wrapper with full TypeScript support, used for client-side data persistence
- dexie-react-hooks 4.2.0 - React hooks for live Dexie queries (`useLiveQuery`)
- idb-keyval 6.x - Simple key-value IndexedDB storage for auth tokens and config
- workbox-window 7.x - Service Worker lifecycle management from client code
- workbox-background-sync 7.4.0 - Automatic retry queue for offline requests (via Workbox Recipes)

**Data Validation & Serialization:**
- zod 3.x - Runtime schema validation on both client and server (no shared TS interfaces across network boundaries)

**Client UI:**
- tailwindcss 4.x - Utility-first CSS framework for touch-optimized interfaces
- lucide-react 1.6.0 - Icon library (React components)
- recharts 3.8.0 - Charting library for sales reports and analytics
- react-dom 19.x - React rendering engine
- react-router-dom 7.x - Declarative routing for SPA navigation

**Server Infrastructure:**
- @fastify/cors 10.x - CORS middleware for cross-origin requests
- @fastify/multipart 9.4.0 - Multipart form data handling (PDF uploads for invoice import)
- @fastify/schedule 6.0.0 - Cron job scheduling (monthly email reports)
- toad-scheduler 3.1.0 - Task scheduler library (used with fastify-schedule)

**PDF Processing:**
- pdfjs-dist 5.5.207 - Mozilla's PDF.js for server-side parsing and text extraction from Süd-Nord-Kontor invoices

**Date/Time:**
- date-fns 4.x - Tree-shakeable date manipulation (monthly reports, time filtering)

## Configuration

**Environment:**
- Environment variables via `.env` (Docker Compose sets at runtime):
  - `PORT` - Server listen port (default: 3000)
  - `CORS_ORIGIN` - Client origin for CORS (set to `https://fairstand.godsapp.de`)
  - `TZ` - Timezone (set to `Europe/Berlin`)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` - Email configuration (optional, reports disabled if unconfigured)
  - `SMTP_FROM` - Email sender address (default: `Fairstand <noreply@fairstand.godsapp.de>`)
  - `DB_PATH` - SQLite database path (default: `./data/fairstand.db` in container `/app/data`)

**TypeScript Configuration:**
- Server: `src/tsconfig.json` - Strict mode, ESM modules, ES2022 target, source maps enabled
- Client: `client/tsconfig.app.json` - Referenced from `client/tsconfig.json`
- Both: declaration files and source maps generated for debugging

**Build:**
- Client: `client/vite.config.ts` - Vite configuration with React plugin, Tailwind CSS, and vite-plugin-pwa
- Server: No explicit Vite config (uses `npm run build` → TypeScript compiler → `dist/index.js`)
- Docker: Multi-stage builds for both client (Node → Nginx) and server (Node → Alpine production image)

**PWA/Service Worker:**
- `client/vite.config.ts` - vite-plugin-pwa configured with:
  - `registerType: 'prompt'` - User can choose when to update SW
  - Workbox configuration for precaching app shell and runtime caching of API responses
  - Cache strategy: API routes use `NetworkFirst` with 5-second timeout
  - Web manifest for iOS/Android installability
  - Icons: 192x192 and 512x512 PNG files

## Platform Requirements

**Development:**
- Node.js 22+
- npm 10+
- Docker and Docker Compose (for local container testing)
- TypeScript knowledge (strict mode, no `any` types)

**Production:**
- Docker container runtime (tested on Hetzner server with Traefik reverse proxy)
- SQLite file storage (1-volume mount: `/app/data/` in container)
- SMTP server (optional, for email reports; can be skipped)
- Reverse proxy (Apache with KeyHelp via Traefik internal proxy on port 8888)
- 10 MB file upload limit for PDF invoice imports
- TLS/HTTPS handled by Apache reverse proxy (not in container)

**Network:**
- CORS configured for single origin (`CORS_ORIGIN` env var)
- Service Worker enables offline-first operation — no WLAN required in Kirche
- Background Sync: Failed requests queued until online, then replayed automatically
- Workbox Recipes include stale-while-revalidate for API caching

---

*Stack analysis: 2026-03-24*
