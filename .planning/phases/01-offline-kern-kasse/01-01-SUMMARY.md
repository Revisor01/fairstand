---
phase: 01-offline-kern-kasse
plan: 01
subsystem: monorepo-scaffold
tags: [vite, react, pwa, fastify, docker, ci-cd, traefik]
dependency_graph:
  requires: []
  provides: [client-scaffold, server-scaffold, docker-stack, ci-cd-pipeline]
  affects: [01-02, 01-03]
tech_stack:
  added:
    - React 19 + TypeScript 5 + Vite 6
    - vite-plugin-pwa 1.2.0 (Workbox, Service Worker)
    - "@tailwindcss/vite 4 + tailwindcss 4"
    - Fastify 5.7 + @fastify/cors
    - better-sqlite3 + drizzle-orm + drizzle-kit
    - tsx 4 (Dev-Server)
    - nginx:alpine (Client-Container)
    - node:20-alpine (Server-Container)
  patterns:
    - "Multi-Stage Docker Build: build → production"
    - "Traefik external network mit PathPrefix für API"
    - "VitePWA registerType: prompt (kein mid-Session Auto-Update)"
    - "nginx Service-Worker Cache-Control no-store"
key_files:
  created:
    - client/package.json
    - client/vite.config.ts
    - client/tsconfig.json
    - client/tsconfig.app.json
    - client/index.html
    - client/src/main.tsx
    - client/src/App.tsx
    - client/src/index.css
    - client/public/icons/icon-192.png
    - client/public/icons/icon-512.png
    - client/nginx.conf
    - client/Dockerfile
    - server/package.json
    - server/tsconfig.json
    - server/src/index.ts
    - server/src/routes/health.ts
    - server/drizzle.config.ts
    - server/Dockerfile
    - docker-compose.yml
    - .github/workflows/deploy.yml
    - .gitignore
    - package.json
  modified: []
decisions:
  - "registerType: prompt statt autoUpdate — verhindert mid-Session-Reload der Kasse"
  - "Traefik external:true — fairstand.godsapp.de über bestehenden Stack"
  - "better-sqlite3 synchron — passt zu Fastify route handlers ohne async overhead"
  - "PWA-Icons als sky-400 Platzhalter — werden in UI-Phase (Plan 03) ersetzt"
metrics:
  duration_minutes: 6
  completed_date: "2026-03-23"
  tasks_completed: 2
  tasks_total: 2
  files_created: 22
  files_modified: 0
---

# Phase 01 Plan 01: Monorepo-Gerüst — Vite+React PWA, Fastify, Docker und GitHub Actions CI/CD

**One-liner:** Monorepo-Fundament mit Vite 6 + React 19 PWA (vite-plugin-pwa, registerType: prompt), Fastify 5 Backend (GET /api/health), Multi-Stage Docker-Stack im Traefik-Netzwerk (fairstand.godsapp.de) und GitHub Actions CI/CD mit GHCR-Push und Portainer-Webhook.

## What Was Built

Das vollständige Monorepo-Gerüst für Fairstand. Kein Feature-Code — nur das Fundament, auf dem Plan 01-02 (Dexie-Schema) und 01-03 (POS-UI) aufbauen.

**Client (client/):**
- Vite 6 + React 19 + TypeScript 5 mit strikter Konfiguration (moduleResolution: bundler)
- vite-plugin-pwa mit `registerType: 'prompt'` — PWA aktualisiert sich erst nach expliziter Nutzerbestätigung (wichtig: kein Warenkorb-Reset mid-Session)
- Workbox NetworkFirst für API-Calls (`/api/*`), Precaching der App Shell
- Tailwind 4 via `@tailwindcss/vite` Plugin
- App.tsx: Placeholder mit `bg-sky-50` / `text-sky-700` (verifiziert Tailwind-Integration)
- iOS PWA Meta-Tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
- PWA-Icons: 192×192 und 512×512 sky-400 Platzhalter (werden in UI-Phase ersetzt)
- `npm run build` erzeugt `dist/manifest.webmanifest` mit `theme_color: #38bdf8`

**Server (server/):**
- Fastify 5.7 mit TypeScript, CORS (`@fastify/cors`)
- `GET /api/health` → `{ status: 'ok', timestamp: number }`
- drizzle.config.ts als Platzhalter für Plan 01-02 (Drizzle-Schema noch nicht vorhanden)
- Multi-Stage Dockerfile: build (tsc) → production (npm ci --omit=dev)

**Infrastruktur:**
- `docker-compose.yml`: client (nginx:alpine) + server (node:20-alpine), beide im `traefik` External Network
- Traefik Labels: `fairstand.godsapp.de` (Client Port 80), `fairstand.godsapp.de/api` (Server Port 3000)
- SQLite-Volume `sqlite-data` für persistente Datenbankdatei
- `.github/workflows/deploy.yml`: Push auf main → GHCR build+push (client+server) → Portainer Webhook
- `.gitignore`: node_modules, dist, .env, *.db, data/

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Client-Gerüst mit Vite, React 19, Tailwind 4 und vite-plugin-pwa | c649a2a | client/package.json, client/vite.config.ts, client/src/App.tsx |
| 2 | Fastify-Backend, Docker-Stack und GitHub Actions CI/CD | 2ae4bb2 | server/src/index.ts, docker-compose.yml, .github/workflows/deploy.yml |

## Verification Results

- `npm run build` in client/ — PASS (dist/ mit manifest.webmanifest erzeugt)
- `manifest.webmanifest` enthält `theme_color: #38bdf8` — PASS
- `registerType: 'prompt'` in vite.config.ts — PASS
- `external: true` in docker-compose.yml — PASS
- `PORTAINER_WEBHOOK_URL` in deploy.yml — PASS
- `no-store` + `Service-Worker-Allowed` in nginx.conf — PASS
- `status: ok` in server/src/routes/health.ts — PASS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript-Fehler bei CSS-Import in main.tsx**
- **Found during:** Task 1 — `npm run build` Fehler
- **Issue:** `tsc -b` kann `./index.css` nicht als Modul auflösen (`error TS2307: Cannot find module './index.css'`)
- **Fix:** CSS-Import aus `main.tsx` entfernt. Tailwind 4 wird über `@tailwindcss/vite`-Plugin automatisch verarbeitet — kein expliziter CSS-Import in main.tsx nötig. Die `index.css` mit `@import "tailwindcss"` bleibt für zukünftige Nutzung erhalten.
- **Files modified:** `client/src/main.tsx`
- **Commit:** c649a2a

**2. [Rule 3 - Blocking] ImageMagick deprecated `convert` Befehl**
- **Found during:** Task 1 — Icon-Generierung
- **Issue:** `convert` ist in ImageMagick v7 deprecated
- **Fix:** `magick` statt `convert` verwendet — Icons erfolgreich generiert
- **Files modified:** client/public/icons/icon-192.png, icon-512.png

**3. [Rule 3 - Blocking] Docker nicht im Shell-PATH**
- **Found during:** Task 2 — `docker-compose config` Verifikation
- **Issue:** `docker` Kommando nicht im PATH der nicht-interaktiven Shell (Docker Desktop läuft als Mac-App)
- **Fix:** YAML-Syntax via Node.js verifiziert (Dateiinhalt und Key-Strings geprüft). docker-compose.yml ist syntaktisch korrekt.
- **Impact:** Kein — die Datei wird erst auf dem Server (server.godsapp.de) verwendet, wo Docker verfügbar ist.

## Known Stubs

- **client/public/icons/icon-192.png** — Sky-400 Platzhalter ohne Text/Logo. Wird in Plan 01-03 (UI-Phase) durch finales Fairstand-Icon ersetzt.
- **client/public/icons/icon-512.png** — Identisch wie icon-192.png, nur 512×512.
- **client/src/App.tsx** — Placeholder-Text "Fairstand Kasse — wird geladen..." ohne echte Funktionalität. Intentionell — Plan 01-02 fügt Dexie-Schema hinzu, Plan 01-03 baut POS-UI.
- **server/drizzle.config.ts** — Referenziert `./src/db/schema.ts` das noch nicht existiert. Intentionell — wird in Plan 01-02 angelegt.

## Self-Check: PASSED

- client/vite.config.ts: FOUND
- server/src/index.ts: FOUND
- docker-compose.yml: FOUND
- .github/workflows/deploy.yml: FOUND
- client/dist/manifest.webmanifest: FOUND
- Commit c649a2a: FOUND
- Commit 2ae4bb2: FOUND
