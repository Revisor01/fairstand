---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Server-Sync, Multi-Laden & Kernfunktionen
status: unknown
stopped_at: Completed 08-bestandspruefung-verkaufshistorie-02-PLAN.md
last_updated: "2026-03-24T10:41:31.423Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird — auch ohne Internetverbindung.
**Current focus:** Phase 08 — bestandspruefung-verkaufshistorie

## Current Position

Phase: 08 (bestandspruefung-verkaufshistorie) — EXECUTING
Plan: 2 of 2

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P01 | 6 | 2 tasks | 22 files |
| Phase 01 P02 | 3 | 2 tasks | 7 files |
| Phase 01 P03 | 6 | 2 tasks | 10 files |
| Phase 02-backend-sync P01 | 2 | 2 tasks | 7 files |
| Phase 02-backend-sync P02 | 1 | 2 tasks | 3 files |
| Phase 03 P01 | 20 | 2 tasks | 13 files |
| Phase 03 P02 | 18 | 2 tasks | 9 files |
| Phase 03 P03 | 4 | 2 tasks | 10 files |
| Phase 04 P01 | 2 | 2 tasks | 4 files |
| Phase 04-rechnungsimport P02 | 8 | 2 tasks | 4 files |
| Phase 04-rechnungsimport P02 | 8 | 3 tasks | 4 files |
| Phase 05 P01 | 2 | 3 tasks | 3 files |
| Phase 05 P02 | 2 | 2 tasks | 2 files |
| Phase 07-server-sync-multi-laden P01 | 8 | 2 tasks | 5 files |
| Phase 07 P02 | 1 | 2 tasks | 4 files |
| Phase 07-server-sync-multi-laden P03 | 15 | 2 tasks | 13 files |
| Phase 08-bestandspruefung-verkaufshistorie P01 | 7 | 2 tasks | 4 files |
| Phase 08-bestandspruefung-verkaufshistorie P02 | 10 | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack: React 19 + TypeScript + Vite + Dexie.js (Frontend), Fastify 5 + SQLite + Drizzle ORM (Backend)
- Offline: Dexie.js zwingend wegen Safari IndexedDB-Transaktionsfehler auf iPad
- Sync: Outbox-Pattern mit Delta-Events (nie Absolutwerte), Trigger via online/visibilitychange (kein Background Sync API auf iOS)
- [Phase 01]: registerType: prompt statt autoUpdate — verhindert mid-Session-Reload der Kasse
- [Phase 01]: Traefik external:true — fairstand.godsapp.de über bestehenden Stack auf server.godsapp.de
- [Phase 01]: Cent-Integer für alle Geldbeträge — float-freie Arithmetik verhindert Rundungsfehler an Kasse
- [Phase 01]: idb-keyval für PIN-Hash und lastActivity — kein eigenes Dexie-Schema nötig für Config-Werte
- [Phase 01]: AuthState mit 4 Zuständen ('checking'|'setup'|'locked'|'unlocked') — checking verhindert Flicker beim App-Start
- [Phase 01]: dexie-react-hooks separat installiert: useLiveQuery ist in Dexie 4.x nicht im Hauptpaket enthalten
- [Phase 01]: Preis-Snapshot im CartItem: salePrice beim Hinzufügen gespeichert, nie nachträglich aus DB aktualisiert
- [Phase 02-backend-sync]: db.transaction((tx) => {...}) korrekte Drizzle-Transaktions-API — gibt void zurück, kein IIFE-Aufruf
- [Phase 02-backend-sync]: onConflictDoNothing() für idempotente Sale-Insertion — doppelter POST mit gleichem id wird lautlos ignoriert
- [Phase 02-backend-sync]: Stock-Delta via sql-Template-Expression — verhindert Absolutwert-Überschreibung bei Concurrent-Sync
- [Phase 02-backend-sync]: flushing-Guard als Modul-Variable verhindert parallele Sync-Ausfuehrung bei Doppel-Trigger
- [Phase 02-backend-sync]: Sofortiger Flush beim App-Start via navigator.onLine — deckt Reload-nach-Reconnect ab
- [Phase 03]: drizzle-kit migrate schlaegt lokal fehl wegen fehlender better-sqlite3 Native Binary (arm64 macOS) — Migration laeuft im Docker-Container beim Deployment
- [Phase 03]: onSwitchToAdmin als optionale Prop in POSScreen — rueckwaertskompatibel, kein Breaking Change
- [Phase 03]: StockAdjustSchema auf Modul-Ebene in sync.ts — konsistent mit SaleSchema, nicht innerhalb des Loop
- [Phase 03-02]: UnlockedApp als separate Komponente: useLowStockCount Hook muss immer aufgerufen werden (React-Hook-Regel verhindert bedingten Aufruf nach if-state-checks)
- [Phase 03-02]: lowStockCount als Prop in POSScreen statt Hook direkt — kein Hook-Doppelaufruf, keine IndexedDB-Doppelabfrage
- [Phase 03-02]: fire-and-forget fetch-Sync fuer Produkt-CRUD bei navigator.onLine — kein Outbox-Pattern noetig da POST /api/products bereits LWW-Upsert ist
- [Phase 03]: @fastify/schedule vor reportScheduler registrieren — fastify.scheduler muss dekoriert sein bevor reportScheduler darauf zugreift
- [Phase 03]: isMailConfigured()-Guard am Anfang jedes Cron-Tasks — verhindert Fehler wenn SMTP nicht konfiguriert
- [Phase 03]: navigator.onLine-Check in MonthlyReport — Berichte nur online verfuegbar, klarer Hinweis statt failed fetch
- [Phase 04]: pdfjs-dist/legacy/build/pdf.mjs Import-Pfad fuer Node.js — GlobalWorkerOptions.workerSrc='' deaktiviert Worker
- [Phase 04]: importRoutes registriert @fastify/multipart intern, nicht global — kein Plugin-Konflikt
- [Phase 04]: Buffer-Strategie (toBuffer()) statt Disk-Write beim PDF-Upload — kein temporaeres Volume noetig
- [Phase 04-rechnungsimport]: defaultValue + onBlur fuer Euro-Felder in ReviewTable — vermeidet Cursor-Springen bei Dezimal-Eingabe
- [Phase 04-rechnungsimport]: MatchedRow-Interface in ReviewTable.tsx exportiert — Single Source of Truth, kein Doppel-Interface
- [Phase 05]: Stock im LWW-Block unveraendert belassen — Delta-Update danach separat
- [Phase 05]: Fire-and-forget PATCH statt Outbox fuer Produkt-Toggle
- [Phase 05]: ServerProduct interface for snake_case to camelCase mapping in download sync
- [Phase 05]: LWW per-product comparison in download sync preserves newer local edits
- [v2.0 Roadmap]: SYNC + SHOP architektonisch untrennbar — beide in Phase 7 (PIN-Auth setzt Shop-Kontext voraus, Sync arbeitet shop-gefiltert)
- [v2.0 Roadmap]: STOR-01 baut auf HIST-01 (Tagesübersicht) auf — Phase 9 nach Phase 8
- [Phase 07-server-sync-multi-laden]: Web Crypto API fuer hashPin — kein npm-Package, Node 20 unterstuetzt nativ
- [Phase 07-server-sync-multi-laden]: Token = crypto.randomUUID() ohne server-seitiges Token-Management — client speichert in idb-keyval
- [Phase 07-server-sync-multi-laden]: ensureShopSeeded() idempotent via shopId-existenz-check — zweiter Aufruf ist No-Op
- [Phase 07]: setShopId('') in lock() statt null — leerer String ist falsy, getShopId() wirft korrekt, Typsicherheit bleibt gewahrt
- [Phase 07]: Offline-Fallback in unlock() gewährt Zugang ohne PIN-Prüfung wenn Session < 2h alt — kein Server-Hash clientseitig nötig
- [Phase 07]: serverAuth-Pattern: idb-keyval 'session'-Key mit StoredSession-Objekt (shopId, shopName, token, lastActivity)
- [Phase 07-server-sync-multi-laden]: seedIfEmpty() aus App.tsx entfernt — Server ist Single Source of Truth fuer Produkte in v2.0
- [Phase 07-server-sync-multi-laden]: downloadProducts() nach Outbox-Flush fire-and-forget — verhindert stale Daten ohne Nutzeraufruf
- [Phase 07-server-sync-multi-laden]: 13 Dateien statt 4 mit SHOP_ID migriert — vollstaendige Eliminierung verhindert Laufzeitfehler
- [Phase 08]: checkStockBeforeAdd als exportierte Pure Function statt inline in addItem — ermöglicht Unit-Tests ohne React-Hooks
- [Phase 08]: proxyProduct.stock = saleItem.quantity beim Storno-Re-Fill — addItem mit stock:0 würde alle Korrektur-Artikel blockieren
- [Phase 08]: Toast-Logik in POSScreen statt ArticleGrid — ArticleGrid Props-Interface bleibt stabil, Feedback-Logik beim Aufrufer
- [Phase 08-bestandspruefung-verkaufshistorie]: [Phase 08-02]: Sale-Objekt als Prop an SaleDetailModal — kein eigenes Dexie-Query im Modal, offline-fähig ohne extra Query
- [Phase 08-bestandspruefung-verkaufshistorie]: [Phase 08-02]: ProductStats fetcht nur bei navigator.onLine — konsistent mit MonthlyReport-Muster aus Phase 03

### Pending Todos

None yet.

### Blockers/Concerns

- iOS/Safari-Pitfall: navigator.storage.persist() Verhalten auf iOS 17+ Home-Screen-PWA noch nicht auf physischem Gerät validiert
- v2.0 Phase 7: Bestehende lokale Dexie-Daten der Nutzerinnen müssen bei Architektur-Umbau migriert oder zurückgesetzt werden — Migration-Strategie klären
- v2.0 Phase 7: PIN-Auth ersetzt bisherige lokale PIN-Auth (idb-keyval) — Backwards-Compatibility oder Hard-Reset beim ersten Start mit v2.0

## Session Continuity

Last session: 2026-03-24T10:41:31.421Z
Stopped at: Completed 08-bestandspruefung-verkaufshistorie-02-PLAN.md
Resume file: None
