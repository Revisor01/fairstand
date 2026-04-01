---
phase: 28-inventur-uebersicht-preis-auswertung
plan: "02"
subsystem: frontend
tags: [inventory, price-history, tabs, reports, admin]
dependency_graph:
  requires: [28-01]
  provides: [INV-01, INV-02, INV-03, PRICE-02]
  affects: [MonthlyReport, ProductStats]
tech_stack:
  added: []
  patterns: [tab-navigation, inline-data-fetching, expandable-rows]
key_files:
  created: []
  modified:
    - client/src/features/admin/reports/MonthlyReport.tsx
    - client/src/features/admin/products/ProductStats.tsx
decisions:
  - Zeitraum-Auswahl in ProductStats nur im Stats-Tab sichtbar (irrelevant fuer Price-History)
  - Monatsselektor in MonthlyReport nur bei nicht-Inventur-Tabs angezeigt
metrics:
  duration: "2 minutes"
  completed: "2026-04-01"
  tasks: 2
  files: 2
---

# Phase 28 Plan 02: Inventur-Tab und Preis-History-Tab Summary

**One-liner:** Inventur-Tab mit expandierbarer EK-Aufschlüsselung in MonthlyReport und Preis-History-Tab mit Richtungsindikator in ProductStats.

## What Was Built

### Task 1: Inventur-Tab in MonthlyReport.tsx (commit: 868d5f2)

Erweitert `MonthlyReport.tsx` um einen dritten Tab "Inventur" neben "Monat" und "Jahr":

- Neuer `activeTab` State (`'monat' | 'jahr' | 'inventur'`)
- Interfaces `EkBreakdownEntry`, `InventoryItem`, `InventoryResponse`
- `useEffect` laedt `/api/reports/inventory?year=...` bei Tab-Wechsel auf 'inventur'
- Tabelle mit Spalten: Artikel, Bestand, Verkauft, VK-Umsatz, EK-Kosten
- Expandierbare EK-Unterzeilen fuer Artikel mit mehreren EK-Preisen (▶/▼ Button)
- Fette Summenzeile "Bestandswert-Summe" am Ende mit Gesamtbestand, Gesamtverkauft, VK-Summe, Bestandswert aus `total_stock_value_cents`
- Monatsselektor versteckt sich im Inventur-Tab (irrelevant dort)
- Hinweis-Fussnote: Bestandswert basiert auf aktuellem EK (kein FIFO)

### Task 2: Preis-History-Tab in ProductStats.tsx (commit: 5fcc229)

Erweitert `ProductStats.tsx` um einen zweiten Tab "Preis-History":

- Neuer `statsTab` State (`'stats' | 'price-history'`)
- Interface `PriceHistoryEntry` fuer API-Response
- `useEffect` laedt `/api/products/:id/price-history` bei Tab-Wechsel auf 'price-history'
- Tabelle mit Spalten: Datum, Feld (EK/VK-Übersetzung), Alter Preis, Neuer Preis
- Richtungsindikator: `↑` in rose-500 bei Erhöhung, `↓` in emerald-500 bei Senkung
- Offline-Hinweis wenn `!navigator.onLine`
- "Keine Preisänderungen vorhanden" bei leerem Array
- Zeitraum-Auswahl-Buttons nur im Stats-Tab sichtbar

### Task 3: Checkpoint human-verify (auto-approved)

Visueller Verifikations-Checkpoint wurde im autonomen Modus auto-approved. TypeScript-Build sauber bestaetigt.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — beide Tabs fetchen echte Daten von den in Plan 28-01 implementierten Endpoints.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | 868d5f2 | feat(28-02): Inventur-Tab in MonthlyReport mit expandierbaren EK-Zeilen |
| Task 2 | 5fcc229 | feat(28-02): Preis-History-Tab in ProductStats mit Datumsformatierung |

## Self-Check: PASSED
