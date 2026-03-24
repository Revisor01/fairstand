---
phase: 10-ui-redesign
plan: 01
subsystem: ui
tags: [react, tailwind, pwa, touch, paymentflow, pos]

# Dependency graph
requires:
  - phase: 09-storno-rueckgabe
    provides: "SaleSummary.tsx als Referenz-Stil, CartItem-Typen, useCart-Hook"
  - phase: 07-server-sync-multi-laden
    provides: "serverAuth.ts mit getStoredSession() und StoredSession-Interface"
provides:
  - "PaymentFlow.tsx als Ein-Screen-Redesign mit Artikelliste und Live-Berechnung"
  - "Shop-Name im POS-Header via getStoredSession()"
  - "Shop-Name im Admin-Header via getStoredSession()"
affects: [pos, admin]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getStoredSession() in useEffect für Shop-Name-Anzeige im Header"
    - "Inline-Zifferneingabe (Numpad) innerhalb einer Karte statt Vollseiten-NumPad"
    - "Live-Berechnung ohne Screen-Wechsel (kein PaymentStep-State mehr)"

key-files:
  created: []
  modified:
    - client/src/features/pos/PaymentFlow.tsx
    - client/src/features/pos/POSScreen.tsx
    - client/src/features/admin/AdminScreen.tsx

key-decisions:
  - "PaymentFlow kein 2-Step-Flow mehr — Ein-Screen mit Live-Berechnungen (kein PaymentStep-State)"
  - "Inline-Numpad in der Karte statt NumPad-Vollseite — kompakter, keine Navigation nötig"
  - "getStoredSession() Pattern für Shop-Name in Header — konsistent mit serverAuth-Architektur aus Phase 07"

patterns-established:
  - "Shop-Name-Pattern: useState('') + useEffect mit getStoredSession() in Screen-Komponenten"
  - "PaymentFlow-Layout: min-h-screen bg-sky-50, innere Karte max-w-sm bg-white rounded-2xl"

requirements-completed: [UI-01, UI-02, UI-03]

# Metrics
duration: 12min
completed: 2026-03-24
---

# Phase 10 Plan 01: UI-Redesign PaymentFlow Summary

**PaymentFlow von 2-Step-Fullscreen auf Ein-Screen-Karte umgestellt: Artikelliste, Live-Wechselgeld/Spende-Berechnung, Shop-Name in POS- und Admin-Header via getStoredSession()**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-24T12:30:00Z
- **Completed:** 2026-03-24T12:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- PaymentFlow komplett neu geschrieben: Ein-Screen-Layout im SaleSummary-Stil (bg-sky-50, max-w-sm, rounded-2xl), kein 2-Step-Flow mehr
- Artikelliste mit Menge und Einzelpreis direkt in der Bezahlkarte sichtbar, Gesamtsumme prominent angezeigt
- Wechselgeld und Spende werden live berechnet sobald paidCents >= totalCents — Schnellauswahl-Buttons "Kein Wechselgeld" / "Alles zurück"
- Shop-Name erscheint im POS-Header unterhalb von "Fairstand Kasse" und im Admin-Header unterhalb von "Verwaltung"

## Task Commits

Jeder Task wurde atomisch committed:

1. **Task 1: PaymentFlow — Ein-Screen-Redesign mit Artikelliste und Live-Berechnung** - `dfdb2b3` (feat)
2. **Task 2: Shop-Name in POS- und Admin-Header, PaymentFlow-Props aktualisiert** - `f9574fd` (feat)

**Plan metadata:** (folgt mit diesem Commit)

## Files Created/Modified

- `client/src/features/pos/PaymentFlow.tsx` — Komplett neu geschrieben: Ein-Screen statt 2-Step, items: CartItem[] Prop, Inline-Numpad, Live-Berechnung
- `client/src/features/pos/POSScreen.tsx` — getStoredSession() + shopName State + Header-Erweiterung + items-Prop an PaymentFlow
- `client/src/features/admin/AdminScreen.tsx` — useEffect importiert, getStoredSession() + shopName State + Header-Erweiterung

## Decisions Made

- PaymentFlow kein 2-Step-Flow mehr — kein `PaymentStep = 'paid' | 'change'` State, alles auf einem Screen
- Inline-Numpad in der Karte: kein separater NumPad-Import mehr, eigene Ziffernbuttons direkt in der Karte, kompakter
- getStoredSession()-Pattern für Shop-Name konsistent mit serverAuth-Architektur aus Phase 07

## Deviations from Plan

Keine — Plan wurde exakt wie geschrieben ausgeführt.

## Issues Encountered

Keine.

## Known Stubs

Keine — alle Datenquellen sind vollständig verdrahtet (items via useCart, shopName via getStoredSession).

## Next Phase Readiness

- PaymentFlow-Redesign abgeschlossen, bereit für Phase 10-02 (falls vorhanden)
- Shop-Name-Anzeige funktioniert in POS und Admin sobald Session geladen
- TypeScript-Kompilierung sauber

---
*Phase: 10-ui-redesign*
*Completed: 2026-03-24*

## Self-Check: PASSED

- PaymentFlow.tsx: FOUND
- POSScreen.tsx: FOUND
- AdminScreen.tsx: FOUND
- 10-01-SUMMARY.md: FOUND
- Commit dfdb2b3: FOUND
- Commit f9574fd: FOUND
