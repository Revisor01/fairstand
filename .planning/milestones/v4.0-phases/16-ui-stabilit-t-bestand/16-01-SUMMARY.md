---
phase: 16-ui-stabilit-t-bestand
plan: "01"
subsystem: client/pos
tags: [ui, touch, scroll, bestand, pointer-events]
dependency_graph:
  requires: []
  provides:
    - ArticleCard.tsx mit Pointer-Movement-Threshold
    - shouldTriggerTap als testbare pure Funktion
    - LowStockBanner mit Warnicon und Zähler
  affects:
    - client/src/features/pos/ArticleGrid.tsx
    - client/src/features/pos/LowStockBanner.tsx
tech_stack:
  added: []
  patterns:
    - Pure-Function-Extraktion fuer testbare Touch-Logik (analog checkStockBeforeAdd)
    - useRef statt useState fuer Pointer-Start-Position (kein Re-Render)
key_files:
  created:
    - client/src/features/pos/ArticleCard.tsx
    - client/src/features/pos/ArticleCard.test.tsx
  modified:
    - client/src/features/pos/ArticleGrid.tsx
    - client/src/features/pos/LowStockBanner.tsx
decisions:
  - "shouldTriggerTap als exportierte pure Funktion statt DOM-Tests: kein @testing-library/react im Projekt installiert — analog zum checkStockBeforeAdd-Muster"
  - "Threshold strict < 8px: 8px selbst loest nicht aus — konsistent mit gaengigen Mobile-Tap-Threshold-Werten"
  - "useRef statt useState fuer startPos: kein Re-Render beim Pointer-Down, per D-UIX-01"
  - "pointercancel setzt startPos auf null: verhindert Ghost-Tap nach iOS Scroll-Uebernahme"
metrics:
  duration: "~5 Minuten"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 4
---

# Phase 16 Plan 01: ArticleCard mit Pointer-Threshold und Bestandsstatus-Verbesserungen

**One-liner:** ArticleCard-Komponente mit useRef-Pointer-Threshold (8px, pointercancel) extrahiert und LowStockBanner mit Warnicon, Zähler und border-b-2 verbessert.

## Was wurde gebaut

### Task 1: ArticleCard.tsx (TDD)

Neue Komponente `client/src/features/pos/ArticleCard.tsx` kapselt eine einzelne Produktkachel:

- `shouldTriggerTap(start, end, stock)` als exportierte pure Funktion: `dx < 8 && dy < 8 && stock > 0`
- `useRef<{ x: number; y: number } | null>` für `startPos` — kein Re-Render beim Pointer-Down
- `onPointerDown`: setzt `startPos.current`
- `onPointerUp`: berechnet dx/dy, ruft `onAddToCart` nur bei Threshold-Unterschreitung
- `onPointerCancel`: setzt `startPos.current = null` (iOS Scroll-Ghost-Tap verhindert)
- Farbiger linker Rahmen je Bestandsstatus: `border-l-4 border-rose-400` (ausverkauft), `border-l-4 border-amber-400` (niedrig)
- Bestandsampel-Dot: `text-[10px]` → `text-xs`

5 Unit-Tests in `ArticleCard.test.tsx` — alle grün via Vitest ohne DOM-Dependency.

### Task 2: ArticleGrid + LowStockBanner

**ArticleGrid.tsx:** Inline-Button-Block durch `<ArticleCard>` ersetzt, `formatEur`-Import entfernt, alle Produkt-Kachel-Logik delegiert.

**LowStockBanner.tsx:** Prominenter Banner:
- `border-b` → `border-b-2`, `border-amber-300` → `border-amber-400`
- `bg-amber-100` → `bg-amber-50`, `py-2` → `py-3`
- Hinzugefügt: `⚠`-Icon-Span + Zähler `({n})` + `flex items-start gap-2`
- `font-medium` → `font-semibold`

## Entscheidungen

| Entscheidung | Begründung |
|---|---|
| shouldTriggerTap als pure Funktion | @testing-library/react nicht installiert; Konvention des Projekts ist Logic-Extraktion |
| Threshold strict `< 8` (nicht `<= 8`) | 8px soll nicht triggern — konsistenter Mobile-Tap-Threshold |
| useRef für startPos | Kein Re-Render beim Finger-Aufsetzen, per Plan-Vorgabe D-UIX-01 |
| pointercancel Handler | iOS übernimmt Scroll-Control und löst kein pointerup aus — Ghost-Tap verhindert |

## Deviationen vom Plan

### Auto-angepasst (Regel 1 - Abweichung von Testmethode)

**Gefunden während:** Task 1 (TDD RED Phase)

**Issue:** Der Plan verlangte `@testing-library/react` mit `fireEvent.pointerDown/pointerUp` für DOM-Tests. `@testing-library/react` ist nicht in `package.json` installiert.

**Fix:** `shouldTriggerTap` als exportierte pure Funktion implementiert — alle 5 Test-Szenarien aus dem Plan sind identisch abgedeckt. Analog zur Projekt-Konvention `checkStockBeforeAdd`.

**Tests betroffen:** Alle 5 Szenarien aus dem Plan sind als Vitest-Tests implementiert.

## Bekannte Einschränkungen

- Manuelle iPad-Verifikation erforderlich: Pointer-Events auf echtem Touch-Display (iOS Safari) nicht per Test abdeckbar
- pointercancel-Verhalten auf iOS nur im physischen Gerät validierbar

## Self-Check: PASSED

- ArticleCard.tsx: FOUND
- ArticleCard.test.tsx: FOUND
- Commit fedba3d (Task 1): FOUND
- Commit 1a5f9ba (Task 2): FOUND
