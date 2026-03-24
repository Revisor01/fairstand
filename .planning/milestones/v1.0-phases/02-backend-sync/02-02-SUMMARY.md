---
phase: 02-backend-sync
plan: 02
subsystem: sync
tags: [dexie, indexeddb, pwa, ios, offline-sync, outbox-pattern]

# Dependency graph
requires:
  - phase: 02-01
    provides: POST /api/sync Endpoint der OutboxEntry-Batches verarbeitet
provides:
  - flushOutbox() — liest Dexie-Outbox, sendet an /api/sync, markiert syncedAt
  - registerSyncTriggers() — online + visibilitychange Event-Listener fuer iOS
  - Sync-Engine beim App-Start automatisch initialisiert
affects:
  - Phase 03 (features die Sync-Status anzeigen)
  - Phase 04 (PDF-Import generiert eigene Outbox-Eintraege)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Outbox-Flush-Guard: flushing-Boolean verhindert parallele Fetch-Calls bei Doppel-Trigger"
    - "iOS Sync-Trigger: window.online + document.visibilitychange statt Background Sync API"
    - "Fail-safe Retry: attempts-Counter in Dexie, nach 5 Fehlschlaegen kein weiterer Retry"
    - "Sale.syncedAt als Sync-Status-Signal: undefined=ungesynct, number=gesynct"

key-files:
  created:
    - client/src/sync/engine.ts
    - client/src/sync/triggers.ts
  modified:
    - client/src/main.tsx

key-decisions:
  - "flushing-Guard als Modul-Variable (nicht React-State) — Sync ist Infrastruktur, nicht UI"
  - "Sofortiger Flush beim App-Start (navigator.onLine) — deckt Reload-nach-Reconnect ab"
  - "bulkDelete nach erfolgreichem POST — atomares Loeschen aller gesendeten Eintraege"
  - "attempts-Inkrement bei Netzwerk- UND Server-Fehler — gleiche Logik, kein Sonderfall"

patterns-established:
  - "Sync-Module in client/src/sync/ — kein UI-Code, nur Infrastruktur"
  - "void flushOutbox() in Event-Handlern — kein await noetig, Fire-and-Forget"

requirements-completed: [OFF-03, OFF-04]

# Metrics
duration: 1min
completed: 2026-03-23
---

# Phase 02 Plan 02: Client-Side Sync Engine Summary

**Offline-Outbox-Flush via fetch('/api/sync') mit iOS-kompatiblen Triggern (online + visibilitychange) und Retry-Guard nach 5 fehlgeschlagenen Versuchen**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-23T10:14:20Z
- **Completed:** 2026-03-23T10:15:18Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- flushOutbox() implementiert: liest Dexie-Outbox, sendet batched an POST /api/sync, loescht bei Erfolg und setzt Sale.syncedAt
- registerSyncTriggers() registriert online und visibilitychange — iOS Background Sync API nicht erforderlich
- main.tsx initialisiert Sync-Engine vor React-Render — keine UI-Abhaengigkeit

## Task Commits

Jeder Task wurde atomar committet:

1. **Task 1: Sync-Engine (engine.ts) + Triggers (triggers.ts)** - `ec272b0` (feat)
2. **Task 2: Sync-Triggers in main.tsx einbinden + TypeScript-Build pruefen** - `b2b3565` (feat)

## Files Created/Modified

- `client/src/sync/engine.ts` - flushOutbox(): liest Outbox, sendet an /api/sync, markiert syncedAt, inkrementiert attempts bei Fehler
- `client/src/sync/triggers.ts` - registerSyncTriggers(): online + visibilitychange Event-Listener, sofortiger Flush bei App-Start
- `client/src/main.tsx` - registerSyncTriggers() vor createRoot().render() aufgerufen

## Decisions Made

- flushing-Guard als Modul-Variable verhindert parallele Ausfuehrung wenn online und visibilitychange gleichzeitig feuern
- Sofortiger Flush beim App-Start (navigator.onLine check) — deckt den Fall ab, dass die App nach Reconnect neu geladen wird
- bulkDelete nach erfolgreichem POST — wenn der Server 2xx zurueckgibt, koennen alle gesendeten Eintraege geloescht werden (Idempotenz des Servers)

## Deviations from Plan

Keine — Plan exakt wie spezifiziert ausgefuehrt.

## Issues Encountered

Keine. TypeScript-Build Client und Server beide fehlerfrei.

## Next Phase Readiness

- Sync-Schleife vollstaendig: Offline-Verkauf → Dexie-Outbox → flushOutbox() → POST /api/sync → Sale.syncedAt gesetzt
- Phase 03 kann Sync-Status aus Sale.syncedAt auslesen und im UI anzeigen
- Phase 04 (PDF-Import) kann STOCK_ADJUST-Eintraege in die Outbox schreiben — flushOutbox() verarbeitet sie automatisch

---
*Phase: 02-backend-sync*
*Completed: 2026-03-23*
