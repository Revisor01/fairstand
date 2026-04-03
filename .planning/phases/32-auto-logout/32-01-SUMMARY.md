---
phase: 32-auto-logout
plan: 01
subsystem: auth
tags: [custom-event, dom-events, react-state, auto-logout, token-expiration]

requires: []
provides:
  - "authFetch dispatcht CustomEvent 'auth:logout' bei 401-Antwort vom Server"
  - "useAuth hoert auf 'auth:logout' und setzt React-State sauber auf 'locked'"
  - "Kein Page-Reload mehr bei Token-Expiration — sauberer React-State-Uebergang"
affects: [auth, serverAuth, useAuth, UnlockedApp]

tech-stack:
  added: []
  patterns:
    - "Custom DOM Event als Kommunikationskanal zwischen authFetch (ausserhalb React) und useAuth (Hook)"
    - "window.addEventListener in useEffect mit leerem Dependency-Array fuer einmalige Registrierung"
    - "Cleanup via removeEventListener im useEffect return"

key-files:
  created: []
  modified:
    - client/src/features/auth/serverAuth.ts
    - client/src/features/auth/useAuth.ts

key-decisions:
  - "CustomEvent statt window.location.reload() verhindert White-Screen und ermoeoglich sauberen React-State-Uebergang"
  - "clearSession() im Event-Handler nicht noetig — authFetch hat localStorage.removeItem('session') bereits ausgefuehrt"
  - "setShopId('') direkt im Handler statt ueber lock() — da clearSession() nicht benoetigt wird"

patterns-established:
  - "Custom DOM Events verbinden nicht-React-Code (authFetch) mit React-State (useAuth)"

requirements-completed: [AUTH-01]

duration: 5min
completed: 2026-04-03
---

# Phase 32 Plan 01: Auto-Logout Summary

**CustomEvent 'auth:logout' ersetzt window.location.reload() bei 401 — sauberer React-State-Uebergang ohne Page-Reload**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T15:20:00Z
- **Completed:** 2026-04-03T15:25:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- authFetch dispatcht bei 401-Antwort ein CustomEvent('auth:logout') statt window.location.reload() aufzurufen
- useAuth registriert einen window.addEventListener fuer 'auth:logout' und setzt state auf 'locked'
- UnlockedApp wird durch den State-Wechsel unmounted — Warenkorb automatisch geleert, PinScreen erscheint sofort

## Task Commits

Jeder Task wurde atomar committed:

1. **Task 1: authFetch — CustomEvent statt window.location.reload()** - `8cd7790` (feat)
2. **Task 2: useAuth — 'auth:logout' Event abfangen und lock() aufrufen** - `120290b` (feat)

**Plan metadata:** (folgt)

## Files Created/Modified

- `client/src/features/auth/serverAuth.ts` - 401-Handler: window.dispatchEvent(new CustomEvent('auth:logout')) statt window.location.reload()
- `client/src/features/auth/useAuth.ts` - Neuer useEffect mit addEventListener/removeEventListener fuer auth:logout

## Decisions Made

- CustomEvent-Pattern gewaehlt um authFetch (ausserhalb React-Baum) mit useAuth-Hook zu verbinden — keine direkten Imports noetig
- clearSession() wird im Event-Handler nicht aufgerufen, da authFetch bereits localStorage.removeItem('session') ausgefuehrt hat — DRY

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 32 vollstaendig abgeschlossen
- Auto-Logout via Token-Expiration funktioniert sauber ohne Page-Reload
- Keine Folge-Phasen im v9.0-Milestone

---
*Phase: 32-auto-logout*
*Completed: 2026-04-03*
