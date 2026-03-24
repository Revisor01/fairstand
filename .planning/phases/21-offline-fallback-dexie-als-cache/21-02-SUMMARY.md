---
phase: 21-offline-fallback-dexie-als-cache
plan: "02"
subsystem: ui
tags: [tanstack-query, offline, pwa, lucide-react, dexie, sync]

# Dependency graph
requires:
  - phase: 21-01
    provides: Dexie als TQ-Fallback-Cache mit useLiveQuery-Integration
  - phase: 20-websocket-live-updates-cleanup
    provides: flushOutbox() in engine.ts, registerSyncTriggers() in triggers.ts

provides:
  - flushOutbox mit optionalem QueryClient-Parameter und Post-Flush-Cache-Invalidation
  - registerSyncTriggers mit optionalem QueryClient-Durchreichen
  - WifiOff-Offline-Indicator im POS-Header mit automatischem online/offline-Wechsel

affects:
  - jede Komponente die registerSyncTriggers aufruft (main.tsx, App.tsx)
  - zukünftige Online/Offline-Behandlung im POS

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optionaler QueryClient-Parameter in Utility-Funktionen: Rückwärtskompatibilität ohne Breaking Change"
    - "navigator.onLine + window-Events als useState-initialen Wert: kein Flicker beim ersten Render"

key-files:
  created: []
  modified:
    - client/src/sync/engine.ts
    - client/src/sync/triggers.ts
    - client/src/features/pos/POSScreen.tsx

key-decisions:
  - "QueryClient als optionaler Parameter statt globalem Singleton: engine.ts bleibt React-frei, kein createContext nötig"
  - "Offline-Indicator unter Shop-Namen statt als Toast: persistentes informatives Feedback, kein Error-State, verschwindet automatisch"
  - "isOnline initialisiert mit navigator.onLine: kein false-negative beim ersten Render wenn bereits offline"

patterns-established:
  - "Post-Flush-Invalidation: flushOutbox(queryClient) invalidiert ['products', shopId] nach bulkDelete — nur wenn queryClient übergeben"
  - "Offline-Indicator-Pattern: useState(navigator.onLine) + useEffect mit online/offline-Listener + cleanup"

requirements-completed:
  - OFFL-02
  - OFFL-03

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 21 Plan 02: TQ-Cache-Invalidation nach Flush + WifiOff-Indicator im POS-Header Summary

**flushOutbox() invalidiert nach Sync ['products', shopId] via optionalem QueryClient; POS-Header zeigt WifiOff-Badge bei fehlender Verbindung**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T21:02:25Z
- **Completed:** 2026-03-24T21:04:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- engine.ts: flushOutbox() erhält optionalen QueryClient-Parameter, invalidiert nach erfolgreichem Outbox-Flush den TQ-Produkt-Cache für den aktuellen Shop
- triggers.ts: registerSyncTriggers() leitet QueryClient optional an flushOutbox() weiter — alle vier Trigger-Pfade (Start, online-Event, visibilitychange, setInterval)
- POSScreen.tsx: WifiOff-Indicator direkt unter dem Shop-Namen, automatisch sichtbar wenn offline, verschwindet bei Reconnect

## Task Commits

Jede Task wurde atomar committed:

1. **Task 1: QueryClient-Invalidation nach Outbox-Flush in engine.ts** - `f33f184` (feat)
2. **Task 2: Offline-Indicator im POS-Header (OFFL-03)** - `aeb8f6b` (feat)

## Files Created/Modified

- `client/src/sync/engine.ts` — QueryClient-Import, Signatur erweitert, invalidateQueries-Block nach bulkDelete
- `client/src/sync/triggers.ts` — QueryClient-Import, optionaler Parameter in registerSyncTriggers, Durchreichen an alle flushOutbox-Aufrufe
- `client/src/features/pos/POSScreen.tsx` — WifiOff-Import, isOnline-State + useEffect, Badge im Header unter Shop-Namen

## Decisions Made

- QueryClient als optionaler Parameter statt globalem Singleton: engine.ts bleibt ein React-freies Utility-Modul. Bestehende Aufrufe ohne Argument in triggers.ts (App-Start) bleiben gültig. Der Invalidation-Pfad greift nur wenn React-Kontext vorhanden.
- Offline-Indicator unter dem Shop-Namen (nicht als Toast): persistentes informatives Feedback solange offline, kein Timeout nötig, kein Error-State — konsistent mit dem Sync-Badge-Pattern aus Phase 17.
- isOnline initialisiert mit navigator.onLine: verhindert false-negative beim ersten Render wenn Gerät bereits offline ist.

## Deviations from Plan

Keine — Plan exakt wie spezifiziert ausgeführt.

## Issues Encountered

Keine.

## User Setup Required

Keine — keine externen Dienste, keine neuen Umgebungsvariablen.

## Next Phase Readiness

- OFFL-02 und OFFL-03 erfüllt
- Phase 21 vollständig: Dexie als TQ-Fallback-Cache (Plan 01) + Post-Flush-Invalidation + Offline-Indicator (Plan 02)
- Für vollständige OFFL-02-Wirkung: registerSyncTriggers in main.tsx oder App.tsx mit useQueryClient()-Wert aufrufen

---
*Phase: 21-offline-fallback-dexie-als-cache*
*Completed: 2026-03-24*
