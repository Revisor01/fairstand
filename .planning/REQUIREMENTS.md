# Requirements: Fairstand Kassensystem v10.0

**Defined:** 2026-04-03
**Core Value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.

## v10.0 Requirements

### Bilder
- [ ] **IMG-01**: Artikelkacheln im POS-Grid zeigen das Produktbild (wenn vorhanden)

### Export
- [ ] **EXP-04**: Inventur kann als XLSX (Excel) heruntergeladen werden
- [ ] **EXP-05**: Verkaufshistorie kann als XLSX (Excel) heruntergeladen werden

### Analyse
- [ ] **ANA-01**: Lagerdauer pro Artikel ist sichtbar — zeigt wann zuletzt verkauft und wie lange auf Lager
- [ ] **ANA-02**: Ladenhüter werden farblich markiert (z.B. >3 Monate nicht verkauft)

### Import
- [ ] **IMP-01**: Beim PDF-Import wird eine Warnung angezeigt wenn sich der EK eines Artikels geändert hat

## Future Requirements

- **NATIVE-01**: Native iOS App via App Store
- **CROSS-01**: Master-Admin sieht übergreifende Berichte über alle Shops
- **SCALE-01**: Report-Scheduler iteriert über alle Shops

## Out of Scope

| Feature | Reason |
|---------|--------|
| ABC-Klassifizierung | Für 50 Artikel im Fairstand nicht nötig |
| DATEV-Export | Erstmal nur interne Übersicht |
| FIFO-Bestandsbewertung | Aktueller EK reicht |
| Automatische Nachbestellung | Manuelle Bestellung reicht |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMG-01 | Phase 33 | Pending |
| EXP-04 | Phase 34 | Pending |
| EXP-05 | Phase 34 | Pending |
| ANA-01 | Phase 35 | Pending |
| ANA-02 | Phase 35 | Pending |
| IMP-01 | Phase 36 | Pending |

---
*Requirements defined: 2026-04-03*
