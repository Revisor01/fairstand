---
phase: 20-websocket-live-updates-cleanup
plan: 02
subsystem: sync
tags: [dexie, tanstack-query, offline, pwa, sync, outbox]

# Dependency graph
requires:
  - phase: 19-tanstack-query-foundation
    provides: useProducts + useCategories als TQ-Hooks, QueryClientProvider in App

provides:
  - completeSale/completeWithdrawal mit Online-Direct-POST zu /api/sync
  - Offline-Fallback via Outbox für beide Sale-Typen
  - Dexie Write-Through nach jedem useProducts-Fetch
  - Dexie Write-Through nach jedem useCategories-Fetch

affects:
  - phase 21 (Offline-Fallback) — Dexie enthält jetzt aktuellen Produktstand
  - phase 20-03 (WebSocket-Invalidierung) — Sale-Pfad ist getrennt von Outbox-Flush

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Online/Offline-Branch via navigator.onLine in completeSale/completeWithdrawal"
    - "Dexie Write-Through nach TQ queryFn als fire-and-forget .catch(() => {})"
    - "IDB-Transaktion ohne db.outbox — verhindert Timeout bei async fetch()"

key-files:
  created: []
  modified:
    - client/src/features/pos/useSaleComplete.ts
    - client/src/hooks/api/useProducts.ts
    - client/src/hooks/api/useCategories.ts

key-decisions:
  - "navigator.onLine-Branch in completeSale/completeWithdrawal: Online POST /api/sync direkt, Fehler/Offline → Outbox"
  - "db.outbox nicht mehr Teil der IDB-Transaktion — kein Timeout-Risiko bei async fetch()"
  - "Dexie Write-Through fire-and-forget (.catch(() => {})) — TQ-Query-Fehler werden nicht maskiert"
  - "shopId-gefiltertes delete() + bulkPut() in einer eigenen Transaktion für Write-Through"

patterns-established:
  - "Online/Offline-Branch Pattern: navigator.onLine → direkter Server-POST, sonst Outbox"
  - "Dexie Write-Through Pattern: nach TQ queryFn fire-and-forget ohne Fehler-Propagation"

requirements-completed: [LIVE-03, LIVE-05]

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 20 Plan 02: Online-Direct-POST + Dexie Write-Through Summary

**completeSale/completeWithdrawal senden Verkäufe online direkt via POST /api/sync ohne Outbox-Umweg; useProducts/useCategories schreiben nach jedem Fetch fire-and-forget in Dexie als Offline-Cache für Phase 21.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T20:47:05Z
- **Completed:** 2026-03-24T20:48:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Online-Verkäufe erscheinen sofort auf dem Server ohne Sync-Delay — kein Outbox-Umweg mehr
- Offline-Fallback bleibt vollständig erhalten (Outbox-Pattern unverändert)
- Dexie hat nach jedem TQ-Fetch einen aktuellen Produktstand — Phase 21 kann offline darauf zurückgreifen
- IDB-Transaktion enthält nicht mehr db.outbox — kein Timeout-Risiko bei async fetch()

## Task Commits

Jede Aufgabe wurde atomar committed:

1. **Task 1: useSaleComplete.ts — Online-Direct-POST + Offline-Outbox-Fallback** - `35be4e6` (feat)
2. **Task 2: Dexie Write-Through in useProducts und useCategories** - `70df36d` (feat)

**Plan metadata:** (follows)

## Files Created/Modified
- `client/src/features/pos/useSaleComplete.ts` — Online/Offline-Branch in completeSale + completeWithdrawal; db.outbox außerhalb der IDB-Transaktion
- `client/src/hooks/api/useProducts.ts` — db-Import + Write-Through nach queryFn
- `client/src/hooks/api/useCategories.ts` — db-Import + Write-Through nach queryFn

## Decisions Made
- `db.outbox` ist nicht mehr Teil der Dexie-IDB-Transaktion: IDB-Transaktionen time-outen wenn async I/O (fetch()) innerhalb der Transaktion geschieht (bekanntes Safari-Problem, auch Phase 14 Decision)
- Write-Through wird fire-and-forget mit `.catch(() => {})` behandelt: TQ-Query-Fehlerbehandlung bleibt sauber, IDB-Fehler sind sekundär
- `shopId`-gefiltertes delete() + bulkPut() statt clear(): Multi-Laden-Sicherheit konsistent mit Phase 14 Entscheidung

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 20-03 (WebSocket-Broadcast + Query-Invalidation) kann direkt starten
- Phase 21 (Offline-Fallback) findet aktuellen Produktstand in Dexie vor (Write-Through aktiv)
- completeSale/completeWithdrawal-Pfad ist jetzt klar getrennt: Online = direkter POST, Offline = Outbox

## Self-Check: PASSED

All files found, all commits verified.

---
*Phase: 20-websocket-live-updates-cleanup*
*Completed: 2026-03-24*
