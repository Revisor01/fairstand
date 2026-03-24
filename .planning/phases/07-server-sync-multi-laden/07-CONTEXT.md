# Phase 7: Server-Sync & Multi-Laden - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Server wird Single Source of Truth. Multi-Laden-Architektur mit PIN-Authentifizierung. Bidirektionaler Sync zwischen Client (Dexie) und Server (SQLite). Jedes Gerät sieht denselben Datenstand pro Laden.

</domain>

<decisions>
## Implementation Decisions

### Datenmigration
- Hard Reset bei v2.0 Update — lokale Dexie-DB löschen, alles vom Server laden
- Bestehende Verkäufe sind bereits auf dem Server (Outbox-Sync aus v1.x)
- Beim ersten Server-Start automatischer Seed: Shop "St. Secundus Hennstedt" mit PIN 140381 und den bestehenden Produkten

### PIN-Authentifizierung
- Server-seitig: POST /api/auth/pin → Server validiert, gibt shopId + Session-Token zurück
- Offline-Fallback: Letzter bekannter Shop aus lokalem Cache, direkter Zugang ohne PIN-Check wenn vorher eingeloggt

### Sync-Verhalten
- Automatisch bei jedem App-Start + nach jedem erfolgreichen Outbox-Sync: immer aktuellste Daten vom Server holen wenn online
- Konfliktstrategie:
  - Neue Daten (Verkäufe, Bestandsänderungen durch Verkäufe) → Client gewinnt, wird zum Server hochgesynct
  - Stammdaten (Produktinfos, Preise, Laden-Config) → Server gewinnt, überschreibt lokal

### Claude's Discretion
- Technische Details der Token-Implementierung (JWT vs Session-ID)
- Dexie-Schema-Migration (Version-Bump mit Upgrade-Funktion vs neue DB)
- API-Endpunkt-Design für Sync-Protokoll

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/src/routes/sync.ts` — bestehender Sync-Endpoint (aktuell nur Upload)
- `client/src/sync/engine.ts` — Outbox-Flush + downloadProducts Funktion
- `server/src/routes/products.ts` — CRUD + LWW-Upsert
- `server/src/db/schema.ts` — Drizzle Schema mit shopId auf allen Tabellen
- `client/src/features/auth/pinAuth.ts` — bisherige lokale PIN-Auth (wird ersetzt)

### Established Patterns
- Outbox-Pattern für Client→Server Sync (SALE_COMPLETE, STOCK_ADJUST)
- LWW (Last-Write-Wins) mit Timestamp-Vergleich bei Produkten
- shopId als Row-Level-Isolation in allen Server-Tabellen

### Integration Points
- `client/src/db/index.ts` — SHOP_ID ist aktuell hardcoded als Konstante, muss dynamisch werden
- `client/src/App.tsx` — Auth-State steuert was gerendert wird
- `client/src/db/seed.ts` — Seed-Logik muss durch Server-Download ersetzt werden

</code_context>

<specifics>
## Specific Ideas

- Bestehender Hennstedt-Laden muss automatisch als erster Shop in Server-DB angelegt werden (PIN 140381)
- shopId ist bereits in allen Server-Tabellen vorhanden — Architektur unterstützt Multi-Laden auf DB-Ebene
- Seed-Daten (seed.ts) sollen bei erstem Server-Start in die Server-DB für den Hennstedt-Shop importiert werden

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
