# Roadmap: Fairstand Kassensystem

## Milestones

- ✅ **v1.0 Fairstand Kassensystem** — Phases 1-4 (shipped 2026-03-23)
- ✅ **v1.1 Tech Debt & Deployment** — Phases 5-6 (shipped 2026-03-24)
- ✅ **v2.0 Server-Sync, Multi-Laden & Kernfunktionen** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v3.0 Polish, Bilder & Redesign** — Phases 10-13 (shipped 2026-03-24)
- 🚧 **v4.0 Datenqualität & Stabilität** — Phases 14-17 (active)

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

### 🚧 v4.0 Datenqualität & Stabilität

- [x] **Phase 14: Online-First Architektur** - LWW durch Server-Replace ersetzen, Admin offline deaktivieren, Offline nur für Verkauf/Storno/Rückgabe (completed 2026-03-24)
- [x] **Phase 15: Datenintegrität** - Marge/EK korrekt, Storno aus Statistiken raus, Warenkorb überlebt Reload, ungültige Artikel erkannt (completed 2026-03-24)
- [x] **Phase 16: UI-Stabilität & Bestand** - Scroll/Tap-Bug behoben, Bestandswarnungen klarer (completed 2026-03-24)
- [x] **Phase 17: Datenverwaltung & Sync** - Zentrales Kategorie-Management, Bildupload-Workflow verbessert, Sync robuster (completed 2026-03-24)

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
- [ ] 17-02-PLAN.md — Bildupload in ProductForm + useSyncStatus-Hook + 30s-Retry + Sync-Badge in POS

## Progress

**Execution Order:**
Phases execute in numeric order: 14 → 15 → 16 → 17

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
| 14. Online-First Architektur | v4.0 | 1/1 | Complete    | 2026-03-24 |
| 15. Datenintegrität | v4.0 | 2/2 | Complete    | 2026-03-24 |
| 16. UI-Stabilität & Bestand | v4.0 | 1/1 | Complete    | 2026-03-24 |
| 17. Datenverwaltung & Sync | v4.0 | 2/2 | Complete    | 2026-03-24 |
