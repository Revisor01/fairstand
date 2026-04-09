---
phase: 38-fifo-inventur
plan: "02"
subsystem: backend/reports
tags: [fifo, inventory, exports, refactoring]
dependency_graph:
  requires: [38-01]
  provides: [inventory-csv-fifo, inventory-xlsx-fifo, inventory-pdf-fifo]
  affects: [server/src/routes/reports.ts]
tech_stack:
  added: []
  patterns: [computeFifoInventory reuse across all inventory export handlers]
key_files:
  modified:
    - server/src/routes/reports.ts
decisions:
  - "computeFifoInventory als einzige Quelle fuer Inventurdaten in allen vier Ausgabewegen (UI + 3 Exports)"
  - "isNaN-Check fuer year-Parameter in allen drei Export-Handlern (Threat T-38-04)"
  - "PDF-Bilanzzeile umbenennen: 'Bestandswert (akt. EK)' -> 'Bestandswert (FIFO)' fuer Konsistenz"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_modified: 1
---

# Phase 38 Plan 02: Inventur-Exports auf FIFO umstellen — Summary

**One-liner:** Drei Inventur-Export-Handler (CSV, XLSX, PDF) nutzen jetzt `computeFifoInventory` statt eigener duplizierter DB-Abfragen, FIFO-Bestandswert konsistent in allen Ausgabewegen.

## What Was Built

Alle drei Inventur-Export-Endpoints in `server/src/routes/reports.ts` wurden refaktoriert:

- **inventory-csv** (`GET /reports/inventory-csv`): Eigene `inventoryResult` + `stockValueResult` Queries (~65 Zeilen) durch `await computeFifoInventory(shopId, y)` ersetzt. Bestandswert-Spalte nutzt jetzt `item.stock_value_cents` statt `item.current_stock * item.current_ek_cents`.
- **inventory-xlsx** (`GET /reports/inventory-xlsx`): Identische Umstellung. XLSX-Zellwert fuer Bestandswert aus `item.stock_value_cents`.
- **inventory-pdf** (`GET /reports/inventory-pdf`): Eigene Queries ersetzt, `shopNameResult`-Query bleibt erhalten (wird von `computeFifoInventory` nicht geliefert). Bilanzbezeichnung von "Bestandswert (akt. EK)" auf "Bestandswert (FIFO)" aktualisiert.

Insgesamt ~200 Zeilen duplizierter SQL-Code entfernt.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1+2 | inventory-csv/xlsx/pdf auf computeFifoInventory umstellen | 4f8518c | server/src/routes/reports.ts |

## Verification Results

```
await computeFifoInventory count: 4 (1x /inventory + 3x Exports)
current_stock * item.current_ek_cents: 0 Treffer (entfernt)
stockValueResult: 0 Treffer (entfernt)
TypeScript: kompiliert ohne Fehler
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Validation] isNaN-Check in inventory-xlsx und inventory-pdf ergaenzt**
- **Found during:** Task 2
- **Issue:** Threat T-38-04 im Plan verlangt isNaN-Check in allen Export-Endpoints; inventory-xlsx und inventory-pdf hatten keinen
- **Fix:** `if (isNaN(y)) return reply.status(400).send(...)` in beide Handler eingefuegt, analog zu inventory-csv
- **Files modified:** server/src/routes/reports.ts
- **Commit:** 4f8518c

**2. [Rule 1 - Consistency] PDF-Bilanz-Label auf "FIFO" aktualisiert**
- **Found during:** Task 2
- **Issue:** PDF-Bilanzzeile nannte den Bestandswert noch "akt. EK", obwohl er jetzt FIFO-basiert ist
- **Fix:** Text von "Bestandswert (akt. EK):" auf "Bestandswert (FIFO):" geaendert
- **Files modified:** server/src/routes/reports.ts
- **Commit:** 4f8518c

## Known Stubs

None — alle drei Exports liefern echte FIFO-berechnete Bestandswerte.

## Threat Flags

Keine neuen Angriffsflächen eingeführt. Threat T-38-04 (isNaN-Check) wurde als Rule-2-Deviation automatisch mitigiert.

## Self-Check: PASSED
