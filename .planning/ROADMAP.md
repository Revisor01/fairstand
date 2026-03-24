# Roadmap: Fairstand Kassensystem

## Milestones

- ✅ **v1.0 Fairstand Kassensystem** — Phases 1-4 (shipped 2026-03-23)
- ✅ **v1.1 Tech Debt & Deployment** — Phases 5-6 (shipped 2026-03-24)
- ✅ **v2.0 Server-Sync, Multi-Laden & Kernfunktionen** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v3.0 Polish, Bilder & Redesign** — Phases 10-13 (shipped 2026-03-24)
- ✅ **v4.0 Datenqualität & Stabilität** — Phases 14-17 (shipped 2026-03-24)

## Phases

<details>
<summary>✅ v1.0 Fairstand Kassensystem (Phases 1-4) — SHIPPED 2026-03-23</summary>

- [x] Phase 1: Offline-Kern & Kasse (3/3 plans) — completed 2026-03-23
- [x] Phase 2: Backend & Sync (2/2 plans) — completed 2026-03-23
- [x] Phase 3: Warenwirtschaft & Berichte (3/3 plans) — completed 2026-03-23
- [x] Phase 4: Rechnungsimport (2/2 plans) — completed 2026-03-23

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Tech Debt & Deployment (Phases 5-6) — SHIPPED 2026-03-24</summary>

- [x] Phase 5: Tech Debt Fixes (2/2 plans) — completed 2026-03-23
- [x] Phase 6: GitHub & Deployment (3/3 plans) — completed 2026-03-24

</details>

<details>
<summary>✅ v2.0 Server-Sync, Multi-Laden & Kernfunktionen (Phases 7-9) — SHIPPED 2026-03-24</summary>

- [x] Phase 7: Server-Sync & Multi-Laden (3/3 plans) — completed 2026-03-24
- [x] Phase 8: Bestandsprüfung & Verkaufshistorie (2/2 plans) — completed 2026-03-24
- [x] Phase 9: Storno & Rückgabe (1/1 plans) — completed 2026-03-24

</details>

<details>
<summary>✅ v3.0 Polish, Bilder & Redesign (Phases 10-13) — SHIPPED 2026-03-24</summary>

- [x] Phase 10: UI-Redesign (2/2 plans) — completed 2026-03-24
- [x] Phase 11: Produktbilder & PDF-Parsing (2/2 plans) — completed 2026-03-24
- [x] Phase 12: Bestandsampel & Umlaute (1/1 plans) — completed 2026-03-24
- [x] Phase 13: GitHub-Dokumentation (0/? plans) — completed 2026-03-24

</details>

<details>
<summary>✅ v4.0 Datenqualität & Stabilität (Phases 14-17) — SHIPPED 2026-03-24</summary>

- [x] **Phase 14: Online-First Architektur** - LWW durch Server-Replace ersetzen, Admin offline deaktivieren, Offline nur für Verkauf/Storno/Rückgabe (completed 2026-03-24)
- [x] **Phase 15: Datenintegrität** - Marge/EK korrekt, Storno aus Statistiken raus, Warenkorb überlebt Reload, ungültige Artikel erkannt (completed 2026-03-24)
- [x] **Phase 16: UI-Stabilität & Bestand** - Scroll/Tap-Bug behoben, Bestandswarnungen klarer (completed 2026-03-24)
- [x] **Phase 17: Datenverwaltung & Sync** - Zentrales Kategorie-Management, Bildupload-Workflow verbessert, Sync robuster (completed 2026-03-24)

</details>

### 🚧 v5.0 Online-First Live Architecture

- [x] **Phase 18: Quick Wins & Security** - Scheduler-Storno-Filter, PDF-Timeout, PDF-Validierung, CORS, PIN-Rate-Limiting, ShopId-Validierung (completed 2026-03-24)
- [ ] **Phase 19: TanStack Query Foundation** - TQ installieren, alle Reads/Writes gegen Server-API, networkMode pro Kontext
- [ ] **Phase 20: WebSocket Live-Updates & Cleanup** - @fastify/websocket, Server-Broadcasts, Query-Invalidation, Outbox-Online entfernen, Sync-Button weg
- [ ] **Phase 21: Offline-Fallback & Dexie als Cache** - POS offline-tauglich mit TQ-Cache + Dexie-Fallback, Outbox offline, nahtloser Wechsel

## Phase Details

### Phase 7: Server-Sync & Multi-Laden
**Goal**: Server ist Single Source of Truth — jedes Gerät arbeitet mit demselben Datenstand, Läden werden über PIN-Authentifizierung getrennt
**Depends on**: Phase 6 (live Deployment)
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SHOP-01, SHOP-02, SHOP-03, SHOP-04
**Success Criteria** (what must be TRUE):
  1. Beim App-Start erscheint ein PIN-Dialog — der eingegebene PIN öffnet den zugehörigen Laden mit seinen Artikeln
  2. Produkte werden beim App-Start automatisch vom Server geladen — lokale Seed-Daten kommen nur wenn Server nicht erreichbar und DB leer
  3. Ein Verkauf der offline getätigt wurde, erscheint nach Reconnect automatisch im Server und auf allen anderen Geräten desselben Ladens
  4. Admin kann Läden anlegen und deren PIN verwalten
  5. Zwei Geräte mit demselben PIN sehen identische Artikel und denselben Bestand nach Sync
**Plans**: 3 plans

Plans:
- [x] 07-01-PLAN.md — Server: shops-Tabelle, PIN-Auth-Endpoint, Server-Seed
- [x] 07-02-PLAN.md — Client: serverAuth.ts, getShopId(), Dexie v3 Hard Reset, useAuth umstellen
- [x] 07-03-PLAN.md — Client: App.tsx, engine.ts, ArticleGrid, ProductList auf dynamische shopId

### Phase 8: Bestandsprüfung & Verkaufshistorie
**Goal**: Mitarbeiterinnen sehen Bestand direkt in der Kasse und können Verkaufshistorie einsehen — Überverkauf ist technisch ausgeschlossen
**Depends on**: Phase 7
**Requirements**: BEST-01, BEST-02, HIST-01, HIST-02
**Success Criteria** (what must be TRUE):
  1. Jede Artikelkachel in der Kasse zeigt den aktuellen Bestand als kleine Zahl neben dem Preis
  2. Wenn der Bestand eines Artikels erschöpft ist, kann er nicht mehr in den Warenkorb gelegt werden
  3. Eine Tagesübersicht zeigt alle Verkäufe des Tages — per Tipp auf einen Verkauf sind die enthaltenen Artikel, Mengen und Preise sichtbar
  4. Pro Artikel ist eine Statistik einsehbar: wie oft verkauft, Gesamtumsatz, über welchen Zeitraum
**Plans**: 2 plans

Plans:
- [x] 08-01-PLAN.md — Bestandsanzeige in Artikelkacheln + Überverkauf-Blockierung in useCart
- [x] 08-02-PLAN.md — Anklickbare Tagesübersicht (SaleDetailModal) + Artikel-Statistik (ProductStats + Server-Endpoint)

### Phase 9: Storno & Rückgabe
**Goal**: Fehlgebuchte Verkäufe können korrigiert werden — Bestand wird korrekt zurückgebucht
**Depends on**: Phase 8 (Tagesübersicht aus HIST-01 ist Einstiegspunkt für Storno)
**Requirements**: STOR-01, STOR-02
**Success Criteria** (what must be TRUE):
  1. Aus der Tagesübersicht heraus kann ein vollständiger Verkauf storniert werden — der Bestand aller enthaltenen Artikel wird zurückgebucht
  2. Einzelne Artikel aus einem Verkauf können als Rückgabe verbucht werden — nur der Bestand des zurückgegebenen Artikels ändert sich
**Plans**: 1 plan

Plans:
- [x] 09-01-PLAN.md — Schemas (Dexie v4 + Drizzle), Server-Handler (SALE_CANCEL + ITEM_RETURN), UI (Storno-Button + Rückgabe-Buttons + visuelle Markierung)

### Phase 10: UI-Redesign
**Goal**: Die Kasse fühlt sich luftig, übersichtlich und professionell an — Kassendialog, Bezahlseite und Admin sind auf einen Blick erfassbar
**Depends on**: Phase 9
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. Kassendialog und Bezahlseite sind als kompakte Overlays dargestellt — nicht fullscreen, der Warenkorb bleibt im Blick
  2. Die Bezahlseite zeigt Artikelliste, Gesamtsumme und berechnet Wechselgeld/Spende live während des Eingebens
  3. Der Shop-Name ist in der Titelzeile oben sichtbar, ohne dass man dafür navigieren muss
  4. Das Gesamtlayout hat mehr Whitespace — Elemente sind großzügig gesetzt, nichts wirkt gedrängt
  5. Der Admin-Bereich ist kompakt und übersichtlich — alle Einstellungen ohne Scrollen findbar
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — PaymentFlow-Redesign (Ein-Screen, Artikelliste, Live-Berechnung) + Shop-Name in POS- und Admin-Header
- [x] 10-02-PLAN.md — Spacing-Erhöhung ArticleGrid + Pill-Tabs in AdminScreen

### Phase 11: Produktbilder & PDF-Parsing
**Goal**: Artikelkacheln zeigen Produktbilder und Rechnungen werden vollständig korrekt in Menge, Artikelnummer und Preis geparst
**Depends on**: Phase 10
**Requirements**: IMG-01, IMG-02, IMG-03, PDF-01
**Success Criteria** (what must be TRUE):
  1. Artikelkacheln zeigen ein Produktbild wenn eines hinterlegt ist — ohne Bild bleibt die Kachel wie bisher
  2. In der Produktverwaltung kann einem Artikel ein Bild zugewiesen werden
  3. Bilder können aus Etiketten-PDFs des Süd-Nord-Kontors extrahiert oder von der Kontor-Website übernommen werden
  4. Beim Import einer Süd-Nord-Kontor-Rechnung erscheinen Menge, Artikelnummer und Preis in separaten Spalten — nicht mehr alles in der Beschreibung
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — PDF-Parser Format-Erkennung (Rabatt-Spalte) + Schema imageUrl + Migration
- [x] 11-02-PLAN.md — Image-Upload-Endpoint + Client imageUrl + ProductList Bild-Button + ArticleGrid Thumbnail

### Phase 12: Bestandsampel & Umlaute
**Goal**: Mitarbeiterinnen erkennen auf einen Blick den Vorratsstand und lesen die gesamte App in korrektem Deutsch
**Depends on**: Phase 11
**Requirements**: AMP-01, TXT-01
**Success Criteria** (what must be TRUE):
  1. Jeder Artikel in der Produktliste und im Kassen-Grid trägt einen farbigen Indikator — grün für ausreichend, gelb für niedrig, rot für kritisch
  2. Kein Button, Label oder Hinweistext in der App enthält mehr ae/oe/ue/ss statt ä/ö/ü/ß
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — Bestandsampel-Dot (●) in ArticleGrid + ProductList, Umlaut-Korrekturen in DailyReport + MonthlyReport

### Phase 13: GitHub-Dokumentation
**Goal**: Das Projekt ist auf GitHub für andere Weltläden auffindbar, verständlich und nutzbar
**Depends on**: Phase 12
**Requirements**: GH-01, GH-02
**Success Criteria** (what must be TRUE):
  1. Das GitHub-Repository enthält eine README.md mit Projektbeschreibung und nachvollziehbarer Setup-Anleitung — ohne Screenshots
  2. Eine Open-Source-Lizenz ist im Repository hinterlegt und die README enthält einen Kontakthinweis für Anfragen anderer Weltläden
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — Kategorie-Entität: Server-Schema + Drizzle-Migration + CRUD-Routen + Dexie v8 + downloadCategories + Dropdown in ProductForm
- [x] 17-02-PLAN.md — Bildupload in ProductForm + useSyncStatus-Hook + 30s-Retry + Sync-Badge in POS

### Phase 14: Online-First Architektur
**Goal**: Server ist die einzige Wahrheit für Produktdaten — LWW-Sync durch komplettes Server-Replace ersetzen, Admin-Features offline deaktivieren, Offline-Modus nur für Verkauf/Storno/Rückgabe
**Depends on**: Phase 13
**Requirements**: ARCH-01, ARCH-02, ARCH-03
**Success Criteria** (what must be TRUE):
  1. Nach downloadProducts() ist Dexie ein exakter Spiegel des Servers — keine Geister-Produkte, keine LWW-Timestamp-Konflikte
  2. Admin-Tabs (Produktverwaltung, Import, Berichte, Einstellungen) zeigen offline einen klaren Hinweis "Internetverbindung erforderlich" und sind nicht bedienbar
  3. Verkauf, Storno und Einzelrückgabe funktionieren offline wie bisher — Sales gehen in die Outbox, Bestand wird lokal angepasst
  4. Beim Reconnect: Outbox flushen → dann Server-Replace → Dexie hat korrekten Stand
**Plans**: 1 plan

Plans:
- [x] 14-01-PLAN.md — LWW-Loop entfernen (engine.ts atomares Replace) + Admin-Offline-Guard (AdminScreen.tsx)

### Phase 15: Datenintegrität
**Goal**: Berichte zeigen korrekte Zahlen und der Warenkorb verliert keine Daten — Marge stimmt, Stornos sind herausgerechnet, Artikel im Cart bleiben nach Reload erhalten und ungültige Artikel werden erkannt
**Depends on**: Phase 14
**Requirements**: DAT-01, DAT-02, DAT-03, VAL-01
**Success Criteria** (what must be TRUE):
  1. Ein Monatsbericht zeigt EK-Preis und Marge korrekt berechnet — stimmige Zahlen nach manuellem Nachrechnen einer Verkaufsliste
  2. Stornierte Verkäufe erscheinen nicht mehr in Umsatz-Summen und Top-Artikel-Rankings
  3. Nach einem Page-Reload sind die Artikel im Warenkorb noch da — kein Datenverlust durch Browser-Refresh
  4. Wenn ein Artikel im Warenkorb liegt und inzwischen deaktiviert oder gelöscht wurde, zeigt die Kasse einen deutlichen Hinweis und verhindert den Verkaufsabschluss
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md — SQL-Fixes in reports.ts: AND cancelled_at IS NULL in allen 6 Queries (DAT-01, DAT-02)
- [x] 15-02-PLAN.md — Dexie v7 cartItems-Tabelle + useCart Persistenz + Validierung + Toast (DAT-03, VAL-01)

### Phase 16: UI-Stabilität & Bestand
**Goal**: Touch-Interaktion ist zuverlässig und Bestandswarnungen sind klar erkennbar — kein versehentliches Antippen beim Scrollen, kein Übersehen von knappem Vorrat
**Depends on**: Phase 15
**Requirements**: UIX-01, BST-01
**Success Criteria** (what must be TRUE):
  1. Beim Scrollen durch das Artikel-Grid auf dem iPad wird kein Artikel versehentlich in den Warenkorb gelegt — Scrollen und Tippen sind zuverlässig unterschieden
  2. Wenn ein Artikel unter den Mindestbestand fällt, ist die Warnung im Kassen-Grid und in der Produktliste sofort sichtbar — ohne explizit in die Verwaltung navigieren zu müssen
  3. Kritisch niedrige Bestände werden prominenter hervorgehoben als im v3.0-Stand
**Plans**: 1 plan

Plans:
- [x] 16-01-PLAN.md — ArticleCard-Extraktion mit Pointer-Movement-Threshold + Bestandsampel-Verbesserung + LowStockBanner

### Phase 17: Datenverwaltung & Sync
**Goal**: Kategorien sind zentral verwaltbar, Produktbilder lassen sich einfacher zuweisen und der Sync schlägt nicht still fehl
**Depends on**: Phase 16
**Requirements**: VRW-01, VRW-02, SYN-01
**Success Criteria** (what must be TRUE):
  1. Kategorien können in der Produktverwaltung als eigene Liste angelegt, umbenannt und gelöscht werden — nicht mehr nur als Freitext pro Produkt eingegeben
  2. Beim Anlegen oder Bearbeiten eines Produkts kann ein Bild in weniger Schritten zugewiesen werden als bisher
  3. Schlägt ein Sync fehl, erscheint eine klare Rückmeldung in der UI — die App versucht es automatisch erneut und gibt nicht still auf
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — Kategorie-Entität: Server-Schema + Drizzle-Migration + CRUD-Routen + Dexie v8 + downloadCategories + Dropdown in ProductForm
- [x] 17-02-PLAN.md — Bildupload in ProductForm + useSyncStatus-Hook + 30s-Retry + Sync-Badge in POS

### Phase 18: Quick Wins & Security
**Goal**: Bekannte Bugs und Sicherheitslücken sind beseitigt bevor die Architektur angefasst wird — Scheduler-Emails zeigen korrekte Zahlen, PDF-Parser hängt sich nicht auf, CORS ist explizit, PIN ist brute-force-resistent und ShopId-Isolation ist server-seitig erzwungen
**Depends on**: Phase 17
**Requirements**: FIX-01, FIX-02, FIX-03, SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Eine per Scheduler versendete Monats-Email enthält keine stornertierten Verkäufe in den Summen — Zahlen stimmen mit dem Admin-Report überein
  2. Ein Upload einer absichtlich beschädigten oder hängenden PDF-Datei bricht nach spätestens 30 Sekunden mit einer Fehlermeldung ab — der Server bleibt responsiv
  3. Eine Datei mit .pdf-Endung aber ohne korrekten PDF-Magic-Bytes wird beim Upload abgelehnt
  4. Ein API-Request von einer nicht konfigurierten Origin wird vom Server mit CORS-Fehler abgelehnt — kein Wildcard-Default
  5. Nach 5 falschen PIN-Versuchen innerhalb einer Minute gibt der Server 429 Too Many Requests zurück — weiteres Raten ist blockiert
  6. Ein Versuch mit einem gültigen Token auf Daten einer anderen shopId zuzugreifen wird server-seitig mit 403 abgelehnt
**Plans**: 3 plans

Plans:
- [x] 18-01-PLAN.md — Scheduler Storno-Filter (5 SQL-Queries) + CORS fail-closed (FIX-01, SEC-01)
- [x] 18-02-PLAN.md — PDF Magic-Byte-Validierung + Promise.race() 30s-Timeout (FIX-02, FIX-03)
- [x] 18-03-PLAN.md — @fastify/rate-limit PIN-Endpoint + Session-Store + shopId-Middleware + Client Auth-Header (SEC-02, SEC-03)

### Phase 19: TanStack Query Foundation
**Goal**: Alle Produkt- und Kategorie-Reads sowie alle CRUD-Writes laufen über TanStack Query direkt gegen den Server — Dexie ist nicht mehr primäre Datenquelle im Online-Modus
**Depends on**: Phase 18
**Requirements**: LIVE-01, LIVE-02, LIVE-06
**Success Criteria** (what must be TRUE):
  1. Produkte und Kategorien erscheinen im Admin ohne manuellen Sync-Aufruf — beim Öffnen eines Tabs werden sie automatisch vom Server geladen
  2. Eine Produktänderung (Preis, Name, Bestand) durch den Admin ist nach dem Speichern sofort in der Ansicht aktualisiert — kein Reload nötig
  3. Im Admin-Kontext (networkMode: 'online') zeigt TanStack Query offline einen Pending-Zustand statt veraltete Daten — keine irreführenden Cached-Werte
  4. Im POS-Kontext (networkMode: 'offlineFirst') arbeitet die Kasse auch ohne Netz mit dem letzten bekannten Produktstand
**Plans**: 3 plans

Plans:
- [ ] 19-01-PLAN.md — TQ Setup: @tanstack/react-query installieren, QueryClientProvider, useProducts + useCategories Hooks
- [ ] 19-02-PLAN.md — Admin Migration: ProductList, ProductForm, StockAdjustModal, CategoryManager auf TQ
- [ ] 19-03-PLAN.md — POS Migration: ArticleGrid mit networkMode offlineFirst

### Phase 20: WebSocket Live-Updates & Cleanup
**Goal**: Änderungen an Produkten, Kategorien und Bestand sind auf allen verbundenen Geräten sofort sichtbar — kein Polling, kein manueller Nachladen-Button, kein Outbox-Umweg für Online-Verkäufe
**Depends on**: Phase 19
**Requirements**: LIVE-03, LIVE-04, LIVE-05, LIVE-07
**Success Criteria** (what must be TRUE):
  1. Ändert der Admin einen Produktpreis, aktualisiert sich die Artikelkachel im POS auf einem anderen Gerät innerhalb von Sekunden — ohne Reload
  2. Ein Verkauf im Online-Modus erscheint sofort auf dem Server — kein Outbox-Eintrag, keine Sync-Verzögerung
  3. Der manuelle Sync-Button ist aus der UI entfernt — kein sichtbares Sync-Konzept für Nutzerinnen im Online-Modus
  4. Dexie enthält nur noch POS-relevante Offline-Daten (Warenkorb, Offline-Sales) — keine redundante Produktkopie für den Admin
**Plans**: 3 plans

Plans:
- [ ] 19-01-PLAN.md — TQ Setup: @tanstack/react-query installieren, QueryClientProvider, useProducts + useCategories Hooks
- [ ] 19-02-PLAN.md — Admin Migration: ProductList, ProductForm, StockAdjustModal, CategoryManager auf TQ
- [ ] 19-03-PLAN.md — POS Migration: ArticleGrid mit networkMode offlineFirst

### Phase 21: Offline-Fallback & Dexie als Cache
**Goal**: Die Kasse funktioniert nahtlos offline und online — beim Verlassen des WLANs schaltet sie automatisch auf Dexie-Cache um, beim Reconnect flusht sie die Outbox und holt sich den aktuellen Stand
**Depends on**: Phase 20
**Requirements**: OFFL-01, OFFL-02, OFFL-03
**Success Criteria** (what must be TRUE):
  1. Nach dem Einloggen kann das iPad in den Flugzeugmodus wechseln — Kasse zeigt weiterhin alle Artikel und lässt Verkäufe abschließen
  2. Offline getätigte Verkäufe erscheinen automatisch auf dem Server, sobald die Verbindung wiederhergestellt ist — keine Benutzerinteraktion nötig
  3. Die Umschaltung zwischen Online- und Offline-Modus ist für die Nutzerin unsichtbar — keine Fehlermeldungen, kein manuelles Eingreifen, nahtloser Übergang
**Plans**: 3 plans

Plans:
- [ ] 19-01-PLAN.md — TQ Setup: @tanstack/react-query installieren, QueryClientProvider, useProducts + useCategories Hooks
- [ ] 19-02-PLAN.md — Admin Migration: ProductList, ProductForm, StockAdjustModal, CategoryManager auf TQ
- [ ] 19-03-PLAN.md — POS Migration: ArticleGrid mit networkMode offlineFirst

## Progress

**Execution Order:**
Phases execute in numeric order: 18 → 19 → 20 → 21

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Offline-Kern & Kasse | v1.0 | 3/3 | Complete | 2026-03-23 |
| 2. Backend & Sync | v1.0 | 2/2 | Complete | 2026-03-23 |
| 3. Warenwirtschaft & Berichte | v1.0 | 3/3 | Complete | 2026-03-23 |
| 4. Rechnungsimport | v1.0 | 2/2 | Complete | 2026-03-23 |
| 5. Tech Debt Fixes | v1.1 | 2/2 | Complete | 2026-03-23 |
| 6. GitHub & Deployment | v1.1 | 3/3 | Complete | 2026-03-24 |
| 7. Server-Sync & Multi-Laden | v2.0 | 3/3 | Complete | 2026-03-24 |
| 8. Bestandsprüfung & Verkaufshistorie | v2.0 | 2/2 | Complete | 2026-03-24 |
| 9. Storno & Rückgabe | v2.0 | 1/1 | Complete | 2026-03-24 |
| 10. UI-Redesign | v3.0 | 2/2 | Complete | 2026-03-24 |
| 11. Produktbilder & PDF-Parsing | v3.0 | 2/2 | Complete | 2026-03-24 |
| 12. Bestandsampel & Umlaute | v3.0 | 1/1 | Complete | 2026-03-24 |
| 13. GitHub-Dokumentation | v3.0 | 0/? | Complete | 2026-03-24 |
| 14. Online-First Architektur | v4.0 | 1/1 | Complete | 2026-03-24 |
| 15. Datenintegrität | v4.0 | 2/2 | Complete | 2026-03-24 |
| 16. UI-Stabilität & Bestand | v4.0 | 1/1 | Complete | 2026-03-24 |
| 17. Datenverwaltung & Sync | v4.0 | 2/2 | Complete | 2026-03-24 |
| 18. Quick Wins & Security | v5.0 | 3/3 | Complete    | 2026-03-24 |
| 19. TanStack Query Foundation | v5.0 | 0/3 | Not started | - |
| 20. WebSocket Live-Updates & Cleanup | v5.0 | 0/? | Not started | - |
| 21. Offline-Fallback & Dexie als Cache | v5.0 | 0/? | Not started | - |
