---
phase: 19-tanstack-query-foundation
plan: "01"
subsystem: frontend
tags: [tanstack-query, react-query, hooks, api]
dependency_graph:
  requires: []
  provides: [useProducts, useCategories, QueryClientProvider]
  affects: [client/src/App.tsx, client/src/hooks/api/]
tech_stack:
  added:
    - "@tanstack/react-query@^5.95.2"
    - "@tanstack/react-query-devtools@^5.95.2"
  patterns:
    - "QueryClient auf Modul-Ebene (nicht in Render-Funktion)"
    - "useQuery mit queryKey: [entity, shopId]"
    - "useMutation mit invalidateQueries onSuccess"
    - "snake_case zu camelCase Mapping in queryFn"
key_files:
  created:
    - client/src/hooks/api/useProducts.ts
    - client/src/hooks/api/useCategories.ts
  modified:
    - client/src/App.tsx
    - client/package.json
decisions:
  - "AppInner-Komponente extrahiert damit QueryClientProvider als äußerster Wrapper um gesamte App-Logik liegt"
  - "Category.sortOrder und Category.createdAt in Mapping berücksichtigt — Interface hat mehr Felder als Plan-Dokumentation angab"
metrics:
  duration: "128 seconds"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 4
---

# Phase 19 Plan 01: TanStack Query Foundation Summary

@tanstack/react-query v5 installiert, QueryClientProvider in App.tsx eingebunden, useProducts und useCategories Hook-Dateien mit vollständigen Query- und Mutation-Hooks erstellt.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | @tanstack/react-query installieren und QueryClientProvider einbinden | 57eeffb | client/package.json, client/src/App.tsx |
| 2 | useProducts.ts und useCategories.ts Hook-Infrastruktur erstellen | 7ecc663 | client/src/hooks/api/useProducts.ts, client/src/hooks/api/useCategories.ts |

## What Was Built

### Task 1: QueryClientProvider Setup

- `@tanstack/react-query@^5.95.2` und `@tanstack/react-query-devtools@^5.95.2` installiert
- `QueryClient` auf Modul-Ebene in App.tsx mit `staleTime: 30s`, `gcTime: 5min`, `retry: 1`
- `AppInner`-Komponente aus bestehender App-Logik extrahiert
- `App()` als `QueryClientProvider`-Wrapper um `AppInner`
- `ReactQueryDevtools` nur im `import.meta.env.DEV`-Build eingebunden

### Task 2: API-Hooks

**useProducts.ts** (`client/src/hooks/api/useProducts.ts`):
- `useProducts()` — GET /api/products mit snake_case→camelCase Mapping via `mapServerProduct()`
- `useCreateProduct()` — POST /api/products, invalidiert `['products', shopId]`
- `useUpdateProduct()` — POST /api/products mit `updatedAt: Date.now()`, invalidiert Cache
- `useToggleProductActive()` — PATCH /api/products/:id/activate|deactivate
- `useAdjustStock()` — POST /api/sync mit STOCK_ADJUST OutboxEntry-Format

**useCategories.ts** (`client/src/hooks/api/useCategories.ts`):
- `useCategories()` — GET /api/categories mit snake_case Mapping inkl. `sortOrder` und `createdAt`
- `useCreateCategory()` — POST /api/categories
- `useRenameCategory()` — PATCH /api/categories/:id, invalidiert auch `['products', shopId]`
- `useDeleteCategory()` — DELETE /api/categories/:id, behandelt 409-Konflikt als spezifischen Fehler

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Category-Typ hat sortOrder und createdAt**
- **Found during:** Task 2, TypeScript Build
- **Issue:** Plan-Dokumentation definiert Category als `{ id, shopId, name }`, aber `client/src/db/schema.ts` hat `sortOrder: number` und `createdAt: number` als Pflichtfelder
- **Fix:** Mapping in `useCategories.ts` um `sortOrder` und `createdAt` erweitert
- **Files modified:** `client/src/hooks/api/useCategories.ts`
- **Commit:** 7ecc663

## Known Stubs

Keine. Alle Hooks sind vollständig implementiert und lesen vom Server. Die Hooks werden erst in Plan 02 und 03 von Komponenten verwendet.

## Self-Check: PASSED
