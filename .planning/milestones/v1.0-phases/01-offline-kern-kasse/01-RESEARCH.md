# Phase 1: Offline-Kern & Kasse - Research

**Researched:** 2026-03-23
**Domain:** Offline-First PWA, Dexie.js/IndexedDB, React POS-UI, Service Worker, Docker/CI/CD
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Kassen-Layout & Interaktion
- Artikel-Grid als dynamisch fließende Kacheln (nicht fixe Spaltenanzahl) mit Name + VK-Preis
- Warenkorb als Slide-In-Panel von rechts, liegt über dem Grid
- Mengenänderung: +/- Buttons pro Artikel UND Direkteingabe per Tap auf die Zahl
- Horizontale Kategorie-Tabs oben: "Alle" als erster Tab, danach die Kategorien (Schokolade, Kaffee, Kunsthandwerk etc.)

#### Bezahl- & Spenden-Flow
- Großes Nummernfeld (Taschenrechner-Style) für Bezahlt-Betrag
- Quick-Buttons für typische Beträge (Standard: 5€, 10€, 20€, 50€) — konfigurierbar in den Settings
- Wechselgeld-Eingabefeld: Mitarbeiterin tippt Wechselgeld-Betrag, Rest wird live als Spende angezeigt
- Nach Verkaufsabschluss: Zusammenfassung (Umsatz, Spende, Wechselgeld) mit "Nächster Kunde"-Button
- "Korrigieren"-Button in der Zusammenfassung: öffnet den Verkauf wieder zum Bearbeiten (Storno/Korrektur)

#### Technisches Fundament & Auth
- 6-Ziffern-PIN pro Laden (kein Username, kein Passwort-Text)
- Session-Dauer: 120 Minuten Auto-Logout bei Inaktivität
- Seed-Daten: Artikel aus der vorhandenen Rechnung 2600988 in die DB einpflegen (EK-Preise + EVP als VK-Preis)
- Monorepo-Struktur: `client/` + `server/` + `docker-compose.yml` im Root

### Claude's Discretion
- Konkrete Tailwind-Farbwerte für Hellblau-Palette
- Service Worker Caching-Strategie (Cache-First vs Network-First)
- Dexie-Schema-Design (Tabellen, Indizes)
- Docker-Compose Service-Konfiguration
- GitHub Actions Workflow-Details

### Deferred Ideas (OUT OF SCOPE)
- Korrektur-Flow nach Verkaufsabschluss: Grundlegende Korrektur in Phase 1, vollständige Storno-Logik ggf. in späterer Phase
- Produktbilder im Grid (aus Etiketten-PDFs) — v2-Feature
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POS-01 | Artikel-Grid zeigt alle aktiven Produkte mit Name und VK-Preis zum Antippen | Dexie `liveQuery` auf `products`-Store; dynamisch fließende Kacheln mit Tailwind CSS Grid auto-fill |
| POS-02 | Warenkorb zeigt ausgewählte Artikel mit Einzelpreis, Menge und Gesamtsumme | React-State für Warenkorb (kein Persist nötig — session-scoped); Slide-In-Panel mit Tailwind `translate-x` |
| POS-03 | Artikel können im Warenkorb in der Menge verändert oder entfernt werden | +/- Buttons + Direkteingabe per `<input type="number">` mit `inputmode="numeric"` |
| POS-04 | Numerisches Eingabefeld für den bezahlten Betrag (touch-optimiert) | Eigener Numpad-Taschenrechner mit `inputmode="decimal"`; kein nativer Input um Keyboard-Layout zu kontrollieren |
| POS-05 | Automatische Berechnung der Differenz (bezahlt minus Gesamtpreis) | Einfache Floating-Point-Arithmetik mit cent-basierter Integer-Rechnung (kein Floating-Point-Fehler) |
| POS-06 | Mitarbeiterin kann Wechselgeld-Betrag eingeben, Rest wird automatisch als Spende verbucht | Zwei-Schritt-Flow: Differenz → Wechselgeld-Eingabe → Spende = Differenz - Wechselgeld |
| POS-07 | Verkaufsabschluss bucht Warenbestand ab, erfasst Umsatz und Spende atomar | Dexie-Transaktion über `sales`, `products` (stock), `outbox` — alles in einer `db.transaction('rw', ...)` |
| OFF-01 | Kassen-App funktioniert vollständig ohne Internetverbindung | Dexie als lokale Wahrheitsquelle; Service Worker cacht App Shell; alle UI-Operationen gehen nur gegen IndexedDB |
| OFF-02 | Alle Daten werden lokal im Browser gespeichert (IndexedDB) | Dexie.js 4.x; `navigator.storage.persist()` beim Start aufrufen |
| OFF-05 | PWA installierbar als Home-Screen-App auf iPad/iPhone | `vite-plugin-pwa` mit `registerType: 'autoUpdate'`; `manifest.json` mit `display: 'standalone'` und iOS-spezifischen Meta-Tags |
| AUTH-01 | Passwortschutz für den Laden (einfaches Passwort, kein User-Management) | 6-stelliger PIN, gehasht mit `crypto.subtle.digest('SHA-256')` oder bcrypt im Backend; PIN-Hash in `idb-keyval` lokal speichern |
| AUTH-02 | Datenmodell enthält shop_id für Multi-Laden-Vorbereitung | `shopId: string` als Pflichtfeld in allen Dexie-Tabellen von Anfang an |
| AUTH-03 | Erstmal nur ein Laden (St. Secundus Hennstedt) | Hardcoded Shop-Initialisierung im Seed; `idb-keyval` speichert `currentShopId` |
| UX-01 | Hauptfarbe Hellblau, modernes und sauberes Design | Tailwind: `sky-400`/`sky-500` als Primärfarbe; `sky-50` als Hintergrund |
| UX-02 | Touch-optimiert: Minimum 44x44px Tap-Targets | Tailwind `min-h-[44px] min-w-[44px]`; primäre Actions `h-14` (56px) |
| UX-03 | Responsive Layout optimiert für iPad (primär) und iPhone | Tailwind Breakpoints: primär `md:` für iPad; `sm:` für iPhone; kein Desktop-Layout nötig |
| UX-04 | Kassen-Ansicht als Hauptbildschirm, Admin-Bereiche sekundär | React Router: `/` = POS; `/admin/*` = geschützte Admin-Bereiche |
| DEP-01 | GitHub Repository mit automatischem Docker-Build via GitHub Actions | Multi-stage Dockerfile; GitHub Actions `docker/build-push-action` → GHCR |
| DEP-02 | Portainer Webhook für Auto-Deploy auf server.godsapp.de | Portainer Stack Webhook URL als GitHub Actions Secret; `curl -X POST $WEBHOOK_URL` als letzter Step |
| DEP-03 | Docker-Compose Stack mit Frontend + Backend | Zwei Services: `client` (nginx:alpine serviert Vite-Build) + `server` (node:20-alpine); beide im selben Traefik-Netzwerk |
</phase_requirements>

---

## Summary

Phase 1 legt das gesamte technische Fundament: Monorepo-Struktur, Docker-Stack, CI/CD-Pipeline, Dexie.js-Datenbankschema, Service Worker für Offline-Fähigkeit und die vollständige Kassen-UI. Das Greenfield-Projekt startet ohne Legacy-Code.

Die wichtigste technische Entscheidung ist bereits getroffen: **Dexie.js statt raw IndexedDB** — wegen Safaris Auto-Close-Bug bei Transaktionen innerhalb von `await`-Chains. Alle anderen Designentscheidungen (PIN-Auth, Slide-In-Warenkorb, Numpad-Style Betragseingabe) sind in der CONTEXT.md fixiert.

Kritischer Constraint für Phase 1: Die Kasse muss **ohne Backend-Verbindung vollständig funktionieren**. Backend (Fastify + SQLite) ist in Phase 1 nur für das Fundament (Docker-Stack) relevant, nicht für die Kassen-Kernfunktion. Die Sync-Engine (Outbox → Server) wird erst in Phase 2 ausgebaut.

**Primary recommendation:** Dexie-Schema und lokale Transaktionslogik (POS-07) als erstes bauen, dann UI — nie umgekehrt. Die Datenbank ist die Wahrheitsquelle; die UI ist reaktiv darüber.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI-Framework | Dominantes Ökosystem; React 19 stabil; `useLiveQuery` von Dexie integiert sich nativ |
| TypeScript | 5.x | Typsicherheit | Pflicht für IndexedDB-Schnittstellen — verhindert Typ-Fehler zwischen Dexie-Store und React-State |
| Vite | 6.x | Build-Tool | Schnellstes Dev-Feedback; Basis für `vite-plugin-pwa`; native ESM |
| vite-plugin-pwa | 0.21.x | PWA-Manifest + Service Worker | Zero-Config-PWA für Vite; generiert Manifest, registriert Service Worker, integriert Workbox automatisch |
| Dexie.js | 4.3.x | IndexedDB-Wrapper | Einzige vernünftige Wahl für Safari/iOS — kapselt alle Transaction-Lifecycle-Quirks; TypeScript-nativ ohne `@types` |
| Workbox | 7.x | Service Worker Caching | Via `vite-plugin-pwa` — Precaching der App Shell; kein manuelles Cache-Management nötig |
| Tailwind CSS | 4.x | CSS-Framework | Schnell; Touch-Targets trivial definierbar; responsive über Breakpoints |
| React Router | 7.x | Client-Side Routing | Standard für React-SPAs; geschützte Routen für Admin-Bereich |
| Fastify | 5.7.x | Backend-API | TypeScript-nativ; deutlich schneller als Express; schema-basierte Validierung |
| better-sqlite3 | aktuell | Synchrone SQLite-Anbindung | Keine separate DB-Infrastruktur; Synchron-API passt zu Fastify; Datei im Docker-Volume |
| Drizzle ORM | aktuell | Typsicheres Schema + Migrations | TypeScript-first; kein generiertes Binary (anders als Prisma); `drizzle-kit` für Migrations |
| idb-keyval | aktuell | Einfaches Key-Value in IndexedDB | Für App-Config (PIN-Hash, shopId, Quick-Button-Beträge) — kein Dexie-Schema nötig |
| zod | 3.x | Schema-Validierung | Gemeinsam für Frontend-Forms und Backend-Request-Validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fastify/cors | aktuell | CORS-Headers | Frontend und Backend laufen in separaten Containern (unterschiedliche Ports) |
| date-fns | 4.x | Datums-Operationen | Für Timestamp-Formatierung in Verkaufs-Zusammenfassung; kein Import von moment.js |
| workbox-window | 7.x | Update-Erkennung im App-Layer | Für den "Update verfügbar"-Banner wenn neuer Service Worker wartet |

### Alternativen (nicht verwenden)

| Statt | Könnte man verwenden | Warum NICHT hier |
|-------|---------------------|------------------|
| Dexie.js | Raw IndexedDB | Safari Transaction Auto-Close-Bug; kein TypeScript-Support ohne Wrapper |
| Dexie.js | PouchDB | Zu schwer; nur sinnvoll wenn CouchDB-Sync benötigt wird |
| Drizzle ORM | Prisma | Prisma generiert eigene Query Engine Binary → größeres Docker-Image |
| better-sqlite3 | PostgreSQL | Keine separate DB-Infrastruktur nötig; single-instance Docker reicht |
| Tailwind CSS 4 | CSS Modules | Tailwind 4 ist stabiler und für Touch-UX schneller umsetzbar |
| date-fns | moment.js | moment.js deprecated, 232 KB Bundle |

**Installation Frontend:**
```bash
npm create vite@latest client -- --template react-ts
cd client
npm install dexie idb-keyval zod date-fns react-router-dom
npm install @tanstack/react-query workbox-window
npm install tailwindcss @tailwindcss/vite
npm install -D vite-plugin-pwa
```

**Installation Backend:**
```bash
mkdir server && cd server
npm init -y
npm install fastify @fastify/cors better-sqlite3 drizzle-orm zod
npm install -D typescript @types/node drizzle-kit tsx @types/better-sqlite3
```

---

## Architecture Patterns

### Monorepo-Struktur (festgelegt in CONTEXT.md)

```
fairstand/
├── client/                        # React PWA
│   ├── src/
│   │   ├── features/
│   │   │   ├── pos/               # Kasse: Grid, Warenkorb, Checkout-Flow
│   │   │   │   ├── ArticleGrid.tsx
│   │   │   │   ├── CartPanel.tsx
│   │   │   │   ├── NumPad.tsx
│   │   │   │   ├── PaymentFlow.tsx
│   │   │   │   └── SaleSummary.tsx
│   │   │   └── auth/              # PIN-Eingabe, Session-Management
│   │   │       ├── PinScreen.tsx
│   │   │       └── useAuth.ts
│   │   ├── db/
│   │   │   ├── schema.ts          # Dexie-Tabellendefinitionen
│   │   │   ├── seed.ts            # Artikel aus Rechnung 2600988
│   │   │   └── index.ts           # Dexie-Singleton-Instanz
│   │   ├── components/            # Geteilte UI-Komponenten
│   │   ├── sw.ts                  # Service Worker (Workbox)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── icons/                 # PWA-Icons (192x192, 512x512)
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   └── health.ts          # GET /api/health (Phase 1)
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle-Schema (spiegelt Dexie)
│   │   │   └── index.ts           # better-sqlite3 + Drizzle-Instanz
│   │   └── index.ts               # Fastify-Setup
│   ├── drizzle.config.ts
│   └── Dockerfile
├── docker-compose.yml
└── .github/
    └── workflows/
        └── deploy.yml
```

### Pattern 1: Dexie-Schema mit shop_id von Anfang an

**Was:** Alle Dexie-Stores enthalten `shopId` als Pflichtfeld — auch wenn Phase 1 nur einen Shop hat.

**Warum jetzt:** Nachträgliche Migration aller lokalen Datensätze mit `shopId` auf Offline-Geräten ist nicht zuverlässig möglich.

**Empfohlenes Schema:**
```typescript
// client/src/db/schema.ts
import Dexie, { type EntityTable } from 'dexie';

interface Product {
  id: string;           // UUID
  shopId: string;       // Multi-Tenant-Vorbereitung — immer setzen
  articleNumber: string;
  name: string;
  category: string;
  purchasePrice: number; // Cent-Integer (EK-Preis)
  salePrice: number;     // Cent-Integer (VK-Preis = EVP)
  vatRate: number;       // 7 oder 19 (%)
  stock: number;
  active: boolean;
  updatedAt: number;    // Unix-Timestamp für LWW-Sync
}

interface Sale {
  id: string;           // UUID — client-generiert
  shopId: string;
  items: SaleItem[];    // JSON-Array (kein eigener Store nötig in Phase 1)
  totalCents: number;
  paidCents: number;
  changeCents: number;
  donationCents: number;
  createdAt: number;
  syncedAt?: number;    // null = noch nicht gesynct
}

interface OutboxEntry {
  id?: number;          // auto-increment
  operation: 'SALE_COMPLETE' | 'STOCK_ADJUST';
  payload: unknown;
  shopId: string;
  createdAt: number;
  attempts: number;
}

class FairstandDB extends Dexie {
  products!: EntityTable<Product, 'id'>;
  sales!: EntityTable<Sale, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'id'>;

  constructor() {
    super('fairstand-db');
    this.version(1).stores({
      products: 'id, shopId, category, active, [shopId+active]',
      sales: 'id, shopId, createdAt, syncedAt',
      outbox: '++id, shopId, createdAt, operation',
    });
  }
}

export const db = new FairstandDB();
```

### Pattern 2: Atomare Verkaufs-Transaktion (POS-07)

**Was:** Verkaufsabschluss schreibt in einer einzigen Dexie-Transaktion: neuer `Sale`, Bestandsreduzierung in `products`, neuer `OutboxEntry`. Entweder alles oder nichts.

**Warum:** Kein Datenverlust bei Browser-Crash mid-Transaction. Dexie kapselt Safaris Auto-Close-Bug.

```typescript
// client/src/features/pos/useSaleComplete.ts
import { db } from '../../db';
import { v4 as uuidv4 } from 'uuid';

export async function completeSale(
  items: CartItem[],
  paidCents: number,
  changeCents: number,
  shopId: string
) {
  const totalCents = items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0);
  const donationCents = paidCents - totalCents - changeCents;

  const sale: Sale = {
    id: uuidv4(),
    shopId,
    items,
    totalCents,
    paidCents,
    changeCents,
    donationCents,
    createdAt: Date.now(),
  };

  await db.transaction('rw', [db.sales, db.products, db.outbox], async () => {
    // 1. Verkauf speichern
    await db.sales.add(sale);

    // 2. Bestand reduzieren (als Delta — niemals absoluten Wert schreiben)
    for (const item of items) {
      await db.products
        .where('id').equals(item.productId)
        .modify(p => { p.stock -= item.quantity; p.updatedAt = Date.now(); });
    }

    // 3. Outbox-Eintrag für spätere Server-Sync
    await db.outbox.add({
      operation: 'SALE_COMPLETE',
      payload: sale,
      shopId,
      createdAt: Date.now(),
      attempts: 0,
    });
  });

  return sale;
}
```

### Pattern 3: Geldbeträge immer als Cent-Integer

**Was:** Alle Währungsbeträge intern als ganzzahlige Cent-Werte speichern. Anzeige dividiert durch 100. Keine Floating-Point-Arithmetik bei Geldwerten.

**Warum:** `0.1 + 0.2 !== 0.3` in JavaScript. Bei Geldbeträgen entstehen Anzeige- und Buchungsfehler.

```typescript
// Richtig:
const totalCents = 789; // 7,89€
const paidCents = 800;  // 8,00€
const diff = paidCents - totalCents; // 11 Cent — exakt

// Anzeige:
const display = (cents: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
    .format(cents / 100);
// → "7,89 €"

// Niemals:
const total = 7.89;
const paid = 8.00;
const diff = paid - total; // 0.10999999999999943 — falsch
```

### Pattern 4: PIN-Authentifizierung mit idb-keyval

**Was:** 6-stelliger PIN wird mit `crypto.subtle` gehasht und in `idb-keyval` gespeichert. Session-Timeout (120 Min) wird als `lastActivity`-Timestamp verwaltet.

**Warum kein Server-Auth:** Kasse muss offline funktionieren. PIN-Vergleich läuft komplett lokal.

```typescript
// client/src/features/auth/pinAuth.ts
import { get, set } from 'idb-keyval';

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function setupPin(pin: string) {
  const hash = await hashPin(pin);
  await set('pinHash', hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await get<string>('pinHash');
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}

export async function updateActivity() {
  await set('lastActivity', Date.now());
}

export async function isSessionValid(): Promise<boolean> {
  const last = await get<number>('lastActivity');
  if (!last) return false;
  return Date.now() - last < 120 * 60 * 1000; // 120 Minuten
}
```

### Pattern 5: Service Worker mit vite-plugin-pwa (Cache-First für App Shell)

**Empfehlung (Claude's Discretion):** Cache-First für App Shell + statische Assets. Network-First für API-Calls (wenn online). Ohne Netz: API-Calls schlagen still fehl, Dexie ist die Datenquelle.

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',   // Nicht 'autoUpdate' — manueller Update-Banner (Pitfall 6)
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      manifest: {
        name: 'Fairstand Kasse',
        short_name: 'Fairstand',
        theme_color: '#38bdf8',   // Tailwind sky-400
        background_color: '#f0f9ff', // Tailwind sky-50
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
});
```

**Hinweis:** `registerType: 'prompt'` statt `'autoUpdate'` — damit kann ein sichtbarer Update-Banner implementiert werden (Pitfall 6: Stale Service Worker).

### Pattern 6: Tailwind Hellblau-Palette (Claude's Discretion)

**Empfehlung:** Tailwind `sky-*` als Primärfarbe.

| Token | Hex | Verwendung |
|-------|-----|-----------|
| `sky-50` | `#f0f9ff` | Seitenhintergrund |
| `sky-100` | `#e0f2fe` | Kategorie-Tab Hintergrund (inaktiv) |
| `sky-400` | `#38bdf8` | Primäre Aktions-Buttons, aktiver Tab |
| `sky-500` | `#0ea5e9` | Hover-State, Akzente |
| `sky-700` | `#0369a1` | Text auf hellen Flächen, Badges |
| `slate-800` | `#1e293b` | Artikel-Namen, Haupttext |
| `slate-500` | `#64748b` | Sekundärer Text (Preise) |
| `emerald-500` | `#10b981` | Erfolgs-Feedback nach Verkaufsabschluss |
| `rose-500` | `#f43f5e` | Fehler, Storno, Warnung |

### Pattern 7: Docker-Compose Stack (Claude's Discretion)

```yaml
# docker-compose.yml
services:
  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.fairstand.rule=Host(`fairstand.godsapp.de`)"
      - "traefik.http.services.fairstand.loadbalancer.server.port=80"
    networks:
      - traefik

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    volumes:
      - sqlite-data:/app/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.fairstand-api.rule=Host(`fairstand.godsapp.de`) && PathPrefix(`/api`)"
      - "traefik.http.services.fairstand-api.loadbalancer.server.port=3000"
    networks:
      - traefik

volumes:
  sqlite-data:

networks:
  traefik:
    external: true
```

**Client Dockerfile (Multi-Stage):**
```dockerfile
# client/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**nginx.conf für React SPA + Service Worker Headers:**
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # Service Worker: kein Cache für sw.js
  location = /sw.js {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
    add_header Service-Worker-Allowed "/";
  }

  # SPA Fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Pattern 8: GitHub Actions CI/CD (Claude's Discretion)

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push client
        uses: docker/build-push-action@v6
        with:
          context: ./client
          push: true
          tags: ghcr.io/${{ github.repository }}/client:latest

      - name: Build and push server
        uses: docker/build-push-action@v6
        with:
          context: ./server
          push: true
          tags: ghcr.io/${{ github.repository }}/server:latest

      - name: Trigger Portainer Webhook
        run: curl -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"
```

### Anti-Patterns

- **Floating-Point für Geld:** Niemals `7.89 + 0.11` — immer Cent-Integer. Buchungsfehler entstehen bei der 10. Transaktion ohne sichtbaren Fehler.
- **Raw IndexedDB ohne Dexie:** Safaris Transaction-Auto-Close trifft jeden `await` im Transaction-Scope. Dexie ist kein "nice to have".
- **`autoUpdate` im vite-plugin-pwa:** Die App würde sich selbst mid-Session aktualisieren und den Warenkorb leeren. Stattdessen: `prompt` + manueller Update-Banner.
- **Stock als Absolutwert synchen:** Wenn offline auf zwei Geräten verkauft wird, überschreibt der zweite Sync den ersten. Immer Deltas (Events) synchen.
- **PIN im localStorage:** 5 MB-Limit, kein Transaktionsschutz, kein Struct-Zugriff. Für alles Persistente: idb-keyval (IndexedDB) oder Dexie.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen verwenden | Warum |
|---------|-------------------|----------------------|-------|
| IndexedDB-Transaktionen | Eigener IndexedDB-Wrapper | Dexie.js 4.x | Safari-Bugs, Async-Lifecycle, TypeScript-Support — alles already solved |
| Service Worker Precaching | Eigenes Cache-Manifest | Workbox via vite-plugin-pwa | Content-Hashing, Update-Strategie, Versionierung — zu komplex manuell |
| PWA-Manifest | Hand-written manifest.json | vite-plugin-pwa | Generiert korrekte Icon-Größen, Scope, iOS-Meta-Tags automatisch |
| CSS Touch-Targets | Eigene CSS-Klassen | Tailwind `min-h-[44px]` | Kein Overhead, konsistent, klar lesbar |
| Währungsformatierung | Eigene Formatier-Funktion | `Intl.NumberFormat` (Web API) | Locale-aware, korrekte Euro-Darstellung ohne Bibliothek |
| UUID-Generierung | `Math.random()` | `crypto.randomUUID()` (Web API) | Kryptographisch sicher, kein Package nötig (ab Chrome 92 / iOS 15.4) |
| Datums-Formatierung | `new Date().toLocaleDateString()` | date-fns `format()` | Locale-Kontrolle, tree-shakeable, kein Globalproblem mit Safari-Datumsparsing |

---

## Common Pitfalls

### Pitfall 1: Safari IndexedDB Transaction Auto-Close
**Was schiefläuft:** Transactions auf Safari schließen automatisch wenn zwischen `transaction.objectStore()` und `.put()` ein `await` steht. Datenverlust ohne Fehler.
**Warum:** Safari's WebKit-Implementierung ist strenger als Chrome.
**Vermeiden:** Immer Dexie.js — kapselt dieses Problem. Niemals raw IndexedDB. Alle Writes in `db.transaction('rw', [...stores], async () => { ... })`.
**Warnsignal:** Daten verschwinden auf iPad, nicht auf Chrome DevTools.

### Pitfall 2: Getrennte Storage-Kontexte: Safari Browser vs. Home Screen PWA
**Was schiefläuft:** Safari Browser und Home-Screen-PWA haben separate IndexedDB. Daten die im Browser eingegeben wurden sind in der installierten App nicht sichtbar.
**Warum:** Intentionales Apple-Verhalten, kein Bug.
**Vermeiden:** Prominenter Banner in Safari: "Bitte zuerst zum Home-Bildschirm hinzufügen". Onboarding beginnt mit Install-Flow, nicht mit Dateneingabe.
**Warnsignal:** "Meine Artikel sind weg" nach Installation.

### Pitfall 3: navigator.storage.persist() nicht aufgerufen
**Was schiefläuft:** iOS löscht bei Speicherdruck still alle PWA-Daten (IndexedDB, Cache Storage).
**Warum:** Ohne `persist()` ist Storage als "best-effort" markiert.
**Vermeiden:** `navigator.storage.persist()` beim App-Start aufrufen. Ergebnis loggen. Bei Ablehnung: Warn-Toast "Speicher nicht gesichert".
**Warnsignal:** "Alles weg" nach längerem Nichtnutzen des iPads.

### Pitfall 4: Stale Service Worker nach Deployment
**Was schiefläuft:** Nach einem Deployment zeigt die Home-Screen-PWA weiterhin die alte Version.
**Warum:** Neuer SW wartet auf Freigabe durch alten SW. Ohne explizites `skipWaiting()` bleibt alte Version.
**Vermeiden:** `registerType: 'prompt'` in vite-plugin-pwa + `workbox-window` für Update-Detection + sichtbarer Banner "Update verfügbar — Neu laden".
**Warnsignal:** DevTools zeigt SW als "waiting"; Nutzerinnen berichten alte UI nach Deployment.

### Pitfall 5: Virtual Keyboard überdeckt Betrag-Eingabe auf iPad
**Was schiefläuft:** Beim Tippen auf das Betrag-Eingabefeld öffnet sich die iOS-Tastatur und schiebt die Ansicht hoch — Wechselgeld-Anzeige verschwindet.
**Warum:** Safari in PWA-Standalone-Mode sendet keine zuverlässigen `resize`-Events bei Keyboard-Erscheinen.
**Vermeiden:** Eigener Numpad (Taschenrechner-Style, kein nativer Input) der die iOS-Tastatur gar nicht erst öffnet. Kein `<input type="number">` für den Bezahlt-Betrag. `inputmode="decimal"` nur wenn nativer Input unbedingt nötig.
**Warnsignal:** Entwickelt auf Desktop-Browser, nie auf physischem iPad getestet.

### Pitfall 6: Floating-Point-Fehler bei Geldberechnung
**Was schiefläuft:** `8.00 - 7.89` ergibt `0.10999999999999943` statt `0.11`. Wechselgeld und Spende werden falsch angezeigt.
**Warum:** IEEE 754 Floating-Point Arithmetik.
**Vermeiden:** Alle Beträge als Cent-Integer speichern und rechnen. Nur bei der Anzeige durch 100 dividieren.
**Warnsignal:** Cent-genaue Abweichungen in der Zusammenfassung.

---

## Code Examples

### Dexie liveQuery in React

```typescript
// client/src/features/pos/useProducts.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export function useActiveProducts(shopId: string, category?: string) {
  return useLiveQuery(async () => {
    const query = db.products.where('[shopId+active]').equals([shopId, 1]);
    const products = await query.toArray();
    if (category && category !== 'all') {
      return products.filter(p => p.category === category);
    }
    return products;
  }, [shopId, category]);
}
```

### StorageManager.persist() beim App-Start

```typescript
// client/src/main.tsx
async function requestPersistentStorage() {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    const granted = await navigator.storage.persist();
    if (!granted) {
      console.warn('Persistent storage not granted — data may be evicted');
      // Optional: Toast anzeigen
    }
  }
}
requestPersistentStorage();
```

### Numpad-Komponente (kein nativer Input)

```typescript
// client/src/features/pos/NumPad.tsx
// Eigener Numpad öffnet KEINE iOS-Tastatur
const KEYS = ['7','8','9','4','5','6','1','2','3','C','0',','];

export function NumPad({ onInput }: { onInput: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map(key => (
        <button
          key={key}
          onPointerDown={(e) => { e.preventDefault(); onInput(key); }}
          className="h-14 rounded-xl bg-slate-100 text-xl font-semibold active:bg-sky-100"
        >
          {key}
        </button>
      ))}
    </div>
  );
}
```

**Wichtig:** `onPointerDown` statt `onClick` — kein 300ms Tap-Delay auf iOS. `e.preventDefault()` verhindert Fokus auf dem Numpad (keine Tastatur).

### Kategorie-Tabs mit "Alle" als erstem Tab

```typescript
// client/src/features/pos/CategoryTabs.tsx
export function CategoryTabs({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}) {
  const tabs = ['Alle', ...categories];
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
      {tabs.map(cat => (
        <button
          key={cat}
          onPointerDown={() => onChange(cat === 'Alle' ? 'all' : cat)}
          className={`
            shrink-0 px-4 h-10 rounded-full text-sm font-medium
            ${active === (cat === 'Alle' ? 'all' : cat)
              ? 'bg-sky-400 text-white'
              : 'bg-sky-100 text-sky-700'}
          `}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
```

### Seed-Daten aus Rechnung 2600988

```typescript
// client/src/db/seed.ts
import { db } from './index';

const SHOP_ID = 'st-secundus-hennstedt';

const SEED_PRODUCTS = [
  // Beispiel-Struktur — 33 Positionen aus Rechnung 2600988 einpflegen
  {
    id: crypto.randomUUID(),
    shopId: SHOP_ID,
    articleNumber: '12345',
    name: 'Schokolade 100g',
    category: 'Schokolade',
    purchasePrice: 189,  // 1,89€ EK (nach Rabatt)
    salePrice: 295,      // 2,95€ EVP als VK
    vatRate: 7,
    stock: 24,
    active: true,
    updatedAt: Date.now(),
  },
  // ... 32 weitere Artikel
];

export async function seedIfEmpty(shopId: string) {
  const count = await db.products.where('shopId').equals(shopId).count();
  if (count === 0) {
    await db.products.bulkAdd(SEED_PRODUCTS);
  }
}
```

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Seit | Bedeutung |
|--------------|------------------|------|-----------|
| `workbox-background-sync` für iOS | `visibilitychange` + `online`-Event | iOS 11.3+ | Background Sync API existiert auf iOS nicht — Sync muss im Vordergrund passieren |
| `registerType: 'autoUpdate'` | `registerType: 'prompt'` + Update-Banner | immer | Auto-Update würde App mid-Session neu laden und State verlieren |
| PostgreSQL auf Server | SQLite + better-sqlite3 | — | Single-instance Docker braucht keine separate DB; SQLite ist produktionsreif für diesen Use Case |
| Prisma ORM | Drizzle ORM | 2023+ | Drizzle hat kein generiertes Binary; 10× kleineres Docker-Image; TypeScript-first |
| `onClick` für Touch | `onPointerDown` | React 16+ | Kein 300ms Tap-Delay auf iOS; bessere Touch-Responsiveness |
| `Math.random()` für IDs | `crypto.randomUUID()` | 2022+ | Native Web API; kryptographisch sicher; kein NPM-Package nötig |
| Tailwind CSS 3 | Tailwind CSS 4 | 2025 | Native CSS-Features; schnellere Build-Zeiten; kein PostCSS nötig |

**Hinweis zur ARCHITECTURE.md:** Das vorhandene Architektur-Dokument referenziert noch PostgreSQL und Express — diese Entscheidungen wurden nachträglich revidiert (STATE.md, Zeile 45-46). Gültig ist: SQLite + Drizzle ORM + Fastify.

---

## Open Questions

1. **Seed-Artikel aus Rechnung 2600988**
   - Was wir wissen: 33 Positionen, EK-Preise nach Rabatt, EVP als VK-Preis
   - Was unklar ist: Genaue Artikelnummern, Bezeichnungen, Kategorien — die PDF-Datei liegt im Projektordner `Süd-Nord-Kontor/` aber muss noch gelesen werden
   - Empfehlung: Seed-Daten in Plan 01-02 als separate Aufgabe anlegen; PDF lokal öffnen und Artikel manuell in `seed.ts` eintragen (33 Positionen sind manuell handhabbar)

2. **iOS 17+ Home Screen PWA: navigator.storage.persist() Verhalten**
   - Was wir wissen: Pitfall bekannt; in STATE.md als offene Frage dokumentiert
   - Was unklar ist: Ob iOS 17+ `persist()` zuverlässig gewährt — wurde noch nicht auf physischem Gerät validiert
   - Empfehlung: `persist()` auf jeden Fall aufrufen; Ergebnis im App-Start loggen; UI-Warnung bei `false`; Validierung auf physischem iPad in der Verify-Phase von Plan 01-02

3. **PWA-Icon-Generierung**
   - Was wir wissen: vite-plugin-pwa benötigt Icons in 192x192 und 512x512 PNG
   - Was unklar ist: Ist ein Logo/Icon für den Fairstand vorhanden?
   - Empfehlung: Placeholder-Icons generieren (Text-basiert: "FS" auf sky-400 Hintergrund) für Phase 1; echtes Icon ist v2-Feature

---

## Sources

### Primary (HIGH confidence)
- Dexie.js Dokumentation — Safari-Kompatibilität, Transaction-Lifecycle, liveQuery
- MDN: Progressive Web Apps / Offline and background operation — Service Worker Standard
- WebKit Blog: Updates to Storage Policy — iOS Storage-Verhalten, persist()
- TanStack Query v5 Docs: Network Mode — offline-aware Queries

### Secondary (MEDIUM confidence)
- PITFALLS.md (projektintern, 2026-03-23) — iOS/Safari-Pitfalls, Touch-UX, PDF-Parsing
- STACK.md (projektintern, 2026-03-23) — Verifizierte Package-Versionen via npm
- ARCHITECTURE.md (projektintern, 2026-03-23) — Outbox-Pattern, Sync-Flow, Datenbankstruktur
- wellally.tech: Build Offline-First PWA with React, Dexie.js & Workbox — Stack-Muster bestätigt
- whatwebcando.today: Handling Service Worker updates — Update-Prompt Pattern

### Tertiary (LOW confidence)
- Apple Developer Forums: iOS Home Screen PWA data persistence — Community-Berichte; offiziell nicht dokumentiert

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — bereits in STACK.md verifiziert, Versionen gegen npm geprüft
- Architecture: HIGH — Outbox-Pattern, Dexie-Schema, Docker-Setup bewährte Muster
- Pitfalls: HIGH (iOS/Safari), MEDIUM (Floating-Point, Storage-Eviction auf physischem Gerät nicht validiert)
- Auth (PIN-System): HIGH — Web Crypto API ist stabil; idb-keyval ist etabliert

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stabile Libraries; iOS-Verhalten kann sich bei iOS-Updates ändern)
