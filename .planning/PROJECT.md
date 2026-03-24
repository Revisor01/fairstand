# Fairstand Kassensystem

## What This Is

Eine Offline-fähige Progressive Web App (PWA) als Kassensystem für den Fairstand der Ev.-Luth. Kirchengemeinde St. Secundus Hennstedt. Der Fairstand verkauft fair gehandelte Waren vom Süd-Nord-Kontor vor und nach Gottesdiensten. Die App ermöglicht Kassenführung, Warenwirtschaft, Rechnungsimport und Spendenerfassung — optimiert für iPad/iPhone-Nutzung ohne WLAN in der Kirche.

## Core Value

Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird — auch ohne Internetverbindung.

## Requirements

### Validated

- ✓ Artikel-Grid zum Antippen mit Produktname und VK-Preis — v1.0
- ✓ Warenkorb mit Gesamtpreisberechnung — v1.0
- ✓ Bezahlt-Betrag eingeben → automatische Berechnung: Wechselgeld vs. Spende — v1.0
- ✓ Verkaufsabschluss bucht Warenbestand ab und erfasst Spende — v1.0
- ✓ Produktverwaltung: Anlegen, Bearbeiten, Deaktivieren — v1.0
- ✓ Warenbestand tracken mit Mindestbestand-Warnung — v1.0
- ✓ PDF-Rechnungsimport vom Süd-Nord-Kontor mit Prüf-Ansicht — v1.0
- ✓ Spendenübersicht kumuliert pro Tag, Monat, Jahr — v1.0
- ✓ Umsatzberichte mit Marge und automatischem Mail-Versand — v1.0
- ✓ Vollständige Offline-Fähigkeit mit automatischer Sync — v1.0
- ✓ PWA installierbar als Home-Screen-App — v1.0
- ✓ Touch-optimiertes Design für iPad/iPhone — v1.0
- ✓ CI/CD mit GitHub Actions + Portainer Auto-Deploy — v1.0

- ✓ Server als Single Source of Truth — bidirektionaler Sync, Dexie nur Offline-Cache — v2.0
- ✓ Multi-Laden mit PIN-Authentifizierung — shops-Tabelle, PIN öffnet Laden — v2.0
- ✓ Bestandsprüfung in der Kasse — Preis + Bestand im Grid, Überverkauf blockiert — v2.0
- ✓ Verkaufshistorie — anklickbare Tagesübersicht + Artikel-Statistik — v2.0
- ✓ Storno & Rückgabe — Verkauf stornieren, Einzelartikel zurückgeben — v2.0

- ✓ UI-Redesign: Kassendialog kompakt, Bezahlseite mit Live-Berechnung, Shop-Name in Titelzeile — v3.0
- ✓ Produktbilder in Artikelkacheln mit manuellem Upload — v3.0
- ✓ Bestandsampel (grün/gelb/rot) in Grid und Produktliste — v3.0
- ✓ Verbessertes PDF-Parsing (Menge, Artikelnummer, Preis getrennt) — v3.0
- ✓ Umlaute konsequent in gesamter UI — v3.0

- ✓ Online-First Architektur: Server-Replace statt LWW, Admin offline deaktiviert — v4.0
- ✓ Stornierte Verkäufe aus allen Berichten und Statistiken gefiltert — v4.0
- ✓ Marge/EK-Preis korrekt in Monatsberichten — v4.0
- ✓ Warenkorb überlebt Page-Reload (Dexie-Persistenz) — v4.0
- ✓ Cart-Validierung: ungültige Artikel erkannt und entfernt — v4.0
- ✓ Scroll vs. Tap zuverlässig unterschieden auf iPad — v4.0
- ✓ Bestandswarnungen prominenter (farbiger Rahmen, größerer Dot) — v4.0
- ✓ Zentrales Kategorie-Management mit CRUD — v4.0
- ✓ Bild-Upload mit Preview in ProductForm — v4.0
- ✓ Sync-Status-Badge und automatischer Retry — v4.0

### Active

## Current Milestone: v5.0 Online-First Live Architecture

**Goal:** Server als Single Source of Truth mit WebSocket Live-Updates. Dexie nur noch als Offline-Cache für die Kasse. Alle bekannten Concerns aus v4.0 aufräumen.

**Target features:**
- Online-Modus: Alle Reads/Writes direkt gegen Server-API, kein Dexie-Umweg
- WebSocket: Produkt-/Kategorie-/Bestandsänderungen sofort auf allen Geräten
- Dexie nur Offline-Fallback: POS cached beim Start, arbeitet offline gegen Cache
- TanStack Query für Server-State-Management mit Offline-Awareness
- Report-Scheduler: Stornierte Verkäufe filtern
- CORS: Explizite Origin statt Wildcard
- PIN: Rate-Limiting auf Server
- PDF-Parser: Timeout für hängende Parses
- Shop-ID: Server-seitige Validierung gegen Session

### Out of Scope

- Native App (App Store) — PWA reicht, spart Apple Developer Account (100€/Jahr)
- Anbindung an echte Zahlungsterminals (EC-Karte etc.) — reine Barzahlung
- Automatische Nachbestellung beim Süd-Nord-Kontor — manuelle Bestellung reicht
- Kundenverwaltung / Kundenkonten — Laufkundschaft vor der Kirche
- Buchhaltungs-Export (DATEV etc.) — erstmal nur interne Übersicht
- Etikettendruck — Etiketten kommen vom Süd-Nord-Kontor
- TSE (Technische Sicherheitseinrichtung) — offene Ladenkasse ist ausgenommen

## Context

- **Kirchengemeinde:** Ev.-Luth. Kirchengemeinde St. Secundus Hennstedt
- **Lieferant:** Süd-Nord-Kontor GmbH, Hamburg (fairtrade.hamburg) — Kundennummer 601349
- **Rechnungsformat:** PDF mit konsistenter Tabellenstruktur (TCPDF-generiert). EVP in der Bezeichnung als Klammer-Format.
- **Sortiment:** Schokolade, Kaffee, Kekse, Fruchtgummi, Kerzen, Kunsthandwerk, Geschenkartikel — ca. 30-50 Artikel
- **Nutzung:** Vor und nach Gottesdiensten, primär auf iPad, kein WLAN in der Kirche
- **Nutzer:** Swantje Luthe + Mitarbeiterinnen (kleine Gruppe, keine komplexe Rechteverwaltung nötig)
- **Deployment:** Docker auf server.godsapp.de (Hetzner), Apache → Traefik → Container
- **Domain:** fairstand.godsapp.de

### Current State (v4.0 shipped)

- Tech Stack: React 19, Vite 6, Tailwind 4, Dexie.js 4 (v8), Fastify 5, SQLite + Drizzle ORM, pdfjs-dist 5, Recharts, Nodemailer
- 17 Phasen (4 v1.0 + 2 v1.1 + 3 v2.0 + 3 v3.0 + 4 v4.0 + Phase 13 offen), alle shipped
- Live auf fairstand.godsapp.de mit CI/CD
- Online-First: Server-Replace statt LWW, Admin online-only, Kasse offline
- Zentrales Kategorie-Management, Cart-Persistenz, Sync-Status-Badge
- 19 Dateien geändert, 826 Zeilen hinzugefügt

## Constraints

- **Offline-First:** Kirche hat kein WLAN — App muss vollständig offline funktionieren, Sync bei Netz
- **Touch-Optimiert:** Primäres Gerät ist iPad, muss mit Fingern bedienbar sein
- **PDF-Parsing:** Rechnungen vom Süd-Nord-Kontor kommen als PDF, müssen serverseitig geparst werden
- **Einfachheit:** Mitarbeiterinnen sind keine Tech-Experten — die Kasse muss sofort verständlich sein
- **Deployment:** Docker-Container auf server.godsapp.de, Apache → Traefik → Container
- **CI/CD:** GitHub Repo mit GitHub Actions Workflow → Docker Image bauen → Portainer Webhook für Auto-Deploy

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA statt native App | Kein App Store nötig, läuft auf allen Geräten, sofortige Updates | ✓ Good — funktioniert offline auf iPad |
| Offline-First mit Dexie.js + Outbox | Kein WLAN in der Kirche, Delta-Sync wenn online | ✓ Good — zuverlässig auch ohne Netz |
| PDF-Parsing serverseitig mit pdfjs-dist | Konsistentes TCPDF-Format, iPad-Entlastung | ✓ Good — koordinatenbasiert, alle Spalten erkannt |
| Multi-Laden-Architektur (shopId) | Option für weitere Gemeinden | ✓ Fixed v2.0 — shops-Tabelle, PIN-Auth, dynamischer shopId |
| Cent-Integer für alle Preise | Keine Rundungsfehler bei Geldbeträgen | ✓ Good |
| Fire-and-forget Server-Sync für Produkte | Admin-Bereich braucht Internet, POS nicht | ✓ Fixed — PATCH deactivate + Download-Sync in Phase 5 |
| Online-First statt LWW | LWW verursachte Phantom-Produkte und ignorierte Server-Deaktivierungen | ✓ Good — Server-Replace eliminiert alle Cache-Divergenz-Bugs |
| Lucide-React Icons | Konsistente SVG Line-Icons statt Emoji/Inline-SVGs | ✓ Good — einheitliches Look&Feel |
| Entnahme KG zum EK | Kirchengemeinde entnimmt Waren zum EK für Eigenverbrauch | ✓ Good — type='withdrawal' in Sale |
| Sale-Sync ohne Produkt-Upsert | SALE_COMPLETE überschrieb Produktdaten (category='') mit Defaults | ✓ Good — nur Stock-Delta, kein Upsert |
| Admin online-only, Kasse offline | Offline-Admin erzeugte nur Cache-Konflikte ohne Nutzen | ✓ Good — saubere Trennung, kein Datenverlust |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-24 after v5.0 milestone started*
