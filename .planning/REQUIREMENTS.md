# Requirements: Fairstand Kassensystem v2.0

**Defined:** 2026-03-24
**Core Value:** Server als Single Source of Truth mit Multi-Laden-Architektur — jedes Gerät sieht denselben Datenstand, Offline-Cache nur als Fallback.

## v2.0 Requirements

### Sync & Architektur

- [ ] **SYNC-01**: Beim App-Start werden alle Produkte automatisch vom Server geladen (Server = Single Source of Truth)
- [ ] **SYNC-02**: Verkäufe die offline getätigt werden, werden automatisch zum Server hochgesynct wenn Internet verfügbar
- [ ] **SYNC-03**: Jedes Gerät sieht denselben Produktbestand — Bestandsänderungen durch Verkäufe sind sofort nach Sync auf allen Geräten sichtbar
- [ ] **SYNC-04**: Lokale Dexie-DB dient nur als Offline-Cache — Seed-Daten nur als Fallback wenn Server nicht erreichbar UND lokale DB leer

### Multi-Laden

- [ ] **SHOP-01**: Laden-Konfiguration (Name, PIN, shopId) wird in der Server-Datenbank gespeichert, nicht hardcoded
- [ ] **SHOP-02**: Beim App-Start wird ein 6-stelliger PIN abgefragt — der PIN identifiziert und öffnet den zugehörigen Laden
- [ ] **SHOP-03**: Produkte gehören zu einem Laden — jeder Laden sieht nur seine eigenen Artikel
- [ ] **SHOP-04**: Admin kann Läden anlegen und bearbeiten (Name, PIN)

### Verkaufshistorie

- [ ] **HIST-01**: Tagesübersicht zeigt Liste aller Verkäufe — anklickbar für Detailansicht (welche Artikel, Menge, Preis)
- [ ] **HIST-02**: Pro Artikel: Verkaufsstatistik einsehbar (wie oft verkauft, Umsatz, Zeitraum) — um zu planen was sich lohnt

### Storno & Rückgabe

- [ ] **STOR-01**: Verkauf kann aus der Tagesübersicht storniert werden — Bestand wird zurückgebucht
- [ ] **STOR-02**: Einzelne Artikel aus einem Verkauf können als Rückgabe verbucht werden

### Bestandsprüfung

- [ ] **BEST-01**: Artikel-Grid in der Kasse zeigt Preis groß und aktuellen Bestand klein
- [ ] **BEST-02**: Wenn mehr Stück in den Warenkorb gelegt werden als im Bestand sind, wird das blockiert

## Out of Scope

| Feature | Reason |
|---------|--------|
| Produktbilder | v3.0 — erst Architektur richtig machen |
| Bestandsampel (Farbindikator) | v3.0 |
| PDF-Parsing verbessern | v3.0 |
| Umlaute überall | v3.0 |
| Redesign | v3.0 |
| README + Lizenz | v3.0 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SYNC-01 | Phase 7 | Pending |
| SYNC-02 | Phase 7 | Pending |
| SYNC-03 | Phase 7 | Pending |
| SYNC-04 | Phase 7 | Pending |
| SHOP-01 | Phase 7 | Pending |
| SHOP-02 | Phase 7 | Pending |
| SHOP-03 | Phase 7 | Pending |
| SHOP-04 | Phase 7 | Pending |
| HIST-01 | Phase 8 | Pending |
| HIST-02 | Phase 8 | Pending |
| BEST-01 | Phase 8 | Pending |
| BEST-02 | Phase 8 | Pending |
| STOR-01 | Phase 9 | Pending |
| STOR-02 | Phase 9 | Pending |

**Coverage:**
- v2.0 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-24 | Traceability updated: 2026-03-24*
