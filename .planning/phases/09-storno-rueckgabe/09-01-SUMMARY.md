---
phase: 09-storno-rueckgabe
plan: 01
subsystem: storno-rueckgabe
tags: [storno, rueckgabe, outbox, sync, ui]
dependency_graph:
  requires: [08-02]
  provides: [STOR-01, STOR-02]
  affects: [sync, reports, inventory]
tech_stack:
  added: []
  patterns: [outbox-delta-event, dexie-v4-upgrade, drizzle-nullable-column]
key_files:
  created:
    - server/src/db/migrations/0004_add_cancelled_at.sql
  modified:
    - client/src/db/schema.ts
    - server/src/db/schema.ts
    - server/src/routes/sync.ts
    - client/src/features/admin/reports/SaleDetailModal.tsx
    - client/src/features/admin/reports/DailyReport.tsx
decisions:
  - "Dexie v4 migration: cancelledAt als Index auf sales — ermöglicht effiziente filter(!cancelledAt) Abfragen"
  - "SaleCancelSchema und ItemReturnSchema auf Modul-Ebene — konsistent mit bestehender StockAdjustSchema-Konvention"
  - "onSaleChanged als optionale Prop — rückwärtskompatibel, kein Breaking Change für bestehende Aufrufer"
  - "window.confirm für Storno-Bestätigung — einfachste Touch-kompatible Lösung ohne Custom-Modal"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-24"
  tasks_completed: 3
  files_modified: 5
  files_created: 1
---

# Phase 09 Plan 01: Storno und Rückgabe Summary

Storno und Rückgabe implementiert: vollständige Verkaufsstornierung (STOR-01) via SALE_CANCEL-Outbox-Eintrag und Einzelartikel-Rückgabe (STOR-02) via ITEM_RETURN-Outbox-Eintrag — beide offline-fähig mit lokaler Bestandskorrektur und serverseitiger Synchronisation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schemas erweitern — Dexie v4, Drizzle, OutboxEntry-Typen | 373982c | client/src/db/schema.ts, server/src/db/schema.ts, migrations/0004_add_cancelled_at.sql |
| 2 | Server-Handler — SALE_CANCEL und ITEM_RETURN in sync.ts | 66ed08a | server/src/routes/sync.ts |
| 3 | UI — SaleDetailModal (Buttons) + DailyReport (visuelle Markierung) | c0d436b | SaleDetailModal.tsx, DailyReport.tsx |

## What Was Built

**Storno (STOR-01):**
- SaleDetailModal zeigt "Verkauf stornieren"-Button für nicht-stornierte Verkäufe
- Bestätigung via `window.confirm` — kein eigenes Modal nötig
- Klick setzt `sale.cancelledAt` lokal in Dexie, bucht Bestand aller Items zurück, erstellt SALE_CANCEL-Outbox-Eintrag
- Server verarbeitet SALE_CANCEL: setzt `sales.cancelledAt`, addiert `products.stock + quantity` für alle Items
- DailyReport: stornierte Zeilen rot (bg-red-50), Uhrzeit durchgestrichen, "Storno"-Label
- Stornierter Sale zeigt roten Banner "Storniert" + Datum/Uhrzeit im Modal

**Rückgabe (STOR-02):**
- Per-Artikel "Zurück"-Button in SaleDetailModal-Tabelle (neue Spalte)
- Disabled wenn Sale storniert oder Artikel bereits zurückgegeben
- Klick addiert productId zu `sale.returnedItems` in Dexie, bucht Bestand des Artikels zurück, erstellt ITEM_RETURN-Outbox-Eintrag
- Modal bleibt offen für weitere Rückgaben
- Zurückgegebene Artikel: Zeile gedimmt (opacity-50), Text durchgestrichen, Checkmark statt Button
- Server verarbeitet ITEM_RETURN: addiert `products.stock + quantity` für den zurückgegebenen Artikel

**Kennzahlen:**
- DailyReport-Stats (count, totalCents, donationCents) filtern stornierte Verkäufe heraus

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files created/modified:
- FOUND: /Users/simonluthe/Documents/fairstand/client/src/db/schema.ts
- FOUND: /Users/simonluthe/Documents/fairstand/server/src/db/schema.ts
- FOUND: /Users/simonluthe/Documents/fairstand/server/src/db/migrations/0004_add_cancelled_at.sql
- FOUND: /Users/simonluthe/Documents/fairstand/server/src/routes/sync.ts
- FOUND: /Users/simonluthe/Documents/fairstand/client/src/features/admin/reports/SaleDetailModal.tsx
- FOUND: /Users/simonluthe/Documents/fairstand/client/src/features/admin/reports/DailyReport.tsx

Commits verified:
- 373982c: feat(09-01): extend schemas for Storno/Rueckgabe
- 66ed08a: feat(09-01): add SALE_CANCEL and ITEM_RETURN handlers in sync.ts
- c0d436b: feat(09-01): Storno and Rueckgabe UI in SaleDetailModal and DailyReport

TypeScript: clean (0 errors)
