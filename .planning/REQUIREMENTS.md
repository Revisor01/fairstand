# Requirements: Fairstand Kassensystem v9.0

**Defined:** 2026-04-02
**Core Value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.

## v9.0 Requirements

### Verwaltung

- [x] **ADMIN-01**: User kann Inventur-Übersicht als eigenen Tab im Admin-Bereich aufrufen (nicht im Jahresbericht)
- [x] **ADMIN-02**: User kann einen Artikel dauerhaft löschen (nicht nur deaktivieren)
- [x] **ADMIN-03**: Der Button "Bestandskorrektur" heißt "Bestand anpassen"

### Verkaufshistorie

- [x] **HIST-01**: Spenden werden in der Tagesübersicht visuell markiert (Betrag hervorgehoben)
- [x] **HIST-02**: User kann Zeiträume per Kalender-Datepicker auswählen (statt Preset-Buttons)

### Auth

- [x] **AUTH-01**: Bei abgelaufenem Token wird automatisch auf den PIN-Login weitergeleitet (statt 401-Fehler)

## Future Requirements

- **CROSS-01**: Master-Admin sieht übergreifende Berichte über alle Shops
- **SCALE-01**: Report-Scheduler iteriert über alle Shops
- **NATIVE-01**: Native iOS App via App Store
- **ABC-01**: ABC-Klassifizierung für Artikel
- **XLSX-01**: Excel-Export (XLSX statt CSV)

## Out of Scope

| Feature | Reason |
|---------|--------|
| DATEV-Export | Erstmal nur interne Übersicht |
| FIFO-Bestandsbewertung | Aktueller EK reicht für Fairstand |
| Automatische Nachbestellung | Manuelle Bestellung reicht |
| Excel (XLSX) Export | CSV reicht für v9.0 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADMIN-01 | Phase 30 | Complete |
| ADMIN-02 | Phase 30 | Complete |
| ADMIN-03 | Phase 30 | Complete |
| HIST-01 | Phase 31 | Complete |
| HIST-02 | Phase 31 | Complete |
| AUTH-01 | Phase 32 | Complete |

**Coverage:**
- v9.0 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
