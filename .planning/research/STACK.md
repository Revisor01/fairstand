# Stack Research

**Domain:** Offline-First PWA Point-of-Sale System (Kirchengemeinde Fairstand)
**Researched:** 2026-03-23
**Confidence:** HIGH (core stack), MEDIUM (PDF parsing specifics)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.x | UI-Framework | Dominant ecosystem, breite Community, exzellenter Touch-Support via onPointerDown Events. React 19 stabilisiert Server Components und Actions. |
| TypeScript | 5.x | Typsicherheit | Pflicht bei Offline-Sync-Logik — verhindert Fehler an Datengrenzen (IndexedDB ↔ API). |
| Vite | 6.x | Build-Tool | Schnellstes Dev-Feedback, native ESM, Basis für vite-plugin-pwa. Vite 5+ ist Voraussetzung für vite-plugin-pwa v1.x. |
| vite-plugin-pwa | 1.2.0 | PWA-Manifest + Service Worker | Zero-Config-PWA für Vite: generiert Manifest, registriert Service Worker, integriert Workbox. Standard-Tool für Vite+PWA-Kombination. |
| Dexie.js | 4.3.0 | Lokale Offline-Datenbank (IndexedDB) | Bestes TypeScript-first-Wrapper für IndexedDB. Version 4 ist praktisch backward-compatible, unterstützt async/await, keine externen Abhängigkeiten. Hinter 100.000+ produktiven Sites. |
| Workbox (workbox-background-sync) | 7.4.0 | Background Sync für fehlgeschlagene Requests | Offizielle Google-Bibliothek für Service-Worker-Caching und Sync-Queue. Retry bei Reconnect, auch wenn App geschlossen ist. Kommt über vite-plugin-pwa automatisch mit. |
| TanStack Query | 5.x | Server-State-Management + Offline-Awareness | networkMode-Option macht Queries offline-bewusst. `PersistQueryClientProvider` + `createSyncStoragePersister` für lokale Cache-Persistenz. Verhindert doppelte Fetch-Logik. |
| Fastify | 5.7.x | Backend-API | TypeScript-nativ, 5.6× schneller als Express in Benchmarks, schema-basiertes Request-Validation. Ziel: Node 20+. Klar besser als Express für Greenfield-TypeScript-Projekte. |
| SQLite + better-sqlite3 | aktuell | Serverseitige Datenbank | Keine separate DB-Infrastruktur, Datei im Docker-Volume — ideal für single-instance Deployment. Synchron-Driver, passt zu Node.js I/O-Modell. |
| Drizzle ORM | aktuell | Typsicheres Schema + Migrations | TypeScript-first ORM mit direkt lesbaren SQL-Abfragen. Kein "Magic", Migrationstool (drizzle-kit) inklusive. |
| Nodemailer | 8.0.x | E-Mail-Versand | Industry-Standard, 13M+ weekly downloads, zero native dependencies, Docker-kompatibel. Nutzt SMTP — kein SaaS-Service nötig, läuft direkt im Container. |
| pdfjs-dist | 5.x | PDF-Parsing serverseitig | Mozilla PDF.js — 2M+ weekly downloads, regelmäßige Updates (aktuell 5.5.x), deep structural access für koordinatenbasiertes Table-Parsing. Besser als `pdf-parse` (unmaintained) und `unpdf` (jünger, weniger erprobt) für strukturierte Rechnungsdaten. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/query-sync-storage-persister | 5.x | TanStack Query Cache in localStorage persistieren | Damit Offline-Daten nach App-Neustart noch da sind |
| idb-keyval | aktuell | Einfaches Key-Value in IndexedDB | Für kleine Config-Werte (z.B. Ladennummer, E-Mail-Adresse), kein Dexie-Schema nötig |
| zod | 3.x | Schema-Validation Frontend + Backend | Gemeinsames Schema für API-Payloads und Formulare, TypeScript-Integration ohne Boilerplate |
| @fastify/multipart | aktuell | Datei-Upload (PDF-Rechnungen) | Für den PDF-Upload-Endpoint im Backend |
| @fastify/cors | aktuell | CORS-Headers | Bei separatem Frontend-Container nötig |
| tailwindcss | 4.x | CSS-Framework | Touch-optimiertes UI schnell umsetzbar, große Tap-Targets per `h-16 w-full` einfach definierbar. Tailwind 4 ist aktuell stable. |
| date-fns | 4.x | Datums-Operationen | Monatliche Berichte, Zeitraum-Filter. Leichter als moment.js, tree-shakeable. |
| vite-pwa (Workbox InjectManifest) | via vite-plugin-pwa | Service Worker Precaching | Komplette App-Shell für 100% Offline-Nutzung im Service Worker vorhalten |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| drizzle-kit | Schema-Migrations für SQLite | `drizzle-kit migrate` im Docker-Entrypoint ausführen |
| Vitest | Unit-Tests | Vite-nativ, kein Jest-Config-Overhead |
| Playwright | E2E-Tests für PWA-Flows | Kann Offline-Modus simulieren via `context.setOffline(true)` |
| Docker multi-stage build | Frontend bauen, Backend separieren | Stage 1: `node:20-alpine` für Build, Stage 2: Production-Image |

---

## Installation

```bash
# Frontend
npm create vite@latest fairstand-client -- --template react-ts
npm install dexie @tanstack/react-query @tanstack/query-sync-storage-persister
npm install tailwindcss date-fns zod idb-keyval
npm install -D vite-plugin-pwa workbox-background-sync

# Backend
npm init -y
npm install fastify @fastify/multipart @fastify/cors
npm install better-sqlite3 drizzle-orm nodemailer pdfjs-dist zod
npm install -D typescript @types/node drizzle-kit tsx
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Dexie.js | RxDB | Wenn Real-Time-Sync über mehrere Tabs/Geräte gleichzeitig nötig ist. Für diesen Anwendungsfall Overkill. |
| Dexie.js | PouchDB | Nur wenn CouchDB-Sync benötigt wird. PouchDB deutlich schwerer. |
| SQLite (Backend) | PostgreSQL | Wenn >1 gleichzeitige Schreib-Prozesse oder horizontale Skalierung geplant. Für single-instance Docker unnötig. |
| Fastify | Express | Wenn Legacy-Middleware-Kompatibilität nötig (z.B. Passport.js ecosystem). Für Greenfield TypeScript nicht empfehlenswert. |
| pdfjs-dist | pdf-parse | Nur für einfachste Plaintext-Extraktion ohne Tabellenstruktur. pdf-parse ist unmaintained. |
| pdfjs-dist | unpdf | Wenn Edge-Runtime (Cloudflare Workers) eingesetzt wird. Auf Node.js ist pdfjs-dist etablierter. |
| TanStack Query | SWR | Wenn nur einfaches Data-Fetching ohne Offline-Strategie nötig. TanStack Query hat mehr Offline-Kontrolle. |
| Tailwind CSS | CSS Modules | Wenn Design-System bereits existiert oder sehr individuelles Styling nötig. Für Touch-optimiertes Greenfield-UI ist Tailwind schneller. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `pdf-parse` | Offiziell unmaintained, keine strukturierten Daten (nur Plaintext), kein Koordinaten-Zugriff für Tabellenzeilen | `pdfjs-dist` |
| `localStorage` für Offline-Daten | 5 MB Limit, synchron blockend, kein strukturiertes Query | Dexie.js (IndexedDB) |
| Express.js | Kein TypeScript-Support von Haus aus, Express 5 nach ~10 Jahren Stagnation, 5× langsamer als Fastify | Fastify |
| Service Worker ohne Workbox | Manuelles Caching fehleranfällig, kein Background-Sync-Fallback für ältere Browser | workbox-background-sync via vite-plugin-pwa |
| Prisma ORM | Zu schwer für SQLite-only Single-Container; generiert eigene Query Engine Binary, erhöht Docker-Image-Größe | Drizzle ORM (leichtgewichtig, kein Binary) |
| React Native / Capacitor | App Store nötig, Deployment komplexer, Apple Developer Account 100€/Jahr. PWA reicht für iPad-Nutzung ohne Store. | PWA (vite-plugin-pwa) |
| moment.js | Bundle-Größe 232 KB, deprecated | date-fns (tree-shakeable, 12 KB für verwendete Funktionen) |

---

## Stack Patterns by Variant

**Wenn WLAN temporär verfügbar ist (Sync-Strategie):**
- Service Worker fängt POST-Requests ab und schreibt in IndexedDB-Queue
- Bei Online-Event: Workbox Background Sync replayed die Queue automatisch
- TanStack Query `networkMode: 'offlineFirst'` verhindert Failed-States im UI

**Wenn mehrere Läden (Multi-Tenant):**
- Backend: `shop_id` Spalte in allen Drizzle-Tabellen, Row-Level-Isolation via SQL WHERE
- Frontend: `idb-keyval` speichert `currentShopId` im App-State
- Dexie: eigene DB-Instanz pro Shop oder Compound-Keys `[shopId, entityId]`

**Wenn PDF-Parsing fehlschlägt (Fallback):**
- Frontend zeigt Parse-Ergebnis in editierbarer Tabelle vor dem Buchen
- Nutzerinnen können falsch erkannte Werte korrigieren
- Kein blindes Auto-Import — immer explizite Freigabe

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| vite-plugin-pwa@1.x | Vite@5.x, Vite@6.x | vite-plugin-pwa ab v0.17 benötigt Vite 5+ |
| Dexie@4.x | TypeScript@5.x | Typdefinitionen im Package enthalten, kein @types nötig |
| Fastify@5.x | Node.js@20+ | v5 dropped Node 18 support |
| pdfjs-dist@5.x | Node.js@18+ | Canvas-Dependency bei Server-Rendering möglicherweise nötig (prüfen) |
| TanStack Query@5.x | React@18+, React@19 | Kein Breaking Change bei React 19 |
| drizzle-orm + better-sqlite3 | Node.js@18+ | Synchrone API von better-sqlite3 passt zu Fastify Route-Handlers |

---

## Sources

- [Dexie.js npm](https://www.npmjs.com/package/dexie) — Version 4.3.0 verifiziert (MEDIUM confidence, npm)
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) — Version 1.2.0 verifiziert (MEDIUM confidence)
- [Fastify npm](https://www.npmjs.com/package/fastify) — Version 5.7.4 verifiziert (HIGH confidence, npm)
- [workbox-background-sync npm](https://www.npmjs.com/package/workbox-background-sync) — Version 7.4.0 verifiziert (MEDIUM confidence)
- [Nodemailer npm](https://www.npmjs.com/package/nodemailer) — Version 8.0.3 verifiziert (HIGH confidence)
- [pdfjs-dist npm](https://www.npmjs.com/package/pdfjs-dist) — Version 5.5.207 verifiziert (MEDIUM confidence)
- [TanStack Query v5 Network Mode Docs](https://tanstack.com/query/v5/docs/react/guides/network-mode) — Offline-Verhalten verifiziert (HIGH confidence, offizielle Docs)
- [Build Offline-First PWA with React, Dexie.js & Workbox](https://www.wellally.tech/blog/build-offline-pwa-react-dexie-workbox) — Stack-Muster bestätigt (MEDIUM confidence)
- [unpdf vs pdf-parse vs pdfjs-dist Vergleich](https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026) — PDF-Library-Vergleich (MEDIUM confidence)
- [7 PDF Parsing Libraries für Node.js](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) — Ecosystem-Überblick (MEDIUM confidence)
- [Express vs Fastify 2025](https://medium.com/codetodeploy/express-or-fastify-in-2025-whats-the-right-node-js-framework-for-you-6ea247141a86) — Performance-Vergleich (MEDIUM confidence)
- [MDN: Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — Service Worker Standard (HIGH confidence, offizielle Docs)

---

*Stack research for: Offline-First PWA POS — Kirchengemeinde Fairstand*
*Researched: 2026-03-23*
