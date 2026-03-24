---
phase: 14-online-first-architektur
plan: "01"
subsystem: sync
tags: [dexie, indexeddb, offline, sync, engine, admin, react]

requires:
  - phase: 07-server-sync-multi-laden
    provides: downloadProducts() + Outbox-Sync, Multi-Laden shopId-Architektur
  - phase: 12-bestandsampel-umlaute
    provides: AdminScreen mit Tab-Navigation (Produkte/Berichte/Import/Einstellungen)

provides:
  - downloadProducts() mit atomarem Server-Replace (delete + bulkPut statt LWW-Loop)
  - AdminScreen Offline-Guard: zeigt Hinweis statt Tab-Inhalt wenn kein Internet

affects:
  - sync (engine.ts, triggers.ts)
  - admin (AdminScreen.tsx)

tech-stack:
  added: []
  patterns:
    - "Atomares Server-Replace: fetch() VOR Dexie-Transaktion, dann where(shopId).delete() + bulkPut()"
    - "Offline-Guard mit useState(navigator.onLine) + online/offline EventListener + useEffect-Cleanup"

key-files:
  created: []
  modified:
    - client/src/sync/engine.ts
    - client/src/features/admin/AdminScreen.tsx

key-decisions:
  - "fetch() MUSS vor db.transaction() abgeschlossen sein — IDB-Transaktionen time-outen bei async I/O innerhalb der Transaktion"
  - "where('shopId').equals(shopId).delete() statt db.products.clear() — Multi-Laden-Sicherheit (andere Shops unberührt)"
  - "Kein eigener useOnlineStatus-Hook — inline State in AdminScreen ausreichend für einen einzigen Anwendungsfall"
  - "Tab-Navigation bleibt offline sichtbar — Hinweistext im main-Block ist informativer als verschwundene Tabs"

patterns-established:
  - "Server-Replace-Pattern: fetch → map → db.transaction(delete shopId + bulkPut) — kein LWW-Vergleich mehr"
  - "Offline-Guard-Pattern: useState(navigator.onLine) + addEventListener online/offline mit Cleanup"

requirements-completed:
  - ARCH-01
  - ARCH-02
  - ARCH-03

duration: 2min
completed: "2026-03-24"
---

# Phase 14 Plan 01: Online-First Architektur Summary

**LWW-Loop durch atomares Server-Replace in downloadProducts() ersetzt und AdminScreen mit Offline-Guard versehen — eliminiert drei Bugs: Phantom-Produkte, Geist-Deaktivierungen und stale Timestamps**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-24T13:26:31Z
- **Completed:** 2026-03-24T13:27:48Z
- **Tasks:** 2 von 2
- **Files modified:** 2

## Accomplishments

- LWW-Loop (for-Schleife mit `existing.updatedAt > mapped.updatedAt`) vollständig entfernt — Dexie enthält nach Sync exakt die Server-Produkte, keine alten/gelöschten Phantom-Einträge mehr
- Atomares Server-Replace via `db.transaction('rw', db.products, ...)` mit shopId-gefiltertem Delete + bulkPut — Multi-Laden-sicher
- AdminScreen zeigt offline in allen 4 Tabs "Internetverbindung erforderlich" statt Tab-Inhalt — online/offline EventListener mit korrektem Cleanup

## Task Commits

1. **Task 1: LWW-Loop durch atomares Server-Replace ersetzen** — `a2ba0b2` (feat)
2. **Task 2: Offline-Guard in AdminScreen** — `9821881` (feat)

**Plan metadata:** (folgt in final commit)

## Files Created/Modified

- `client/src/sync/engine.ts` — downloadProducts() neu: fetch → map → db.transaction(delete + bulkPut), kein LWW-Loop mehr
- `client/src/features/admin/AdminScreen.tsx` — isOnline State + EventListener + main-Block Offline-Guard

## Decisions Made

- **fetch() vor db.transaction():** IDB-Transaktionen time-outen wenn async I/O (fetch) innerhalb läuft — deshalb fetch zuerst abschließen, dann Transaktion starten
- **shopId-Filter statt clear():** `db.products.where('shopId').equals(shopId).delete()` statt `db.products.clear()` schützt Produkte anderer Läden in Multi-Laden-Setup
- **Kein eigener Hook:** Inline `useState(navigator.onLine)` + `useEffect` in AdminScreen — kein `useOnlineStatus`-Hook, da Overkill für einen einzigen Anwendungsfall
- **Rückgabewert:** War `upserted` (Anzahl geänderter), ist jetzt `mapped.length` (Gesamtanzahl) — passt weiterhin zum "X Produkte aktualisiert"-Label in ProductList

## Deviations from Plan

None — Plan wurde exakt wie beschrieben ausgeführt.

## Issues Encountered

None.

## User Setup Required

None — keine externen Services, keine Umgebungsvariablen.

## Next Phase Readiness

- Sync-Engine ist jetzt korrekt: Server ist Single Source of Truth, keine LWW-Konflikte mehr
- AdminScreen hat Offline-Guard — Verwaltungs-Features nur online bedienbar
- Kasse (POSScreen) funktioniert offline unverändert
- Bereit für weitere v4.0-Bugfixes

## Self-Check: PASSED

- FOUND: client/src/sync/engine.ts
- FOUND: client/src/features/admin/AdminScreen.tsx
- FOUND: .planning/phases/14-online-first-architektur/14-01-SUMMARY.md
- FOUND: commit a2ba0b2 (Task 1)
- FOUND: commit 9821881 (Task 2)

---
*Phase: 14-online-first-architektur*
*Completed: 2026-03-24*
