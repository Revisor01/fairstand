---
phase: 19-tanstack-query-foundation
plan: "03"
subsystem: ui
tags: [react, tanstack-query, offline, pwa, pos]

requires:
  - phase: 19-01
    provides: QueryClientProvider in App.tsx + useProducts Hook mit queryKey-Pattern

provides:
  - POS ArticleGrid nutzt TQ mit networkMode 'offlineFirst' für Offline-Cache-Fallback
  - Gleicher queryKey ['products', shopId] wie Admin — gemeinsamer TQ-Cache

affects:
  - 19-04 (WebSocket-Phase: invalidateQueries trifft automatisch auch den POS)
  - 20 (jede weitere Phase die TQ-Cache-Invalidation nutzt)

tech-stack:
  added: []
  patterns:
    - "networkMode: 'offlineFirst' für POS-Queries — läuft immer, Cache bevorzugt"
    - "Shared queryKey ['products', shopId] zwischen Admin (useProducts) und POS (ArticleGrid)"
    - "active-Filter inline im queryFn statt separater Dexie-Query"

key-files:
  created: []
  modified:
    - client/src/features/pos/ArticleGrid.tsx

key-decisions:
  - "useQuery direkt in ArticleGrid statt useProducts()-Hook wiederverwenden: networkMode ist POS-spezifisch und muss am Query-Call gesetzt werden"
  - "isLoading statt !products als Ladestate-Check: semantisch klarer bei TQ"
  - "active-Filter als .filter(p => p.active) im queryFn: kein separater useMemo nötig, Dexie-Filter-Äquivalent"

patterns-established:
  - "POS-spezifische Queries mit networkMode: 'offlineFirst' — Admin bleibt auf Standard 'online'"

requirements-completed:
  - LIVE-06

duration: 8min
completed: "2026-03-24"
---

# Phase 19 Plan 03: ArticleGrid TQ offlineFirst Migration Summary

**ArticleGrid im POS auf TanStack Query mit networkMode 'offlineFirst' umgestellt — Kasse zeigt gecachte Produkte wenn offline (LIVE-06), gleicher queryKey wie Admin für gemeinsamen Cache**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T20:35:00Z
- **Completed:** 2026-03-24T20:43:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- useLiveQuery (Dexie) aus ArticleGrid entfernt — kein direkter Dexie-Zugriff mehr im POS
- TanStack Query mit networkMode: 'offlineFirst' eingebaut — POS nutzt TQ-Cache als Offline-Fallback
- Gleicher queryKey ['products', shopId] wie Admin-Queries — ein Cache-Eintrag wird von beiden genutzt, Admin-Update invalidiert automatisch auch den POS

## Task Commits

Jeder Task wurde atomisch committed:

1. **Task 1: ArticleGrid von useLiveQuery auf TQ offlineFirst umstellen** - `f3d2b2a` (feat)

**Plan metadata:** (folgt)

## Files Created/Modified

- `client/src/features/pos/ArticleGrid.tsx` - useLiveQuery/db-Import entfernt, useQuery mit networkMode: 'offlineFirst' und snake_case-Mapping eingebaut

## Decisions Made

- useQuery direkt in ArticleGrid aufgerufen (nicht useProducts-Hook wiederverwendet), weil networkMode POS-spezifisch ist und am Query-Call gesetzt werden muss
- isLoading als Ladestate statt !products — semantisch klarer mit TQ
- active-Filter inline im queryFn statt separatem useMemo

## Deviations from Plan

None — Plan exakt wie beschrieben ausgeführt.

## Issues Encountered

None.

## User Setup Required

None — keine externe Konfiguration nötig.

## Known Stubs

None — ArticleGrid zeigt echte Serverdaten aus dem TQ-Cache.

## Next Phase Readiness

- Plan 19-03 abgeschlossen: POS nutzt TQ mit offlineFirst
- Phase 19 damit vollständig (Plan 01: QueryClient-Setup, Plan 02: Admin-Queries, Plan 03: POS-Migration)
- Phase 20 (WebSocket): Query-Invalidation via invalidateQueries(['products', shopId]) trifft automatisch sowohl Admin als auch POS

---
*Phase: 19-tanstack-query-foundation*
*Completed: 2026-03-24*
