---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Online-First Live Architecture
status: unknown
stopped_at: Completed 19-tanstack-query-foundation-01-PLAN.md
last_updated: "2026-03-24T20:30:46.390Z"
progress:
  total_phases: 15
  completed_phases: 1
  total_plans: 6
  completed_plans: 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-24)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird — auch ohne Internetverbindung.
**Current focus:** Phase 19 — tanstack-query-foundation

## Current Position

Phase: 19 (tanstack-query-foundation) — EXECUTING
Plan: 2 of 3

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
| Phase 09-storno-rueckgabe P01 | 3 | 3 tasks | 6 files |
| Phase 10-ui-redesign P01 | 12 | 2 tasks | 3 files |
| Phase 10-ui-redesign P02 | 5 | 2 tasks | 2 files |
| Phase 11 P01 | 15 | 2 tasks | 6 files |
| Phase 11 P02 | 7 | 2 tasks | 5 files |
| Phase 12-bestandsampel-umlaute P01 | 8 | 2 tasks | 5 files |
| Phase 14-online-first-architektur P01 | 2 | 2 tasks | 2 files |
| Phase 15-datenintegrit-t P01 | 5 | 2 tasks | 1 files |
| Phase 15-datenintegrit-t P02 | 2 | 3 tasks | 4 files |
| Phase 16-ui-stabilit-t-bestand P01 | 5 | 2 tasks | 4 files |
| Phase 17-datenverwaltung-sync P01 | 3 | 2 tasks | 9 files |
| Phase 17-datenverwaltung-sync P02 | 3 | 2 tasks | 5 files |
| Phase 18-quick-wins-security P02 | 5 | 2 tasks | 2 files |
| Phase 18-quick-wins-security P01 | 31532258 | 2 tasks | 2 files |
| Phase 18 P03 | 20 | 2 tasks | 16 files |
| Phase 19 P01 | 128 | 2 tasks | 4 files |

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
- [Phase 09]: Dexie v4 migration: cancelledAt als Index auf sales
- [Phase 09]: window.confirm fuer Storno-Bestaetigung — einfachste Touch-kompatible Loesung ohne Custom-Modal
- [Phase 09]: onSaleChanged als optionale Prop in SaleDetailModal — rueckwaertskompatibel
- [Phase 10-ui-redesign]: PaymentFlow kein 2-Step-Flow mehr — Ein-Screen mit Live-Berechnungen
- [Phase 10-ui-redesign]: getStoredSession()-Pattern fuer Shop-Name in Header — konsistent mit serverAuth
- [Phase 10-ui-redesign]: Pill-Tabs in AdminScreen verwenden bg-sky-400 (aktiv) — konsistent mit Kategorie-Tabs in ArticleGrid
- [Phase 10-ui-redesign]: lowStockCount-Badge im Pill-Button via gap-1 statt ml-1 — konsistenteres flex-Spacing
- [Phase 11]: PDF-Layout: Positionsnummer (1., 2., ...) steht in eigener Zeile, Daten in naechster Zeile — beide Formate folgen diesem Muster
- [Phase 11]: Von-hinten-Strategie fuer PDF-Preis-Erkennung: letztes Euro-Item = Gesamt, vorletztes = Preis/St., letztes Prozent-Item = MwSt
- [Phase 11]: IMAGES_DIR via env-Variable konfigurierbar (default /app/data/images) — Docker-Volume-Pfad austauschbar ohne Rebuild
- [Phase 11]: Dexie v5 ohne .upgrade() Handler — imageUrl ist optional, bestehende Eintraege bleiben unveraendert
- [Phase 12-bestandsampel-umlaute]: Ampel-Dot als inline span mit text-[10px] leading-none in flex items-center gap-1 — kein Hook, kein Interface
- [Phase 12-bestandsampel-umlaute]: Funktionsnamen wie handleAllesZurueck nicht umbenannt — kein sichtbarer Nutzen, Breaking Change vermieden
- [Phase 14-online-first-architektur]: fetch() vor db.transaction(): IDB-Transaktionen time-outen bei async I/O innerhalb der Transaktion
- [Phase 14-online-first-architektur]: where('shopId').equals(shopId).delete() statt db.products.clear() — Multi-Laden-Sicherheit
- [Phase 14-online-first-architektur]: Kein eigener useOnlineStatus-Hook — inline State in AdminScreen ausreichend für einzelnen Anwendungsfall
- [Phase 14-online-first-architektur]: Tab-Navigation bleibt offline sichtbar — Hinweistext im main-Block informativer als verschwundene Tabs
- [Phase 15-datenintegrit-t]: IS NULL statt = 0 fuer cancelled_at-Filter in Report-Queries: SQLite speichert cancelledAt als INTEGER NULL, nicht als 0
- [Phase 15-datenintegrit-t]: getShopId() aus db/index.js: Single Source of Truth für Shop-ID, kein synchrones Äquivalent in serverAuth.ts
- [Phase 15-datenintegrit-t]: loaded-Flag in useCart: verhindert Race-Condition zwischen persist-Effect und loadAndValidate beim Mount
- [Phase 16-ui-stabilit-t-bestand]: shouldTriggerTap als exportierte pure Funktion statt DOM-Tests: kein @testing-library/react installiert, analog checkStockBeforeAdd-Muster
- [Phase 16-ui-stabilit-t-bestand]: useRef statt useState fuer Pointer-Start-Position: kein Re-Render beim Finger-Aufsetzen (D-UIX-01)
- [Phase 17-datenverwaltung-sync]: Dexie v8 ohne .upgrade()-Handler: neue categories-Tabelle braucht kein Upgrade
- [Phase 17-datenverwaltung-sync]: DELETE /api/categories/:id gibt 409 bei Produkt-Nutzung — korrekter HTTP-Konflikt-Statuscode
- [Phase 17-datenverwaltung-sync]: PATCH /categories/:id Bulk-Update: alle Produkte mit altem Kategorienamen werden in gleicher Route aktualisiert
- [Phase 17-datenverwaltung-sync]: URL.createObjectURL fuer Bild-Preview: sofortige Vorschau ohne Upload, pendingImageFile erst beim Speichern hochgeladen
- [Phase 17-datenverwaltung-sync]: Sync-Badge statt Toast im POS-Header: persistentes Feedback solange Outbox Eintraege hat, kein Timeout noetig
- [v5.0 Roadmap]: FIX + SEC zusammengefasst in Phase 18 — beide unabhängig von Architektur-Refactor, hoher Sicherheitswert bei niedrigem Risiko
- [v5.0 Roadmap]: LIVE-01 + LIVE-02 + LIVE-06 in Phase 19 — TQ-Foundation muss stehen bevor WebSocket (Phase 20) Query-Invalidation nutzen kann
- [v5.0 Roadmap]: OFFL-01-03 in Phase 21 nach LIVE komplett — Offline-Fallback testet den fertigen Stack, nicht die Übergangszustände
- [Phase 18-quick-wins-security]: isPdf() als Modul-Level-Funktion in import.ts — testbar ohne Fastify-Kontext, Magic-Byte-Check vor Parser-Aufruf
- [Phase 18-quick-wins-security]: _parsePdf() nicht exportiert, parseSuedNordKontorPdf() als Promise.race()-Wrapper mit PDF_PARSE_TIMEOUT_MS=30s
- [Phase 18-quick-wins-security]: cancelled_at IS NULL als Pflicht-Filter auf allen sales-Queries im Scheduler
- [Phase 18-quick-wins-security]: CORS_ORIGIN zwingend (fail-closed): fehlt die Var, startet der Server nicht
- [Phase 18]: @fastify/rate-limit mit global:false — nur /api/auth/pin erhält Rate-Limiting
- [Phase 18]: In-Memory Session Store (Map) — kein DB-Overhead, Client re-loggt nach Neustart
- [Phase 18]: shopId aus Session statt aus Query/Body — eliminiert Client-Ehrlichkeit als Sicherheitsannahme
- [Phase 19]: AppInner-Komponente extrahiert damit QueryClientProvider als äußerster Wrapper um gesamte App-Logik liegt
- [Phase 19]: Category.sortOrder und Category.createdAt in Mapping berücksichtigt — Interface hat mehr Felder als Plan-Dokumentation angab

### Pending Todos

None yet.

### Blockers/Concerns

- iOS/Safari-Pitfall: navigator.storage.persist() Verhalten auf iOS 17+ Home-Screen-PWA noch nicht auf physischem Gerät validiert
- v5.0 Architektur-Risiko: TanStack Query + Dexie gleichzeitig als Cache-Schichten können zu Inkonsistenz führen — klare Trennlinie in Phase 19 festlegen (TQ für Reads, Dexie nur noch POS-Offline-Fallback)

## Session Continuity

Last session: 2026-03-24T20:30:46.385Z
Stopped at: Completed 19-tanstack-query-foundation-01-PLAN.md
Resume file: None
