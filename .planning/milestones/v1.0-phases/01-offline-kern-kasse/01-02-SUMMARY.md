---
phase: 01-offline-kern-kasse
plan: 02
subsystem: db-auth-foundation
tags: [dexie, indexeddb, pin-auth, pwa, offline, idb-keyval, seed-data]
dependency_graph:
  requires: [01-01]
  provides: [dexie-schema, pin-auth, db-singleton, seed-data]
  affects: [01-03]
tech_stack:
  added:
    - "Dexie.js 4.3 — FairstandDB mit EntityTable-Typisierung"
    - "idb-keyval — PIN-Hash und Session-Timestamp in IndexedDB"
    - "crypto.subtle SHA-256 — browsernativer PIN-Hash ohne externe Dep"
  patterns:
    - "Cent-Integer für alle Preise — kein Floating Point in DB"
    - "Compound-Index [shopId+active] für gefilterte Kassen-Queries"
    - "Outbox-Pattern: ++id auto-increment, shopId, attempts für Retry-Logik"
    - "seedIfEmpty() guard — prüft count() vor bulkAdd()"
    - "AuthState: checking|setup|locked|unlocked — keine boolesche Vereinfachung"
    - "pointerdown statt click — Safari-PWA Touch-Kompatibilität"
key_files:
  created:
    - client/src/db/schema.ts
    - client/src/db/index.ts
    - client/src/db/seed.ts
    - client/src/features/auth/pinAuth.ts
    - client/src/features/auth/useAuth.ts
    - client/src/features/auth/PinScreen.tsx
  modified:
    - client/src/App.tsx
decisions:
  - "Cent-Integer für alle Geldbeträge — float-freie Arithmetik verhindert Rundungsfehler an Kasse"
  - "idb-keyval für PIN-Hash und lastActivity — kein eigenes Dexie-Schema nötig für Config-Werte"
  - "crypto.subtle SHA-256 ohne Salt — ausreichend für 6-Ziffern-PIN in Offline-PWA ohne Netzwerk-Angriffsfläche"
  - "AuthState enum-style mit 4 Zuständen — 'checking' verhindert Flicker beim App-Start"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-23"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 1
---

# Phase 01 Plan 02: Dexie-Schema, PIN-Auth und PWA-Datenfundament

**One-liner:** Dexie 4 Datenbankschema mit 3 Tabellen (products, sales, outbox) und shopId-Compound-Indizes, SHA-256 PIN-Auth via crypto.subtle + idb-keyval mit 120-Minuten-Session-Timeout, und 33 echte Seed-Artikel aus Rechnung 2600988 als Cent-Integer.

## What Was Built

Das vollständige Datenfundament für Fairstand. Plan 01-03 (Kassen-UI) kann direkt auf diese Schicht aufbauen — alle Types, die DB-Instanz und die Auth-Hooks sind typsicher und production-ready.

**Datenbank (client/src/db/):**
- `schema.ts`: FairstandDB extends Dexie mit EntityTable-Typisierung für Product, Sale, OutboxEntry. Alle Tabellen tragen `shopId` für Multi-Tenant-Vorbereitung (AUTH-02). Compound-Index `[shopId+active]` optimiert den häufigsten Kassen-Query (aktive Produkte des Ladens).
- `index.ts`: Singleton `db = new FairstandDB()` und `SHOP_ID = 'st-secundus-hennstedt'` — ein zentraler Einstiegspunkt für die gesamte App.
- `seed.ts`: 33 Artikel direkt aus Rechnung 2600988 (Süd-Nord-Kontor, 16.03.2026) — echte Artikelnummern, EK-Preise nach Rabatt und EVP als Cent-Integer. Kategorien: Kunsthandwerk, Kaffee, Schokolade, Gebäck, Süsswaren, Sonstiges. `seedIfEmpty()` prüft via count() ob bereits Daten vorhanden.

**PIN-Auth (client/src/features/auth/):**
- `pinAuth.ts`: SHA-256-Hashing via `crypto.subtle.digest` (kein npm-Paket nötig). `setupPin`, `verifyPin`, `updateActivity`, `isSessionValid` (120 Min.), `hasPinSetup`, `logout` — alle async mit idb-keyval.
- `useAuth.ts`: React-Hook mit 4 Auth-Zuständen. `'checking'` verhindert Flicker beim App-Start. `pointerdown`-Listener aktualisiert `lastActivity` bei jeder Interaktion.
- `PinScreen.tsx`: 6-Punkte-Anzeige + 3×4 Numpad. Setup-Modus fordert Bestätigung an (Mismatch → Reset). Unlock-Modus zeigt "Falscher PIN" bei Fehler. Tap-Targets: `h-14` (56px). Touch-optimiert mit `onPointerDown`.

**App-Routing (client/src/App.tsx):**
- `navigator.storage.persist()` beim App-Start — verhindert Datenverlust bei Speicherdruck (OFF-02)
- `seedIfEmpty()` beim ersten Start — legt die 33 Artikel in IndexedDB ab
- Auth-Guard: checking → Ladescreen, setup → PinScreen(setup), locked → PinScreen(unlock), unlocked → Kassen-Placeholder

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Dexie-Schema, DB-Singleton und Seed-Daten | dcae50d | client/src/db/schema.ts, index.ts, seed.ts |
| 2 | PIN-Auth-Schicht, useAuth-Hook, PinScreen und App-Routing | fd7850b | pinAuth.ts, useAuth.ts, PinScreen.tsx, App.tsx |

## Verification Results

1. `npm run build` in client/ — PASS (0 TypeScript-Fehler)
2. `grep -q "shopId" client/src/db/schema.ts` — PASS (AUTH-02)
3. `grep -q "crypto.subtle" client/src/features/auth/pinAuth.ts` — PASS (AUTH-01)
4. `grep -q "storage.persist" client/src/App.tsx` — PASS (Pitfall 3 / OFF-02)
5. `grep -q "seedIfEmpty" client/src/App.tsx` — PASS (Seed-Daten)
6. `dist/manifest.webmanifest` noch vorhanden aus Plan 01-01 — PASS (OFF-05)

## Deviations from Plan

Keine — Plan exakt wie beschrieben ausgeführt. Die echten Rechnungsdaten aus Rechnung 2600988 konnten direkt extrahiert und verwendet werden.

## Known Stubs

- **client/src/App.tsx** (unlocked-Zweig): Placeholder "Kassen-UI wird in Plan 01-03 implementiert." — intentionell, Plan 01-03 ersetzt diesen Bereich vollständig.

## Self-Check: PASSED

- client/src/db/schema.ts: FOUND
- client/src/db/index.ts: FOUND
- client/src/db/seed.ts: FOUND
- client/src/features/auth/pinAuth.ts: FOUND
- client/src/features/auth/useAuth.ts: FOUND
- client/src/features/auth/PinScreen.tsx: FOUND
- client/src/App.tsx: FOUND (modifiziert)
- Commit dcae50d: FOUND
- Commit fd7850b: FOUND
