---
status: passed
phase: 14-online-first-architektur
verified: 2026-03-24
---

# Phase 14: Online-First Architektur — Verification

## Must-Haves

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | downloadProducts() ersetzt alle Produkte statt LWW | ✓ PASS | engine.ts:104-105 — `delete()` + `bulkPut()`, kein `updatedAt`-Vergleich mehr |
| 2 | Admin-Tabs offline gesperrt mit Hinweis | ✓ PASS | AdminScreen.tsx:20,100-103 — `isOnline` state + "Internetverbindung erforderlich" |
| 3 | Verkauf/Storno/Rückgabe funktionieren offline | ✓ PASS | Outbox-Pattern in engine.ts unverändert, useCart/SaleDetailModal unberührt |
| 4 | Reconnect: Outbox flush → dann Replace | ✓ PASS | triggers.ts unverändert — flushOutbox() → downloadProducts() Sequenz korrekt |

## Requirements Coverage

| REQ-ID | Description | Status |
|--------|-------------|--------|
| ARCH-01 | Server-Replace statt LWW | ✓ Complete |
| ARCH-02 | Admin offline deaktiviert | ✓ Complete |
| ARCH-03 | Offline nur Verkauf/Storno/Rückgabe | ✓ Complete |

## Score

**4/4 must-haves verified** — Phase goal achieved.

## Human Verification

1. App online starten → Produkte laden → Anzahl in Dexie muss Server-Anzahl entsprechen
2. Flugmodus aktivieren → Admin-Tab zeigt "Internetverbindung erforderlich"
3. Flugmodus: Verkauf durchführen → Sale in Outbox
4. Flugmodus aus → Outbox flusht, dann frische Produkte vom Server
