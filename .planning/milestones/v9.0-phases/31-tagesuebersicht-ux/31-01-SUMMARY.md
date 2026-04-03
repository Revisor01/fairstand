---
phase: 31-tagesuebersicht-ux
plan: 01
subsystem: ui
tags: [react, tailwindcss, dailyreport, donations, datepicker]

# Dependency graph
requires:
  - phase: 27-preis-history-bestandsverlauf
    provides: Sale-Datenstruktur mit donationCents-Feld
provides:
  - Spendenmarkierung in Tagesübersicht (grune Zeilen + fetter Spendenbetrag)
  - Datepicker aktiver Zustand analog zu Preset-Buttons
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Konditionelle Tailwind-Klassen mit Prioritaetskaskade: storniert > Spende > normal"
    - "color-scheme:dark als Tailwind-Arbitrary-Property fuer Safari/iOS native Inputs"

key-files:
  created: []
  modified:
    - client/src/features/admin/reports/DailyReport.tsx

key-decisions:
  - "Prioritaet storniert > Spende > normal — stornierte Zeilen behalten immer roten Hintergrund"
  - "color-scheme:dark noetig damit Kalender-Icon im aktiven (weissen Text) Zustand auf iOS sichtbar bleibt"

patterns-established:
  - "tr-className Prioritaetskaskade: cancelledAt prueft zuerst, dann donationCents > 0, dann Default"

requirements-completed:
  - HIST-01
  - HIST-02

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 31 Plan 01: Tagesübersicht-UX Summary

**Spendenmarkierung in Verkaufstabelle (grune Zeilen + fetter Betrag) und Datepicker aktiver Zustand analog zu Preset-Buttons in DailyReport.tsx**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-03T15:12:12Z
- **Completed:** 2026-04-03T15:13:41Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Verkaufszeilen mit `donationCents > 0` erhalten grunen Hintergrund (`bg-green-50`) — Spenden auf einen Blick erkennbar
- Spendenbetrag in Zeilen mit Spende: `font-bold` + `text-green-700` statt nur `text-green-600`
- Datepicker zeigt `bg-sky-500 text-white` (identisch mit aktiven Preset-Buttons) wenn `rangeMode === 'custom'`

## Task Commits

Jeder Task einzeln committet:

1. **Task 1: Spendenmarkierung in Verkaufstabelle (HIST-01)** - `87bf724` (feat)
2. **Task 2: Datepicker aktiver Zustand (HIST-02)** - `c8383d6` (feat)

## Files Created/Modified

- `client/src/features/admin/reports/DailyReport.tsx` - Spendenmarkierung in tr-className + td-className, Datepicker bedingte className-Logik

## Decisions Made

- Prioritaetskaskade `cancelledAt > donationCents > 0 > default` stellt sicher, dass stornierte Zeilen immer rot bleiben, auch wenn sie eine Spende hatten
- `[color-scheme:dark]` als Tailwind Arbitrary Property benoetigt damit das native Kalender-Icon auf iOS im aktiven (weisser Text auf blauem Hintergrund) Zustand sichtbar bleibt

## Deviations from Plan

Keine — Plan exakt wie beschrieben ausgefuehrt.

Das Akzeptanzkriterium "mindestens 2 Treffer fuer `rangeMode === 'custom'`" war auf eine switch/case-Erwartung bezogen, die nicht zutrifft: Das useMemo nutzt `case 'custom':` statt Gleichheitsoperator. Die Implementierung ist korrekt — der Datepicker hat bedingte className-Logik mit `rangeMode === 'custom'`, TypeScript-Kompilierung ohne Fehler.

## Issues Encountered

Keine.

## User Setup Required

Keine — reine Frontend-UX-Aenderung, kein Setup erforderlich.

## Next Phase Readiness

- Phase 31 abgeschlossen
- Naechste Phase: 32-auto-logout (AUTH-01: Token-Expiration → sauberer Logout statt 401-Fehler)

---
*Phase: 31-tagesuebersicht-ux*
*Completed: 2026-04-03*
