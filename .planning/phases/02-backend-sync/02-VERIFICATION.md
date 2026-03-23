---
phase: 02-backend-sync
verified: 2026-03-23T10:17:44Z
status: gaps_found
score: 10/11 must-haves verified
re_verification: false
gaps:
  - truth: "Konflikte (Last-Write-Wins via Timestamp) werden ohne manuellen Eingriff aufgeloest"
    status: failed
    reason: "Der ROADMAP Success Criterion 3 fordert LWW-Konfliktaufloesung via Timestamp. Die Implementierung nutzt ausschliesslich onConflictDoNothing() fuer alle Upserts — bei einem bereits bekannten Produkt wird weder name, salePrice noch updatedAt aktualisiert. Kein WHERE-Vergleich auf updated_at, kein onConflictDoUpdate. Das updatedAt-Feld existiert im Schema, wird aber fuer Konfliktaufloesung nie genutzt."
    artifacts:
      - path: "server/src/routes/sync.ts"
        issue: "Zeilen 75-87: Produkt-Upsert via onConflictDoNothing() — bei ID-Konflikt wird der neue Datensatz komplett ignoriert, auch wenn updatedAt neuer ist. LWW-Logik fehlt."
    missing:
      - "onConflictDoUpdate({ target: products.id, set: { name: sql'excluded.name', salePrice: sql'excluded.sale_price', updatedAt: sql'excluded.updated_at', ... } }).where(lt(products.updatedAt, sql'excluded.updated_at')) oder equivalent"
      - "Alternativ: explizite WHERE-pruefung auf updated_at vor dem Update als separates tx.update()"
human_verification:
  - test: "End-to-End Offline-Sync testen"
    expected: "Offline-Verkauf abschliessen, App neu laden waehrend online — Datensatz erscheint in Server-DB, Outbox-Eintrag in Dexie geloescht, Sale.syncedAt gesetzt"
    why_human: "Erfordert laufenden Server + Browser mit DevTools-Offline-Modus; nicht rein durch Code-Analyse verifizierbar"
  - test: "Idempotenz-Test: gleichen Sale zweimal senden"
    expected: "Zweiter POST gibt processed:1, errors:[] zurueck — kein Duplikat in der DB"
    why_human: "Erfordert laufenden Server und curl-Aufruf mit identischer Sale-ID"
---

# Phase 02: Backend & Sync — Verification Report

**Phase Goal:** Verkaufsdaten werden nicht nur lokal gespeichert, sondern mit dem Server synchronisiert — Datenverlust bei iPad-Reset ist ausgeschlossen
**Verified:** 2026-03-23T10:17:44Z
**Status:** gaps_found
**Re-verification:** Nein — initiale Verifikation

---

## Goal Achievement

### Observable Truths (aus PLAN must_haves + ROADMAP Success Criteria)

**Plan 02-01 Truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/sync nimmt OutboxEntries entgegen und antwortet mit { processed, errors } | VERIFIED | `server/src/routes/sync.ts` Z.38-116: Route existiert, validiert via Zod, gibt `{ processed, errors }` zurueck |
| 2 | SALE_COMPLETE-Event inseriert den Sale idempotent (INSERT OR IGNORE auf id) | VERIFIED | Z.61-71: `tx.insert(sales).values({...}).onConflictDoNothing().run()` |
| 3 | SALE_COMPLETE-Event reduziert den Stock als Delta (nie Absolutwert) | VERIFIED | Z.90-93: `sql\`${products.stock} - ${item.quantity}\`` |
| 4 | Produkte aus Sale-Items werden per Upsert angelegt, falls auf dem Server noch unbekannt | VERIFIED | Z.75-87: `tx.insert(products).values({...}).onConflictDoNothing().run()` — bei unbekanntem Produkt wird minimal angelegt |
| 5 | Migration laeuft automatisch beim Container-Start — kein manueller SQL-Schritt | VERIFIED | `server/Dockerfile` Z.17: `CMD ["sh", "-c", "npx drizzle-kit migrate && node dist/index.js"]` |

**Plan 02-02 Truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | Nach einem Offline-Verkauf werden ausstehende Outbox-Eintraege beim naechsten Online-Kontakt automatisch an POST /api/sync gesendet | VERIFIED | `engine.ts` Z.22-26: `fetch('/api/sync', { method: 'POST', ... })` mit Dexie-Outbox als Quelle |
| 7 | Sync-Trigger feuern bei window.online-Event und bei document.visibilitychange (sichtbar + online) | VERIFIED | `triggers.ts` Z.10-18: beide `addEventListener` korrekt registriert |
| 8 | Beim App-Start wird sofort geflusht wenn navigator.onLine true ist | VERIFIED | `triggers.ts` Z.4-7: `if (navigator.onLine) { void flushOutbox(); }` |
| 9 | Nach erfolgreichem Sync wird syncedAt auf dem Sale-Datensatz in Dexie gesetzt | VERIFIED | `engine.ts` Z.47-53: `db.sales.update(payload.id, { syncedAt: Date.now() })` |
| 10 | Nach 5 fehlgeschlagenen Versuchen wird ein Outbox-Eintrag nicht mehr retried | VERIFIED | `engine.ts` Z.15: `.filter((e: OutboxEntry) => (e.attempts ?? 0) < 5)` |
| 11 | Fehlgeschlagener Sync loescht keine Outbox-Eintraege — sie bleiben fuer den naechsten Trigger | VERIFIED | `engine.ts` Z.27-41: bei Fehler nur `attempts + 1`, kein `bulkDelete` |

**ROADMAP Success Criteria:**

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| SC-1 | Nach Offline-Verkauf erscheint Datensatz auf Server sobald iPad online | VERIFIED | Sync-Engine vollstaendig implementiert (engine.ts + triggers.ts) |
| SC-2 | Bestandsaenderungen werden als Delta-Events synchronisiert | VERIFIED | `sql\`${products.stock} - ${item.quantity}\`` in sync.ts |
| SC-3 | Konflikte (Last-Write-Wins via Timestamp) werden ohne manuellen Eingriff aufgeloest | FAILED | `onConflictDoNothing()` ignoriert neuere Daten — kein LWW-Vergleich auf `updated_at` |

**Score:** 10/11 must-haves verified (ROADMAP SC-3 failed)

---

## Required Artifacts

| Artifact | Erwartet | Status | Details |
|----------|----------|--------|---------|
| `server/src/db/schema.ts` | Drizzle-Tabellen: products, sales, outboxEvents | VERIFIED | Alle 3 exports vorhanden, 37 Zeilen, substanziell |
| `server/src/db/index.ts` | DB-Singleton via better-sqlite3 + drizzle() | VERIFIED | `export const db = drizzle(...)` — 6 Zeilen, korrekt |
| `server/src/routes/sync.ts` | POST /api/sync Endpoint mit Zod-Validierung | VERIFIED | 117 Zeilen, vollstaendig implementiert |
| `server/migrations/0000_sloppy_mister_fear.sql` | Initiale SQLite-Migration mit CREATE TABLE | VERIFIED | 3x CREATE TABLE (outbox_events, products, sales) |
| `client/src/sync/engine.ts` | flushOutbox() — liest Dexie-Outbox, sendet an /api/sync | VERIFIED | 58 Zeilen, vollstaendig mit Guard + Retry-Logik |
| `client/src/sync/triggers.ts` | registerSyncTriggers() — online + visibilitychange | VERIFIED | 20 Zeilen, korrekt registriert |
| `client/src/main.tsx` | registerSyncTriggers() beim App-Start | VERIFIED | Z.8: `registerSyncTriggers()` vor `createRoot().render()` |

---

## Key Link Verification

### Plan 02-01 Links

| Von | Nach | Via | Status | Details |
|-----|------|-----|--------|---------|
| `server/src/index.ts` | `server/src/routes/sync.ts` | `fastify.register(syncRoutes, { prefix: '/api' })` | WIRED | Z.13 in index.ts: import + register beide vorhanden |
| `server/src/routes/sync.ts` | `server/src/db/index.ts` | `import { db } from '../db/index.js'` | WIRED | Z.4 + `db.transaction(...)` ab Z.59 |
| `server/Dockerfile` | `server/migrations/` | `drizzle-kit migrate` im CMD | WIRED | Z.13-14: COPY migrations + Z.17: CMD enthaelt `drizzle-kit migrate` |

### Plan 02-02 Links

| Von | Nach | Via | Status | Details |
|-----|------|-----|--------|---------|
| `client/src/sync/engine.ts` | `/api/sync` | `fetch('/api/sync', { method: 'POST', ... })` | WIRED | Z.22-26: fetch-Aufruf mit korrektem Body-Format |
| `client/src/sync/engine.ts` | `client/src/db/index.ts` | `import { db } from '../db/index.js'` | WIRED | Z.1: import vorhanden; Z.12: `db.outbox.where(...)` aktiv genutzt |
| `client/src/sync/triggers.ts` | `client/src/sync/engine.ts` | `import { flushOutbox } from './engine.js'` | WIRED | Z.1: import; Z.6,11,15: flushOutbox() dreifach aufgerufen |
| `client/src/main.tsx` | `client/src/sync/triggers.ts` | `registerSyncTriggers()` | WIRED | Z.4: import; Z.8: Aufruf vor `createRoot().render()` |

---

## Requirements Coverage

| Requirement | Quell-Plan | Beschreibung | Status | Evidence |
|-------------|-----------|--------------|--------|----------|
| WAR-04 | 02-01 | Warenbestand wird bei Verkauf automatisch reduziert | SATISFIED | Server-seitig: `sql\`${products.stock} - ${item.quantity}\`` — Delta-Reduktion in sync.ts Z.90-93 |
| OFF-03 | 02-01, 02-02 | Automatische Synchronisation mit Server wenn online | SATISFIED | Vollstaendige Outbox-Flush-Kette: engine.ts + triggers.ts + main.tsx |
| OFF-04 | 02-01, 02-02 | Sync verwendet Delta-Events (nicht Absolutwerte) | SATISFIED | Server: Stock wird als Delta reduziert (sql template); Client: OutboxEntry traegt `quantity` als Delta |

Alle drei in den PLAN-Frontmatter deklarierten Requirements (WAR-04, OFF-03, OFF-04) sind implementiert und verifiziert.

**Orphaned Requirements:** Keine. Alle in REQUIREMENTS.md als "Phase 2" markierten IDs (WAR-04, OFF-03, OFF-04) sind in den PLANs deklariert und implementiert.

---

## Anti-Patterns Found

| Datei | Zeile | Pattern | Schwere | Impact |
|-------|-------|---------|---------|--------|
| `server/src/routes/sync.ts` | 108 | `// STOCK_ADJUST: Phase 3 — noch nicht implementiert` | INFO | Beabsichtigter Stub — STOCK_ADJUST ist explizit auf Phase 3 verschoben, keine Fehlfunktion |
| `server/src/routes/sync.ts` | 75-87 | Produkt-Upsert via `onConflictDoNothing()` ohne LWW-Vergleich | BLOCKER | Entspricht nicht ROADMAP SC-3 (Last-Write-Wins); bei vorhandenem Produkt mit aelterem `updatedAt` wird der neuere Sale-Snapshot-Name nie eingetragen |

Der STOCK_ADJUST-Stub ist kein Blocker — er ist dokumentiert und bewusst auf Phase 3 verschoben.

Das fehlende LWW-Muster beim Produkt-Upsert ist ein Blocker fuer ROADMAP SC-3, aber kein Blocker fuer die Kernfunktion (Verkauf landet auf dem Server, Bestand wird reduziert). Es betrifft ausschliesslich den Fall, dass ein Produkt serverseitig bereits bekannt ist und der Client eine neuere Version mitliefert — was in Phase 2 noch nicht auftreten kann (Produktverwaltung kommt erst in Phase 3).

---

## Human Verification Required

### 1. End-to-End Offline-Sync

**Test:** Browser-DevTools > Network: Offline; Verkauf abschliessen; Network: Online; Netzwerk-Tab beobachten
**Expected:** POST an /api/sync erscheint, Server antwortet 200; IndexedDB-Outbox-Eintrag verschwindet; Sale.syncedAt wird gesetzt
**Why human:** Erfordert laufende Dev-Umgebung (Server + Vite) und Browser-Offline-Simulation

### 2. Idempotenz-Verifikation

**Test:** `curl -X POST http://localhost:3000/api/sync -H 'Content-Type: application/json' -d '{"entries":[{...gleicher Sale zweimal...}]}'`
**Expected:** Beide Aufrufe geben `{ "processed": 1, "errors": [] }` zurueck; DB enthaelt exakt einen Datensatz
**Why human:** Erfordert laufenden Server; automatisch nicht testbar ohne Laufzeitumgebung

---

## Gaps Summary

**1 Gap gefunden (ROADMAP Success Criterion 3):**

ROADMAP SC-3 fordert "Konflikte (Last-Write-Wins via Timestamp) werden ohne manuellen Eingriff aufgeloest". Die Implementierung loest Konflikte ausschliesslich durch `onConflictDoNothing()` — d.h. der erste Schreiber gewinnt (FIRST-WRITE-WINS), nicht der mit dem neuesten `updatedAt`.

**Konkreter Fall:** Produkt X ist auf dem Server mit `updatedAt = T1` bekannt. Client sendet Sale mit Produkt X (name oder salePrice hat sich geaendert), `updatedAt = T2 > T1`. Der Server ignoriert die neueren Produktdaten (`onConflictDoNothing`), obwohl der Client die aktuellere Version haette.

**Einschraenkung:** In Phase 2 ist dies nur theoretisch problematisch, da keine Produktverwaltungs-UI existiert (kommt in Phase 3). Der Fallback-Produkt-Insert (category='', purchasePrice=0) wird durch spaetere Phase-3-Produktsync ueberschrieben. Der Gap sollte dennoch vor Phase 3 geschlossen werden.

**Root Cause:** Der PLAN hat `onConflictDoNothing()` fuer den Produkt-Upsert spezifiziert (als "Fallback fuer unbekannte Produkte"). Die LWW-Anforderung aus dem ROADMAP war im PLAN-must_haves nicht explizit enthalten — der PLAN adressiert diesen SC-3 nicht.

---

*Verified: 2026-03-23T10:17:44Z*
*Verifier: Claude (gsd-verifier)*
