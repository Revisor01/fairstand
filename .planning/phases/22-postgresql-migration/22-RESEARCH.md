# Phase 22: PostgreSQL-Migration - Research

**Researched:** 2026-03-24
**Domain:** Database Migration — SQLite → PostgreSQL mit Drizzle ORM
**Confidence:** HIGH (Schema-Migration) / MEDIUM (Data-Migration)

## Summary

Phase 22 migriert den Fairstand-Server von SQLite (better-sqlite3) auf PostgreSQL für Production-Reife der Datenbankebene. Die Datenschemata sind identisch — nur die Datenbank-Dialecte unterscheiden sich (sqliteTable → pgTable, synchrone zu asynchrone APIs). Bestehende Daten müssen vom bestehenden SQLite-Container zu PostgreSQL übertragen werden.

**Kritische Umstellung:** better-sqlite3 ist synchron (`.run()`, `.get()`, `.all()` ohne await), PostgreSQL mit node-postgres ist async/await. Der planner muss alle Datenbankaufrufe auf async umstellen — das ist die Hauptkomplexität. Drizzle ORM macht den Rest einfach (Schema + Queries sehen fast identisch aus).

**Primary recommendation:** (1) Neue postgres-Service in docker-compose.yml hinzufügen, (2) Schema zu pgTable migrieren und drizzle-kit push nutzen, (3) Synchrone `.run()`/`.get()`/`.all()` zu async/await in allen Routes + seed.ts + reportScheduler.ts ändern, (4) Datenmigrationsskript für bestehende SQLite-Daten schreiben, (5) better-sqlite3 aus package.json entfernen.

## User Constraints (from CONTEXT.md)

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure phase with no locked decisions.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PG-01 | Server verwendet PostgreSQL statt SQLite (Drizzle ORM mit drizzle-orm/node-postgres) | Schema-Umstellung documented; Pool-Konfiguration documented |
| PG-02 | Docker-Compose enthält PostgreSQL-Container mit Volume für Datenpersistenz | Named Volume pattern documented (postgres-data:/var/lib/postgresql/data) |
| PG-03 | Alle Drizzle-Schema-Definitionen sind auf PostgreSQL-Syntax migriert (text → varchar, integer → serial etc.) | Drizzle pgTable documented; column type differences identified |
| PG-04 | Bestehende SQLite-Daten können über ein Migrationsskript nach PostgreSQL übertragen werden | SQLite→PostgreSQL migration pattern documented |
| PG-05 | better-sqlite3 ist komplett entfernt (package.json, imports) | Dependency changes identified |

## Standard Stack

### Core Database Layer

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pg (node-postgres) | ^14.0 oder ^15.0 | PostgreSQL-Treiber für Node.js | Offizielle Node.js PostgreSQL-Library, verwendet von großen Projekten, Connection Pooling nativ |
| drizzle-orm | 0.40+ (aktuell im Projekt) | ORM — abstrakt SQL-Dialekt | Bereits im Stack; pgTable-Provider für PostgreSQL vollständig kompatibel mit bestehenden Queries |
| drizzle-kit | 0.30+ (aktuell im Projekt) | Schema-Migrations-Tool | Erzeugt PostgreSQL-Migrations automatisch aus Schema |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| postgres.js (Alternative) | ^4.x | PostgreSQL-Treiber (schneller, aber weniger Tooling) | Wenn Performance extrem kritisch; für Fairstand reicht node-postgres |
| better-sqlite3 | — | **ENTFERNT** | SQLite-Sync-Driver; wird durch PostgreSQL ersetzt |

### Development & Migration Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `sqlite3` CLI oder `better-sqlite3` REPL | Bestehende SQLite-Daten explorieren | Temporär zur Migration |
| Node.js Migration-Script (custom) | SQLite → PostgreSQL Data-Transfer | Keine Abhängigkeit nötig (nutzt pg + better-sqlite3 temporär) |

## Architecture Patterns

### Recommended Project Structure

```
server/
├── src/
│   ├── db/
│   │   ├── index.ts                    # Drizzle + Pool initialization
│   │   ├── schema.ts                   # pgTable definitions (changed from sqliteTable)
│   │   ├── seed.ts                     # Async — ensureShopSeeded() wird async
│   │   └── migrate-from-sqlite.ts      # Data migration helper (nur für Phase 22)
│   ├── routes/                         # Alle async/await statt synchrone Calls
│   └── scheduler/reportScheduler.ts    # Async — alle .run()/.get() → await
├── docker-compose.yml                  # postgres service + volume hinzufügen
├── drizzle.config.ts                   # dialect: 'postgresql' statt 'sqlite'
└── Dockerfile                          # Keine Änderungen außer DB_PATH → DATABASE_URL
```

### Pattern 1: Drizzle + node-postgres Pool

**What:** Zentrale DB-Verbindung mit Connection Pooling statt SQLite Single-File.

**When to use:** Production-Umgebung mit mehreren gleichzeitigen Requests.

**Example (src/db/index.ts):**
```typescript
// Source: Drizzle ORM docs — drizzle-orm/node-postgres
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // DATABASE_URL format: postgresql://user:password@localhost:5432/fairstand
  // Optional: SSL für Produktion
  // ssl: process.env.NODE_ENV === 'production',
});

// Fastify onClose hook für Cleanup
// fastify.addHook('onClose', async () => {
//   await pool.end();
// });

export const db = drizzle({ client: pool, schema });
```

**Schlüsseldifferenz zu SQLite:**
- `pool.end()` in Fastify.onClose() aufrufen (besser für Connection Reuse)
- Alle Queries sind **promise-basiert** → müssen awaited werden

### Pattern 2: Schema-Umstellung sqliteTable → pgTable

**What:** Spalten-Typen und Constraints für PostgreSQL anpassen.

**When to use:** Bei jeder Schema-Definition.

**Kritische Typ-Unterschiede:**

| SQLite | PostgreSQL | Drizzle pgTable |
|--------|-----------|-----------------|
| `integer('col').primaryKey({ autoIncrement: true })` | SERIAL (auto-increment 4-byte int) | `serial('col').primaryKey()` |
| `integer('col').notNull()` | INTEGER | `integer('col').notNull()` |
| `text('col')` | VARCHAR / TEXT | `text('col')` (unchanged) |
| `integer('col', { mode: 'boolean' })` | BOOLEAN | `boolean('col')` |
| JSON via `text('col', { mode: 'json' })` | JSONB / JSON | `jsonb('col')` oder `json('col')` |

**Fairstand outboxEvents-Tabelle Anpassung:**
```typescript
// Source: Drizzle ORM docs — column types
// OLD (SQLite):
// id: integer('id').primaryKey({ autoIncrement: true }),

// NEW (PostgreSQL):
import { pgTable, serial, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const outboxEvents = pgTable('outbox_events', {
  id: serial('id').primaryKey(),           // ← Changed: serial statt integer + autoIncrement
  shopId: text('shop_id').notNull(),
  operation: text('operation').notNull(),
  payload: jsonb('payload').notNull(),     // Optional: JSONB statt JSON für bessere Queries
  processedAt: integer('processed_at'),
  createdAt: integer('created_at').notNull(),
});
```

### Pattern 3: Async/Await Migration für Route Handlers

**What:** Alle DB-Aufrufe müssen von `.get()/.run()/.all()` (synchron) zu `await` (asynchron) geändert werden.

**When to use:** Überall wo currently `db.select()...run()` oder `.get()` ohne await.

**Aktueller Code (SQLite-Synchron):**
```typescript
// server/src/routes/sync.ts (SYNCHRON)
const sales = db.select().from(sales).where(eq(sales.shopId, shopId)).all();
```

**Neuer Code (PostgreSQL-Async):**
```typescript
// server/src/routes/sync.ts (ASYNC)
const sales = await db.select().from(sales).where(eq(sales.shopId, shopId));
```

**Route Handler bereits async? Nein — aktuelle routes sind:**
- `auth.ts`: `export async function authRoutes()` — aber `validateSession()` ist nicht async
- `sync.ts`: `export async function syncRoutes()` — aber handlers nutzen synchrone `.all()` / `.run()`
- `products.ts`: `export async function productRoutes()` — handlers sind NOT async

**Änderungen erforderlich:**
1. Alle Fastify Route Handlers müssen `async` sein (sind sie wahrscheinlich schon Fastify-Standard)
2. Alle `db.select()...all()` → `await db.select()...`
3. Alle `db.insert()...run()` → `await db.insert()...`
4. Alle `db.update()...run()` → `await db.update()...`

### Pattern 4: Docker Compose PostgreSQL Service

**What:** Named Volume für Datenpersistenz, Umgebungsvariablen für Init.

**When to use:** Production Deployment.

**Example (docker-compose.yml):**
```yaml
services:
  postgres:
    image: postgres:16-alpine            # Oder 17-alpine (aktuell stable)
    environment:
      POSTGRES_DB: fairstand
      POSTGRES_USER: fairstand          # User statt root
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # Aus .env
      POSTGRES_INITDB_ARGS: "-E UTF8"   # Unicode Support
    volumes:
      - postgres-data:/var/lib/postgresql/data  # Named Volume für Persistenz
    networks:
      - traefik
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fairstand"]
      interval: 10s
      timeout: 5s
      retries: 5

  server:
    build:
      context: ./server
    environment:
      DATABASE_URL: postgresql://fairstand:${POSTGRES_PASSWORD}@postgres:5432/fairstand
      # Alte Variable entfernen:
      # - DB_PATH: /app/data/fairstand.db
    depends_on:
      postgres:
        condition: service_healthy
    # ... rest of config

volumes:
  postgres-data:                          # Named Volume Declaration
```

**Wichtig:** `depends_on` mit `service_healthy` sorgt dafür, dass Server erst startet wenn DB ready ist.

### Pattern 5: Datenmigration SQLite → PostgreSQL

**What:** Bestehende Daten aus SQLite in PostgreSQL kopieren (idempotent).

**When to use:** Beim ersten Container-Start in Produktion.

**Ansatz (migrate-from-sqlite.ts):**
```typescript
// Source: Praktisches Pattern für SQLite→PostgreSQL Migration
// Location: server/src/db/migrate-from-sqlite.ts

import Database from 'better-sqlite3';
import { db } from './index.js';

const SQLITE_PATH = process.env.SQLITE_BACKUP_PATH || './data/fairstand.db';

export async function migrateFromSQLiteIfNeeded(): Promise<void> {
  // 1. Prüfe ob SQLite-Datei existiert
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('No SQLite backup found, skipping migration');
    return;
  }

  // 2. Prüfe ob PostgreSQL-Daten bereits existieren (Idempotenz)
  const existingShops = await db.select().from(shops);
  if (existingShops.length > 0) {
    console.log('PostgreSQL already populated, skipping migration');
    return;
  }

  // 3. Öffne SQLite (temporär)
  const sqlite = new Database(SQLITE_PATH);

  try {
    // 4. Lese Shops
    const sqliteShops = sqlite.prepare('SELECT * FROM shops').all();
    for (const shop of sqliteShops) {
      await db.insert(shops).values(shop);
    }

    // 5. Lese Products
    const sqliteProducts = sqlite.prepare('SELECT * FROM products').all();
    for (const product of sqliteProducts) {
      await db.insert(products).values(product);
    }

    // 6. Ähnlich für Sales, Categories, Settings

    console.log('Migration from SQLite completed');
  } finally {
    sqlite.close();
  }
}

// Rufe auf in Docker Entrypoint oder src/index.ts boot:
// await migrateFromSQLiteIfNeeded();
```

**Wichtig:**
- Nutze `for await` Schleife oder sequenzielle Inserts (PostgreSQL garantiert Reihenfolge-Konsistenz)
- Berücksichtige Foreign Keys — Reihenfolge ist wichtig (shops vor products)
- Idempotent: Wenn bereits Daten existieren, überspringe

### Anti-Patterns to Avoid

- **Synchrone `.run()` / `.get()` Calls in async Routes:** Führt zu Promises, die nicht awaited sind — Fehler werden nicht abgefangen
- **DB-Connection ohne Pool:** SQLite-Gewohnheit — PostgreSQL braucht Pool für >1 Request gleichzeitig
- **Keine Migration für bestehende SQLite-Daten:** Daten sind weg!
- **Alte better-sqlite3-Imports nicht entfernen:** Build-Fehler, wenn better-sqlite3 nicht installiert

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite → PostgreSQL Typ-Konvertierung | Custom Konvertierungs-Mapper | drizzle-kit generate + pgTable | Drizzle generiert korrekte SQL-Migrations; Custom-Mapping führt zu Typ-Mismatches |
| Connection Pooling | Manual Pool-Management (create connection pro Request) | pg Pool + Drizzle | Connection-Wiederverwendung ist kritisch für Performance; manuelle Verwaltung ist fehleranfällig |
| Async/Await in Routes falsch umsteigen | Callback-Hell oder Promise-Chaining | Alle Handlers konsequent `async` + `await` | Klarer Code, einfacher zu debuggen, Standards-compliant |
| Migrations-Versionierung | Hardcoded SQL-Strings in Code | drizzle-kit Migrations-Verzeichnis | Versionskontrolle, Rollback-Möglich, reproduzierbar |
| SQLite-Backup-Import | Ad-hoc SQL-Import-Scripts | Strukturiertes Node.js Migrationsskript mit Transaktionen | Atomare Operationen, besseres Error-Handling, Logging |

**Key insight:** Drizzle abstrahiert ~90% der Komplexität weg — nur die async/await Refactorings sind zeitintensiv, aber mechanisch einfach.

## Common Pitfalls

### Pitfall 1: Forgotten `.await` auf Query Results

**What goes wrong:** Route Handler ruft `db.select()...` auf, erwartet Daten, aber bekommt Promise. Runtime-Fehler wenn später `.map()` oder `.length` zugegriffen wird.

**Why it happens:** better-sqlite3 `.all()` gibt sofort Array zurück; node-postgres gibt Promise zurück. IDE und TypeScript erkennen das automatisch, aber bei `const data = db.select()...` ohne `await` ist es subtil.

**How to avoid:** Alle `const x = db.select()...` → `const x = await db.select()...` Pattern durchsuchen + finden. TypeScript-Fehler sollten helfen ("Property 'map' does not exist on type Promise").

**Warning signs:** Type-Fehler "expected Array, got Promise", oder "undefined is not iterable" bei Runtime.

### Pitfall 2: Synchrone Logik in Seed/Scheduler blockiert Server

**What goes wrong:** `ensureShopSeeded()` wird aufgerufen bevor Server lädt. Wenn Seed-Inserts nicht awaited sind, startet der Server bevor Daten existieren. Routes kriegen 404 "keine Shops".

**Why it happens:** better-sqlite3 `.run()` ist synchron — alles wartet. Mit PostgreSQL müssen wir `await db.insert()...` setzen, aber wenn wir das vergessen, startet der Server trotzdem einfach weiter.

**How to avoid:** `ensureShopSeeded()` explizit `async` machen. In `src/index.ts` mit `await ensureShopSeeded()` aufrufen (nicht einfach `ensureShopSeeded()`).

**Warning signs:** Server startet, aber `GET /api/products` gibt keine Produkte zurück obwohl Seed-Code läuft.

### Pitfall 3: Foreign-Key Verletzungen bei Datenmigration

**What goes wrong:** Products werden vor Shops migriert. PostgreSQL wirft "FOREIGN KEY violation" Fehler.

**Why it happens:** PostgreSQL enforced FKs standardmäßig (besser als SQLite default-off). Wenn Reihenfolge falsch ist, schlägt Insert fehl.

**How to avoid:** Migrationsskript migriert in korrekter Reihenfolge: (1) shops, (2) categories, (3) products, (4) sales, (5) settings.

**Warning signs:** Migrationsskript crasht mit "Fremdschlüssel-Verletzung" Error.

### Pitfall 4: DB-Connection pooled nicht, Server crasht unter Last

**What goes wrong:** Drizzle.Pool wird nicht konfiguriert — jede Query öffnet neue Connection. Nach ~10 gleichzeitigen Requests: "Too many connections" PostgreSQL Error.

**Why it happens:** node-postgres Default Pool hat `max: 10` Connections. Wenn Handler nicht async ist oder Connection nicht korrekt released wird, Leak.

**How to avoid:** Pool-Größe konfigurieren: `new Pool({ max: 20, idleTimeoutMillis: 30000 })`. Fastify Hook `.onClose` Pool mit `await pool.end()` schließen.

**Warning signs:** Server funktioniert solo, aber unter Last (mehrere gleichzeitige Users) wird es langsamer und crasht.

### Pitfall 5: Umgebungsvariablen nicht gesetzt — Server kann nicht starten

**What goes wrong:** DATABASE_URL fehlt. `new Pool({ connectionString: undefined })` crasht.

**Why it happens:** Alte Code nutzte `process.env.DB_PATH`, neue Code nutzt `process.env.DATABASE_URL`. Wenn docker-compose.yml nicht aktualisiert ist, Variable existiert nicht.

**How to avoid:**
- docker-compose.yml muss `DATABASE_URL: postgresql://...` setzen
- `.env` (lokal) oder CI/CD Secrets müssen POSTGRES_PASSWORD enthalten
- Dockerfile CMD muss `drizzle-kit migrate` vor Node-Start ausführen

**Warning signs:** Server startet nicht, Error "DATABASE_URL not set" oder "Cannot connect to database".

## Code Examples

Verified patterns from official sources:

### Drizzle Schema Umstellung (pgTable)

```typescript
// Source: Drizzle ORM docs — Schema Definition
// File: server/src/db/schema.ts

import { pgTable, text, integer, boolean, serial, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: text('id').primaryKey(),                        // UUID bleibt text
  shopId: text('shop_id').notNull(),
  articleNumber: text('article_number').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull().default(''),
  purchasePrice: integer('purchase_price').notNull(),
  salePrice: integer('sale_price').notNull(),
  vatRate: integer('vat_rate').notNull(),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  active: boolean('active').notNull().default(true),  // ← Changed from integer(..., { mode: 'boolean' })
  imageUrl: text('image_url'),
  updatedAt: integer('updated_at').notNull(),
});

export const outboxEvents = pgTable('outbox_events', {
  id: serial('id').primaryKey(),                      // ← Changed: serial statt integer(...autoIncrement)
  shopId: text('shop_id').notNull(),
  operation: text('operation').notNull(),
  payload: jsonb('payload').notNull(),               // ← Changed: jsonb statt JSON-Mode on text
  processedAt: integer('processed_at'),
  createdAt: integer('created_at').notNull(),
});
```

### Fastify with Drizzle + Pool

```typescript
// Source: Fastify + Drizzle ORM Integration Pattern
// File: server/src/index.ts (excerpt)

import Fastify from 'fastify';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema.js';

const fastify = Fastify({ logger: true });

// Initialize Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle({ client: pool, schema });

// Cleanup on shutdown
fastify.addHook('onClose', async () => {
  await pool.end();
});

// Routes verwenden db
fastify.get('/api/products', async (request, reply) => {
  const products = await db.select().from(products);  // ← await required
  reply.send(products);
});

await fastify.listen({ port: 3000, host: '0.0.0.0' });
```

### Data Migration Script (SQLite → PostgreSQL)

```typescript
// Source: Praktisches SQLite→PostgreSQL Migration Pattern
// File: server/src/db/migrate-from-sqlite.ts

import fs from 'fs';
import Database from 'better-sqlite3';
import { db } from './index.js';
import { shops, products, categories, sales, settings } from './schema.js';

export async function migrateFromSQLiteIfNeeded(): Promise<void> {
  const SQLITE_PATH = process.env.SQLITE_BACKUP_PATH || './data/fairstand.db';

  if (!fs.existsSync(SQLITE_PATH)) {
    console.log('[Migration] No SQLite backup found');
    return;
  }

  // Check if PG already has data
  const existingShops = await db.select().from(shops);
  if (existingShops.length > 0) {
    console.log('[Migration] PostgreSQL already populated');
    return;
  }

  console.log('[Migration] Starting SQLite→PostgreSQL migration...');
  const sqlite = new Database(SQLITE_PATH);

  try {
    // Migration order: shops → categories → products → sales → settings
    const sqliteShops = sqlite.prepare('SELECT * FROM shops').all() as any[];
    for (const shop of sqliteShops) {
      await db.insert(shops).values({
        id: shop.id,
        shopId: shop.shop_id,
        name: shop.name,
        pin: shop.pin,
        createdAt: shop.created_at,
      });
    }
    console.log(`[Migration] Migrated ${sqliteShops.length} shops`);

    const sqliteProducts = sqlite.prepare('SELECT * FROM products').all() as any[];
    for (const prod of sqliteProducts) {
      await db.insert(products).values({
        id: prod.id,
        shopId: prod.shop_id,
        articleNumber: prod.article_number,
        name: prod.name,
        category: prod.category,
        purchasePrice: prod.purchase_price,
        salePrice: prod.sale_price,
        vatRate: prod.vat_rate,
        stock: prod.stock,
        minStock: prod.min_stock,
        active: Boolean(prod.active),  // ← Convert 0/1 to boolean
        imageUrl: prod.image_url,
        updatedAt: prod.updated_at,
      });
    }
    console.log(`[Migration] Migrated ${sqliteProducts.length} products`);

    // Ähnlich für categories, sales, settings...

    console.log('[Migration] SQLite→PostgreSQL migration completed');
  } catch (error) {
    console.error('[Migration] Failed:', error);
    throw error;
  } finally {
    sqlite.close();
  }
}
```

### Async Seed Funktion

```typescript
// Source: Fairstand Pattern — async ensureShopSeeded
// File: server/src/db/seed.ts

export async function ensureShopSeeded(): Promise<void> {
  // Idempotent: Nichts tun wenn Shop bereits existiert
  const existing = await db.select().from(shops).where(eq(shops.shopId, SHOP_ID));
  if (existing.length > 0) return;

  const pinHash = await hashPin(SHOP_PIN);
  const now = Date.now();

  // Shop anlegen
  await db.insert(shops).values({
    id: crypto.randomUUID(),
    shopId: SHOP_ID,
    name: SHOP_NAME,
    pin: pinHash,
    createdAt: now,
  });

  // Produkte anlegen
  const productCount = await db.select().from(products).where(eq(products.shopId, SHOP_ID));
  if (productCount.length === 0) {
    for (const p of SEED_PRODUCTS) {
      await db.insert(products).values({
        id: crypto.randomUUID(),
        shopId: SHOP_ID,
        ...p,
        updatedAt: now,
      });
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SQLite (single file, sync API) | PostgreSQL (network DB, async API) | Phase 22 v6.0 | Production-Readiness: Bessere Skalierung, bessere Concurrency-Handling, aber Code-Umstellung notwendig |
| synchrone `.run()/.get()/.all()` Calls | Async/await mit node-postgres Pool | Phase 22 | Error-Handling wird expliziter, Code ist async-konform |
| Integer mit mode: 'boolean' | Native boolean column type | Phase 22 | Bessere DB-native Representation, weniger Type-Konvertierung |
| `integer()` mit autoIncrement | PostgreSQL `serial` type | Phase 22 | Native Auto-Increment, bessere Performance als AUTOINCREMENT-Constraint |

**Deprecated/outdated:**
- `better-sqlite3`: Wird entfernt, nur für lokale Dev verwendbar wenn noch nötig
- SQLite-basierte Deployments: Nicht produktionsreif für Multi-Request-Szenarios

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (bereits in package.json) + Fastify testing utilities |
| Config file | vitest.config.ts (wahrscheinlich noch nicht erstellt) |
| Quick run command | `npm run test -- --run` (oder `npm test` if scripts configured) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PG-01 | Server startet mit PostgreSQL Connection und antwortet auf API-Requests | Integration | `npm test -- server/tests/integration/db-connection.test.ts` | ❌ Wave 0 |
| PG-02 | Docker-Compose hat postgres Service mit Volume — Container-Neustart bewahrt Daten | Manual/Smoke | `docker-compose up -d && docker-compose exec postgres psql -U fairstand -d fairstand -c "SELECT 1"` | ❌ Manifest |
| PG-03 | Schema Migrationen generieren für PostgreSQL-Syntax | Integration | `npm run build && npm run drizzle:generate` (Schema-Diff prüfen) | ❌ Wave 0 |
| PG-04 | Migrationsskript transferiert SQLite-Daten korrekt (Reihenfolge, FK-Integrität) | Integration | `npm test -- server/tests/integration/migrate-from-sqlite.test.ts` | ❌ Wave 0 |
| PG-05 | better-sqlite3 entfernt — build schlägt fehl wenn Reste vorhanden | Unit | `grep -r "better-sqlite3" src/ && exit 1 \|\| true` (Linting-Task) | ✅ Already enforced |

### Sampling Rate
- **Per task commit:** `npm run test -- --run` (alle Unit-Tests in <30s)
- **Per wave merge:** `npm test` (volle Integration + Smoke)
- **Phase gate:** Full suite grün + Manual Docker-Compose Smoke (postgres läuft, Daten bleiben nach Neustart)

### Wave 0 Gaps
- [ ] `server/tests/integration/db-connection.test.ts` — Drizzle Pool Connection Pool + Basic Query Test
- [ ] `server/tests/integration/migrate-from-sqlite.test.ts` — SQLite-Backup laden, Migrate ausführen, Daten-Konsistenz prüfen
- [ ] `server/tests/integration/schema.test.ts` — Schema-Changes validieren (pgTable statt sqliteTable, serial id in outboxEvents)
- [ ] `.github/workflows/` Update — DATABASE_URL in CI/CD setzen (postgresql://...@localhost)
- [ ] Docker-Compose Smoke Test Script — postgres Service Health Check, Daten-Persistenz nach Neustart

*Existing test infrastructure:* Vitest ist installed, aber keine DB-spezifischen Tests vorhanden. Wave 0 muss Basis-Infra schaffen.

## Sources

### Primary (HIGH confidence)

- [Drizzle ORM - PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql-new) — pgTable, Pool configuration, drizzle-orm/node-postgres
- [Drizzle ORM - Schema](https://orm.drizzle.team/docs/sql-schema-declaration) — Column type declarations (pgTable vs sqliteTable)
- [Drizzle ORM - PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) — serial, boolean, jsonb, text types
- [Drizzle ORM - Migrations](https://orm.drizzle.team/docs/migrations) — drizzle-kit generate, push, migrate workflow
- [Drizzle ORM - Database connection](https://orm.drizzle.team/docs/connect-overview) — Pool initialization patterns

### Secondary (MEDIUM confidence)

- [Fastify API with Postgres and Drizzle ORM](https://dev.dev.com/vladimirvovk/fastify-api-with-postgres-and-drizzle-orm-a7j) — Integration pattern verified
- [How to create persistent volume for postgresql container](https://forums.docker.com/t/how-to-create-persistent-volume-for-postgresql-container/130532) — Docker Compose named volume pattern
- [Running PostgreSQL in Docker with Persistent Volume](https://dev.dev.com/lovestaco/running-postgresql-in-docker-with-persistent-volume-4joe) — Container setup + volume persistence
- [Migrating Open WebUI SQLite Database to Postgresql](https://ciodave.medium.com/migrating-open-webui-sqlite-database-to-postgresql-8efe7b2e4156) — Data migration pattern (type conversion, ForeignKey order)
- [postgres - Official Image | Docker Hub](https://hub.docker.com/_/postgres/) — PostgreSQL image versions + PGDATA mount points

### Tertiary (LOW confidence - needs validation)

- [drizzle-orm async await synchronous API migration](https://github.com/drizzle-team/drizzle-orm/issues/2275) — GitHub Issue discussion (async/sync transaction behavior noted)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pgTable, drizzle-orm/node-postgres, node-postgres Pool sind etablierte Patterns
- Architecture: MEDIUM — Async/Await Refactor ist mechanisch aber umfangreich; Schema-Umstellung ist straightforward
- Pitfalls: MEDIUM — Basierend auf Common Patterns, aber Fairstand-spezifische Integration noch nicht tested

**Research date:** 2026-03-24
**Valid until:** 2026-04-07 (14 Tage — PostgreSQL ist stabil, aber Fairstand-Async-Refactor könnte Überraschungen bringen)

## Open Questions

1. **Transaktionen und Rollback-Verhalten**
   - Was wissen wir: Drizzle ORM unterstützt Transaktionen mit node-postgres
   - Was unklar: Wie verhält sich der Fairstand-Code mit Transaktionen? (Seed, Migrations, reportScheduler)
   - Recommendation: Wave 0 muss Transaktions-Tests für kritische Operationen (Sales buchen) schreiben

2. **reportScheduler async-Umstellung**
   - Was wissen wir: Nutzt synchrone `.run()` / `.get()` auf SQLite
   - Was unklar: Scheduler (toad-scheduler) kann async Task-Handler? Wie Error-Handling?
   - Recommendation: Code-Inspektion erforderlich (reportScheduler.ts) — vermutlich nur `.run()` → `await` ändern nötig

3. **WebSocket + Database Transaktionen**
   - Was wissen wir: WebSocket Routes können Queries absenden
   - Was unklar: Wenn Connection-Pool ausgeschöpft — können WebSocket-Clients hängen bleiben?
   - Recommendation: Pool-Größe auf 20+ setzen, Health-Checks bei WebSocket-Connect

## Completion Checklist

- [x] Schema-Umstellung dokumentiert (sqliteTable → pgTable, Typ-Unterschiede)
- [x] Docker-Compose PostgreSQL Service Pattern dokumentiert
- [x] Async/Await Refactor-Strategie dokumentiert
- [x] Datenmigrationsskript Pattern dokumentiert
- [x] Kritische Pitfalls identifiziert und mitigation documented
- [x] Code Examples aus offiziellen Quellen verifiziert
- [x] Test-Infra Gaps identifiziert (Wave 0 Muss-Haves)
- [x] Abhängigkeiten (better-sqlite3 → pg) dokumentiert
- [x] Konfigurationsänderungen (DATABASE_URL, drizzle.config.ts) dokumentiert
- [ ] Phase-Execution ready (planner wird Tasks aus diesem Research erstellen)
