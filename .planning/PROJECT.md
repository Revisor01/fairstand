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

### Active

## Current Milestone: v2.0 Server-Sync, Multi-Laden & Kernfunktionen

**Goal:** Server als Single Source of Truth mit Multi-Laden-Architektur. Architektur-Fehler aus v1.x beheben (jedes Gerät war isoliert) + fehlende Kernfunktionen (Storno, Bestandsprüfung, Verkaufshistorie).

**Target features:**
- Server-Sync + Multi-Laden (PIN pro Shop, Laden-Config in DB, bidirektionaler Sync)
- Verkaufshistorie pro Artikel + Gesamtübersicht
- Storno/Rückgabe
- Bestandsprüfung in der Kasse (Preis groß, Bestand klein, Überverkauf blockiert)

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

### Current State (v1.1 shipped, v2.0 starting)

- Tech Stack: React 19, Vite 6, Tailwind 4, Dexie.js 4, Fastify 5, SQLite + Drizzle ORM, pdfjs-dist 5, Recharts, Nodemailer
- v1.0: 4 Phasen, v1.1: 2 Phasen (Tech Debt + Deployment)
- Live auf fairstand.godsapp.de mit CI/CD
- **Kritisches Problem:** Jedes Gerät hat isolierte Dexie-DB — Server ist nicht Single Source of Truth. Multi-Laden hardcoded. Muss in v2.0 grundlegend umgebaut werden.

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
| Multi-Laden-Architektur (shopId) | Option für weitere Gemeinden | ⚠️ Revisit — hardcoded shopId, kein Server-Sync, v2.0 fixt das |
| Cent-Integer für alle Preise | Keine Rundungsfehler bei Geldbeträgen | ✓ Good |
| Fire-and-forget Server-Sync für Produkte | Admin-Bereich braucht Internet, POS nicht | ✓ Fixed — PATCH deactivate + Download-Sync in Phase 5 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-24 after v2.0 milestone start*
