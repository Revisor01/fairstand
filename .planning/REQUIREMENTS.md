# Requirements: Fairstand Kassensystem

**Defined:** 2026-03-23
**Core Value:** Mitarbeiterinnen können vor Ort offline kassieren, Wechselgeld/Spende differenzieren und den Warenbestand im Blick behalten.

## v1 Requirements

### Point of Sale (Kasse)

- [ ] **POS-01**: Artikel-Grid zeigt alle aktiven Produkte mit Name und VK-Preis zum Antippen
- [ ] **POS-02**: Warenkorb zeigt ausgewählte Artikel mit Einzelpreis, Menge und Gesamtsumme
- [ ] **POS-03**: Artikel können im Warenkorb in der Menge verändert oder entfernt werden
- [ ] **POS-04**: Numerisches Eingabefeld für den bezahlten Betrag (touch-optimiert)
- [ ] **POS-05**: Automatische Berechnung der Differenz (bezahlt minus Gesamtpreis)
- [ ] **POS-06**: Mitarbeiterin kann Wechselgeld-Betrag eingeben, Rest wird automatisch als Spende verbucht
- [ ] **POS-07**: Verkaufsabschluss bucht Warenbestand ab, erfasst Umsatz und Spende atomar
- [ ] **POS-08**: Tagesübersicht nach dem Gottesdienst: Anzahl Verkäufe, Gesamtumsatz, Gesamtspenden

### Warenwirtschaft

- [ ] **WAR-01**: Produkte anlegen mit Artikelnummer, Bezeichnung, EK-Preis, VK-Preis, MwSt-Satz
- [ ] **WAR-02**: Produkte bearbeiten (Preise, Name, Bestand)
- [ ] **WAR-03**: Produkte deaktivieren (nicht im Kassen-Grid, aber Daten erhalten)
- [ ] **WAR-04**: Warenbestand wird bei Verkauf automatisch reduziert
- [ ] **WAR-05**: Warenbestand kann manuell angepasst werden (Zugang/Korrektur)
- [ ] **WAR-06**: Konfigurierbarer Mindestbestand pro Produkt mit visueller Warnung

### Rechnungsimport

- [ ] **IMP-01**: PDF-Upload von Süd-Nord-Kontor Rechnungen
- [ ] **IMP-02**: Automatisches Parsen: Menge, Artikelnummer, Bezeichnung, EK-Preis (nach Rabatt), EVP (VK-Preis), MwSt-Satz
- [ ] **IMP-03**: Prüf-Ansicht nach dem Parsen: alle erkannten Positionen editierbar
- [ ] **IMP-04**: Neue Artikel aus der Rechnung werden als Produkt-Vorschläge angelegt
- [ ] **IMP-05**: Bestandsbuchung (Zugang) erst nach manueller Freigabe

### Spenden & Berichte

- [ ] **REP-01**: Spendenübersicht kumuliert pro Tag, Monat und Jahr
- [ ] **REP-02**: Umsatzbericht pro Monat und Jahr (Gesamtumsatz, Marge, Spenden)
- [ ] **REP-03**: Konfigurierbare E-Mail-Adresse für Berichtsversand
- [ ] **REP-04**: Optionaler automatischer Mail-Versand (monatlich und/oder jährlich)

### Offline & Sync

- [ ] **OFF-01**: Kassen-App funktioniert vollständig ohne Internetverbindung
- [ ] **OFF-02**: Alle Daten werden lokal im Browser gespeichert (IndexedDB)
- [ ] **OFF-03**: Automatische Synchronisation mit Server wenn online
- [ ] **OFF-04**: Sync verwendet Delta-Events (nicht Absolutwerte) für Bestandsänderungen
- [ ] **OFF-05**: PWA installierbar als Home-Screen-App auf iPad/iPhone

### Authentifizierung & Multi-Laden

- [ ] **AUTH-01**: Passwortschutz für den Laden (einfaches Passwort, kein User-Management)
- [ ] **AUTH-02**: Datenmodell enthält shop_id für Multi-Laden-Vorbereitung
- [ ] **AUTH-03**: Erstmal nur ein Laden (St. Secundus Hennstedt)

### Design & UX

- [ ] **UX-01**: Hauptfarbe Hellblau, modernes und sauberes Design
- [ ] **UX-02**: Touch-optimiert: Minimum 44x44px Tap-Targets
- [ ] **UX-03**: Responsive Layout optimiert für iPad (primär) und iPhone
- [ ] **UX-04**: Kassen-Ansicht als Hauptbildschirm, Admin-Bereiche sekundär

### CI/CD & Deployment

- [ ] **DEP-01**: GitHub Repository mit automatischem Docker-Build via GitHub Actions
- [ ] **DEP-02**: Portainer Webhook für Auto-Deploy auf server.godsapp.de
- [ ] **DEP-03**: Docker-Compose Stack mit Frontend + Backend

## v2 Requirements

### Erweiterte Features

- **V2-01**: Multi-Laden-UI mit Laden-Auswahl und separaten Beständen
- **V2-02**: Herkunftsland und Artikeldetails im Verkaufs-Flow anzeigbar
- **V2-03**: CSV/PDF-Export von Berichten
- **V2-04**: Produktbilder im Artikel-Grid (aus Etiketten-PDFs)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bon-Druck / Kassenbons | Offene Ladenkasse ohne Bon-Pflicht; Drucker-Hardware kompliziert Offline-Setup |
| EC-Karte / Kartenzahlung | Hardware + WLAN nötig; Laufkundschaft zahlt bar |
| Barcode-Scanner | Für 30-50 Artikel ist Grid-Antippen schneller |
| Kundenverwaltung | Laufkundschaft, kein Stammkunden-System nötig |
| DATEV-Export | Für Kirchengemeinde mit kleinem Stand unverhältnismäßig |
| Automatische Nachbestellung | Manuelle Bestellung beim Süd-Nord-Kontor reicht |
| TSE (Technische Sicherheitseinrichtung) | Offene Ladenkasse ist ausgenommen; dennoch Finanzamt-Klärung empfohlen |
| Native App (App Store) | PWA reicht, spart 100€/Jahr Apple Developer Account |
| Mehrsprachigkeit | Nur deutschsprachige Nutzerinnen |
| Komplexe Rechteverwaltung | Einfacher Passwortschutz reicht für kleine Gruppe |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| POS-01 | Phase 1 | Pending |
| POS-02 | Phase 1 | Pending |
| POS-03 | Phase 1 | Pending |
| POS-04 | Phase 1 | Pending |
| POS-05 | Phase 1 | Pending |
| POS-06 | Phase 1 | Pending |
| POS-07 | Phase 1 | Pending |
| POS-08 | Phase 3 | Pending |
| WAR-01 | Phase 3 | Pending |
| WAR-02 | Phase 3 | Pending |
| WAR-03 | Phase 3 | Pending |
| WAR-04 | Phase 2 | Pending |
| WAR-05 | Phase 3 | Pending |
| WAR-06 | Phase 3 | Pending |
| IMP-01 | Phase 4 | Pending |
| IMP-02 | Phase 4 | Pending |
| IMP-03 | Phase 4 | Pending |
| IMP-04 | Phase 4 | Pending |
| IMP-05 | Phase 4 | Pending |
| REP-01 | Phase 3 | Pending |
| REP-02 | Phase 3 | Pending |
| REP-03 | Phase 3 | Pending |
| REP-04 | Phase 3 | Pending |
| OFF-01 | Phase 1 | Pending |
| OFF-02 | Phase 1 | Pending |
| OFF-03 | Phase 2 | Pending |
| OFF-04 | Phase 2 | Pending |
| OFF-05 | Phase 1 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| UX-01 | Phase 1 | Pending |
| UX-02 | Phase 1 | Pending |
| UX-03 | Phase 1 | Pending |
| UX-04 | Phase 1 | Pending |
| DEP-01 | Phase 1 | Pending |
| DEP-02 | Phase 1 | Pending |
| DEP-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after roadmap creation*
