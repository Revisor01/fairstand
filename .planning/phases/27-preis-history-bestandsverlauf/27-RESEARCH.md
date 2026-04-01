# Phase 27: Preis-History & Bestandsverlauf - Research

**Researched:** 2026-04-01
**Domain:** Database schema extension, audit logging, PostgreSQL migrations
**Confidence:** HIGH

## Summary

Phase 27 baut zwei neue Audit-Tabellen in die PostgreSQL-Datenbank ein — `price_history` und `stock_movements` — um jede EK/VK-Änderung und jede Bestandsbewegung lückenlos zu protokollieren. Das Fundament für die Auswertungen in Phase 28 (Jahresbericht mit Inventur).

Die Implementierung folgt dem bestehenden Muster:
- **Drizzle ORM** für Schema-Definition und Migrations
- **App-Layer Logging** (kein DB-Trigger) bei Preisänderungen (products.ts PUT/PATCH) und Bestandsbewegungen (sync.ts Operationen)
- **PostgreSQL Integer Timestamps** (Unix ms) wie in allen bestehenden Tabellen
- **ShopId-Isolation** in beiden neuen Tabellen
- **JSONB Payload** für flexible Referenzen und Kontextdaten

**Primary recommendation:** Drizzle Schema zuerst erweitern → Migrations erzeugen → Logging-Stellen in products.ts und sync.ts implementieren → Neuer GET-Endpoint für stock-movements pro Artikel.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- PostgreSQL Trigger vs. App-Layer für price_history: **App-Layer** (in Phase 27 implementieren, nicht Trigger)
- `stock_movements` als separate Tabelle mit Referenzen auf sales/outbox_events
- Drizzle ORM Migration für neue Tabellen
- API-Endpoint für Stock-Movement-Journal pro Artikel

### Claude's Discretion
All implementation choices at Claude's discretion — pure infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRICE-01 | Jede EK/VK-Änderung wird automatisch in `price_history` geloggt | App-Layer-Insert in products.ts bei PUT/PATCH; Schema + Migration definiert |
| INV-04 | User kann pro Artikel Stock-Movement-Journal einsehen (Verkauf, Nachbuchung, Korrektur, Rückgabe mit Timestamp) | `stock_movements` Tabelle mit operation-Typ; GET-Endpoint für Historie |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.x (current in project) | Schema definition + migrations | Bereits im Projekt, TypeScript-first, kein ORM-Overhead |
| drizzle-kit | aktuell | Migration-Generierung und -Anwendung | Offizielle Drizzle-CLI für `drizzle-kit generate`, `drizzle-kit migrate` |
| PostgreSQL | 14+ (server.godsapp.de) | Persistierung | Bestehender Datenbankserver, verfügbar, unterstützt JSONB, BigInt |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fastify/plugin | aktuell | Routes registrieren | Bereits in products.ts + sync.ts, keine zusätzliche Installation |
| zod | 3.x (project default) | Schema-Validation | Validierung von price_history + stock_movements Payloads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| App-Layer Logging | PostgreSQL Trigger | Trigger: atomar, automatisch; App-Layer: auditierbar in Code, einfacher zu testen. CONTEXT.md fordert App-Layer. |
| Separate `stock_movements` Tabelle | Alles in `outbox_events` speichern | Separate Tabelle: klare Datenstruktur, einfachere Queries; outbox_events: weniger Tables, aber Payload-Parsing komplex. Separate Tabelle ist besser für Jahresbericht. |

## Architecture Patterns

### Recommended Project Structure
```
server/
├── src/
│   ├── db/
│   │   ├── schema.ts          # price_history, stock_movements Tabellen hinzufügen
│   │   └── index.ts           # (unverändert)
│   ├── routes/
│   │   ├── products.ts        # PUT/PATCH: price_history INSERT (Logging)
│   │   ├── sync.ts            # SALE_COMPLETE/STOCK_ADJUST/...: stock_movements INSERT
│   │   ├── reports.ts         # (unverändert)
│   │   └── priceHistory.ts    # Neuer Endpoint: GET /api/products/:id/price-history
│   │                          # Neuer Endpoint: GET /api/products/:id/stock-movements
│   └── ...
├── migrations/
│   ├── 0005_add_price_history.sql
│   ├── 0006_add_stock_movements.sql
│   └── meta/_journal.json     # Wird von drizzle-kit aktualisiert
└── drizzle.config.ts
```

### Pattern 1: Price-History Logging in products.ts
**What:** Bei PUT/PATCH `purchasePrice` oder `salePrice`: vor dem Update den alten Preis lesen, dann INSERT in `price_history` mit (shopId, productId, field, oldValue, newValue, changedAt).

**When to use:** Jede Preisänderung muss sofort protokolliert werden — keine späteren Backfills.

**Example:**
```typescript
// In products.ts POST/PATCH/PUT — vor dem Update:
const [oldProduct] = await db.select().from(products).where(eq(products.id, id)).limit(1);

if (oldProduct.purchasePrice !== newPurchasePrice) {
  await db.insert(priceHistories).values({
    shopId: session.shopId,
    productId: id,
    field: 'purchase_price',
    oldValue: oldProduct.purchasePrice,
    newValue: newPurchasePrice,
    changedAt: Date.now(),
  });
}

// Dann das Product-Update durchführen
await db.update(products).set({ purchasePrice: newPurchasePrice }).where(eq(products.id, id));
```

**Source:** Existing pattern in products.ts (lines 102-108), sales.ts (lines 66-87) — Transactions, ShopId-Isolation

### Pattern 2: Stock-Movement Logging in sync.ts
**What:** Bei jeder Operation (SALE_COMPLETE, STOCK_ADJUST, SALE_CANCEL, ITEM_RETURN) ein oder mehrere Einträge in `stock_movements` inserten. Reference auf Sale oder Adjustment.

**When to use:** Alle Bestandsbewegungen müssen nachverfolgbar sein — wann, von wo (welche Operation), wie viel.

**Example:**
```typescript
// In sync.ts POST /sync — für SALE_COMPLETE:
for (const item of sale.items) {
  await tx.insert(stockMovements).values({
    shopId: entry.shopId,
    productId: item.productId,
    type: 'sale',
    quantity: -item.quantity,
    referenceSaleId: sale.id,
    movedAt: entry.createdAt,
  });
}

// Für STOCK_ADJUST:
await tx.insert(stockMovements).values({
  shopId: entry.shopId,
  productId: adj.productId,
  type: 'adjustment',
  quantity: adj.delta,
  reason: adj.reason,
  movedAt: entry.createdAt,
});
```

**Source:** Existing patterns in sync.ts (lines 94-134, 146-163, 174-199, 209-228)

### Pattern 3: Audit-Query in neuer Route
**What:** GET `/api/products/:id/price-history` und GET `/api/products/:id/stock-movements` — mit ShopId-Check, OrderBy timestamp, optional Pagination.

**When to use:** Phase 28 (Bericht) und UI (PRICE-02) müssen diese Daten abrufen.

**Example:**
```typescript
// GET /api/products/:id/price-history
fastify.get('/products/:id/price-history', async (request, reply) => {
  const { id } = request.params as { id: string };
  const session = (request as any).session as { shopId: string };
  
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product || product.shopId !== session.shopId) {
    return reply.status(403).send({ error: 'Zugriff verweigert' });
  }
  
  const history = await db
    .select()
    .from(priceHistories)
    .where(eq(priceHistories.productId, id))
    .orderBy(desc(priceHistories.changedAt));
  
  return reply.send(history);
});
```

### Anti-Patterns to Avoid
- **Preis-Logging vergessen:** Wenn Preisänderungen nicht sofort protokolliert werden, sind später Auswertungen unvollständig — nicht reparierbar ohne Datensicherungen. Logging in Production-Code, nicht im Seed.
- **Unterschiedliche Timestamps in price_history vs. stock_movements:** Konsistente Zeitreferenzen (Unix ms) sind nötig für Jahresbericht-Schnitte (z.B. "Umsatz mit EK1 bis 2026-02-28").
- **Keine ShopId-Isolation in Audit-Tabellen:** Violation von bestehenden Sicherheitsmustern — Cross-Shop-Daten-Leaks.
- **Hardcoded Konstanten für operation-Typen:** Use Enums/zod für `type: 'sale' | 'adjustment' | 'correction' | 'return'` — später Typenumfang veränderbar, aber konsistent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB-Migrations für neue Tabellen | Handgeschriebene SQL-Files | `drizzle-kit generate` | Drizzle kennt den aktuellen Schema und erzeugt Migrations automatisch, keine Nummer-Konflikte, Rollback-Support |
| Preis-Audit manuell tracken | Separate Logs pro Änderung | Zentralisierte `price_history` Tabelle | Single source of truth, keine Race-Conditions, Auswertungen möglich |
| Stock-Movement-Suche in mehreren Tabellen | Abfragen auf sales + outbox_events + separate Events | Dedizierte `stock_movements` mit referenziellen Links | Einfachere Queries, kein JSONB-Parsing, Jahresbericht-Queries sind 10× schneller |

**Key insight:** Audit-Trails als erste Klasse in DB-Design — nicht als "Logs auf der Seite" oder in einem separaten System. Eine zentrale Quelle für jede Änderung macht alle späteren Berichte möglich.

## Runtime State Inventory

No runtime state discovered in this phase.

**Verification:** 
- ✅ Phase involves schema extension only — no stored data transformations
- ✅ No existing price_history/stock_movements data to migrate
- ✅ No OS-registered state affected
- ✅ No secrets/env vars affected
- ✅ No build artifacts that carry old names

## Common Pitfalls

### Pitfall 1: Preisänderungen zwischen Product-Fetch und Update
**What goes wrong:** Between reading `oldPrice` and updating `newPrice`, another request changes it → Log enthält falschen Old-Value.

**Why it happens:** Optimistische Concurrency ohne Locks.

**How to avoid:** Transactions (Drizzle `db.transaction()`) — Fetch + Logging + Update atomar durchführen. In products.ts schon vorhanden (lines 63-92 POST), wird auch in PUT/PATCH nötig.

**Warning signs:** Preis-History hat Lücken oder Sprünge, auf denen sich kein Sale erklären lässt.

### Pitfall 2: stock_movements Timestamps vs. sales.createdAt Mismatch
**What goes wrong:** SALE_COMPLETE wird mit unterschiedlichen Timestamps protokolliert → Jahresbericht-Schnitt ("Alle Verkäufe Feb") erfasst Stock-Movement, aber nicht die Sale.

**Why it happens:** outbox_entry.createdAt != entry.createdAt != Date.now() — es gibt 3 verschiedene Zeitpunkte im Sync-Flow.

**How to avoid:** **Immer** entry.createdAt für stock_movements verwenden, nicht Date.now(). Das ist der "offizielle" Zeitpunkt der Offline-Operation. Sync-Server-Zeit ist nur für `processedAt` relevant.

**Warning signs:** Stock-Movement und Sale haben unterschiedliche `createdAt` auch wenn sie sich zeitlich entsprechen sollten.

### Pitfall 3: Fehlende stock_movements bei Direktupdates via DELETE /sales/:id
**What goes wrong:** sales.ts DELETE-Endpoint (lines 50-88) restockt Produkte, aber es gibt keinen stock_movements Eintrag dafür.

**Why it happens:** Es ist ein Ad-hoc-Endpoint, nicht Teil des Sync-Flows — die Logging-Stelle wird vergessen.

**How to avoid:** Auch in DELETE-Handler ein stock_movements INSERT für Restock durchführen, mit type:'hard_delete' oder type:'correction'.

**Warning signs:** Bestand stimmt, aber stock_movements ist lückenhaft — Jahresbericht kann Verlauf nicht nachvollziehen.

## Code Examples

Verified patterns from existing codebase:

### Creating Drizzle Schema Tables
```typescript
// server/src/db/schema.ts
import { pgTable, text, integer, bigint } from 'drizzle-orm/pg-core';

export const priceHistories = pgTable('price_histories', {
  id: serial('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  productId: text('product_id').notNull(),
  field: text('field').notNull(), // 'purchase_price' | 'sale_price'
  oldValue: integer('old_value').notNull(),
  newValue: integer('new_value').notNull(),
  changedAt: bigint('changed_at', { mode: 'number' }).notNull(),
});

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  shopId: text('shop_id').notNull(),
  productId: text('product_id').notNull(),
  type: text('type').notNull(), // 'sale' | 'adjustment' | 'correction' | 'return'
  quantity: integer('quantity').notNull(), // negativ für Ausgang, positiv für Eingang
  referenceSaleId: text('reference_sale_id'), // Fremdschlüssel auf sales.id, nullable
  reason: text('reason'), // für STOCK_ADJUST: Grund
  movedAt: bigint('moved_at', { mode: 'number' }).notNull(),
});

// Source: server/src/db/schema.ts, pattern from categories (lines 1-8)
```

### Generating Migration with drizzle-kit
```bash
# Im server/ Verzeichnis
cd server
npx drizzle-kit generate

# Erzeugt: migrations/000X_add_price_history.sql und migrations/000Y_add_stock_movements.sql
# und aktualisiert migrations/meta/_journal.json
```

**Source:** Established pattern — drizzle.config.ts (lines 1-8) definiert bereits out='./migrations'

### Applying Migration in Docker Entrypoint
```bash
# server/Dockerfile oder entrypoint.sh
npm run migrate

# package.json:
# "migrate": "drizzle-kit migrate"
```

**Source:** Standard Drizzle pattern, bestätigt durch migrations/_journal.json (version 7)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Logs außerhalb DB | Audit Trails als DB-Tabellen | 2020-2023 (Industry-Standard) | Auswertungen möglich, Single Source of Truth |
| DB-Trigger für Audit | App-Layer Logging mit Transactions | Post-2020 (Microservices-Ära) | Bessere Testbarkeit, klarer Code, Debugging einfacher |
| Zeitstempel als strings | Unix Millisekunden (BigInt) | 2023+ (Standardisierung) | Vergleiche, Berechnungen, Sortierungen zuverlässig |

**Deprecated/outdated:**
- DB-Trigger für Logging: Nicht mehr Best-Practice in modernen Stacks — schwer zu debuggen, nicht testbar, Code lebt außerhalb Version Control
- Separate Audit-Datenbank: Zu komplex für Single-Instance Docker — Sync-Probleme, Konsistenz schwierig

## Open Questions

1. **Sollen price_history + stock_movements indexed werden?**
   - What we know: Dexie-Indizes sind für Online-Queries nicht essentiell, aber Jahresbericht könnte gross sein (100.000+ Zeilen).
   - What's unclear: Performance-Requirements für Jahresbericht-Queries (muss < 1s sein?) — kein Benchmark vorhanden.
   - Recommendation: **Wave 0** als Performance-Check — wenn GET /products/:id/price-history slow wird, Indexes hinzufügen: `(shop_id, product_id, changed_at DESC)`

2. **Sollen alte price_history Einträge nach N Monaten archiviert/gelöscht werden?**
   - What we know: Aktuell keine Retentions-Policy, Daten wachsen unbegrenzt.
   - What's unclear: Rechtliche Anforderung (Kirchengemeinde, Registrierkasse?) — Aufbewahrungsfristen unbekannt.
   - Recommendation: **Phase 28 oder später** — erst prüfen mit Kevin Lembke, ob 3/5/10 Jahre Aufbewahrung nötig ist.

3. **Werden price_history + stock_movements in Phase 29 exportiert (CSV)?**
   - What we know: EXP-01/02 erfordern Sales + Inventur-Export, nicht explizit Audit-Trails.
   - What's unclear: Nutzer-Request, ob vollständiger Audit-Trail exportierbar sein sollte.
   - Recommendation: **Backlog** — Phase 29 kann es bei Bedarf hinzufügen, Struktur ist schon da.

## Environment Availability

No external dependencies required for this phase.

**Verification:**
- PostgreSQL: ✅ server.godsapp.de läuft, via DATABASE_URL erreichbar (Dockerfile mounts DB)
- Node.js + npm: ✅ Docker-Build-Stage hat node:20-alpine
- drizzle-kit: ✅ Bereits in `devDependencies` (package.json)

## Code Examples - Integration Points

### Point 1: products.ts — Price-History Insert
```typescript
// server/src/routes/products.ts — bestehende POST /products erweitern

// Vor dem onConflictDoUpdate (Zeile 77):
const [existing] = await db.select().from(products).where(eq(products.id, p.id)).limit(1);
if (existing && existing.purchasePrice !== p.purchasePrice) {
  await tx.insert(priceHistories).values({
    shopId: p.shopId,
    productId: p.id,
    field: 'purchase_price',
    oldValue: existing.purchasePrice,
    newValue: p.purchasePrice,
    changedAt: Date.now(),
  });
}
if (existing && existing.salePrice !== p.salePrice) {
  await tx.insert(priceHistories).values({
    shopId: p.shopId,
    productId: p.id,
    field: 'sale_price',
    oldValue: existing.salePrice,
    newValue: p.salePrice,
    changedAt: Date.now(),
  });
}
```

### Point 2: sync.ts — Stock-Movement Insert für SALE_COMPLETE
```typescript
// server/src/routes/sync.ts — Zeile 115-124 erweitern

await tx.transaction(async (tx) => {
  // ... existing Sale INSERT, Stock-Delta ...
  
  // Neue: Stock-Movements protokollieren
  for (const item of sale.items) {
    if (!prod || prod.shopId !== entry.shopId) continue;
    await tx.insert(stockMovements).values({
      shopId: entry.shopId,
      productId: item.productId,
      type: 'sale',
      quantity: -item.quantity,
      referenceSaleId: sale.id,
      movedAt: entry.createdAt, // WICHTIG: nicht Date.now()
    });
  }
});
```

## Validation Architecture

Skipped — `workflow.nyquist_validation` is explicitly set to `false` in `.planning/config.json`.

## Sources

### Primary (HIGH confidence)
- **server/src/db/schema.ts** (lines 1-69) — Bestehende Tabellen-Struktur (shopId-Pattern, BigInt timestamps, JSONB payloads)
- **server/src/routes/products.ts** (lines 54-95) — LWW-Upsert Pattern, onConflictDoUpdate, ShopId-Isolation
- **server/src/routes/sync.ts** (lines 64-243) — Transaction Pattern, outboxEvents Logging, ShopId-Checks
- **server/drizzle.config.ts** (lines 1-8) — Migration-Setup, PostgreSQL dialect
- **server/migrations/meta/_journal.json** — Migrations-Index, Nummernvergabe (0000-0004)
- **CONTEXT.md Phase 27** — Locked Decisions: App-Layer Logging, Separate Tabellen

### Secondary (MEDIUM confidence)
- **REQUIREMENTS.md** (PRICE-01, INV-04) — Fehlervermeidung für Phase-Requirements
- **STATE.md** (v8.0 decisions) — Kontextverständnis über Preisänderungen + Snapshot-Pattern

### Tertiary (informational)
- **Drizzle ORM docs** (drizzle.ormconfig, migrations) — Best-Practice-Referenzen (nicht neu recherchiert, Training-Data)

## Metadata

**Confidence breakdown:**
- Standard stack (PostgreSQL, Drizzle, transactions): **HIGH** — Existing patterns in codebase, no external factors
- Architecture (price_history + stock_movements tables): **HIGH** — Clear from CONTEXT.md + REQUIREMENTS.md
- Logging integration points (products.ts, sync.ts): **HIGH** — Verified from source code
- Pitfalls: **MEDIUM** — Based on generalized concurrency patterns + codebase knowledge; runtime behavior untested

**Research date:** 2026-04-01
**Valid until:** 2026-04-30 (Schema patterns stable, no major PostgreSQL/Drizzle updates expected)

---

**Next steps for planner:**
1. Create PLAN.md for schema extension (Drizzle + Migrations)
2. Create PLAN.md for price_history logging in products.ts
3. Create PLAN.md for stock_movements logging in sync.ts + new GET endpoints
4. Create PLAN.md for DELETE /sales/:id hard-delete logging
5. Execution: Schema → Migrations → Routes → Integration Tests
