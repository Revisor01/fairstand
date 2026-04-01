# Requirements: Fairstand Kassensystem v8.0

**Defined:** 2026-04-01
**Core Value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.

## v8.0 Requirements

### Inventur & Bestandsauswertung

- [ ] **INV-01**: User kann im Jahresbericht eine Inventur-Übersicht sehen mit pro Artikel: aktueller Bestand, verkaufte Menge, VK-Umsatz, EK-Kosten
- [ ] **INV-02**: User kann bei Artikeln mit verschiedenen EK-Preisen über's Jahr sehen, wie viel zu welchem EK verkauft wurde
- [ ] **INV-03**: User sieht im Jahresbericht eine Bestandswert-Summe (Gesamtwert aller Waren = Menge × aktueller EK)
- [x] **INV-04**: User kann pro Artikel ein Stock-Movement-Journal einsehen (Verkauf, Nachbuchung, Korrektur, Rückgabe mit Zeitstempel)

### Preis-History

- [x] **PRICE-01**: Jede EK/VK-Änderung an einem Artikel wird automatisch in einer price_history-Tabelle geloggt
- [ ] **PRICE-02**: User kann pro Artikel in der Produktverwaltung eine History der Preisänderungen einsehen (Zeitstrahl mit altem/neuem Preis)
- [ ] **PRICE-03**: Jahresbericht zeigt bei Preisänderungen die Aufschlüsselung: X Stück zu EK1, Y Stück zu EK2

### Export

- [ ] **EXP-01**: User kann Verkaufshistorie als CSV downloaden (Excel-kompatibel mit korrekten Umlauten)
- [ ] **EXP-02**: User kann Inventur-Übersicht als CSV downloaden
- [ ] **EXP-03**: User kann einzelne Verkäufe nachträglich als PDF-Beleg exportieren

## Future Requirements

- **CROSS-01**: Master-Admin sieht übergreifende Berichte über alle Shops
- **SCALE-01**: Report-Scheduler iteriert über alle Shops
- **NATIVE-01**: Native iOS App via App Store (Apple Developer Account vorhanden)
- **ABC-01**: ABC-Klassifizierung für Artikel (Top-Seller identifizieren)
- **XLSX-01**: Excel-Export (XLSX statt CSV) für komplexere Auswertungen

## Out of Scope

| Feature | Reason |
|---------|--------|
| DATEV-Export | Erstmal nur interne Übersicht, kein Buchhaltungs-Anbindung |
| Automatische Nachbestellung | Manuelle Bestellung beim Süd-Nord-Kontor reicht |
| Excel (XLSX) Export | CSV reicht für v8.0, XLSX ggf. in v9.0 |
| Echtzeit-Inventur mit Scanner | Kein Barcode-Scanner vorhanden |
| Übergreifende Berichte | Erst in späterem Milestone (CROSS-01) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INV-01 | Phase 28 | Pending |
| INV-02 | Phase 28 | Pending |
| INV-03 | Phase 28 | Pending |
| INV-04 | Phase 27 | Complete |
| PRICE-01 | Phase 27 | Complete |
| PRICE-02 | Phase 28 | Pending |
| PRICE-03 | Phase 28 | Pending |
| EXP-01 | Phase 29 | Pending |
| EXP-02 | Phase 29 | Pending |
| EXP-03 | Phase 29 | Pending |

**Coverage:**
- v8.0 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
