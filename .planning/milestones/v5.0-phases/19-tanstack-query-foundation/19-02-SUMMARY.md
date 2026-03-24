---
phase: 19-tanstack-query-foundation
plan: 02
subsystem: ui
tags: [react, tanstack-query, dexie, admin, products, categories]

# Dependency graph
requires:
  - phase: 19-01
    provides: useProducts, useCategories, useCreateProduct, useUpdateProduct, useToggleProductActive, useAdjustStock, useCreateCategory, useRenameCategory, useDeleteCategory TQ hooks

provides:
  - ProductList reads products directly from server via TQ, toggle via mutation
  - ProductForm saves via useCreateProduct/useUpdateProduct mutations with query invalidation
  - StockAdjustModal adjusts stock via useAdjustStock mutation (replaces Dexie transaction + outbox)
  - CategoryManager reads/creates/renames/deletes categories via TQ hooks

affects:
  - phase-20-websocket
  - phase-21-offline-fallback

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TQ Query + Mutation pattern in admin components (reads from server, writes via mutations, cache invalidated on success)
    - useQueryClient() for explicit invalidation after image upload side-effects

key-files:
  created: []
  modified:
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/admin/products/ProductForm.tsx
    - client/src/features/admin/products/StockAdjustModal.tsx
    - client/src/features/admin/settings/CategoryManager.tsx

key-decisions:
  - "ProductForm retains getShopId() import for constructing new product objects (shopId field)"
  - "ProductForm retains getAuthHeaders() import for image upload (direct fetch, no TQ wrapper for file uploads)"
  - "useQueryClient() called in ProductForm after image upload to invalidate products query — updateProduct.mutateAsync onSuccess invalidates but imageUrl arrives from separate upload request"
  - "StockAdjustModal product.stock preview remains local calculation (product.stock + parsedDelta) — server-truth arrives after mutation onSuccess query invalidation"

patterns-established:
  - "Admin components use TQ for all reads and writes — no direct Dexie access in admin features"
  - "Image uploads use direct fetch + manual queryClient.invalidateQueries — file uploads do not fit TQ mutation pattern"

requirements-completed:
  - LIVE-01
  - LIVE-02

# Metrics
duration: 3min
completed: 2026-03-24
---

# Phase 19 Plan 02: Admin-Komponenten TQ-Migration Summary

**Four admin components migrated from useLiveQuery/Dexie to TanStack Query — reads from server, writes via mutations with automatic query invalidation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T20:31:30Z
- **Completed:** 2026-03-24T20:34:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- ProductList liest Produkte direkt vom Server via useProducts(), Toggle-Aktivierung via useToggleProductActive Mutation
- ProductForm speichert via useCreateProduct/useUpdateProduct Mutations mit automatischer Query-Invalidation — kein db.products.add/update mehr
- StockAdjustModal ersetzt Dexie-Transaktion + Outbox-Eintrag durch useAdjustStock Mutation
- CategoryManager ersetzt useLiveQuery + manuelle fetch-Aufrufe durch useCategories + Mutation-Hooks; kein downloadCategories/downloadProducts mehr

## Task Commits

1. **Task 1: ProductList auf useProducts() umstellen** - `b0092d2` (feat)
2. **Task 2: ProductForm, StockAdjustModal, CategoryManager migrieren** - `ae2e83b` (feat)

## Files Created/Modified

- `client/src/features/admin/products/ProductList.tsx` - useLiveQuery entfernt, useProducts + useToggleProductActive stattdessen
- `client/src/features/admin/products/ProductForm.tsx` - useLiveQuery + Dexie-Writes entfernt, useCategories + useCreateProduct + useUpdateProduct
- `client/src/features/admin/products/StockAdjustModal.tsx` - Dexie-Transaktion + Outbox durch useAdjustStock ersetzt
- `client/src/features/admin/settings/CategoryManager.tsx` - useLiveQuery + manuelle fetch durch TQ Category-Hooks ersetzt

## Decisions Made

- ProductForm behält `getShopId()` Import für das Befüllen des shopId-Felds bei neuen Produkten
- ProductForm behält `getAuthHeaders()` für direkten fetch beim Image-Upload — File-Uploads passen nicht ins TQ Mutation-Pattern
- Nach Image-Upload: `queryClient.invalidateQueries` explizit aufgerufen, damit die frisch hochgeladene imageUrl geladen wird (updateProduct.mutateAsync allein reicht nicht, da der Bild-Upload ein separater Request ist)
- isLoading-State in CategoryManager zeigt "Laden..." statt leerem Zustand

## Deviations from Plan

None — Plan wurde exakt wie spezifiziert ausgeführt.

## Issues Encountered

None.

## Known Stubs

None — alle vier Komponenten lesen echte Serverdaten via TQ.

## Next Phase Readiness

- Alle vier Admin-Komponenten lesen direkt vom Server (LIVE-01 erfüllt)
- Nach Speichern/Ändern sofortige Listenaktualisierung ohne Reload (LIVE-02 erfüllt)
- Phase 19 Plan 03 kann direkt anschließen

## Self-Check: PASSED

All files present. All commits verified (b0092d2, ae2e83b).

---
*Phase: 19-tanstack-query-foundation*
*Completed: 2026-03-24*
