---
phase: 23-dexie-entfernung-online-only
plan: "02"
subsystem: auth
tags: [idb-keyval, localStorage, IndexedDB, session, pin-auth, import, settings]

requires:
  - phase: 23-01
    provides: "Dexie schema/engine/triggers entfernt, db/index.ts auf Typen+shopId reduziert"

provides:
  - "kein idb-keyval Import mehr in client/src"
  - "Session-Daten (token, shopId, shopName, lastActivity) in localStorage"
  - "PIN-Hash und lastActivity in localStorage"
  - "Import-Historie in localStorage"
  - "Schnellbetraege in localStorage (get + set)"

affects:
  - 23-03-plan (letzter Plan der Phase — idb-keyval aus package.json entfernen)

tech-stack:
  added: []
  patterns:
    - "localStorage statt idb-keyval fuer kleine Konfigurationswerte"
    - "async-Funktions-Signaturen bleiben erhalten auch wenn Inhalt synchron ist (Rueckwaertskompatibilitaet)"

key-files:
  created: []
  modified:
    - client/src/features/auth/serverAuth.ts
    - client/src/features/auth/pinAuth.ts
    - client/src/features/admin/import/ImportScreen.tsx
    - client/src/features/admin/settings/SettingsForm.tsx
    - client/src/features/pos/PaymentFlow.tsx

key-decisions:
  - "async-Signaturen in serverAuth.ts und pinAuth.ts beibehalten — verhindert Breaking Changes in allen Aufrufern"
  - "ImportScreen: db.products-Matching durch fetch('/api/products') ersetzt, db.outbox durch fetch('/api/stock/adjust')"
  - "ImportScreen: authHeaders einmal deklariert fuer PDF-Upload, separater fetch fuer Produkte (productHeaders)"

patterns-established:
  - "localStorage statt IndexedDB fuer kleine Konfigurationswerte (< 5 MB, synchroner Zugriff ausreichend)"

requirements-completed:
  - DEX-05

duration: 5min
completed: "2026-03-24"
---

# Phase 23 Plan 02: idb-keyval auf localStorage Summary

**idb-keyval komplett aus 5 Dateien entfernt — Session, PIN, Import-Historie und Schnellbetraege nutzen jetzt synchrones localStorage**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-24T22:47:00Z
- **Completed:** 2026-03-24T22:49:07Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- serverAuth.ts und pinAuth.ts: idb-keyval komplett durch localStorage ersetzt, async-Signaturen erhalten
- ImportScreen.tsx: idb-keyval, flushOutbox und db (Dexie) entfernt — Produkt-Matching und Stock-Buchung via API
- SettingsForm.tsx und PaymentFlow.tsx: quick_amounts via localStorage statt idb-keyval
- Kein idb-keyval-Import mehr in der gesamten client/src Codebase

## Task Commits

1. **Task 1: serverAuth.ts und pinAuth.ts** - `9e7abdf` (feat)
2. **Task 2: ImportScreen.tsx, SettingsForm.tsx, PaymentFlow.tsx** - `48af66c` (feat)

## Files Created/Modified

- `client/src/features/auth/serverAuth.ts` - idb-keyval entfernt, localStorage fuer 'session'-Objekt
- `client/src/features/auth/pinAuth.ts` - idb-keyval entfernt, localStorage fuer 'pinHash' und 'lastActivity'
- `client/src/features/admin/import/ImportScreen.tsx` - idb-keyval + flushOutbox + db entfernt, API-Calls stattdessen, localStorage fuer 'import-history'
- `client/src/features/admin/settings/SettingsForm.tsx` - idb-keyval entfernt, localStorage fuer 'quick_amounts'
- `client/src/features/pos/PaymentFlow.tsx` - idb-keyval entfernt, localStorage fuer 'quick_amounts' (lesen)

## Decisions Made

- async-Signaturen in Auth-Funktionen beibehalten trotz synchronem localStorage — keine Breaking Changes fuer Aufrufer
- ImportScreen: Produktliste via `fetch('/api/products')` statt Dexie-Query — korrekte Online-Only-Architektur
- ImportScreen: Bestandsbuchung via `fetch('/api/stock/adjust')` statt Outbox — kein Outbox-Pattern mehr noetig

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ImportScreen: db.products und db.outbox durch API-Calls ersetzt**
- **Found during:** Task 2 (ImportScreen.tsx)
- **Issue:** Plan beschreibt nur idb-keyval-Entfernung, aber handleCommit und handleFileSelected nutzten noch `db.products` und `db.outbox` (Dexie) — diese existieren nach Plan 01 nicht mehr in db/index.ts
- **Fix:** Produkt-Matching via `fetch('/api/products')`, Bestandsbuchung via `fetch('/api/stock/adjust')`, neues Produkt direkt per POST
- **Files modified:** client/src/features/admin/import/ImportScreen.tsx
- **Verification:** Keine db-Importe mehr, kein Dexie-Aufruf mehr in ImportScreen.tsx
- **Committed in:** 48af66c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — Bug/Breaking import nach Plan 01)
**Impact on plan:** Notwendige Korrektur — ohne diesen Fix wuerde ImportScreen.tsx zur Laufzeit crashen da `db` nicht mehr exportiert wird.

## Issues Encountered

- authHeaders doppelte Deklaration in handleFileSelected: erste fuer PDF-Upload, zweite (umbenannt zu productHeaders) fuer Produkt-Fetch — TypeScript-Fehler vermieden

## Next Phase Readiness

- Alle idb-keyval-Importe aus client/src entfernt
- Plan 03 kann idb-keyval aus package.json entfernen

---
*Phase: 23-dexie-entfernung-online-only*
*Completed: 2026-03-24*
