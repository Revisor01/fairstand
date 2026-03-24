---
phase: 07-server-sync-multi-laden
plan: "02"
subsystem: auth
tags: [idb-keyval, dexie, react, typescript, serverAuth, shopId]

# Dependency graph
requires:
  - phase: 07-01
    provides: POST /api/auth/pin mit shopId+token Response + shops-Tabelle in SQLite

provides:
  - serverAuth.ts mit serverLogin(), getStoredSession(), clearSession(), updateActivity(), isSessionValid()
  - db/index.ts ohne SHOP_ID-Konstante, mit getShopId()/setShopId() für dynamischen Shop-Kontext
  - useAuth.ts auf serverAuth umgestellt mit Online/Offline-Pfad in unlock()
  - Dexie Version 3 mit Hard-Reset-Upgrade (products.clear())

affects:
  - 07-03 (Sync-Engine und alle UI-Komponenten die SHOP_ID importiert haben)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Modul-Variable _shopId als dynamischer Shop-Kontext statt hardcodierter Konstante"
    - "unlock() unterscheidet navigator.onLine: online→Server-Auth, offline→Session-Fallback"
    - "lock() räumt Session UND Shop-Kontext auf (clearSession + setShopId(''))"
    - "Dexie-Upgrade mit products.clear() für sauberen State bei Architektur-Wechsel"

key-files:
  created:
    - client/src/features/auth/serverAuth.ts
  modified:
    - client/src/db/index.ts
    - client/src/features/auth/useAuth.ts
    - client/src/db/schema.ts

key-decisions:
  - "setShopId('') in lock() statt null — leerer String ist falsy, getShopId() wirft korrekt, Typsicherheit bleibt gewahrt (string statt null)"
  - "Offline-Fallback in unlock() gewährt Zugang ohne PIN-Prüfung wenn Session < 2h alt — kein Server-Hash clientseitig nötig"
  - "setup() bleibt als No-op für App.tsx-Kompatibilität — kein Breaking Change am useAuth-Interface"
  - "pinAuth.ts bleibt unberührt — Plan 03 passt Imports an (kein voreiliges Löschen)"

patterns-established:
  - "serverAuth-Pattern: idb-keyval 'session'-Key mit StoredSession-Objekt (shopId, shopName, token, lastActivity)"
  - "useAuth-Interface unverändert: { state, unlock, setup, lock } — rückwärtskompatibel mit App.tsx"

requirements-completed: [SHOP-03, SHOP-04, SYNC-02]

# Metrics
duration: 1min
completed: 2026-03-24
---

# Phase 07 Plan 02: Client Auth-Architektur Summary

**Server-PIN-Auth mit idb-keyval-Session + dynamischer shopId-Modul-Variable ersetzt hardcodierte SHOP_ID-Konstante; Dexie auf Version 3 mit products.clear()-Upgrade**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-24T10:14:58Z
- **Completed:** 2026-03-24T10:15:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- serverAuth.ts erstellt: kapselt Server-PIN-Auth mit idb-keyval-Session-Persistenz (5 Exports)
- db/index.ts: SHOP_ID-Konstante entfernt, getShopId()/setShopId() mit Modul-Variable eingeführt
- useAuth.ts vollständig auf serverAuth umgestellt: Online/Offline-Pfad klar getrennt und kommentiert
- Dexie Version 3 mit upgrade()-Funktion die products.clear() ausführt (Hard Reset für v2.0-Migration)

## Task Commits

Jeder Task wurde atomar committet:

1. **Task 1: serverAuth.ts + db/index.ts** - `d0af3fe` (feat)
2. **Task 2: useAuth.ts + Dexie v3** - `df0f239` (feat)

## Files Created/Modified
- `client/src/features/auth/serverAuth.ts` - Neu: Server-PIN-Auth + Session-Persistenz in idb-keyval
- `client/src/db/index.ts` - SHOP_ID entfernt, getShopId()/setShopId() mit Modul-Variable
- `client/src/features/auth/useAuth.ts` - Auf serverAuth umgestellt, Online/Offline-Pfad in unlock()
- `client/src/db/schema.ts` - Version 3 mit products.clear() Hard-Reset-Upgrade

## Decisions Made
- `setShopId('')` in `lock()` statt `setShopId(null)` — leerer String ist falsy, passt in `string`-Typsignatur
- Offline-Fallback: keine PIN-Prüfung offline möglich (kein Server-Hash clientseitig) — Session-Alter entscheidet
- `setup()` als No-op belassen für App.tsx-Rückwärtskompatibilität
- `pinAuth.ts` bleibt unberührt bis Plan 03 Imports umstellt

## Deviations from Plan

Keine — Plan exakt wie beschrieben ausgeführt.

## Issues Encountered

Keine.

## User Setup Required

Keine — keine externen Dienste konfiguriert.

## Known Stubs

Keine — alle Funktionen vollständig implementiert und verdrahtet.

## Next Phase Readiness

- serverAuth.ts exportiert alle nötigen Funktionen für Plan 03 (Sync-Engine)
- getShopId()/setShopId() bereit für alle Komponenten die SHOP_ID importierten
- Dexie Version 3 stellt sicher dass beim Update keine veralteten Produkte ohne shopId-Bezug bleiben
- Plan 03 kann SHOP_ID-Imports aller übrigen Dateien auf getShopId() umstellen

---
*Phase: 07-server-sync-multi-laden*
*Completed: 2026-03-24*
