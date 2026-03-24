# Phase 2: Backend & Sync - Research

**Researched:** 2026-03-23
**Domain:** Fastify 5 + Drizzle ORM + SQLite, Outbox-Flush-Engine (iOS-kompatibel)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Outbox-Pattern:** Jede Mutation wird als Event in die Outbox-Tabelle geschrieben, beim Sync an den Server geflusht
- **Delta-Events** für Bestandsänderungen (nicht Absolutwerte) — verhindert Konflikte bei mehreren Geräten
- **Last-Write-Wins** via Timestamp für alle anderen Entitäten
- **Sync-Trigger:** `online`-Event + `visibilitychange` (kein Background Sync — funktioniert auf iOS nicht)
- **Fastify 5.x mit SQLite + Drizzle ORM** (kein separater DB-Container)
- **REST-API:** POST /api/sync, Produkte, Verkäufe
- **SQLite-Datei** im Docker-Volume persistiert
- **Server-Schema** spiegelt Dexie-Schema (products, sales, outbox_events)

### Claude's Discretion

- Drizzle-Schema-Design und Migrationsstrategie
- API-Route-Struktur und Error-Handling
- Sync-Batch-Größe und Retry-Logik
- CORS-Konfiguration für die PWA-Domain

### Deferred Ideas (OUT OF SCOPE)

- Bidirektionaler Sync (Server → Client) — erstmal nur Client → Server
- WebSocket für Echtzeit-Sync — unnötig, periodischer Flush reicht
- Multi-Device-Sync mit Conflict-UI — LWW reicht für den Use Case
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WAR-04 | Warenbestand wird bei Verkauf automatisch reduziert | Lokal bereits implementiert in `useSaleComplete.ts`; Server muss SALE_COMPLETE-Events empfangen und stock serverseitig spiegeln |
| OFF-03 | Automatische Synchronisation mit Server wenn online | Sync-Engine mit `online`-Event + `visibilitychange`-Trigger; Outbox-Flush via POST /api/sync |
| OFF-04 | Sync verwendet Delta-Events (nicht Absolutwerte) für Bestandsänderungen | OutboxEntry.operation = 'SALE_COMPLETE' enthält bereits Verkaufsdaten als Delta; Server berechnet stock-Änderung aus items[].quantity |
</phase_requirements>

---

## Summary

Phase 2 baut auf einem vollständig funktionierenden Offline-Client auf. Das Dexie-Schema mit `OutboxEntry`-Tabelle und die atomare Schreiblogik in `useSaleComplete.ts` sind bereits vorhanden und produktionsreif. Die `OutboxEntry`-Typen (`SALE_COMPLETE`, `STOCK_ADJUST`) und der Payload-Aufbau sind festgelegt.

Serverseitig ist ein Fastify-Grundgerüst mit CORS und Health-Route vorhanden, aber noch kein Drizzle-Schema, keine Datenbankverbindung und kein Sync-Endpoint. Das Drizzle-Config zeigt auf `./src/db/schema.ts`, welches noch leer ist. Die Docker-Compose ist vollständig konfiguriert: SQLite-Volume, CORS_ORIGIN, Traefik-Labels für `fairstand.godsapp.de/api`.

Die Outbox-Flush-Engine existiert noch nicht im Client. Sie muss als separates Modul (`client/src/sync/`) gebaut werden, das Event-Listener auf `window.online` und `document.visibilitychange` registriert und nicht-synchronisierte OutboxEntries batched zum Server schickt.

**Primäre Empfehlung:** Server-Schema zuerst mit Drizzle definieren + Migration im Dockerfile automatisieren, dann POST /api/sync implementieren, dann Client-Sync-Engine draufsetzen.

---

## Standard Stack

### Core (bereits installiert)

| Library | Installierte Version | Purpose | Notiz |
|---------|---------------------|---------|-------|
| fastify | ^5.7 (aktuell 5.8.2) | HTTP-Framework | Bereits in server/package.json |
| @fastify/cors | ^10 (aktuell 11.2.0) | CORS-Plugin | Bereits registriert in server/src/index.ts |
| better-sqlite3 | ^11 (aktuell 12.8.0) | SQLite-Treiber | Bereits in server/package.json |
| drizzle-orm | ^0.40 (aktuell 0.45.1) | ORM | Bereits in server/package.json |
| drizzle-kit | ^0.30 (aktuell 0.31.10) | Migrations-CLI | Bereits in server/devDependencies |
| zod | ^3 (aktuell 4.3.6) | Schema-Validation | Bereits in server/package.json |

### Keine zusätzlichen Pakete nötig

Der gesamte Stack für Phase 2 ist bereits in `server/package.json` vorhanden. Keine neuen Abhängigkeiten erforderlich.

**Drizzle-DB-Verbindung (import-Muster):**

```typescript
// Source: https://orm.drizzle.team/docs/get-started/sqlite-new
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database(process.env.DB_PATH ?? './data/fairstand.db');
export const db = drizzle({ client: sqlite });
```

---

## Architecture Patterns

### Empfohlene Dateistruktur für Phase 2

```
server/src/
├── db/
│   ├── schema.ts          # Drizzle-Tabellendefinitionen (NEU)
│   └── index.ts           # DB-Singleton via better-sqlite3 + drizzle() (NEU)
├── routes/
│   ├── health.ts          # Bereits vorhanden
│   └── sync.ts            # POST /api/sync Endpoint (NEU)
└── index.ts               # Fastify-Setup (vorhanden, sync-Route einhängen)

server/migrations/         # Generiert von drizzle-kit generate (NEU)

client/src/
├── db/
│   ├── schema.ts          # Bereits vorhanden (unveränderter Source of Truth)
│   └── index.ts           # Bereits vorhanden
├── sync/
│   ├── engine.ts          # Flush-Logik: Outbox lesen, POST /api/sync (NEU)
│   └── triggers.ts        # online + visibilitychange Event-Listener (NEU)
└── features/pos/
    └── useSaleComplete.ts # Bereits vorhanden — kein Änderungsbedarf
```

### Pattern 1: Drizzle Schema (Server) spiegelt Dexie Schema (Client)

**Was:** Das Drizzle-Schema auf dem Server übernimmt exakt dieselbe Entitätsstruktur wie das Dexie-Schema auf dem Client. Kein Mapping nötig, Payloads sind direkt einsetzbar.

**Dexie-Schema (Client, bereits vorhanden):**
- `OutboxEntry`: `operation: 'SALE_COMPLETE' | 'STOCK_ADJUST'`, `payload: unknown`, `shopId`, `createdAt`, `attempts`
- `Sale`: `id` (UUID), `shopId`, `items` (JSON), `totalCents`, `paidCents`, `changeCents`, `donationCents`, `createdAt`, `syncedAt?`
- `Product`: `id` (UUID), `shopId`, `stock`, `updatedAt`, u.v.m.

**Drizzle-Schema (Server, zu erstellen):**

```typescript
// server/src/db/schema.ts
// Source: https://orm.drizzle.team/docs/get-started/sqlite-new
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  articleNumber: text('article_number').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull().default(''),
  purchasePrice: integer('purchase_price').notNull(),  // Cent-Integer
  salePrice: integer('sale_price').notNull(),           // Cent-Integer
  vatRate: integer('vat_rate').notNull(),               // 7 oder 19
  stock: integer('stock').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updated_at').notNull(),           // Unix ms (LWW)
});

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  items: text('items', { mode: 'json' }).notNull(),    // SaleItem[] als JSON
  totalCents: integer('total_cents').notNull(),
  paidCents: integer('paid_cents').notNull(),
  changeCents: integer('change_cents').notNull(),
  donationCents: integer('donation_cents').notNull(),
  createdAt: integer('created_at').notNull(),           // Unix ms
  syncedAt: integer('synced_at'),                       // null = noch nicht gesynct
});

export const outboxEvents = sqliteTable('outbox_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: text('shop_id').notNull(),
  operation: text('operation').notNull(),               // 'SALE_COMPLETE' | 'STOCK_ADJUST'
  payload: text('payload', { mode: 'json' }).notNull(),
  processedAt: integer('processed_at'),                 // null = ausstehend
  createdAt: integer('created_at').notNull(),
});
```

### Pattern 2: POST /api/sync — Idempotente Batch-Verarbeitung

**Was:** Ein einzelner Endpoint empfängt alle ausstehenden OutboxEntries als Array und verarbeitet sie sequenziell in einer SQLite-Transaktion. Idempotenz durch `id`-basiertes Upsert (INSERT OR IGNORE).

**Wann:** Immer wenn Client-Outbox Einträge enthält und Client online ist.

**Endpoint-Struktur:**

```typescript
// server/src/routes/sync.ts
// Zod-Validierung für den Payload
const SaleItemSchema = z.object({
  productId: z.string(),
  articleNumber: z.string(),
  name: z.string(),
  salePrice: z.number().int(),
  quantity: z.number().int().positive(),
});

const OutboxEntrySchema = z.object({
  operation: z.enum(['SALE_COMPLETE', 'STOCK_ADJUST']),
  payload: z.unknown(),
  shopId: z.string(),
  createdAt: z.number().int(),
});

const SyncBatchSchema = z.object({
  entries: z.array(OutboxEntrySchema),
});

// POST /api/sync
// Antwortet mit: { processed: number, errors: Array<{ index, message }> }
```

**Verarbeitungslogik für SALE_COMPLETE:**

```typescript
// Innerhalb db.transaction():
// 1. Sale inserieren (INSERT OR IGNORE — Idempotenz)
// 2. Für jedes item: stock -= item.quantity (Delta, nie Absolutwert)
// 3. OutboxEvent auf dem Server als processedAt markieren
```

### Pattern 3: Client Sync-Engine

**Was:** Singleton-Modul im Client, das beim App-Start Event-Listener registriert und bei Trigger alle ungesyncten OutboxEntries (syncedAt IS NULL) batched sendet.

**iOS-Kompatibilität:** Kein Background Sync API — ausschliesslich `window.addEventListener('online', ...)` und `document.addEventListener('visibilitychange', ...)`. Beide funktionieren zuverlässig in Safari auf iOS 17+ Home-Screen-PWA.

```typescript
// client/src/sync/engine.ts
import { db } from '../db/index.js';

export async function flushOutbox(): Promise<void> {
  const pending = await db.outbox
    .where('createdAt')
    .aboveOrEqual(0)
    .filter(e => e.attempts < 5)
    .toArray();

  if (pending.length === 0) return;

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries: pending }),
  });

  if (!res.ok) {
    // Attempts erhöhen — nächster Trigger versucht es erneut
    for (const entry of pending) {
      await db.outbox.update(entry.id!, { attempts: (entry.attempts ?? 0) + 1 });
    }
    return;
  }

  // Erfolgreiche Entries aus Outbox entfernen
  await db.outbox.bulkDelete(pending.map(e => e.id!));
  // Sale.syncedAt setzen
  const saleEntries = pending.filter(e => e.operation === 'SALE_COMPLETE');
  for (const e of saleEntries) {
    const sale = e.payload as { id: string };
    await db.sales.update(sale.id, { syncedAt: Date.now() });
  }
}

// client/src/sync/triggers.ts
export function registerSyncTriggers(): void {
  window.addEventListener('online', () => { flushOutbox(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      flushOutbox();
    }
  });
}
```

### Pattern 4: Drizzle-Migration im Docker-Entrypoint

**Was:** `drizzle-kit migrate` läuft automatisch beim Container-Start, bevor der Server hochkommt. Kein manueller Schritt beim Deploy.

**Umsetzung im Dockerfile:**

```dockerfile
CMD ["sh", "-c", "npx drizzle-kit migrate && node dist/index.js"]
```

Oder eleganter als npm-Script in package.json:
```json
"start": "drizzle-kit migrate && node dist/index.js"
```

**Migrations-Workflow:**
1. `server/src/db/schema.ts` ändern
2. `npx drizzle-kit generate` — erzeugt SQL-Migration in `server/migrations/`
3. Migrations-Dateien committen — beim nächsten Deploy automatisch angewendet

### Anti-Patterns to Avoid

- **Absolutwerte beim Stock-Sync:** Nie `stock = 5` senden, immer `stock -= 2` (Delta). Mehrere gleichzeitige Geräte würden sonst Bestände überschreiben.
- **Sync ohne Idempotenz:** Doppelte POST-Requests bei Netzwerkfehler dürfen nicht zu doppelten Sales führen. `INSERT OR IGNORE` auf der `id`-Spalte ist Pflicht.
- **Sync-Engine im React-State:** Outbox-Status nie nur in-memory halten — beim Tab-Reload verloren. Die Dexie-Outbox ist die einzige Wahrheitsquelle.
- **Unbegrenztes Retry:** Nach 5 fehlgeschlagenen Versuchen eine Entry nicht mehr retrien (verhindert Endlos-Schleifen bei kaputten Payloads).
- **drizzle-kit push in Produktion:** Nur für lokale Entwicklung. In Produktion immer `drizzle-kit generate` + `drizzle-kit migrate` — push überspringt Migration-History.
- **Blocking SQLite-Connection im Fastify-Startup:** `better-sqlite3` ist synchron — Connection darf nicht im async-Kontext mit `await` aufgerufen werden. Direkt als `new Database(path)` instanziieren.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|-------------------|-------------|-------|
| Schema-Migrationen | Kein SQL-Diff-Tool schreiben | `drizzle-kit generate` + `drizzle-kit migrate` | Drizzle verfolgt Schema-History, generiert idempotente SQL-Dateien |
| Request-Body-Validierung | Keine manuelle if/typeof-Checks | `zod.parse()` mit Zod-Schema | Zod gibt präzise Fehlermeldungen zurück, TypeScript-Typen kostenlos |
| Idempotenz-Logik | Kein eigenes "schon verarbeitet?"-Flag | SQLite `INSERT OR IGNORE` via Drizzle `.onConflictDoNothing()` | Einzeilig, atomar, kein Race-Condition-Risiko |
| Batch-Fehlerbehandlung | Kein try/catch pro Entry | SQLite-Transaktion + Rollback | Partial-Writes verhindern, kein inkonsistenter Serverzustand |

---

## Common Pitfalls

### Pitfall 1: drizzle-kit findet Schema nicht beim Migrate im Docker-Container

**Was schiefgeht:** `drizzle-kit migrate` scheitert im Production-Container, weil `./src/db/schema.ts` nicht mehr existiert (nur noch `dist/`).

**Warum:** drizzle-kit liest die Schema-Datei bei Migration nicht — es liest die vorgenerierten SQL-Dateien aus `migrations/`. Das ist kein Problem, wenn Migrations-Ordner korrekt mit `COPY` ins Image kopiert wird.

**Vorbeugung:** Im Dockerfile explizit `COPY --from=build /app/migrations ./migrations` hinzufügen. Migration-Dateien gehören ins Git-Repository und ins Docker-Image.

**Warnsignal:** `Error: No migration files found` beim Container-Start.

### Pitfall 2: better-sqlite3 + ESM-Modul-Konflikt

**Was schiefgeht:** `better-sqlite3` ist ein CommonJS-Native-Addon. Bei `"type": "module"` in package.json kann es zu Import-Fehlern kommen.

**Warum:** Native Node.js Addons (.node-Dateien) unterstützen kein echtes ESM. `better-sqlite3` hat aber einen ESM-kompatiblen Wrapper.

**Vorbeugung:** Import mit `import Database from 'better-sqlite3'` — funktioniert in modernem Node.js 20+ auch mit `"type": "module"` korrekt, weil das Paket einen ESM-Export hat. Nicht `createRequire` verwenden.

**Warnsignal:** `ERR_REQUIRE_ESM` oder `ERR_UNKNOWN_FILE_EXTENSION` beim Start.

### Pitfall 3: iOS Safari `online`-Event feuert nicht nach Reconnect aus dem Hintergrund

**Was schiefgeht:** Nutzerinnen wechseln ins WLAN, aber die App synct nicht. `online`-Event wurde nicht empfangen.

**Warum:** iOS/Safari feuert das `online`-Event manchmal nicht zuverlässig, wenn die PWA im Hintergrund war. `visibilitychange` deckt diesen Fall ab.

**Vorbeugung:** Beide Trigger kombinieren (wie in Pattern 3). Zusätzlich `navigator.onLine`-Check beim App-Start: bei `true` sofort `flushOutbox()` aufrufen.

**Warnsignal:** Outbox-Einträge bleiben nach Netz-Reconnect unverarbeitet.

### Pitfall 4: Doppelter Sale-Eintrag durch Retry

**Was schiefgeht:** POST /api/sync antwortet mit Timeout (503). Client retried. Sale wird doppelt in der Server-DB gespeichert.

**Warum:** Kein Idempotenz-Schutz auf dem Endpoint.

**Vorbeugung:** `sales.id` ist UUID (clientseitig generiert via `crypto.randomUUID()`). Server verwendet `INSERT OR IGNORE` (Drizzle: `.onConflictDoNothing()`). Zweiter Request ist Noop.

**Warnsignal:** Mehr `sales`-Einträge auf dem Server als auf dem Client.

### Pitfall 5: Stock-Berechnung schlägt fehl bei unbekanntem Produkt

**Was schiefgeht:** Ein `SALE_COMPLETE`-Event enthält eine `productId`, die auf dem Server noch nicht existiert (Produkt nur lokal angelegt, nie gesynct).

**Warum:** Phase 2 enthält nur Client→Server-Sync für Sales. Produkte existieren zunächst nur in Dexie, nicht in der Server-DB.

**Vorbeugung:** Server muss bei `SALE_COMPLETE` die Produkte aus dem `items[]`-Array upserten (INSERT OR IGNORE), nicht nur den Stock aktualisieren. Alternativ: `UPSERT products SET stock -= delta WHERE id = ?`.

**Warnsignal:** Foreign-Key-Constraint-Fehler oder `null`-Stock auf dem Server nach Sync.

---

## Code Examples

### Drizzle DB-Verbindung (Server)

```typescript
// server/src/db/index.ts
// Source: https://orm.drizzle.team/docs/get-started/sqlite-new
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

const sqlite = new Database(process.env.DB_PATH ?? './data/fairstand.db');
export const db = drizzle({ client: sqlite, schema });
```

### Fastify Route mit Zod-Validierung

```typescript
// server/src/routes/sync.ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { sales, products, outboxEvents } from '../db/schema.js';

const SyncBatchSchema = z.object({
  entries: z.array(z.object({
    operation: z.enum(['SALE_COMPLETE', 'STOCK_ADJUST']),
    payload: z.unknown(),
    shopId: z.string(),
    createdAt: z.number().int(),
  })),
});

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.post('/sync', async (request, reply) => {
    const result = SyncBatchSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.flatten() });
    }

    let processed = 0;
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < result.data.entries.length; i++) {
      const entry = result.data.entries[i];
      try {
        // Transaktion pro Entry für maximale Robustheit
        db.transaction(() => {
          if (entry.operation === 'SALE_COMPLETE') {
            // Implementierung folgt in Plan 02-01
          }
        })();
        processed++;
      } catch (err) {
        errors.push({ index: i, message: String(err) });
      }
    }

    return { processed, errors };
  });
}
```

### Drizzle Idempotenz-Insert

```typescript
// Source: Drizzle ORM docs — onConflictDoNothing
import { sql } from 'drizzle-orm';

// Sale idempotent einfügen
await db.insert(sales).values(saleData).onConflictDoNothing();

// Produkt-Stock als Delta (nicht Absolutwert)
await db
  .update(products)
  .set({ stock: sql`${products.stock} - ${delta}` })
  .where(eq(products.id, productId));
```

### Client Sync-Trigger registrieren (App-Start)

```typescript
// client/src/sync/triggers.ts
import { flushOutbox } from './engine.js';

export function registerSyncTriggers(): void {
  // Sofort beim Start versuchen (falls bereits online)
  if (navigator.onLine) {
    flushOutbox();
  }

  window.addEventListener('online', () => {
    flushOutbox();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      flushOutbox();
    }
  });
}
```

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Geändert | Bedeutung |
|--------------|------------------|----------|-----------|
| Background Sync API (Service Worker) | `online` + `visibilitychange` Events | iOS hat Background Sync nie implementiert (Stand 2026) | Kein SW-Background-Sync auf iOS — Event-basiert ist der Standard für PWAs |
| Prisma ORM | Drizzle ORM | ~2023 | Drizzle hat kein Binary, kleineres Docker-Image, SQL-nah |
| drizzle-kit push | drizzle-kit generate + migrate | Best Practice seit Drizzle 0.28+ | `push` überspringt Migration-History — nur für Dev |
| Express.js | Fastify 5 | Fastify 5 stable Oktober 2024 | TypeScript-native, schema-basiert, schneller |

---

## Open Questions

1. **Produkt-Bootstrapping beim ersten Sync**
   - Was wir wissen: Client hat Produkte in Dexie (aus Seed-Skript). Server-DB ist leer.
   - Unklar: Werden Produkte separat zum Server gesynct, oder nur implizit via SALE_COMPLETE?
   - Empfehlung: In Phase 2 reicht es, Produkte aus dem Sale-Payload upzuserten (`INSERT OR IGNORE`) — vollständiger Produkt-Sync gehört zu Phase 3 (WAR-01 bis WAR-05).

2. **Retry-Budget und Backoff-Strategie**
   - Was wir wissen: `attempts`-Feld ist auf OutboxEntry vorhanden, max 5 Versuche sinnvoll.
   - Unklar: Exponentieller Backoff oder flacher Retry bei jedem Trigger?
   - Empfehlung: Flacher Retry reicht (kein Timer nötig) — nächster `online`/`visibilitychange` ist der natürliche Backoff.

3. **Sync-Feedback im UI**
   - Was wir wissen: Kein dedizierter Sync-Status-State im Client.
   - Unklar: Soll der User sehen, wann zuletzt gesynct wurde?
   - Empfehlung: Einfaches Badge "X ungesynct" in Phase 2 reicht; kein komplexes State-Management nötig.

---

## Sources

### Primary (HIGH confidence)

- [Drizzle ORM SQLite Docs](https://orm.drizzle.team/docs/get-started/sqlite-new) — Schema-Definition, DB-Connection, Migration-Commands
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) — drizzle-kit generate + migrate Workflow
- `client/src/db/schema.ts` — Source of Truth für alle Entitäts-Strukturen (lokal verifiziert)
- `client/src/features/pos/useSaleComplete.ts` — OutboxEntry-Format und atomare Schreiblogik (lokal verifiziert)
- `server/src/index.ts` + `server/package.json` — Bestehender Fastify-Stack (lokal verifiziert)
- `docker-compose.yml` — SQLite-Volume und CORS_ORIGIN bereits konfiguriert (lokal verifiziert)

### Secondary (MEDIUM confidence)

- [MDN: Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — online/visibilitychange Event-Verhalten
- [PWA iOS Limitations 2026 (magicbell.com)](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — Background Sync API Status auf iOS bestätigt: nicht verfügbar

### Tertiary (LOW confidence)

- Keine LOW-confidence Quellen verwendet

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Pakete bereits installiert, Versionen verifiziert via `npm view`
- Architecture: HIGH — Dexie-Schema und bestehende Outbox-Logik sind Source of Truth; Drizzle-Pattern aus offiziellen Docs
- Pitfalls: HIGH — Idempotenz, iOS-Safari-Verhalten und ESM/CJS-Konflikte aus direkter Code-Analyse und verifizierten Quellen

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stabiler Stack, wenig Bewegung)
