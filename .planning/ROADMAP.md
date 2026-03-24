# Roadmap: Fairstand Kassensystem

## Milestones

- ✅ **v1.0 Fairstand Kassensystem** — Phases 1-4 (shipped 2026-03-23)
- ✅ **v1.1 Tech Debt & Deployment** — Phases 5-6 (shipped 2026-03-24)
- 🚧 **v2.0 Server-Sync, Multi-Laden & Kernfunktionen** — Phases 7-9 (active)

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

### 🚧 v2.0 Server-Sync, Multi-Laden & Kernfunktionen

- [x] **Phase 7: Server-Sync & Multi-Laden** - Architektur-Umbau: Server wird Single Source of Truth, PIN-basierte Laden-Auswahl (completed 2026-03-24)
- [ ] **Phase 8: Bestandsprüfung & Verkaufshistorie** - Kassen-UX mit Bestandsanzeige und Überverkauf-Blockierung, Tages- und Artikelstatistik
- [ ] **Phase 9: Storno & Rückgabe** - Vollständige Transaktionskorrektur mit Bestandsrückverfolgung

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
- [ ] 08-01-PLAN.md — Bestandsanzeige in Artikelkacheln + Überverkauf-Blockierung in useCart
- [ ] 08-02-PLAN.md — Anklickbare Tagesübersicht (SaleDetailModal) + Artikel-Statistik (ProductStats + Server-Endpoint)

### Phase 9: Storno & Rückgabe
**Goal**: Fehlgebuchte Verkäufe können korrigiert werden — Bestand wird korrekt zurückgebucht
**Depends on**: Phase 8 (Tagesübersicht aus HIST-01 ist Einstiegspunkt für Storno)
**Requirements**: STOR-01, STOR-02
**Success Criteria** (what must be TRUE):
  1. Aus der Tagesübersicht heraus kann ein vollständiger Verkauf storniert werden — der Bestand aller enthaltenen Artikel wird zurückgebucht
  2. Einzelne Artikel aus einem Verkauf können als Rückgabe verbucht werden — nur der Bestand des zurückgegebenen Artikels ändert sich
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 7 → 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Offline-Kern & Kasse | v1.0 | 3/3 | Complete | 2026-03-23 |
| 2. Backend & Sync | v1.0 | 2/2 | Complete | 2026-03-23 |
| 3. Warenwirtschaft & Berichte | v1.0 | 3/3 | Complete | 2026-03-23 |
| 4. Rechnungsimport | v1.0 | 2/2 | Complete | 2026-03-23 |
| 5. Tech Debt Fixes | v1.1 | 2/2 | Complete | 2026-03-23 |
| 6. GitHub & Deployment | v1.1 | 3/3 | Complete | 2026-03-24 |
| 7. Server-Sync & Multi-Laden | v2.0 | 3/3 | Complete   | 2026-03-24 |
| 8. Bestandsprüfung & Verkaufshistorie | v2.0 | 0/2 | Not started | - |
| 9. Storno & Rückgabe | v2.0 | 0/? | Not started | - |
