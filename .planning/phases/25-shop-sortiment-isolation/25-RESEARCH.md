# Phase 25: Shop-Sortiment-Isolation - Research

**Researched:** 2026-03-25
**Domain:** Multi-shop data isolation, row-level security via session context, offline-first consistency
**Confidence:** HIGH

## Summary

Phase 25 ist eine **Audit- und Isolation-Phase**: Alle bestehenden API-Endpunkte müssen konsequent nach `shopId` aus der Session filtern, damit jeder Shop sein vollständig unabhängiges Sortiment hat. Der Code-Skeleton existiert bereits (alle Tabellen haben `shopId`-Spalten, Session-Middleware ist etabliert), aber **nicht alle Routes filtern konsequent**. Diese Phase liefert die vollständige Row-Level-Security-Implementierung.

Die technische Strategie ist bewährt: Session-Middleware injiziert `shopId` → Route-Handler extrahieren `shopId` aus Session (nicht aus Request-Body) → Drizzle ORM WHERE-Clauses filtern konsequent → WebSocket broadcast ist bereits shopId-spezifisch.

**Primary recommendation:** Audit-getriebene Implementierung: Jede Route PATCH/GET/DELETE/POST erhält systematisch WHERE-Klauseln. Service-Worker und Dexie.js brauchen minimale Änderungen (shopId ist bereits in offline-Daten vorhanden).

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Daten-Isolation Strategie:** Neuer Shop startet leer — jeder Shop baut sein Sortiment selbst auf (per PDF-Import oder manuell)
- **Session-Middleware:** Injiziert shopId → Route-Handler bekommen shopId aus Session, nie aus Request-Body/Query
- **API & Routing:** Bestehende Endpunkte reichen — products, categories, sales, reports filtern bereits nach shopId aus Session
- **Server-seitige WHERE-Clause:** Auf shopId bei jedem GET/PATCH/DELETE — shopId kommt immer aus Session
- **PDF-Import:** Setzt shopId automatisch aus der Session auf alle neuen Produkte
- **Client-seitige Isolation:** Minimale Client-Änderungen — Server filtert bereits, Client zeigt was Server liefert

### Claude's Discretion

- Reihenfolge der Route-Überprüfungen (welche Routes zuerst shopId-Audit bekommen)
- Ob bestehende Seed-Daten (St. Secundus Produkte) explizit eine shopId bekommen oder schon haben
- Fehlermeldungen bei Cross-Shop-Zugriffsversuchen

### Deferred Ideas (OUT OF SCOPE)

- SCALE-01: Report-Scheduler über alle Shops (Future Requirement)
- CROSS-01: Master-Admin übergreifende Berichte (Future Requirement)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHOP-04 | Jeder Shop hat ein eigenes, unabhängiges Sortiment (eigene Produkte, Preise, Bestand) | **Audit Pattern etabliert:** Alle Tabellen (products, categories, sales, settings) haben shopId-Spalte. Routes filtern bereits teilweise nach shopId. |
| SELF-01 | Nach PIN-Login verwaltet jeder Shop seine eigenen Produkte | **Products-Route:** GET /products filtern nach session.shopId. POST /products validiert request.shopId gegen session.shopId (Zeile 60-62). PATCH /products/:id/deactivate braucht shopId-Validierung. |
| SELF-02 | Jeder Shop sieht nur seine eigenen Berichte | **Reports-Route:** GET /reports/monthly und /reports/yearly filtern bereits nach session.shopId. Keine Änderungen nötig. |
| SELF-03 | PDF-Import erstellt Produkte im jeweiligen Shop-Sortiment | **Import-Route:** POST /import/parse gibt Rows zurück, aber shopId-Assignment fehlt. Muss im Frontend beim Commit hinzugefügt werden. |

## Standard Stack

### Core (Already in Place)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | 5.7.x | Backend-API Framework | TypeScript-nativ, Request-Context (Session-Middleware) an allen Routes verfügbar |
| Drizzle ORM | aktuell | Typsicheres Schema + SQL WHERE-Clauses | `where(eq(table.shopId, shopId))` Pattern ist simpel und vertraut |
| PostgreSQL | aktuell | Serverseitige Datenbank | Multi-Shop-Isolation via SQL WHERE ist die Standard-Strategie bei PostgreSQL |
| TanStack Query | 5.x | Frontend Server-State + Offline-Awareness | `networkMode: 'offlineFirst'` + Hooks sind bereits implemented |
| Dexie.js | 4.3.0 | Lokale Offline-Datenbank | `shopId` ist bereits in jedem lokalen Record vorhanden |
| Workbox (via vite-plugin-pwa) | 7.4.0 | Service Worker Background Sync | Broadcast-Pattern ist shopId-bewusst (`broadcast({ type: '...', shopId })`) |

### Session Security Pattern

| Component | Implementation | Purpose |
|-----------|-----------------|---------|
| Session-Middleware | `lib/sessions.ts` → token → shopId Lookup | Injiziert shopId in Request-Context |
| Request Validation | `request.session.shopId` in Route-Handler | Atomare Quelle der Wahrheit für User-Identität |
| Zod Validation | ProductSchema.shopId überprüft gegen session.shopId | Client kann falsche shopId senden → Validierung blockiert |

## Architecture Patterns

### Established: Row-Level Security via Session Injection

**What:** Session-Middleware liest `token` aus Request Header, schlägt shopId nach, speichert in `request.session.shopId`. Route-Handler nutzen diese shopId für alle Queries.

**When to use:** Alle GET/POST/PATCH/DELETE Routes ohne Exception

**Example (Products Route — already implemented):**

```typescript
// server/src/routes/products.ts Zeile 46-50
fastify.get('/products', async (request, reply) => {
  const session = (request as any).session as { shopId: string };
  const shopId = session.shopId;
  const rows = await db.select().from(products).where(eq(products.shopId, shopId));
  return reply.send(rows);
});

// server/src/routes/products.ts Zeile 58-62 (POST validation)
if (p.shopId !== session.shopId) {
  return reply.status(403).send({ error: 'Zugriff verweigert: falsche shopId' });
}
```

### Established: WebSocket Broadcast per Shop

**What:** `broadcast({ type: 'products_changed', shopId: session.shopId })` sendet Invalidierungs-Signal nur an Clients desselben Shops.

**When to use:** Nach jeder Mutation (INSERT/UPDATE/DELETE)

**Example (from websocket.ts Zeilen 18-27):**

```typescript
export function broadcast(msg: BroadcastMessage): void {
  const conns = clients.get(msg.shopId);
  if (!conns) return;
  const payload = JSON.stringify(msg);
  for (const ws of conns) {
    if (ws.readyState === 1) ws.send(payload);
  }
}
```

### Established: Offline-First Consistency (Dexie.js)

**What:** Dexie speichert Produkte lokal mit `shopId`-Feld. Service Worker queued Requests mit shopId. Bei Reconnect wird shopId automatisch validiert.

**When to use:** Frontend-Sync: Niemals Cross-Shop-Daten mergen

**Implementation Notes:**
- Dexie-Schema bereits shopId-aware
- TanStack Query `networkMode: 'offlineFirst'` nutzt lokale Cache
- Service Worker queued `{ shopId, operation, payload }`

### Expected Implementation Pattern (Audit-Phase)

**Route Audit Checklist:**

```
Per Route (GET, POST, PATCH, DELETE):
1. Extract: const session = (request as any).session as { shopId: string };
2. Filter: WHERE eq(table.shopId, session.shopId)
3. Validate: If request.body contains shopId, assert p.shopId === session.shopId (403)
4. Broadcast: broadcast({ type: '..._changed', shopId: session.shopId })
```

**Routes to Audit (from .planning/phases/25-shop-sortiment-isolation/25-CONTEXT.md):**

| File | GET | POST | PATCH | DELETE | Status |
|------|-----|------|-------|--------|--------|
| routes/products.ts | ✅ Filtered | ✅ Validated | ❓ Audit | ❓ Audit | Partial |
| routes/categories.ts | ✅ Filtered | ✅ Scoped | ✅ Validated | ❓ Audit | Partial |
| routes/sales.ts | ✅ Filtered | — | — | — | Complete |
| routes/reports.ts | ✅ Filtered | — | — | — | Complete |
| routes/settings.ts | ✅ Filtered | ✅ Scoped | ❓ Audit | — | Partial |
| routes/sync.ts | — | ✅ Validated | — | — | Complete |
| routes/import.ts | POST /import/parse | shopId-Assignment fehlt | — | — | **Needs Work** |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request-level shopId extraction | Custom middleware that reads cookies/headers and looks up shopId | `request.session.shopId` (already provided by Fastify auth plugin) | Bereits etabliert, keine Reinvention nötig |
| Per-shop data caching | Custom in-memory cache per shopId | TanStack Query `networkMode: 'offlineFirst'` + Dexie.js | Query-Caching und Offline-Persistence löst das eleganter |
| Cross-shop data merging | Manual JOIN/filtering logic | `where(eq(table.shopId, sessionShopId))` in Drizzle | ORM WHERE-Clauses sind atomare Quelle der Wahrheit |
| Service Worker request queueing | Custom IndexedDB queue | Workbox `background-sync` (via vite-plugin-pwa) | Workbox ist battle-tested, Retry-Logik ist robust |

**Key insight:** Phase 25 ist **nicht** ein Feature-Build. Es ist ein Audit-Phase, die bestehende Patterns konsequent durchsetzt. Keine neuen Libraries, keine neuen Abstraktionen — nur systematische Anwendung von `where(eq(table.shopId, sessionShopId))` auf alle Routes.

## Runtime State Inventory

### Stored Data

**Dexie.js (Client-seitig):**
- `products` → bereits shopId-aware (lokal gecacht mit shopId-Feld)
- `sales` → bereits shopId-aware (lokal synchronisierte Transaktionen mit shopId)
- `settings` → bereits shopId-aware

**PostgreSQL (Server-seitig):**
- `products` → shopId-Spalte existiert, Seed-Daten für St. Secundus müssen shopId haben
- `categories` → shopId-Spalte existiert
- `sales` → shopId-Spalte existiert
- `settings` → shopId-Spalte existiert
- `outboxEvents` → shopId-Spalte existiert

**Action:** Seed-Daten überprüfen (server/src/db/seed.ts) — alle Produkte für St. Secundus brauchen den korrekten shopId. Falls bereits da: keine Änderungen nötig.

### Live Service Config

**Session Store (lib/sessions.ts):**
- Speichert token → shopId mapping im Memory
- Bei App-Neustart: alle Sessions verloren (akzeptabel für diese Phase)
- Falls persistent Session-Storage geplant ist (Phase 26+): hier anpassen

**WebSocket Clients (routes/websocket.ts):**
- `Map<shopId, Set<WebSocket>>` — pro Shop getrennte Connection-Pools
- Keine Migration nötig — Pattern ist bereits shopId-scoped

**Action:** Keine — bereits correct implementiert.

### OS-Registered State

**None identified** — PWA läuft im Browser, kein OS-Level State.

### Secrets & Env Vars

**None specific to Phase 25.** Session-Token wird in-Memory gehalten, PIN-Hashes sind in DB.

### Build Artifacts

**Dexie.js IndexedDB:**
- Lokale Datenbank ist per Browser-Origin — nicht per Shop
- Nach Login wird `setShopId(session.shopId)` aufgerufen
- Bei Logout wird `setShopId('')` aufgerufen
- **Keine Migration nötig** — shopId ist bereits im Dexie-Schema vorhanden

**Action:** None.

## Common Pitfalls

### Pitfall 1: Forgetting WHERE-Clause on UPDATE/PATCH

**What goes wrong:** `await db.update(products).set({ stock: 100 })` ohne WHERE-Clause updatet ALLE Produkte aller Shops.

**Why it happens:** Drizzle ORM erlaubt `.update()` ohne WHERE — das ist absichtlich (für Bulk-Ops), aber gefährlich bei row-level security.

**How to avoid:** **Always include WHERE shopId** in update/delete. TypeScript-Trick:
```typescript
// Falsch (gefährlich):
await db.update(products).set({ stock: 100 });

// Richtig:
await db.update(products)
  .set({ stock: 100 })
  .where(eq(products.shopId, shopId));
```

**Warning signs:**
- Audit-Test: Zwei unterschiedliche Shops, ein Update in Shop A → Check ob Shop B betroffen ist
- DB-Query-Log zeigt WHERE-Clause ohne shopId-Bedingung

### Pitfall 2: Validating shopId in Request-Body but Ignoring Mismatch

**What goes wrong:**
```typescript
const p = ProductSchema.safeParse(request.body);
// p.shopId könnte anders sein als session.shopId — wird aber ignoriert
```

**Why it happens:** Frontend sendet möglicherweise falsche shopId (Bug oder Angriff).

**How to avoid:** **Explicit validation before using request data:**
```typescript
if (p.shopId !== session.shopId) {
  return reply.status(403).send({ error: 'Zugriff verweigert' });
}
```

**Warning signs:**
- Zod validation akzeptiert shopId-Feld, aber Handler nutzt nicht.
- Fehlende 403-Responses in Test-Coverage.

### Pitfall 3: Broadcast to Wrong shopId

**What goes wrong:**
```typescript
// Falsch: hardcoded oder ignoring shopId
broadcast({ type: 'products_changed' }); // shopId fehlt!

// Clients von Shop B werden auch notifiziert — falsche Invalidierung
```

**Why it happens:** Copy-Paste oder Vergessenheit bei den ersten Implementierungen.

**How to avoid:** **Immer `shopId` aus Session in Broadcast mitnehmen:**
```typescript
broadcast({ type: 'products_changed', shopId: session.shopId });
```

**Warning signs:**
- Shop A macht einen Update → Shop B's UI invalidiert sich auch
- WebSocket-Tests zeigen falsche Broadcasting-Muster

### Pitfall 4: Offline-Sync mit Cross-Shop-Produkten

**What goes wrong:** Service Worker queued offline einen Sale mit Produkt von Shop A, aber Client ist inzwischen in Shop B eingeloggt → Sync schlägt fehl oder produziert Datenmüll.

**Why it happens:** Dexie speichert alle Shops' Daten lokal (for offline-resilience), aber Sync validiert zu spät.

**How to avoid:** **In Sync-Handler shopId validieren:**
```typescript
for (const entry of result.data.entries) {
  if (entry.shopId !== session.shopId) {
    return reply.status(403).send({ error: 'shopId mismatch' });
  }
}
```

**Warning signs:**
- Offline-Sync-Tests mit mehreren Shops gleichzeitig
- Unerwartete 403-Fehler bei Reconnect nach Shop-Wechsel

### Pitfall 5: Not Filtering Seed Data

**What goes wrong:**
```typescript
// seed.ts fügt Produkte ohne shopId ein
INSERT INTO products (id, name, ...) VALUES ('1', 'Kaffee', ...)
// → Produkte gehören zu keinem Shop
```

**Why it happens:** Seed-Daten wurden vor Multi-Shop-Requirement geschrieben.

**How to avoid:** **Seed-Daten enthalten immer shopId — für St. Secundus (Master-Shop):**
```typescript
await db.insert(products).values({
  id: 'product-1',
  shopId: masterShopId, // ← Explicit!
  name: 'Kaffee',
  // ...
});
```

**Warning signs:**
- Nach Seed laufen: `SELECT COUNT(*) FROM products WHERE shop_id IS NULL;` → Sollte 0 sein
- Reports zeigen unerwartete Produkte ohne Clear-Shop-Zuordnung

## Code Examples

Verified patterns from codebase:

### Pattern 1: GET with Shop Filtering (Established)

```typescript
// Source: server/src/routes/products.ts Zeile 46-50
fastify.get('/products', async (request, reply) => {
  const session = (request as any).session as { shopId: string };
  const shopId = session.shopId;
  const rows = await db.select().from(products).where(eq(products.shopId, shopId));
  return reply.send(rows);
});
```

### Pattern 2: POST with shopId Validation (Established)

```typescript
// Source: server/src/routes/products.ts Zeile 54-62
fastify.post('/products', async (request, reply) => {
  const result = ProductSchema.safeParse(request.body);
  if (!result.success) return reply.status(400).send({ error: result.error.flatten() });
  const p = result.data;
  const session = (request as any).session as { shopId: string };

  // ← CRITICAL: Validate shopId match
  if (p.shopId !== session.shopId) {
    return reply.status(403).send({ error: 'Zugriff verweigert: falsche shopId' });
  }

  await db.insert(products).values({ /* ... shopId: p.shopId ... */ });
  reply.status(201).send({ ok: true });
  broadcast({ type: 'products_changed', shopId: session.shopId }); // ← shopId mitgeben
});
```

### Pattern 3: PATCH with Shop Context (Needs Audit)

```typescript
// server/src/routes/categories.ts Zeile 52-76
fastify.patch('/categories/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const session = (request as any).session as { shopId: string };

  // 1. Load entity
  const [cat] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!cat) return reply.status(404).send({ error: 'Nicht gefunden' });

  // 2. ← Validate shop ownership
  if (cat.shopId !== session.shopId) {
    return reply.status(403).send({ error: 'Zugriff verweigert' });
  }

  // 3. Update with WHERE
  await db.update(categories)
    .set({ name: newName })
    .where(eq(categories.id, id)); // ← shopId-Filter hier nicht nötig (ID ist unique)

  broadcast({ type: 'categories_changed', shopId: session.shopId });
});
```

### Pattern 4: SQL Query with Shop Filter (Reports)

```typescript
// Source: server/src/routes/reports.ts Zeile 19-31
const summaryResult = await db.execute(sql`
  SELECT ... FROM sales
  WHERE shop_id = ${shopId}  // ← CRITICAL: shop_id in WHERE
    AND created_at >= ${monthStart}
    AND created_at < ${monthEnd}
    AND cancelled_at IS NULL
`);
```

### Pattern 5: WebSocket per Shop (Established)

```typescript
// Source: server/src/routes/websocket.ts Zeile 48-54
const { shopId } = session;
if (!clients.has(shopId)) {
  clients.set(shopId, new Set());
}
clients.get(shopId)!.add(socket);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global product list | Per-shop filtered products | v7.0 Planning | Multi-tenancy now possible |
| Single shop in session | shopId extracted from session per request | Phase 24 | Row-level security via code (not DB constraints) |
| Broadcast to all clients | Broadcast scoped to shopId | Phase 24 | Isolation at transport layer |

**Deprecated/outdated:** None in this domain.

## Open Questions

1. **Seed Data ShopId Assignment**
   - What we know: `seed.ts` exists, creates initial products
   - What's unclear: Whether existing Seed-Produkte bereits correct shopId haben oder NULL
   - Recommendation: Read `seed.ts` before implementation, add explicit `shopId: masterShopId` to all seed entries

2. **Settings Key Uniqueness**
   - What we know: `settings` table has `(key, shopId)` structure, but primary key is only `key`
   - What's unclear: Can different shops have same setting key (e.g., "admin_email")?
   - Recommendation: Verify primary key is composite `(key, shopId)` not just `key`. If `key` is unique, setting upserts across shops will collide.

3. **PATCH Routes Missing Audit**
   - What we know: Categories PATCH is implemented correctly (line 52-76)
   - What's unclear: Which PATCH routes (e.g., `/products/:id/deactivate`) still lack WHERE-shopId-filter
   - Recommendation: Systematic audit per route file

## Validation Architecture

**Skipped** — `workflow.nyquist_validation` is explicitly `false` in .planning/config.json

## Sources

### Primary (HIGH confidence)

- **Codebase:** server/src/routes/ (products, categories, sales, reports, settings, sync, import, auth, websocket)
- **Session Pattern:** server/src/lib/sessions.ts — token → shopId lookup established
- **Schema:** server/src/db/schema.ts — all tables have shopId columns verified
- **Frontend:** client/src/features/admin/AdminScreen.tsx — shopName display, isMaster conditional UI

### Secondary (MEDIUM confidence)

- **Drizzle ORM:** Pattern `where(eq(table.shopId, shopId))` is standard SQL isolation
- **Fastify Request Context:** `(request as any).session` is established practice in codebase
- **TanStack Query + Dexie.js:** Integration already present, offline-first pattern verified

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — All libraries already integrated and in use
- Architecture: **HIGH** — Session-based row-level security is established in Phase 24
- Pitfalls: **MEDIUM** — Extrapolated from patterns, test coverage will verify

**Research date:** 2026-03-25
**Valid until:** 2026-04-08 (14 days — this domain is stable, patterns won't change)

---

## Summary: What the Planner Must Do

1. **Systematic Route Audit:** Check all PATCH/GET/DELETE operations for WHERE-shopId-filters
2. **Seed Data Verification:** Ensure all seed products have correct shopId for Master Shop
3. **Settings Table:** Verify primary key is composite (key, shopId) to avoid cross-shop collisions
4. **Test Coverage:** Each audited route needs:
   - Test 1: Shop A creates/updates → Shop B doesn't see it
   - Test 2: Shop A tries to access Shop B's entity → 403 Forbidden
   - Test 3: WebSocket broadcast is scoped to correct shop
5. **No New Dependencies:** This is a refactor phase, use existing patterns
