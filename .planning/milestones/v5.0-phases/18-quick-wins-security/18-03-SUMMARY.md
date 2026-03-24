---
phase: 18-quick-wins-security
plan: "03"
subsystem: security
tags: [rate-limit, auth, session, authorization, fastify, brute-force]
dependency_graph:
  requires: []
  provides: [SEC-02, SEC-03]
  affects: [server/src/routes/*, client/src/sync/engine.ts, client/src/features/admin/*]
tech_stack:
  added: ["@fastify/rate-limit"]
  patterns: ["In-Memory Session Store", "Bearer Token Auth", "preHandler Auth-Middleware"]
key_files:
  created:
    - server/src/lib/sessions.ts
  modified:
    - server/src/routes/auth.ts
    - server/src/index.ts
    - server/src/routes/sync.ts
    - server/src/routes/products.ts
    - server/src/routes/categories.ts
    - server/src/routes/reports.ts
    - server/src/routes/settings.ts
    - client/src/features/auth/serverAuth.ts
    - client/src/sync/engine.ts
    - client/src/features/admin/reports/MonthlyReport.tsx
    - client/src/features/admin/settings/CategoryManager.tsx
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/admin/products/ProductStats.tsx
    - client/src/features/admin/settings/SettingsForm.tsx
    - client/src/features/admin/products/ProductForm.tsx
    - client/src/features/admin/import/ImportScreen.tsx
decisions:
  - "@fastify/rate-limit mit global:false — nur /api/auth/pin erhält Rate-Limiting, keine globale Performancebremse"
  - "In-Memory Session Store als Map<token, {shopId, createdAt}> — kein DB-Overhead, Sessions überleben Server-Neustart nicht (akzeptabel, Client re-loggt automatisch)"
  - "preHandler-Hook in index.ts statt pro Route — Single Point of Truth, keine vergessenen Routen"
  - "shopId aus Session statt aus Query/Body lesen — eliminiert Client-Ehrlichkeit als Sicherheitsannahme"
  - "getAuthHeaders() als zentraler Helper — alle fetch-Aufrufe einheitlich, kein vergessener Token"
metrics:
  duration: "~20 Minuten"
  completed: "2026-03-24"
  tasks: 2
  files: 16
---

# Phase 18 Plan 03: Rate-Limiting + Session-Auth + ShopId-Isolation Summary

**One-liner:** @fastify/rate-limit (5/min/IP) auf /api/auth/pin + In-Memory Session Store + preHandler Auth-Middleware + shopId-Enforcement auf allen Routen + Authorization-Header in allen Client-API-Calls.

## What Was Built

### Task 1: Rate-Limiting + Session-Store + Auth-Middleware

- **@fastify/rate-limit installiert** mit `global: false` — nur explizit markierte Routen betroffen
- **server/src/lib/sessions.ts erstellt** — In-Memory Map<token, {shopId, createdAt}> mit `createSession`, `validateSession`, `deleteSession`, `getSessionCount`
- **auth.ts erweitert** — `config.rateLimit: { max: 5, timeWindow: '1 minute' }` + `createSession(token, shop.shopId)` nach erfolgreichem PIN-Check
- **index.ts erweitert** — `rateLimit(global:false)` registriert + `preHandler`-Hook: alle `/api/*` außer `/api/auth/*` und `/api/health` verlangen `Authorization: Bearer <token>`

### Task 2: ShopId-Validierung + Authorization-Header

**Server-Seite:**
- **sync.ts** — 403 wenn `entry.shopId !== session.shopId` (nach Zod-Validierung, vor Einzel-Entry-Verarbeitung)
- **products.ts** — GET liest `shopId` aus Session (kein Query-Param mehr); POST validiert `body.shopId === session.shopId`
- **categories.ts** — alle Handler lesen `shopId` aus Session; PATCH/DELETE prüfen `cat.shopId === session.shopId`
- **reports.ts** — alle 3 Endpoints lesen `shopId` aus Session (monthly, yearly, product-stats)
- **settings.ts** — GET + PUT lesen `shopId` aus Session

**Client-Seite:**
- **serverAuth.ts** — neue Exportfunktion `getAuthHeaders()` gibt `{Content-Type, Authorization: Bearer <token>}` zurück
- **engine.ts** — `flushOutbox`, `downloadProducts`, `downloadCategories` verwenden `await getAuthHeaders()`
- **Alle Admin-Komponenten** — MonthlyReport, CategoryManager, ProductList, ProductStats, SettingsForm, ProductForm, ImportScreen verwenden `getAuthHeaders()` in allen fetch-Calls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Auth-Header in Admin-Komponenten ergänzt**
- **Found during:** Task 2
- **Issue:** Plan nannte nur engine.ts explizit, aber 7 weitere Admin-Komponenten hatten ungeschützte fetch-Calls gegen /api/* Endpunkte (Categories, Products, Reports, Settings, Import)
- **Fix:** getAuthHeaders() in MonthlyReport.tsx, CategoryManager.tsx, ProductList.tsx, ProductStats.tsx, SettingsForm.tsx, ProductForm.tsx, ImportScreen.tsx ergänzt
- **Files modified:** alle 7 genannten Dateien
- **Commit:** 3ec72fb

**2. [Rule 2 - Missing Critical] shopId aus Body in settings/categories POST entfernt**
- **Found during:** Task 2
- **Issue:** SettingsForm.tsx und CategoryManager.tsx schickten `shopId` noch im Request-Body mit — nach Umstellung auf Session-basierte shopId im Server unnötig und potentiell irreführend
- **Fix:** shopId aus Body entfernt, Server liest ausschließlich aus Session
- **Files modified:** settings.ts, SettingsForm.tsx, CategoryManager.tsx
- **Commit:** 3ec72fb

## Security Impact

| Angriff | Vorher | Nachher |
|---------|--------|---------|
| PIN Brute-Force (10.000 Kombinationen) | ~1 Sekunde | ~33 Minuten (5/min-Limit) |
| Token für Shop A auf Shop B verwenden | möglich (Client-Ehrlichkeit) | 403 (Server-Enforcement) |
| Request ohne Token an /api/sync | 200 (kein Check) | 401 (preHandler blockiert) |
| shopId-Manipulation im Request-Body | wirksam | ignoriert (Session dominiert) |

## Known Stubs

None — alle Sicherheitsfeatures vollständig implementiert.

## Self-Check: PASSED

- FOUND: server/src/lib/sessions.ts
- FOUND: server/src/routes/auth.ts
- FOUND: .planning/phases/18-quick-wins-security/18-03-SUMMARY.md
- FOUND: commit 138dcef (Task 1)
- FOUND: commit 3ec72fb (Task 2)
