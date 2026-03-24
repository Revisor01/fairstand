---
phase: 08-bestandspruefung-verkaufshistorie
plan: "01"
subsystem: ui
tags: [react, typescript, vitest, tailwind, dexie, pos]

# Dependency graph
requires:
  - phase: 07-server-sync-multi-laden
    provides: getShopId(), serverAuth, Produkt-Schema mit stock/minStock
provides:
  - AddItemResult Typ + checkStockBeforeAdd() Funktion (useCart.ts)
  - Bestandsanzeige auf Artikelkacheln (ArticleGrid.tsx)
  - disabled-State für ausverkaufte Artikel
  - Stock-Toast in POSScreen bei Überverkaufsversuch
affects:
  - Phase 08 Plan 02 (Verkaufshistorie)
  - Phase 09 (Stornierung)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AddItemResult Discriminated Union: { added: true } | { added: false; reason } — kein boolean-Return bei Seiteneffekten"
    - "checkStockBeforeAdd als exportierte Pure Function — Hook-Logik testbar ohne React-Testumgebung"
    - "proxyProduct.stock = saleItem.quantity für Storno-Re-Fill — verhindert Stock-Blockierung bei Korrektur-Flow"

key-files:
  created:
    - client/src/features/pos/useCart.test.ts
  modified:
    - client/src/features/pos/useCart.ts
    - client/src/features/pos/ArticleGrid.tsx
    - client/src/features/pos/POSScreen.tsx

key-decisions:
  - "checkStockBeforeAdd als exportierte Pure Function statt inline in addItem — ermöglicht Unit-Tests ohne React-Hooks"
  - "proxyProduct.stock = saleItem.quantity beim Storno-Re-Fill — addItem mit stock:0 würde alle Korrektur-Artikel blockieren"
  - "Toast in POSScreen statt in ArticleGrid — ArticleGrid-Props bleiben stabil (void-Return), Feedback-Logik liegt beim Aufrufer"

patterns-established:
  - "AddItemResult-Pattern: Seiteneffekt-Funktionen geben Discriminated-Union zurück statt void/boolean"
  - "Vitest-Testbarkeit: Hook-Logik in exportierte Pure Functions auslagern wenn kein React-Setup nötig"

requirements-completed:
  - BEST-01
  - BEST-02

# Metrics
duration: 7min
completed: 2026-03-24
---

# Phase 08 Plan 01: Bestandsanzeige und Überverkauf-Blockierung Summary

**Artikelkacheln zeigen Bestand (Ausverkauft/Noch X/X Stk.) via AddItemResult-Pattern mit 6 Vitest Unit-Tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-24T10:33:07Z
- **Completed:** 2026-03-24T10:40:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `useCart.addItem` gibt jetzt `AddItemResult` zurück; prüft Bestand vor dem `dispatch`
- `checkStockBeforeAdd` als exportierte Pure Function mit 6 Unit-Tests in vitest
- Artikelkacheln zeigen Bestandszahl: "Ausverkauft" (rose), "Noch X" (amber), "X Stk." (slate)
- Ausverkaufte Kacheln: `disabled`, `opacity-50 cursor-not-allowed`, kein Warenkorb-Öffnen
- POSScreen zeigt rose-Toast wenn `cart.addItem` `{ added: false }` zurückgibt

## Task Commits

1. **Task 1: useCart addItem mit Bestandsprüfung** - `f8a8aea` (feat + test — TDD RED/GREEN)
2. **Task 2: ArticleGrid + POSScreen** - `b99ded8` (feat)

## Files Created/Modified

- `client/src/features/pos/useCart.ts` — AddItemResult Typ, checkStockBeforeAdd(), addItem-Rückgabe
- `client/src/features/pos/useCart.test.ts` — 6 Unit-Tests für checkStockBeforeAdd
- `client/src/features/pos/ArticleGrid.tsx` — Bestandsanzeige, disabled-State auf Kacheln
- `client/src/features/pos/POSScreen.tsx` — stockError-State, Toast-Anzeige, result.added-Auswertung

## Decisions Made

- checkStockBeforeAdd als exportierte Pure Function: ermöglicht Unit-Tests ohne React Hooks Testing Library
- proxyProduct.stock = saleItem.quantity beim Storno-Re-Fill: addItem mit stock:0 hätte alle Korrektur-Artikel blockiert
- Toast-Logik in POSScreen statt ArticleGrid: ArticleGrid Props-Interface bleibt stabil

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] proxyProduct.stock in handleCorrect auf saleItem.quantity gesetzt**
- **Found during:** Task 1 (addItem Bestandsprüfung implementiert)
- **Issue:** handleCorrect in POSScreen befüllte den Warenkorb per Proxy-Produkt mit stock:0 — nach dem neuen Stock-Check würde kein einziger Artikel beim Korrigieren mehr hinzugefügt
- **Fix:** proxyProduct.stock = saleItem.quantity — exakt die Menge die re-added wird, kein overflow möglich
- **Files modified:** client/src/features/pos/POSScreen.tsx
- **Verification:** TypeScript kompiliert, build erfolgreich
- **Committed in:** f8a8aea (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — Bug)
**Impact on plan:** Fix notwendig für Korrektheit des Storno-Flows. Kein Scope Creep.

## Issues Encountered

- Unused `AddItemResult` type-import in useCart.test.ts führte zu tsc-Fehler beim Build (`error TS6133`) — Import entfernt. Tests und Build bestehen sauber.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- BEST-01 und BEST-02 vollständig erfüllt
- Plan 08-02 (Verkaufshistorie) kann unabhängig gestartet werden
- Keine Blocker

## Self-Check: PASSED

- useCart.ts: FOUND
- useCart.test.ts: FOUND
- ArticleGrid.tsx: FOUND
- POSScreen.tsx: FOUND
- 08-01-SUMMARY.md: FOUND
- Commit f8a8aea: FOUND
- Commit b99ded8: FOUND

---
*Phase: 08-bestandspruefung-verkaufshistorie*
*Completed: 2026-03-24*
