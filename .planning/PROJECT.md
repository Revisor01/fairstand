# Fairstand Kassensystem

## What This Is

Eine Offline-fähige Progressive Web App (PWA) als Kassensystem für den Fairstand der Ev.-Luth. Kirchengemeinde St. Secundus Hennstedt. Der Fairstand verkauft fair gehandelte Waren vom Süd-Nord-Kontor vor und nach Gottesdiensten. Die App ermöglicht Kassenführung, Warenwirtschaft, Rechnungsimport und Spendenerfassung — optimiert für iPad/iPhone-Nutzung ohne WLAN in der Kirche.

## Core Value

Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird — auch ohne Internetverbindung.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Kasse (Point of Sale)**
- [ ] Artikel-Grid zum Antippen mit Produktname und VK-Preis
- [ ] Warenkorb mit Gesamtpreisberechnung
- [ ] Bezahlt-Betrag eingeben → automatische Berechnung: Wechselgeld vs. Spende
- [ ] Mitarbeiterin entscheidet aktiv: Wechselgeld-Betrag eingeben, Rest wird Spende
- [ ] Verkaufsabschluss bucht Warenbestand ab und erfasst Spende

**Warenwirtschaft**
- [ ] Produktverwaltung: Anlegen, Bearbeiten, Löschen von Artikeln
- [ ] EK-Preis und VK-Preis pro Artikel pflegen
- [ ] Artikelnummer (Süd-Nord-Kontor), Bezeichnung, MwSt-Satz, Herkunft speichern
- [ ] Warenbestand tracken (Zugang bei Einkauf, Abgang bei Verkauf)
- [ ] Konfigurierbarer Mindestbestand pro Produkt mit Warnung wenn unterschritten

**Rechnungsimport**
- [ ] PDF-Upload von Süd-Nord-Kontor Rechnungen
- [ ] Automatisches Parsen: Menge, Artikelnummer, Bezeichnung, EK-Preis, EVP (VK-Preis), MwSt
- [ ] Prüf- und Editier-Ansicht nach dem Parsen (bevor Bestand gebucht wird)
- [ ] Bestandsbuchung nach Freigabe

**Spendenverwaltung**
- [ ] Automatische Erfassung der Spende pro Verkauf (Differenz bezahlt - VK-Preis - Wechselgeld)
- [ ] Spendenübersicht (kumuliert pro Tag, Monat, Jahr)

**Berichte & Auswertungen**
- [ ] Umsatzberichte pro Monat und pro Jahr
- [ ] Spendenberichte pro Monat und pro Jahr
- [ ] Konfigurierbare E-Mail-Adresse für automatischen Versand
- [ ] Optionaler automatischer Mail-Versand (monatlich/jährlich)

**Offline & Sync**
- [ ] Vollständige Offline-Fähigkeit: Kasse funktioniert ohne WLAN
- [ ] Lokale Datenspeicherung (IndexedDB / Service Worker Cache)
- [ ] Automatische Synchronisation wenn wieder online
- [ ] Konfliktbehandlung bei gleichzeitigen Änderungen

**Multi-Laden (Architektur vorbereiten)**
- [ ] Datenmodell unterstützt mehrere Läden
- [ ] Passwortschutz pro Laden
- [ ] Erstmal nur ein Laden (St. Secundus Hennstedt)

**Design & UX**
- [ ] Hauptfarbe: Hellblau
- [ ] Touch-optimiert für iPad und iPhone
- [ ] PWA: Installierbar als Home-Screen-App
- [ ] Große Tap-Targets für schnelles Kassieren

### Out of Scope

- Native App (App Store) — PWA reicht, spart Apple Developer Account (100€/Jahr)
- Anbindung an echte Zahlungsterminals (EC-Karte etc.) — reine Barzahlung
- Automatische Nachbestellung beim Süd-Nord-Kontor — manuelle Bestellung reicht
- Kundenverwaltung / Kundenkonten — Laufkundschaft vor der Kirche
- Buchhaltungs-Export (DATEV etc.) — erstmal nur interne Übersicht
- Etikettendruck — Etiketten kommen vom Süd-Nord-Kontor

## Context

- **Kirchengemeinde:** Ev.-Luth. Kirchengemeinde St. Secundus Hennstedt
- **Lieferant:** Süd-Nord-Kontor GmbH, Hamburg (fairtrade.hamburg) — Kundennummer 601349
- **Rechnungsformat:** PDF mit konsistenter Tabellenstruktur (Menge, Artikelnummer, Bezeichnung, Rabatt, Preis/St., MwSt, Gesamt). EVP (Empfohlener Verkaufspreis) in der Bezeichnung enthalten.
- **Sortiment:** Schokolade, Kaffee, Kekse, Fruchtgummi, Kerzen, Kunsthandwerk, Geschenkartikel — ca. 30-50 Artikel
- **Nutzung:** Vor und nach Gottesdiensten, primär auf iPad, kein WLAN in der Kirche
- **Nutzer:** Swantje Luthe + Mitarbeiterinnen (kleine Gruppe, keine komplexe Rechteverwaltung nötig)
- **Deployment:** Docker auf server.godsapp.de (Hetzner). Server-Worker in /Users/simonluthe/Documents/claude-workspaces/server kann Domain anlegen (KeyHelp API), Stack deployen (Portainer MCP), vHost einrichten.
- **Domain:** voraussichtlich fairstand.godsapp.de

## Constraints

- **Offline-First:** Kirche hat kein WLAN — App muss vollständig offline funktionieren, Sync bei Netz
- **Touch-Optimiert:** Primäres Gerät ist iPad, muss mit Fingern bedienbar sein
- **PDF-Parsing:** Rechnungen vom Süd-Nord-Kontor kommen als PDF, müssen serverseitig geparst werden
- **Einfachheit:** Mitarbeiterinnen sind keine Tech-Experten — die Kasse muss sofort verständlich sein
- **Deployment:** Docker-Container auf server.godsapp.de, Apache → Traefik → Container

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA statt native App | Kein App Store nötig, läuft auf allen Geräten, sofortige Updates | — Pending |
| Offline-First Architektur | Kein WLAN in der Kirche, Sync wenn wieder online | — Pending |
| PDF-Parsing serverseitig | Rechnungen kommen als PDF, konsistentes Format vom Süd-Nord-Kontor | — Pending |
| Multi-Laden-Architektur vorbereiten | Option für weitere Gemeinden/Stände, erstmal nur einer | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-23 after initialization*
