# Requirements: Fairstand Kassensystem v3.0

**Defined:** 2026-03-24
**Core Value:** Polish und visuelle Verbesserungen — die App soll auf einen Blick erfassbar, luftig und stylisch sein.

## v3.0 Requirements

### Redesign

- [x] **UI-01**: Kassendialog und Bezahlseite sind kompakt (wie der Abschlussdialog) — nicht fullscreen, alles auf einen Blick erfassbar
- [x] **UI-02**: Bezahlseite zeigt Artikelliste + Gesamtsumme groß + Live-Berechnung von Wechselgeld/Spende beim Eingeben
- [x] **UI-03**: Shop-Name wird in der Titelzeile oben angezeigt
- [ ] **UI-04**: Gesamtes Layout luftiger, kompakter und stylischer — mehr Whitespace, weniger gedrängt
- [ ] **UI-05**: Admin/Einstellungen übersichtlicher und kompakter gestaltet

### Produktbilder

- [ ] **IMG-01**: Artikelkacheln zeigen Produktbilder (falls vorhanden)
- [ ] **IMG-02**: Bilder können aus Etiketten-PDFs (Ordner Süd-Nord-Kontor/) extrahiert oder von der Kontor-Website geholt werden
- [ ] **IMG-03**: Bilder können manuell in der Produktverwaltung zugewiesen werden

### PDF-Parsing

- [ ] **PDF-01**: Verbessertes Parsing der Süd-Nord-Kontor Rechnungen — Menge, Artikelnummer, Preis korrekt in separate Spalten statt alles in Beschreibung (Testdatei: Rechnung 2552709.pdf)

### Bestandsampel

- [ ] **AMP-01**: Farbindikator (grün/gelb/rot) für Vorratsstand in der Produktliste und im Kassen-Grid

### Umlaute

- [ ] **TXT-01**: Konsequent öäüß in der gesamten UI verwenden statt ae/oe/ue/ss

### GitHub

- [ ] **GH-01**: README.md mit Projektbeschreibung und Setup-Anleitung (keine Screenshots)
- [ ] **GH-02**: Open-Source-Lizenz — frei für alle Weltläden (ev + kath), Kontakthinweis für Account-Anfragen

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-Laden Admin-UI (Läden anlegen per Web) | Funktioniert bereits über Server-Seed/DB |
| Real-time Push zwischen Geräten | Polling/manuell reicht für Kirchenverkauf |
| Native App | PWA reicht |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 10 | Complete |
| UI-02 | Phase 10 | Complete |
| UI-03 | Phase 10 | Complete |
| UI-04 | Phase 10 | Pending |
| UI-05 | Phase 10 | Pending |
| IMG-01 | Phase 11 | Pending |
| IMG-02 | Phase 11 | Pending |
| IMG-03 | Phase 11 | Pending |
| PDF-01 | Phase 11 | Pending |
| AMP-01 | Phase 12 | Pending |
| TXT-01 | Phase 12 | Pending |
| GH-01 | Phase 13 | Pending |
| GH-02 | Phase 13 | Pending |

**Coverage:**
- v3.0 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
