# Roadmap: Fairstand Kassensystem

## Milestones

- ✅ **v1.0 Fairstand Kassensystem** — Phases 1-4 (shipped 2026-03-23)
- ✅ **v1.1 Tech Debt & Deployment** — Phases 5-6 (shipped 2026-03-24)
- ✅ **v2.0 Server-Sync, Multi-Laden & Kernfunktionen** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v3.0 Polish, Bilder & Redesign** — Phases 10-13 (shipped 2026-03-24)
- ✅ **v4.0 Datenqualität & Stabilität** — Phases 14-17 (shipped 2026-03-24)
- ✅ **v5.0 Online-First Live Architecture** — Phases 18-21 (shipped 2026-03-24)
- ✅ **v6.0 Pure Online** — Phases 22-23 (shipped 2026-03-24)
- ✅ **v7.0 Multi-Shop & UX** — Phases 24-26 (shipped 2026-03-25)
- ✅ **v8.0 Inventur, Preis-History & Rechnungsexport** — Phases 27-29 (shipped 2026-04-02)
- ✅ **v9.0 UX-Polish & Verwaltung** — Phases 30-32 (shipped 2026-04-03)
- ✅ **v10.0 Bilder, Export & Analyse** — Phases 33-36 (shipped 2026-04-03)
- ✅ **v11.0 EK-Preismanagement & Inventur-Genauigkeit** — Phases 37-39 (shipped 2026-04-09)
- **v12.0 Live-Suche** — Phase 40 (active)

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

<details>
<summary>✅ v5.0 Online-First Live Architecture (Phases 18-21) — SHIPPED 2026-03-24</summary>

- [x] **Phase 18: Quick Wins & Security** - Scheduler-Storno-Filter, PDF-Timeout, PDF-Validierung, CORS, PIN-Rate-Limiting, ShopId-Validierung (completed 2026-03-24)
- [x] **Phase 19: TanStack Query Foundation** - TQ installieren, alle Reads/Writes gegen Server-API, networkMode pro Kontext (completed 2026-03-24)
- [x] **Phase 20: WebSocket Live-Updates & Cleanup** - @fastify/websocket, Server-Broadcasts, Query-Invalidation, Outbox-Online entfernen, Sync-Button weg (completed 2026-03-24)
- [x] **Phase 21: Offline-Fallback & Dexie als Cache** - POS offline-tauglich mit TQ-Cache + Dexie-Fallback, Outbox offline, nahtloser Wechsel (completed 2026-03-24)

</details>

<details>
<summary>✅ v6.0 Pure Online (Phases 22-23) — SHIPPED 2026-03-24</summary>

- [x] Phase 22: PostgreSQL-Migration (3/3 plans) — completed 2026-03-24
- [x] Phase 23: Dexie-Entfernung & Online-Only (3/3 plans) — completed 2026-03-24

Full details: `.planning/milestones/v6.0-ROADMAP.md`

</details>

<details>
<summary>✅ v7.0 Multi-Shop & UX (Phases 24-26) — SHIPPED 2026-03-25</summary>

- [x] **Phase 24: Master-Shop Administration** - is_master-Flag, Shop anlegen/deaktivieren über Master-UI (completed 2026-03-25)
- [x] **Phase 25: Shop-Sortiment-Isolation** - Jeder Shop hat eigene Produkte, Berichte und PDF-Import pro Shop (completed 2026-03-25)
- [x] **Phase 26: Responsive UX** - Layout für alle Geräte, Warenkorb als Spalte oder Swipe-In, verbesserte Kategorien-Navigation (completed 2026-03-25)

</details>

<details>
<summary>✅ v8.0 Inventur, Preis-History & Rechnungsexport (Phases 27-29) — SHIPPED 2026-04-02</summary>

- [x] **Phase 27: Preis-History & Bestandsverlauf** - DB-Schema price_history + stock_movements, automatisches Logging bei Preisänderungen und Bestandsbewegungen (completed 2026-04-01)
- [x] **Phase 28: Inventur-Übersicht & Preis-Auswertung** - Jahresbericht-Erweiterung mit Inventur pro Artikel, EK-Aufschlüsselung, Bestandswert-Summe, Preis-History-Ansicht (completed 2026-04-01)
- [x] **Phase 29: Export** - CSV-Download für Verkaufshistorie und Inventur, PDF-Einzelbelege (completed 2026-04-01)

Full details: `.planning/milestones/v8.0-ROADMAP.md`

</details>

<details>
<summary>✅ v9.0 UX-Polish & Verwaltung (Phases 30-32) — SHIPPED 2026-04-03</summary>

- [x] **Phase 30: Admin-Verwaltung** - Inventur als eigener Tab, Artikel löschen, Button umbenennen (completed 2026-04-02)
- [x] **Phase 31: Tagesübersicht-UX** - Spenden visuell markieren, Kalender-Datepicker (completed 2026-04-03)
- [x] **Phase 32: Auto-Logout** - Automatischer Redirect auf PIN-Login bei abgelaufenem Token (completed 2026-04-03)

Full details: `.planning/milestones/v9.0-ROADMAP.md`

</details>

<details>
<summary>✅ v10.0 Bilder, Export & Analyse (Phases 33-36) — SHIPPED 2026-04-03</summary>

- [x] **Phase 33: Produktbilder im POS-Grid** - Artikelkacheln zeigen Produktbild wenn vorhanden (completed 2026-04-03)
- [x] **Phase 34: XLSX-Export** - Inventur und Verkaufshistorie als Excel-Datei herunterladbar (completed 2026-04-03)
- [x] **Phase 35: Lagerdauer-Analyse** - Letzte Verkaufsdaten und Ladenhüter-Markierung sichtbar (completed 2026-04-03)
- [x] **Phase 36: EK-Preiswarnung beim Import** - Warnung wenn sich EK eines Artikels beim PDF-Import geändert hat (completed 2026-04-03)

</details>

<details>
<summary>✅ v11.0 EK-Preismanagement & Inventur-Genauigkeit (Phases 37-39) — SHIPPED 2026-04-09</summary>

- [x] **Phase 37: EK-Wareneingänge & Bestandsanpassung** - Bestandserhöhungen speichern EK-Preis, PDF-Import erfasst Wareneingangs-Bewegung, StockAdjustModal mit EK-Toggle
- [x] **Phase 38: FIFO-Inventur** - Bestandswert auf Basis historischer EK-Preise per Wareneingang, Inventur-Report zeigt Mengen je EK transparent
- [x] **Phase 39: Bestandswarnungen-UX** - Glocken-Icon mit Badge-Zähler im Header, aufgeräumte Warnliste per Klick

</details>

<details open>
<summary>v12.0 Live-Suche (Phase 40) — ACTIVE</summary>

- [ ] **Phase 40: Live-Suche im POS-Dashboard** - Suchfeld über dem Artikelgrid filtert live nach Artikelnummer, Produktname und Kategorie

</details>

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
**Plans**: 2 plans

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
**Plans**: 2 plans

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
**Plans**: 2 plans

Plans:
- [x] 19-01-PLAN.md — TQ Setup: @tanstack/react-query installieren, QueryClientProvider, useProducts + useCategories Hooks
- [x] 19-02-PLAN.md — Admin Migration: ProductList, ProductForm, StockAdjustModal, CategoryManager auf TQ
- [x] 19-03-PLAN.md — POS Migration: ArticleGrid mit networkMode offlineFirst

### Phase 20: WebSocket Live-Updates & Cleanup
**Goal**: Änderungen an Produkten, Kategorien und Bestand sind auf allen verbundenen Geräten sofort sichtbar — kein Polling, kein manueller Nachladen-Button, kein Outbox-Umweg für Online-Verkäufe
**Depends on**: Phase 19
**Requirements**: LIVE-03, LIVE-04, LIVE-05, LIVE-07
**Success Criteria** (what must be TRUE):
  1. Ändert der Admin einen Produktpreis, aktualisiert sich die Artikelkachel im POS auf einem anderen Gerät innerhalb von Sekunden — ohne Reload
  2. Ein Verkauf im Online-Modus erscheint sofort auf dem Server — kein Outbox-Eintrag, keine Sync-Verzögerung
  3. Der manuelle Sync-Button ist aus der UI entfernt — kein sichtbares Sync-Konzept für Nutzerinnen im Online-Modus
  4. Dexie enthält nur noch POS-relevante Offline-Daten (Warenkorb, Offline-Sales) — keine redundante Produktkopie für den Admin
**Plans**: 2 plans

Plans:
- [x] 20-01-PLAN.md — Server: @fastify/websocket + /api/ws Route + broadcast() + Integration in products/categories/sync
- [x] 20-02-PLAN.md — Client: useSaleComplete Online-Direct-POST + Dexie Write-Through in useProducts/useCategories
- [x] 20-03-PLAN.md — Client: useWebSocket Hook + Cleanup (Sync-Button, Sync-Badge, downloadProducts entfernen)

### Phase 21: Offline-Fallback & Dexie als Cache
**Goal**: Die Kasse funktioniert nahtlos offline und online — beim Verlassen des WLANs schaltet sie automatisch auf Dexie-Cache um, beim Reconnect flusht sie die Outbox und holt sich den aktuellen Stand
**Depends on**: Phase 20
**Requirements**: OFFL-01, OFFL-02, OFFL-03
**Success Criteria** (what must be TRUE):
  1. Nach dem Einloggen kann das iPad in den Flugzeugmodus wechseln — Kasse zeigt weiterhin alle Artikel und lässt Verkäufe abschließen
  2. Offline getätigte Verkäufe erscheinen automatisch auf dem Server, sobald die Verbindung wiederhergestellt ist — keine Benutzerinteraktion nötig
  3. Die Umschaltung zwischen Online- und Offline-Modus ist für die Nutzerin unsichtbar — keine Fehlermeldungen, kein manuelles Eingreifen, nahtloser Übergang
**Plans**: 2 plans

Plans:
- [x] 21-01-PLAN.md — Dexie Cold-Start-Fallback: queryFn in ArticleGrid, useProducts, useCategories (OFFL-01)
- [x] 21-02-PLAN.md — Outbox-Flush mit TQ-Invalidation + Offline-Indicator im POS-Header (OFFL-02, OFFL-03)

### Phase 22: PostgreSQL-Migration
**Goal**: Der Server verwendet PostgreSQL statt SQLite — die Datenbank ist produktionsreif, bestehende Daten sind übertragen, better-sqlite3 ist entfernt
**Depends on**: Phase 21
**Requirements**: PG-01, PG-02, PG-03, PG-04, PG-05
**Success Criteria** (what must be TRUE):
  1. Der Server startet und beantwortet alle API-Anfragen nach dem Wechsel auf PostgreSQL — kein Endpoint bricht, alle Daten sind vorhanden
  2. Docker-Compose startet einen PostgreSQL-Container mit persistentem Volume — Daten überleben Container-Neustart
  3. Ein Migrationsskript überträgt alle bestehenden SQLite-Daten (Produkte, Kategorien, Shops, Sales) in die PostgreSQL-Datenbank
  4. better-sqlite3 ist aus package.json und allen Imports entfernt — der Build schlägt fehl wenn Reste vorhanden sind
**Plans**: 3 plans

Plans:
- [x] 22-01-PLAN.md — Docker-Infra (docker-compose PostgreSQL), Drizzle Schema pgTable, DB-Connection Pool
- [x] 22-02-PLAN.md — Async-Refactor aller Routes + seed.ts + reportScheduler.ts + PostgreSQL-SQL
- [x] 22-03-PLAN.md — Datenmigrationsskript SQLite→PostgreSQL + better-sqlite3 entfernen

### Phase 23: Dexie-Entfernung & Online-Only
**Goal**: Dexie, IndexedDB und das Outbox-Pattern sind vollständig entfernt — die App läuft ausschließlich online, zeigt bei fehlendem Internet einen klaren Hinweis und der Service Worker cached nur die App-Shell
**Depends on**: Phase 22
**Requirements**: DEX-01, DEX-02, DEX-03, DEX-04, DEX-05, ONL-01, ONL-02, ONL-03
**Success Criteria** (what must be TRUE):
  1. Dexie.js, dexie-react-hooks und idb-keyval tauchen nicht mehr in package.json oder in einem import-Statement auf — npm run build schlägt fehl wenn Reste vorhanden sind
  2. Der Warenkorb hält seinen Stand im React State zwischen Navigationen — nach einem bewussten Browser-Reload startet er leer (kein IndexedDB-Fallback)
  3. Ohne aktive Internetverbindung zeigt die App sofort einen deutlichen Hinweis — kein Verkauf kann abgeschlossen werden, keine Daten werden angezeigt
  4. Ein Verkauf wird direkt an den Server gesendet — es gibt keine Outbox, keine Retry-Queue, kein lokales Speichern
  5. Der Service Worker cached die App-Shell (HTML, JS, CSS) für PWA-Installation — er speichert keine API-Responses oder Produktdaten
**Plans**: 3 plans

Plans:
- [x] 23-01-PLAN.md — Dexie-Kern entfernen: db/schema, db/index, sync/engine, sync/triggers, useCart, useProducts, useCategories, App.tsx
- [x] 23-02-PLAN.md — idb-keyval auf localStorage: serverAuth, pinAuth, ImportScreen, SettingsForm, PaymentFlow
- [x] 23-03-PLAN.md — Online-Only Abschluss: useSaleComplete, DailyReport TQ, useLowStockCount, Offline-Overlay, Service Worker, package.json

### Phase 24: Master-Shop Administration
**Goal**: Der Master-Shop (St. Secundus) kann andere Shops über eine eigene Verwaltungsansicht anlegen, PIN vergeben und deaktivieren — kein anderer Shop sieht diese Funktion
**Depends on**: Phase 23
**Requirements**: SHOP-01, SHOP-02, SHOP-03
**Success Criteria** (what must be TRUE):
  1. Nach dem Login mit dem Master-PIN erscheint in der Admin-Navigation ein "Shops"-Tab, der bei allen anderen Shops nicht sichtbar ist
  2. Aus dem Shops-Tab heraus kann ein neuer Shop mit Name und PIN angelegt werden — nach dem Anlegen ist der Shop sofort über den neuen PIN erreichbar
  3. Ein aktiver Shop kann deaktiviert werden — danach schlägt der Login mit dessen PIN fehl und die Mitarbeiterinnen des Shops sehen eine klare Fehlermeldung
  4. Die Master-Verwaltung zeigt eine Liste aller Shops mit Status (aktiv/inaktiv)
**Plans**: 2 plans

Plans:
- [x] 24-01-PLAN.md — DB-Schema (is_master + active), Migration, Seed-Update, Auth active-Check + isMaster in Response
- [x] 24-02-PLAN.md — /api/shops Route (Master-only CRUD), ShopsManager.tsx, AdminScreen Shops-Tab, isMaster in Session

### Phase 25: Shop-Sortiment-Isolation
**Goal**: Jeder Shop hat ein vollständig unabhängiges Sortiment — Produkte, Preise und Bestand sind shop-spezifisch, Berichte und PDF-Imports bleiben pro Shop isoliert
**Depends on**: Phase 24
**Requirements**: SHOP-04, SELF-01, SELF-02, SELF-03
**Success Criteria** (what must be TRUE):
  1. Zwei Shops mit unterschiedlichen PINs sehen nach dem Login jeweils nur ihre eigenen Produkte — kein Artikel des anderen Shops ist sichtbar
  2. Eine Bestandsänderung oder Preisänderung in Shop A hat keine Auswirkung auf die Produktansicht in Shop B
  3. Der Tagesbericht und Monatsbericht zeigen ausschließlich Verkäufe des eingeloggten Shops — keine Daten anderer Shops erscheinen
  4. Ein PDF-Import erstellt die neuen Produkte im Sortiment des eingeloggten Shops — nicht global
**Plans**: 2 plans
Plans:
- [x] 25-01-PLAN.md — products.ts PATCH-Hardening + settings Composite Key
- [x] 25-02-PLAN.md — sync.ts Stock-Delta shopId-Validierung + ImportScreen Bereinigung

### Phase 26: Responsive UX
**Goal**: Die App passt sich an jedes Gerät an — auf dem Desktop und iPad im Querformat steht der Warenkorb als feste Spalte daneben, auf dem iPhone und iPad im Hochformat lässt er sich per Swipe einblenden, und die Kategorien-Navigation ist schnell und klar bedienbar
**Depends on**: Phase 25
**Requirements**: UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. Auf dem Desktop-Browser und iPad Landscape ist der Warenkorb dauerhaft als rechte Spalte sichtbar — ohne Modal oder Overlay
  2. Auf dem iPhone und iPad Portrait ist der Warenkorb zunächst versteckt und erscheint als Panel von rechts wenn man darauf tippt oder wischt
  3. Die Kategorien-Navigation ermöglicht das schnelle Wechseln zwischen Kategorien mit einem einzelnen Tipp — der aktive Filter ist klar erkennbar
  4. Das Layout funktioniert auf allen drei Geräteklassen ohne horizontales Scrollen oder abgeschnittene Elemente
**Plans**: 4 plans
Plans:
- [x] 26-01-PLAN.md — Admin-Einstellung cart_sidebar_enabled in SettingsForm
- [x] 26-02-PLAN.md — POSScreen responsives Sidebar-Layout (lg+ Spalte vs. Slide-In)
- [x] 26-03-PLAN.md — CartPanel Swipe-to-Dismiss und Swipe-to-Open
- [x] 26-04-PLAN.md — ArticleGrid sticky Kategorie-Tabs, Auto-Scroll, verbesserter Kontrast

### Phase 27: Preis-History & Bestandsverlauf
**Goal**: Jede EK/VK-Änderung und jede Bestandsbewegung wird lückenlos in der Datenbank protokolliert — das Fundament für alle Auswertungen in Phase 28
**Depends on**: Phase 26
**Requirements**: PRICE-01, INV-04
**Success Criteria** (what must be TRUE):
  1. Nach einer Preisänderung an einem Artikel enthält die price_history-Tabelle einen neuen Eintrag mit Artikel-ID, altem Preis, neuem Preis und Zeitstempel — ohne manuellen Eingriff
  2. Nach einem Verkauf, einer Stornierung, einer Nachbuchung oder Bestandskorrektur enthält stock_movements einen Eintrag mit Typ, Menge, Zeitstempel und Referenz auf den auslösenden Vorgang
  3. Pro Artikel kann eine chronologische Liste aller Bestandsbewegungen abgerufen werden — Eintrag für Eintrag mit Zeitstempel und Bewegungsgrund
  4. Das Logging läuft vollständig serverseitig — kein Clientcode muss sich darum kümmern
**Plans**: 3 plans

Plans:
- [x] 27-01-PLAN.md — Drizzle-Schema: priceHistories + stockMovements Tabellen + Migrations generieren
- [x] 27-02-PLAN.md — Logging in products.ts (Preis-History) und sales.ts (Hard-Delete Restock)
- [ ] 27-03-PLAN.md — Logging in sync.ts (alle 4 Operationen) + GET-Endpoints priceHistory.ts

### Phase 28: Inventur-Übersicht & Preis-Auswertung
**Goal**: Der Jahresbericht zeigt pro Artikel eine vollständige Inventur-Übersicht mit Bestand, Umsatz, EK-Kosten und Preisänderungen — alle Zahlen stimmen, auch wenn EK im Laufe des Jahres gestiegen ist
**Depends on**: Phase 27
**Requirements**: INV-01, INV-02, INV-03, PRICE-02, PRICE-03
**Success Criteria** (what must be TRUE):
  1. Im Jahresbericht gibt es eine Inventur-Tabelle: pro Artikel sind aktueller Bestand, verkaufte Gesamtmenge, VK-Umsatz und EK-Kosten auf einen Blick sichtbar
  2. Wenn ein Artikel im Laufe des Jahres zwei verschiedene EK-Preise hatte, zeigt die Inventur-Aufschlüsselung "X Stück zu EK1 = Betrag, Y Stück zu EK2 = Betrag" — korrekt abgeleitet aus den Sale-Item-Snapshots
  3. Eine Bestandswert-Summe am Ende der Inventur-Tabelle zeigt den Gesamtwert aller Waren (Menge × aktueller EK) als einzelne Zahl
  4. Pro Artikel in der Produktverwaltung gibt es eine History-Ansicht mit Zeitstrahl: wann hat sich EK oder VK geändert, von welchem auf welchen Wert
**Plans**: 2 plans

Plans:
- [x] 28-01-PLAN.md — Backend: GET /api/reports/inventory Endpoint mit EK-Aufschlüsselung (INV-01, INV-02, INV-03, PRICE-03)
- [x] 28-02-PLAN.md — Frontend: Inventur-Tab in MonthlyReport + Preis-History-Tab in ProductStats (INV-01, INV-02, INV-03, PRICE-02)
**UI hint**: yes

### Phase 29: Export
**Goal**: Verkaufshistorie, Inventur und Einzelbelege können als Datei heruntergeladen werden — CSV für Tabellenkalkulationen, PDF für Einzelbelege
**Depends on**: Phase 28
**Requirements**: EXP-01, EXP-02, EXP-03
**Success Criteria** (what must be TRUE):
  1. Aus der Verkaufshistorie kann eine CSV-Datei heruntergeladen werden, die sich in Excel und Numbers ohne Zeichensatzfehler öffnen lässt (korrekte Umlaute, Semikolon-Trennzeichen)
  2. Die Inventur-Tabelle aus dem Jahresbericht kann als separate CSV-Datei exportiert werden — alle Spalten aus der Ansicht sind enthalten
  3. Zu einem einzelnen abgeschlossenen Verkauf lässt sich ein PDF-Beleg generieren und herunterladen — mit Artikel, Menge, Preis, Datum und Shop-Name
**Plans**: 2 plans

Plans:
- [x] 29-01-PLAN.md — Backend: CSV + PDF Export-Endpoints (pdfkit + csv-stringify) (EXP-01, EXP-02, EXP-03)
- [x] 29-02-PLAN.md — Frontend: Download-Buttons in DailyReport, MonthlyReport, SaleDetailModal (EXP-01, EXP-02, EXP-03)

### Phase 30: Admin-Verwaltung
**Goal**: Die Produktverwaltung ist vollständig — Artikel können dauerhaft gelöscht werden, die Inventur ist direkt zugänglich, und Beschriftungen sind eindeutig
**Depends on**: Phase 29
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03
**Success Criteria** (what must be TRUE):
  1. Im Admin-Bereich gibt es einen eigenen "Inventur"-Tab, der die Inventur-Übersicht zeigt — nicht mehr im Jahresbericht vergraben
  2. In der Produktverwaltung kann ein Artikel dauerhaft gelöscht werden — nach einer Bestätigungsabfrage verschwindet er vollständig aus der Datenbank
  3. Der Button zur Bestandsanpassung heißt "Bestand anpassen" statt "Bestandskorrektur"
**Plans**: 2 plans

Plans:
- [x] 30-01-PLAN.md — Backend: DELETE-Endpoint + Unique-Constraint-Migration
- [x] 30-02-PLAN.md — Frontend: InventurTab extrahieren + Löschen-UI + Umbenennung

### Phase 31: Tagesübersicht-UX
**Goal**: Die Tagesübersicht zeigt auf einen Blick welche Transaktionen Spenden enthielten und ermöglicht eine freie Datumsauswahl per Kalender
**Depends on**: Phase 30
**Requirements**: HIST-01, HIST-02
**Success Criteria** (what must be TRUE):
  1. Verkäufe in der Tagesübersicht, bei denen ein Spendenbetrag erfasst wurde, sind visuell deutlich markiert — der Spendenbetrag ist hervorgehoben
  2. Der Benutzer kann über einen Kalender-Datepicker ein beliebiges Datum auswählen — die Preset-Buttons (Heute, Gestern etc.) sind nicht mehr der einzige Weg
**Plans**: 1 plan
**UI hint**: yes

Plans:
- [x] 31-01-PLAN.md — DailyReport.tsx: Spendenmarkierung + Datepicker-Aktivzustand (HIST-01, HIST-02)

### Phase 32: Auto-Logout
**Goal**: Ein abgelaufener Session-Token führt zu einem sauberen Redirect auf den PIN-Login — kein verwirrender 401-Fehler
**Depends on**: Phase 31
**Requirements**: AUTH-01
**Success Criteria** (what must be TRUE):
  1. Wenn eine API-Anfrage mit einem abgelaufenen Token eine 401-Antwort erhält, wird der Benutzer automatisch auf die PIN-Eingabe weitergeleitet — ohne Fehlermeldung oder White Screen
  2. Nach dem automatischen Redirect ist der Warenkorb leer und der Benutzer kann sich erneut einloggen
**Plans**: 1 plan

Plans:
- [x] 32-01-PLAN.md — authFetch: CustomEvent statt Reload + useAuth: auto-lock bei 401

### Phase 33: Produktbilder im POS-Grid
**Goal**: Mitarbeiterinnen sehen Produktbilder direkt in den Artikelkacheln der Kasse — ohne in die Verwaltung navigieren zu müssen
**Depends on**: Phase 32
**Requirements**: IMG-01
**Success Criteria** (what must be TRUE):
  1. Eine Artikelkachel im POS-Grid zeigt das hinterlegte Produktbild — das Bild füllt die Kachel als Hintergrund oder als eingebettetes Element
  2. Artikel ohne hinterlegtes Bild zeigen die bisherige Darstellung (Name + Preis) unverändert — kein leeres Bild-Platzhalter-Element
  3. Die Kachel bleibt vollständig tippbar — der Plus-Button und der Bestandsindikator sind weiterhin klar sichtbar
**Plans**: 1 plan

Plans:
- [x] 35-01-PLAN.md — last_sale_at Backend-Query + Lagerdauer-Badge + Ladenhüter-Filter in ProductList
**UI hint**: yes

### Phase 34: XLSX-Export
**Goal**: Inventur und Verkaufshistorie können als Excel-Datei heruntergeladen werden — zusätzlich zu den bestehenden CSV- und PDF-Exporten
**Depends on**: Phase 33
**Requirements**: EXP-04, EXP-05
**Success Criteria** (what must be TRUE):
  1. Im Admin-Bereich gibt es neben dem CSV-Download-Button für die Inventur einen weiteren Button "Als Excel herunterladen" — die resultierende .xlsx-Datei öffnet sich in Excel und Numbers ohne Fehler
  2. Ebenso gibt es für die Verkaufshistorie einen Excel-Export-Button — alle Spalten aus der Ansicht sind in der XLSX-Datei enthalten
  3. Deutsche Sonderzeichen (Umlaute) erscheinen in der Excel-Datei korrekt — kein Zeichensatz-Problem
**Plans**: 1 plan

Plans:
- [x] 34-01-PLAN.md — xlsx installieren + Server-Endpoints (inventory-xlsx, sales-xlsx) + Frontend-Buttons

### Phase 35: Lagerdauer-Analyse
**Goal**: Für jeden Artikel ist sichtbar wann er zuletzt verkauft wurde und Ladenhüter (>3 Monate nicht verkauft) sind auf einen Blick erkennbar
**Depends on**: Phase 34
**Requirements**: ANA-01, ANA-02
**Success Criteria** (what must be TRUE):
  1. In der Produktliste oder einem dedizierten Analyse-Bereich zeigt jeder Artikel das Datum des letzten Verkaufs und die Anzahl Tage seit dem letzten Verkauf
  2. Artikel, die seit mehr als 3 Monaten nicht verkauft wurden, sind farblich markiert (z.B. orangefarbener Hinweis oder Label "Ladenhüter")
  3. Artikel ohne jeglichen Verkauf (neu angelegt, noch nie verkauft) werden klar als solche ausgewiesen
**Plans**: 1 plan

Plans:
- [ ] 35-01-PLAN.md — last_sale_at Backend-Query + Lagerdauer-Badge + Ladenhüter-Filter in ProductList
**UI hint**: yes

### Phase 36: EK-Preiswarnung beim Import
**Goal**: Beim PDF-Import vom Süd-Nord-Kontor werden Preisänderungen gegenüber dem gespeicherten EK sofort sichtbar — Mitarbeiterinnen müssen nicht manuell vergleichen
**Depends on**: Phase 35
**Requirements**: IMP-01
**Success Criteria** (what must be TRUE):
  1. In der Import-Prüfansicht wird pro Zeile ein Warnsymbol oder farblicher Hinweis angezeigt wenn der importierte EK vom gespeicherten EK des gematchten Artikels abweicht
  2. Der Hinweis zeigt den alten und neuen EK-Wert — Mitarbeiterin sieht auf einen Blick wie stark sich der Preis verändert hat
  3. Artikel ohne EK-Abweichung erhalten keinen Hinweis — die Warnung erscheint nur wo tatsächlich eine Änderung vorliegt
**Plans**: 1 plan

Plans:
- [x] 36-01-PLAN.md — MatchedRow.storedPurchasePriceCents + EK-Warnzeile in ReviewTable

### Phase 37: EK-Wareneingänge & Bestandsanpassung
**Goal**: Jede Bestandserhöhung — ob per PDF-Import oder manueller Anpassung — speichert den zugehörigen EK-Preis als eigene Bewegung in stock_movements
**Depends on**: Phase 36
**Requirements**: EINGANG-01, EINGANG-02, ANPASS-01, ANPASS-02
**Success Criteria** (what must be TRUE):
  1. Nach einem PDF-Import erscheint in der stock_movements-Tabelle eine Bewegung vom Typ 'restock' mit dem aus der Rechnung stammenden EK-Preis und der importierten Menge pro Artikel
  2. Im StockAdjustModal gibt es einen "Preis anpassen"-Toggle — wird er aktiviert, erscheint ein EK-Preis-Eingabefeld und der neue EK wird beim Speichern in der Bewegung hinterlegt
  3. Bei einer positiven Bestandskorrektur ohne Toggle-Aktivierung wird der aktuelle Produkt-EK automatisch als EK der Bewegung gespeichert
  4. Negative Bestandskorrekturen (Schwund, Korrektur nach unten) erfordern keinen EK-Preis-Eintrag
**Plans**: 3 plans

Plans:
- [x] 37-01-PLAN.md — DB-Schema: purchase_price_cents in stock_movements
- [x] 37-02-PLAN.md — STOCK_ADJUST Handler + StockAdjustModal EK-Toggle
- [x] 37-03-PLAN.md — POST /api/stock/adjust Endpoint + ImportScreen purchasePriceCents

### Phase 38: FIFO-Inventur
**Goal**: Der Inventur-Report berechnet den Bestandswert auf Basis exakter historischer EK-Preise pro Wareneingang nach FIFO — nicht mehr "aktueller EK × Gesamtbestand"
**Depends on**: Phase 37
**Requirements**: INVENT-01, INVENT-02, INVENT-03
**Success Criteria** (what must be TRUE):
  1. Im Inventur-Tab zeigt die Bestandswert-Summe einen Betrag, der aus den historischen Eingangs-EKs nach FIFO berechnet wurde — nicht aus dem aktuellen Produkt-EK multipliziert mit dem Gesamtbestand
  2. Pro Artikel listet der Inventur-Report auf, welche Mengen zu welchem EK-Preis noch im Bestand liegen (z.B. "3 Stück zu 1,20 € + 5 Stück zu 1,35 €")
  3. Wenn Artikel verkauft wurden, sind die ältesten Wareneingänge zuerst verbraucht — ein Verkauf nach einem neueren Eingang reduziert den älteren Bestand zuerst
**Plans**: 2 plans

Plans:
- [x] 38-01-PLAN.md — FIFO-Algorithmus in computeFifoInventory + /reports/inventory Endpoint + InventurTab Chargen-Anzeige
- [x] 38-02-PLAN.md — inventory-csv, inventory-pdf, inventory-xlsx auf computeFifoInventory umstellen

### Phase 39: Bestandswarnungen-UX
**Goal**: Bestandswarnungen sind jederzeit sichtbar aber nicht aufdringlich — ein Glocken-Icon mit Zähler im Header macht den Überblick möglich ohne den Arbeitsfluss zu unterbrechen
**Depends on**: Phase 36
**Requirements**: WARN-01, WARN-02
**Success Criteria** (what must be TRUE):
  1. Im Header der App erscheint ein Glocken-Icon mit einem Badge-Zähler der anzeigt wie viele Artikel unter Mindestbestand liegen — bei keiner Warnung ist der Badge nicht sichtbar
  2. Ein Tipp auf die Glocke öffnet eine Liste mit genau einem Eintrag pro Artikel unter Mindestbestand, der Artikelname, aktueller Bestand und Mindestbestand zeigt
  3. Die bisherige Darstellung der Bestandswarnungen (ausgeklappter Banner o.ä.) wird durch die Glocke ersetzt — keine Dopplung
**Plans**: 1 plan

Plans:
- [x] 39-01-PLAN.md — StockAlertButton (Bell + Badge + Popover) erstellen, LowStockBanner entfernen


### Phase 40: Live-Suche im POS-Dashboard
**Goal**: Mitarbeiterinnen können Artikel im POS-Dashboard per Texteingabe sofort finden — ohne durch das gesamte Grid scrollen zu müssen
**Depends on**: Phase 39
**Requirements**: SUCH-01, SUCH-02, SUCH-03, SUCH-04, SUCH-05
**Success Criteria** (what must be TRUE):
  1. Über dem Artikelgrid gibt es ein Suchfeld — nach dem ersten Tipp auf das Feld erscheint die Tastatur und die Filterung startet sofort mit jedem eingegebenen Zeichen
  2. Wenn der Suchbegriff in Artikelnummer, Produktname oder Kategorie vorkommt (Teilmatch), erscheint der Artikel im gefilterten Grid — nicht passende Artikel verschwinden
  3. Das Leeren des Suchfelds stellt das vollständige Artikelgrid wieder her — als wäre keine Suche aktiv gewesen
  4. Die Suche funktioniert auf dem iPad mit Touch-Eingabe ohne Verzögerung oder Flackern des Grids
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 35 → 36 → 37 → 38 → 39 → 40

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
| 18. Quick Wins & Security | v5.0 | 3/3 | Complete | 2026-03-24 |
| 19. TanStack Query Foundation | v5.0 | 3/3 | Complete | 2026-03-24 |
| 20. WebSocket Live-Updates & Cleanup | v5.0 | 3/3 | Complete | 2026-03-24 |
| 21. Offline-Fallback & Dexie als Cache | v5.0 | 2/2 | Complete | 2026-03-24 |
| 22. PostgreSQL-Migration | v6.0 | 3/3 | Complete | 2026-03-24 |
| 23. Dexie-Entfernung & Online-Only | v6.0 | 3/3 | Complete | 2026-03-24 |
| 24. Master-Shop Administration | v7.0 | 2/2 | Complete | 2026-03-25 |
| 25. Shop-Sortiment-Isolation | v7.0 | 2/2 | Complete | 2026-03-25 |
| 26. Responsive UX | v7.0 | 4/4 | Complete | 2026-03-25 |
| 27. Preis-History & Bestandsverlauf | v8.0 | 2/3 | Complete    | 2026-04-01 |
| 28. Inventur-Übersicht & Preis-Auswertung | v8.0 | 2/2 | Complete    | 2026-04-01 |
| 29. Export | v8.0 | 2/2 | Complete    | 2026-04-01 |
| 30. Admin-Verwaltung | v9.0 | 2/2 | Complete    | 2026-04-02 |
| 31. Tagesübersicht-UX | v9.0 | 1/1 | Complete    | 2026-04-03 |
| 32. Auto-Logout | v9.0 | 1/1 | Complete    | 2026-04-03 |
| 33. Produktbilder im POS-Grid | v10.0 | 0/? | Complete    | 2026-04-03 |
| 34. XLSX-Export | v10.0 | 1/1 | Complete    | 2026-04-03 |
| 35. Lagerdauer-Analyse | v10.0 | 1/1 | Complete    | 2026-04-03 |
| 36. EK-Preiswarnung beim Import | v10.0 | 1/1 | Complete    | 2026-04-03 |
| 37. EK-Wareneingänge & Bestandsanpassung | v11.0 | 3/3 | Complete | 2026-04-09 |
| 38. FIFO-Inventur | v11.0 | 2/2 | Complete | 2026-04-09 |
| 39. Bestandswarnungen-UX | v11.0 | 1/1 | Complete | 2026-04-09 |
| 40. Live-Suche im POS-Dashboard | v12.0 | 0/? | Not started | - |
