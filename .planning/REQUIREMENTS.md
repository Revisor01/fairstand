# Requirements: Fairstand Kassensystem v4.0

**Defined:** 2026-03-24
**Core Value:** Datenqualität und Stabilität — die Kasse rechnet korrekt, verliert keine Daten und reagiert zuverlässig auf Touch.

## v4.0 Requirements

### Architektur

- [x] **ARCH-01**: downloadProducts() ersetzt den gesamten Dexie-Produktbestand durch Server-Daten — kein LWW, komplettes Replace
- [x] **ARCH-02**: Admin-Features (Produktverwaltung, Import, Berichte, Einstellungen) sind offline deaktiviert mit klarem Hinweis
- [x] **ARCH-03**: Offline funktionieren nur Verkauf, Storno und Einzelrückgabe — Outbox + lokaler Bestandszähler bleiben erhalten

### Datenintegrität

- [ ] **DAT-01**: Marge/EK-Preis wird korrekt berechnet und in Berichten angezeigt — aktuell fehlerhafte Berechnung
- [ ] **DAT-02**: Stornierte Verkäufe werden korrekt aus Umsatz-Statistiken und Top-Artikel-Rankings herausgerechnet
- [ ] **DAT-03**: Warenkorb überlebt einen Page-Reload — Artikel bleiben nach Browser-Refresh erhalten (Dexie-Persistenz)

### UI-Bugfixes

- [ ] **UIX-01**: Scroll vs. Tap wird korrekt unterschieden — kein versehentliches Antippen beim Scrollen im Artikel-Grid

### Bestandsmanagement

- [ ] **BST-01**: Bestandswarnungen verbessern — klarere/frühere Hinweise bei niedrigem Vorrat

### Datenverwaltung

- [ ] **VRW-01**: Zentrales Kategorie-Management — Kategorien als eigene Entität verwalten, nicht nur als Freitext pro Produkt
- [ ] **VRW-02**: Produktbild-Upload verbessern — einfacherer Workflow für Bildzuweisung

### Validierung

- [ ] **VAL-01**: Cart-Validierung — ungültige/veraltete Artikel im Warenkorb erkennen und behandeln

### Sync

- [ ] **SYN-01**: Sync-Robustheit verbessern — Fehlerbehandlung und Retry-Logik optimieren

## Out of Scope

| Feature | Reason |
|---------|--------|
| README + Lizenz auf GitHub | Aus v3.0 offen, separater Quick-Task |
| Multi-Laden Admin-UI (Läden anlegen per Web) | Funktioniert über Server-Seed/DB |
| Real-time Push zwischen Geräten | Polling/manuell reicht für Kirchenverkauf |
| Native App | PWA reicht |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 14 | Complete |
| ARCH-02 | Phase 14 | Complete |
| ARCH-03 | Phase 14 | Complete |
| DAT-01 | Phase 15 | Pending |
| DAT-02 | Phase 15 | Pending |
| DAT-03 | Phase 15 | Pending |
| VAL-01 | Phase 15 | Pending |
| UIX-01 | Phase 16 | Pending |
| BST-01 | Phase 16 | Pending |
| VRW-01 | Phase 17 | Pending |
| VRW-02 | Phase 17 | Pending |
| SYN-01 | Phase 17 | Pending |

**Coverage:**
- v4.0 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Traceability updated: 2026-03-24 (roadmap created)*
