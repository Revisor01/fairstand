---
phase: 26-responsive-ux
plan: "02"
subsystem: pos-layout
tags: [responsive, sidebar, cartpanel, posscreen, mediaququery]
dependency_graph:
  requires: [26-01]
  provides: [responsive-pos-layout]
  affects: [CartPanel, POSScreen]
tech_stack:
  added: []
  patterns: [window.matchMedia reactive, derived state from two booleans, shared panel content subpattern]
key_files:
  created: []
  modified:
    - client/src/features/pos/CartPanel.tsx
    - client/src/features/pos/POSScreen.tsx
decisions:
  - CartPanel gemeinsamer panelContent als Variable statt Subkomponente — klarer bei zwei unterschiedlichen Containern
  - Sidebar-CartPanel rendert kein X-Button und kein Overlay — nicht nötig bei statischer Spalte
  - onAddToCart setzt setIsCartOpen nur wenn !shouldShowSidebar — Sidebar ist immer sichtbar
metrics:
  duration_minutes: 12
  completed_date: "2026-03-25"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 26 Plan 02: Responsives POS-Layout mit Warenkorb-Sidebar Summary

**One-liner:** Responsives POS-Layout mit CartPanel als statische Sidebar auf lg+ Screens via window.matchMedia und cart_sidebar_enabled Setting.

## What Was Built

POSScreen.tsx lädt beim Start die Shop-Einstellung `cart_sidebar_enabled` aus `/api/settings` und überwacht via `window.matchMedia('(min-width: 1024px)')` reaktiv die Bildschirmbreite. Wenn beides aktiv ist (`shouldShowSidebar = cartSidebarEnabled && isLargeScreen`), wird CartPanel als fixe rechte Spalte (`sidebar={true}`) neben dem Artikel-Grid gerendert — kein Overlay, kein Slide-In. Auf schmalen Screens oder bei deaktivierter Einstellung bleibt das bestehende Slide-In Verhalten unverändert.

CartPanel wurde umgebaut: Der gemeinsame Panel-Inhalt (Artikel-Liste + Footer) ist in eine `panelContent` Variable ausgelagert. Im Sidebar-Modus wird ein statisches `w-80` div ohne X-Button und ohne Overlay gerendert; im Slide-In Modus das bisherige `fixed inset-y-0` Panel.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CartPanel sidebar-Modus als statische Spalte | 13efd6f | client/src/features/pos/CartPanel.tsx |
| 2 | POSScreen responsives Layout mit Settings-Fetch | 1be54f0 | client/src/features/pos/POSScreen.tsx |

## Decisions Made

- **panelContent als Variable statt Subkomponente:** Beide Render-Pfade (sidebar/slide-in) verwenden denselben JSX-Block für Inhalt und Footer. Als Variable statt Subkomponente vermeidet unnötige Prop-Durchreichung.
- **Kein X-Button im Sidebar-Modus:** Die Sidebar kann nicht geschlossen werden — sie ist immer sichtbar. Ein X-Button würde verwirren.
- **setIsCartOpen nur im Slide-In Modus:** `onAddToCart` ruft `setIsCartOpen(true)` nur auf wenn `!shouldShowSidebar` — im Sidebar-Modus ist der Warenkorb ohnehin immer sichtbar.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- client/src/features/pos/CartPanel.tsx: FOUND
- client/src/features/pos/POSScreen.tsx: FOUND
- Commit 13efd6f: FOUND
- Commit 1be54f0: FOUND
