# Architecture Research

**Domain:** Offline-First PWA Point of Sale (church fair trade stand)
**Researched:** 2026-03-23
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (iPad/iPhone)                       │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                         React UI Layer                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │   POS    │  │  Waren-  │  │Rechnungs-│  │  Berichte &  │  │  │
│  │  │  Kasse   │  │wirtschaft│  │  import  │  │  Spenden     │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │  │
│  └───────┴─────────────┴─────────────┴────────────────┴──────────┘  │
│                               │                                       │
│  ┌────────────────────────────▼───────────────────────────────────┐  │
│  │                    Local Data Layer (Dexie.js)                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │  │
│  │  │  IndexedDB   │  │  Sync Queue  │  │   Outbox (pending    │  │  │
│  │  │  (products,  │  │  (pending    │  │   PDF uploads)       │  │  │
│  │  │  sales,      │  │   mutations) │  │                      │  │  │
│  │  │  donations)  │  │              │  │                      │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                               │                                       │
│  ┌────────────────────────────▼───────────────────────────────────┐  │
│  │                     Service Worker (Workbox)                     │  │
│  │  ┌─────────────────┐  ┌────────────────┐  ┌─────────────────┐  │  │
│  │  │  App Shell      │  │  Background    │  │  Network        │  │  │
│  │  │  Cache (static  │  │  Sync (queue   │  │  Interceptor    │  │  │
│  │  │  assets)        │  │  replay)       │  │  (API calls)    │  │  │
│  │  └─────────────────┘  └────────────────┘  └─────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │ (wenn online)
┌─────────────────────────────▼──────────────────────────────────────┐
│                     Backend (Node.js / Express)                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   Sync API       │  │  PDF Parsing     │  │  Report / Mail   │  │
│  │  /api/sync       │  │  Pipeline        │  │  API             │  │
│  │  (receive queue) │  │  /api/invoice    │  │  /api/reports    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           └─────────────────────┴─────────────────────┘            │
│                               │                                      │
│  ┌────────────────────────────▼───────────────────────────────────┐  │
│  │                PostgreSQL (server-side storage)                   │  │
│  │  shops | products | sales | donations | sync_log                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Komponente | Verantwortlichkeit | Implementierung |
|---|---|---|
| React UI Layer | Screens und Interaktion, ausschliesslich gegen lokale Daten operieren | React + TypeScript, Vite |
| Dexie.js / IndexedDB | Lokale persistente Datenhaltung — Wahrheitsquelle im Offline-Modus | Dexie.js (Wrapper um IndexedDB) |
| Sync Queue (Outbox) | Alle Mutationen (Verkauf, Bestandsbuchen) aufzeichnen, bevor sie zum Server gehen | Eigener IndexedDB-Store in Dexie |
| Service Worker | App Shell cachen, Netzwerkausfaelle abfangen, Background Sync ausloesen | Workbox (vite-plugin-pwa) |
| Sync API | Outbox-Eintraege entgegennehmen, idempotent verarbeiten, Konflikte auflosen | Express.js Route + Zod Validation |
| PDF Parsing Pipeline | Rechnungs-PDF serverseitig parsen, Artikel + Preise extrahieren | pdf2json oder pdfjs-dist auf Server |
| PostgreSQL | Server-seitige Wahrheitsquelle, Mandantentrennung per shop_id | PostgreSQL + Prisma ORM |
| Report / Mail API | Berichte generieren, E-Mail versenden | Nodemailer oder Resend |

## Recommended Project Structure

```
fairstand/
├── apps/
│   ├── web/                      # React PWA (Frontend)
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── pos/          # Kasse: Grid, Warenkorb, Checkout
│   │   │   │   ├── inventory/    # Warenwirtschaft: Produkte, Bestand
│   │   │   │   ├── invoice/      # Rechnungsimport: Upload, Preview, Freigabe
│   │   │   │   ├── donations/    # Spendenerfassung und -uebersicht
│   │   │   │   └── reports/      # Berichte, Mail-Versand
│   │   │   ├── db/
│   │   │   │   ├── schema.ts     # Dexie-Tabellendefinitionen
│   │   │   │   ├── sync-queue.ts # Outbox-Logik: enqueue, dequeue
│   │   │   │   └── index.ts      # Dexie-Instanz (Singleton)
│   │   │   ├── sync/
│   │   │   │   ├── sync-engine.ts # Online-Erkennung, Sync ausloesen
│   │   │   │   └── conflict.ts   # Conflict-Resolution-Logik (LWW)
│   │   │   ├── api/
│   │   │   │   └── client.ts     # fetch-Wrapper fuer API-Calls (mit Retry)
│   │   │   ├── components/       # Geteilte UI-Komponenten
│   │   │   └── sw.ts             # Service Worker (Workbox)
│   │   ├── vite.config.ts
│   │   └── public/
│   └── server/                   # Node.js Backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── sync.ts       # POST /api/sync (Outbox verarbeiten)
│       │   │   ├── invoice.ts    # POST /api/invoice (PDF parsen)
│       │   │   └── reports.ts    # GET /api/reports
│       │   ├── pdf/
│       │   │   ├── parser.ts     # PDF-Extraktion (pdfjs-dist)
│       │   │   └── snk-mapper.ts # Suedfnord-Kontor Format -> Produkt-Schema
│       │   ├── db/
│       │   │   └── prisma/       # Prisma Schema + Migrations
│       │   └── mail/
│       │       └── sender.ts     # Nodemailer / Resend
│       └── Dockerfile
├── docker-compose.yml
└── .github/workflows/deploy.yml
```

### Structure Rationale

- **features/:** Feature-Slicing nach Fachdomaene — jedes Feature hat eigene Komponenten, Hooks, Logik. Kein kreuzweises Importieren zwischen Features, nur nach oben zu `db/` und `api/`.
- **db/:** Dexie-Schema und Sync-Queue als eigenstaendiges Modul. Alle Features greifen ausschliesslich ueber dieses Modul auf IndexedDB zu.
- **sync/:** Sync-Engine entkoppelt von UI — weiss wann online, regelt Retry-Logik, wird vom Service Worker (Background Sync Event) und vom App-Layer (online-Event) getriggert.
- **api/ (client):** Einziger Ort fuer fetch-Aufrufe. Wrapper kennt Base-URL, Auth-Header, Retry-Strategie.
- **pdf/ (server):** PDF-Parsing ist komplex und isoliert — eigenes Modul mit klarer Input/Output-Grenze (Buffer rein, strukturiertes Array raus).

## Architectural Patterns

### Pattern 1: Outbox Pattern (Sync Queue)

**Was:** Jede lokal ausgefuehrte Mutation (Verkauf abschliessen, Bestand aendern) wird zuerst als Eintrag in den Outbox-Store von IndexedDB geschrieben. Erst dann wird die eigentliche Datenaenderung lokal angewendet. Die Outbox wird asynchron zum Server gespielt.

**Wann:** Immer — dieses Pattern ist das Fundament der Offline-First-Garantie.

**Trade-offs:** Etwas hoehere Schreibkomplexitaet; dafuer garantiert kein Datenverlust bei Verbindungsabbruch.

**Beispiel:**
```typescript
// db/sync-queue.ts
export interface OutboxEntry {
  id?: number;           // auto-increment
  operation: 'SALE_COMPLETE' | 'STOCK_ADJUST' | 'PRODUCT_UPDATE';
  payload: unknown;
  shopId: string;
  createdAt: number;     // timestamp fuer LWW
  attempts: number;
}

// Features schreiben immer so:
await db.transaction('rw', [db.sales, db.outbox], async () => {
  await db.sales.add(sale);
  await db.outbox.add({ operation: 'SALE_COMPLETE', payload: sale, ... });
});
```

### Pattern 2: Optimistic UI mit lokalem Commit

**Was:** UI-Aktion aktualisiert sofort den lokalen Zustand (IndexedDB + React State). Kein Warten auf Server-Bestaetigung. Falls Sync fehlschlaegt: Fehlermeldung im Hintergrund, Daten bleiben lokal erhalten.

**Wann:** Kasse-Flow (Verkauf abschliessen, Bestand abbuchen) — muss sofort reagieren.

**Trade-offs:** Seltene Inkonsistenz zwischen Client und Server moeglich; fuer diesen Use Case akzeptabel.

### Pattern 3: Last-Write-Wins Konfliktaufloesung

**Was:** Jeder Datensatz traegt einen `updatedAt`-Timestamp. Beim Sync vergleicht der Server Client-Timestamp vs. Server-Timestamp. Neuerer Wert gewinnt.

**Wann:** Dieses Kassensystem — ein Laden, kleine Nutzergruppe, sequentielle Transaktionen. Konflikte sind selten.

**Trade-offs:** Bei gleichzeitiger Bearbeitung auf zwei Geraeten koennte eine Aenderung verloren gehen. Fuer diesen Use Case (nicht paralleler Betrieb) angemessen. CRDTs oder Operation-Logs waeren Overengineering.

## Data Flow

### Flow 1: Verkauf abschliessen (Offline-Szenario)

```
Mitarbeiterin tippt Artikel an
    ↓
POS-Feature: Warenkorb aufbauen (React State)
    ↓
"Abschliessen" getippt
    ↓
db.transaction(): sale + outbox-Eintrag schreiben (IndexedDB)
    ↓
Lagerbestand sofort lokal reduzieren
    ↓
UI zeigt Wechselgeld / Spendenhoehe
    --- (spaeter, wenn WLAN) ---
    ↓
sync-engine.ts erkennt online-Event oder SW Background Sync Event
    ↓
Outbox auslesen → POST /api/sync (batch)
    ↓
Server schreibt in PostgreSQL, gibt neue server_id zurueck
    ↓
Lokaler Outbox-Eintrag als "gesynct" markieren / loeschen
```

### Flow 2: Rechnungsimport

```
Mitarbeiterin waehlt PDF-Datei aus
    ↓
invoice-Feature: Datei als FormData → POST /api/invoice
    ↓ (erfordert Netzwerk — intentional)
Server: pdfjs-dist liest PDF-Buffer
    ↓
snk-mapper.ts: Tabellenzeilen → strukturiertes Array {menge, artikelnr, bezeichnung, ekPreis, evp, mwst}
    ↓
Antwort: strukturiertes Array an Client
    ↓
Client zeigt Preview-Tabelle (editierbar)
    ↓
Mitarbeiterin prueft, korrigiert, bestaetigt
    ↓
Bestandsbuchung lokal in IndexedDB + Outbox-Eintrag
    ↓
Normaler Sync-Flow (wie oben)
```

### Flow 3: Sync State Management

```
App-Start
    ↓
sync-engine prueft navigator.onLine
    ↓ (online)          ↓ (offline)
Outbox flushen      Badge "Offline" anzeigen
    ↓
Service Worker registriert Background Sync Tag
    ↓
SW feuert 'sync'-Event wenn Netz wiederkommt (auch wenn Tab zu)
    ↓
sync-engine.flush() verarbeitet Outbox
```

### State Management

```
IndexedDB (Dexie) — persistente Wahrheitsquelle
    ↓ liveQuery() / useLiveQuery()
React Components — reaktiv, kein manuelles Refresh noetig
    ↓
User Action
    ↓
db.transaction() — atomar in IndexedDB schreiben
    ↓ (liveQuery triggers)
Components re-render automatisch
```

## Suggested Build Order

Die Reihenfolge folgt den technischen Abhaengigkeiten:

| Schritt | Was | Warum zuerst |
|---|---|---|
| 1 | Dexie Schema + lokale CRUD-Operationen | Fundament — alle anderen Schichten bauen darauf |
| 2 | React UI: POS-Kasse gegen lokale Daten | Core Value zuerst validieren, ohne Netz |
| 3 | Service Worker + App Shell Caching | PWA-Installierbarkeit, Offline-Grundlage |
| 4 | Sync Queue (Outbox) | Sobald Kasse funktioniert: Datenverlust verhindern |
| 5 | Backend: Express + PostgreSQL + Sync API | Sync-Gegenstelle aufbauen |
| 6 | Sync Engine (online/offline Erkennung, Flush) | Verbindet Client-Outbox mit Server |
| 7 | Warenwirtschaft UI | Aufbaut auf bestehendem Dexie-Schema |
| 8 | Backend: PDF Parsing Pipeline | Isoliertes Modul, hoehere Komplexitaet |
| 9 | Rechnungsimport UI | Aufbaut auf PDF-Pipeline |
| 10 | Berichte + Mail-Versand | Nice-to-have, kein Offline-Anteil |

## Scaling Considerations

Dieses System bedient 1 Laden, wenige Nutzerinnen. Skalierung ist kein echtes Thema.

| Szenario | Architekturanpassung |
|---|---|
| 1 Laden, 1-3 Nutzer (aktuell) | Monolith ausreichend, single Docker Container |
| 5-10 Laeden (potentiell) | shop_id-basierte Mandantentrennung im bestehenden Schema genuegt |
| 50+ Laeden | Schema-per-Tenant oder eigene PostgreSQL-DB per Tenant; vorerst nicht benoetigt |

### Mandantentrennung (Multi-Tenant vorbereiten)

Alle DB-Tabellen tragen eine `shop_id` (UUID). Die App wird mit einer Shop-ID initialisiert (im localStorage oder App-Config gespeichert). Sync-API prueft immer: payload.shop_id === authenticated_shop_id. Auf Client-Seite filtert Dexie alle Queries nach shop_id — keine Tabellentrennung noetig.

```typescript
// Alle lokalen Queries so:
const products = await db.products.where('shopId').equals(currentShopId).toArray();
```

## Anti-Patterns

### Anti-Pattern 1: Netzwerk-First fuer den Kassen-Flow

**Was Leute tun:** Kassierung laeuft gegen die API, bei Netzwerkfehler wird ein Offline-Fallback aktiviert.

**Warum falsch:** Offline ist kein Ausnahmezustand — es ist der Normalfall in der Kirche. Netzwerk-First bedeutet, dass jeder Verkauf potenziell haengt oder fehlschlaegt.

**Stattdessen:** Immer lokal-first. Netz ist Enhancement fuer Sync, nicht Voraussetzung.

### Anti-Pattern 2: Sync Queue im Frontend-State (React State / Zustand)

**Was Leute tun:** Ausstehende Aktionen in einem In-Memory-Store halten.

**Warum falsch:** Tab-Reload oder App-Crash loescht den State — Transaktionen gehen verloren.

**Stattdessen:** Outbox immer in IndexedDB schreiben — ueberdauert Reload, Browser-Neustart, Geraete-Wechsel.

### Anti-Pattern 3: PDF-Parsing im Browser

**Was Leute tun:** PDF direkt mit pdfjs auf dem Client parsen.

**Warum falsch:** Koordinaten-basierte Tabellenextraktion ist CPU-intensiv, schlaegt auf aelteren iPads fehl. Kein stabiler Zugriff auf Seitenlayout ohne Node.js Canvas-Kontext.

**Stattdessen:** PDF-Upload zum Server, serverseitiges Parsen mit vollem Node.js-Stack, strukturierte JSON-Antwort zum Client.

### Anti-Pattern 4: Gemeinsame IndexedDB-Datenbank ohne Shop-ID-Filter

**Was Leute tun:** Fuer den ersten Laden keine Mandantentrennung einbauen, "spaeter nachrueesten".

**Warum falsch:** Nachtraegliche Migration aller lokalen Daten mit shop_id ist fehleranfaellig, besonders wenn Geraete offline sind.

**Stattdessen:** shop_id von Anfang an in jede Tabelle aufnehmen — auch wenn es erstmal nur einen Shop gibt.

## Integration Points

### External Services

| Service | Integration Pattern | Hinweise |
|---|---|---|
| Suedf-Nord-Kontor (Rechnung) | PDF-Upload durch Nutzerin, kein API | Kein digitaler Datenaustausch, nur PDF-Datei |
| E-Mail Versand | SMTP via Nodemailer oder Resend REST API | Fuer monatliche/jaehrliche Berichte |
| Portainer Webhook | GitHub Actions baut Image, Webhook triggert Redeploy | CI/CD, kein Einfluss auf App-Architektur |

### Internal Boundaries

| Grenze | Kommunikation | Hinweise |
|---|---|---|
| React UI <-> Dexie | Direkte Importe, liveQuery() Hooks | Kein State-Manager noetig — Dexie ist reaktiv |
| Features <-> Sync Engine | Event-basiert (online/offline) + direkter Aufruf bei User-Aktion | Sync Engine ist Singleton |
| Service Worker <-> App | postMessage() fuer Status-Updates; sync-Event fuer Outbox-Flush | SW hat keinen Zugriff auf React State |
| Client <-> Backend | REST (JSON), multipart/form-data fuer PDF | Kein WebSocket noetig |
| Backend <-> PostgreSQL | Prisma ORM | Typsicherheit, Migrations |

## Sources

- [Offline-first frontend apps in 2025: IndexedDB and SQLite - LogRocket Blog](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) — HIGH confidence
- [Offline-First without a backend: local-first PWA architecture - DEV Community](https://dev.to/crisiscoresystems/offline-first-without-a-backend-a-local-first-pwa-architecture-you-can-trust-3j15) — MEDIUM confidence
- [Offline sync & conflict resolution patterns - Sachith Dassanayake (Feb 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/) — HIGH confidence
- [Build Offline-First PWA with React, Dexie.js & Workbox - wellally.tech](https://www.wellally.tech/blog/build-offline-pwa-react-dexie-workbox) — MEDIUM confidence
- [Dexie.js Synchronization Patterns](https://dexie.org/product) — HIGH confidence
- [7 PDF Parsing Libraries for Node.js - Strapi Blog](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) — MEDIUM confidence
- [Advanced PWA: Offline, Push & Background Sync - rishikc.com](https://rishikc.com/articles/advanced-pwa-features-offline-push-background-sync/) — MEDIUM confidence
- MDN: [Offline and background operation - Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — HIGH confidence

---
*Architecture research for: Offline-First PWA POS — Fairstand Kassensystem*
*Researched: 2026-03-23*
