---
phase: 21-offline-fallback-dexie-als-cache
plan: "01"
subsystem: client/offline
tags: [offline, dexie, tanstack-query, pwa, cold-start]
dependency_graph:
  requires: []
  provides: [OFFL-01]
  affects: [client/src/features/pos/ArticleGrid.tsx, client/src/hooks/api/useProducts.ts, client/src/hooks/api/useCategories.ts]
tech_stack:
  added: []
  patterns: [dexie-fallback, try-catch-queryFn, write-through-cache]
key_files:
  created: []
  modified:
    - client/src/hooks/api/useProducts.ts
    - client/src/hooks/api/useCategories.ts
    - client/src/features/pos/ArticleGrid.tsx
decisions:
  - "try/catch um gesamte queryFn statt separatem Fehler-Handler: deckt sowohl Netzwerkfehler als auch HTTP-Fehler (res.ok=false) ab"
  - "Spezifischer Fehler-Throw wenn Cache leer: transparentes Fehlerbild statt stiller Empty-State"
  - "db-Import in ArticleGrid neben getShopId ergänzt: getShopId war bereits importiert, nur db fehlte"
metrics:
  duration: "~5 min"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_modified: 3
requirements_covered: [OFFL-01]
---

# Phase 21 Plan 01: Dexie Cold-Start Fallback Summary

Dexie-Fallback in queryFns von useProducts, useCategories und ArticleGrid eingebaut — POS startet nach App-Neustart offline aus IndexedDB-Cache statt mit Fehler-State.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dexie-Fallback in useProducts und useCategories | bbf4e0f | useProducts.ts, useCategories.ts |
| 2 | Dexie-Fallback in ArticleGrid (POS Cold-Start offline) | 28f6c0c | ArticleGrid.tsx |

## What Was Built

Alle drei Query-Funktionen, die Produkte und Kategorien laden, haben jetzt einen `try/catch`-Wrapper:

- **try-Block:** Online-Pfad (Fetch + Write-Through nach Dexie) unverändert
- **catch-Block:** Liest aus Dexie (`db.products.where('shopId').equals(shopId)`), gibt Cache zurück wenn vorhanden, wirft spezifischen Fehler wenn leer

Der POS-spezifische Fallback in `ArticleGrid` filtert auch im Offline-Pfad nur aktive Produkte (`.filter(p => p.active)`), analog zum Online-Pfad.

## Deviations from Plan

Keine — Plan exakt wie beschrieben umgesetzt.

## Known Stubs

Keine.

## Self-Check: PASSED

- client/src/hooks/api/useProducts.ts — vorhanden, enthält Dexie-Fallback
- client/src/hooks/api/useCategories.ts — vorhanden, enthält Dexie-Fallback
- client/src/features/pos/ArticleGrid.tsx — vorhanden, enthält Dexie-Fallback mit db-Import
- Commit bbf4e0f — vorhanden
- Commit 28f6c0c — vorhanden
- TypeScript-Build: erfolgreich (keine Fehler)
