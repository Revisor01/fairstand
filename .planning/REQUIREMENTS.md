# Requirements: Fairstand Kassensystem v7.0

**Defined:** 2026-03-25
**Core Value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.

## v7.0 Requirements

### Multi-Shop Administration

- [x] **SHOP-01**: Master-Shop (St. Secundus) kann neue Shops anlegen mit Name und PIN
- [x] **SHOP-02**: Master-Shop kann Shops deaktivieren (PIN funktioniert nicht mehr, kein Login möglich)
- [ ] **SHOP-03**: Master-Shop hat ein is_master-Flag in der DB — nur Master sieht Shop-Verwaltung
- [ ] **SHOP-04**: Jeder Shop hat ein eigenes, unabhängiges Sortiment (eigene Produkte, Preise, Bestand)

### Shop-Selbstverwaltung

- [ ] **SELF-01**: Nach PIN-Login verwaltet jeder Shop seine eigenen Produkte (anlegen, bearbeiten, deaktivieren)
- [ ] **SELF-02**: Jeder Shop sieht nur seine eigenen Berichte (Tagesübersicht, Monatsberichte)
- [ ] **SELF-03**: PDF-Import erstellt Produkte im jeweiligen Shop-Sortiment

### Responsive UX

- [ ] **UX-01**: Layout ist auf iPad (Landscape + Portrait), iPhone und Desktop-Browser optimiert
- [ ] **UX-02**: Warenkorb als fixe Spalte auf breiten Screens (iPad Landscape, Desktop)
- [ ] **UX-03**: Warenkorb als Swipe-In Panel auf schmalen Screens (iPhone, iPad Portrait)
- [ ] **UX-04**: Kategorien-Navigation verbessert (aktuelle Tab-Leiste ist nicht ideal)

## Future Requirements

- **NATIVE-01**: Native iOS App via App Store (Apple Developer Account vorhanden)
- **SCALE-01**: Report-Scheduler iteriert über alle Shops
- **CROSS-01**: Master-Admin sieht übergreifende Berichte über alle Shops

## Out of Scope

| Feature | Reason |
|---------|--------|
| Geteiltes Sortiment | Explizit ausgeschlossen — jeder Shop hat eigenes Sortiment |
| Übergreifende Berichte | Erst in späterem Milestone (CROSS-01) |
| Native App | PWA reicht aktuell |
| Master verwaltet Shop-Produkte | Jeder Shop verwaltet selbst |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHOP-01 | Phase 24 | Complete |
| SHOP-02 | Phase 24 | Complete |
| SHOP-03 | Phase 24 | Pending |
| SHOP-04 | Phase 25 | Pending |
| SELF-01 | Phase 25 | Pending |
| SELF-02 | Phase 25 | Pending |
| SELF-03 | Phase 25 | Pending |
| UX-01 | Phase 26 | Pending |
| UX-02 | Phase 26 | Pending |
| UX-03 | Phase 26 | Pending |
| UX-04 | Phase 26 | Pending |

**Coverage:**
- v7.0 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Traceability updated: 2026-03-25 (roadmap created)*
