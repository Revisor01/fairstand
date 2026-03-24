# Phase 23: Dexie-Entfernung & Online-Only - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Dexie.js, dexie-react-hooks, idb-keyval und das Outbox-Pattern vollständig entfernen. App läuft ausschließlich online. Bei fehlendem Internet wird ein klarer Hinweis angezeigt. Warenkorb nur noch in React State. Sales/Reports nur vom Server. Service Worker nur App-Shell-Caching.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure/cleanup phase.

Key details from codebase scout:
- idb-keyval muss auf localStorage umgestellt werden (Session, PIN, Quick-Amounts, Import-Historie)
- useLiveQuery() in DailyReport, useLowStockCount, useSyncStatus → TanStack Query oder lokaler State
- useCart Dexie-Persistierung → reine React State (kein localStorage nötig — Reload = leerer Cart per DEX-04)
- useSaleComplete Online-Only: kein Outbox-Fallback, nur POST direkt an Server
- sync/engine.ts + sync/triggers.ts → komplett entfernen
- db/schema.ts → komplett entfernen
- Workbox runtimeCaching für /api/* entfernen — kein Daten-Caching
- Online-Hinweis bei fehlendem Internet implementieren (derzeit nur State, keine UI)

</decisions>

<code_context>
## Existing Code Insights

### Dateien die Dexie importieren
- client/src/db/schema.ts — FairstandDB Klasse (komplett entfernen)
- client/src/features/admin/reports/DailyReport.tsx — useLiveQuery(db.sales)
- client/src/sync/useSyncStatus.ts — useLiveQuery(db.outbox)
- client/src/hooks/useLowStockCount.ts — useLiveQuery(db.products)

### Dateien die idb-keyval importieren
- client/src/features/auth/serverAuth.ts — Session-Speicherung
- client/src/features/auth/pinAuth.ts — PIN-Hash & Activity
- client/src/features/admin/import/ImportScreen.tsx — Import-Historie
- client/src/features/admin/settings/SettingsForm.tsx — Quick-Amounts
- client/src/features/pos/PaymentFlow.tsx — Quick-Amounts laden

### Outbox/Sync-Dateien
- client/src/sync/engine.ts — flushOutbox()
- client/src/sync/triggers.ts — registerSyncTriggers()
- client/src/features/pos/useSaleComplete.ts — Outbox-Fallback bei offline

### Cart
- client/src/features/pos/useCart.ts — useReducer + Dexie cartItems Persistierung

### Service Worker
- client/vite.config.ts — VitePWA mit NetworkFirst für /api/*

### Integration Points
- client/src/App.tsx — registriert sync triggers
- client/src/hooks/api/useProducts.ts — Dexie write-through + fallback
- client/src/hooks/api/useCategories.ts — Dexie write-through + fallback

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure/cleanup phase

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
