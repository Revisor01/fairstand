# Fairstand Kassensystem

## What This Is

Eine Online-Only Progressive Web App (PWA) als Kassensystem für den Fairstand der Ev.-Luth. Kirchengemeinde St. Secundus Hennstedt. Der Fairstand verkauft fair gehandelte Waren vom Süd-Nord-Kontor vor und nach Gottesdiensten. Die App ermöglicht Kassenführung, Warenwirtschaft, Rechnungsimport und Spendenerfassung — optimiert für iPad/iPhone-Nutzung. Server mit PostgreSQL als Single Source of Truth, alle Daten live vom Server.

## Core Value

Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.

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

- ✓ TanStack Query als primäre Datenschicht — Produkt-/Kategorie-Reads direkt vom Server, Dexie nur Offline-Cache — v5.0
- ✓ WebSocket Live-Updates — Änderungen sofort auf allen Geräten, kein Polling/manueller Sync — v5.0
- ✓ Online-Direktverkauf — Verkäufe online ohne Outbox-Umweg, offline Outbox als Fallback — v5.0
- ✓ Dexie Cold-Start-Fallback — POS startet offline mit gecachten Produkten — v5.0
- ✓ Report-Scheduler Storno-Filter — cancelled_at IS NULL in allen SQL-Queries — v5.0
- ✓ CORS fail-closed — Server startet nicht ohne explizite CORS_ORIGIN — v5.0
- ✓ PIN Rate-Limiting — max 5 Versuche/min/IP via @fastify/rate-limit — v5.0
- ✓ PDF Magic-Byte-Validierung + 30s Timeout — v5.0
- ✓ Server-seitige shopId-Validierung — Session-Token erzwingt Shop-Isolation — v5.0

- ✓ PostgreSQL statt SQLite — Drizzle ORM mit node-postgres, Docker-Compose mit persistentem Volume — v6.0
- ✓ Dexie.js, dexie-react-hooks, idb-keyval komplett entfernt — keine IndexedDB mehr — v6.0
- ✓ Outbox-Pattern komplett entfernt — Verkäufe gehen direkt an den Server — v6.0
- ✓ Warenkorb nur in React State (kein Dexie/IndexedDB-Fallback) — v6.0
- ✓ Sales/Reports ausschließlich vom Server (TanStack Query) — v6.0
- ✓ Online-Only: Offline-Overlay bei fehlendem Internet — v6.0
- ✓ Service Worker nur noch App-Shell-Caching — v6.0

### Active

## Current Milestone: v7.0 Multi-Shop & UX

**Goal:** Vollständige Multi-Shop-Verwaltung mit eigenem Sortiment pro Shop, plus responsive UX für alle Geräte (Browser, iPad, iPhone) mit flexiblem Warenkorb-Layout.

**Target features:**
- Master-Shop (St. Secundus) kann andere Shops anlegen, PIN vergeben, deaktivieren
- Jeder Shop hat eigenes Sortiment (Produkte, Preise, Bestand) — kein geteiltes Sortiment
- Jeder Shop verwaltet seine Produkte selbst nach PIN-Login
- Berichte bleiben pro Shop (keine übergreifende Ansicht)
- Responsive Layout für Browser, iPad, iPhone
- Warenkorb als fixe Spalte (breite Screens) oder Swipe-In (schmale Screens)
- Kategorien-Tab-Navigation verbessern

### Out of Scope

- Native App (App Store) — PWA reicht, kein Bedarf aktuell
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

### Current State (v6.0 shipped)

- Tech Stack: React 19, Vite 6, Tailwind 4, TanStack Query 5, Lucide React, Fastify 5 + @fastify/websocket + @fastify/rate-limit, PostgreSQL 16 + Drizzle ORM (node-postgres), pdfjs-dist 5, Recharts, Nodemailer
- 23 Phasen (4 v1.0 + 2 v1.1 + 3 v2.0 + 3 v3.0 + 4 v4.0 + 4 v5.0 + 2 v6.0), alle shipped
- Live auf fairstand.godsapp.de mit CI/CD (GitHub Actions → Portainer Webhook)
- Online-Only: TanStack Query als einzige Datenschicht, WebSocket für Live-Updates, keine lokale DB
- PostgreSQL in Docker-Compose mit persistentem Volume, alle Routes async/await
- Keine Dexie.js, keine IndexedDB, kein Outbox-Pattern — alles direkt Server-seitig
- Session-Auth mit In-Memory Store, shopId-Validierung, Rate-Limiting, CORS fail-closed

## Constraints

- **Online-Only:** App braucht Internet — kein Offline-Modus mehr (Kirche hat mittlerweile Mobilnetz-Abdeckung)
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
| TanStack Query statt Dexie-First | Dexie-Reads verursachten Delay und Cache-Divergenz | ✓ Good — Live-Daten online, Dexie nur Offline-Cache |
| WebSocket statt manueller Sync | Manueller Sync-Button war UX-Problem, Änderungen nicht sofort sichtbar | ✓ Good — Live-Updates auf allen Geräten |
| Session-Auth mit In-Memory Store | Zuvor kein server-seitiges Token-Management, shopId nur clientseitig | ✓ Good — erzwingt Shop-Isolation |
| CORS fail-closed | Wildcard-Default war Sicherheitsrisiko | ✓ Good — Server startet nicht ohne CORS_ORIGIN |
| Admin online-only, Kasse offline | Offline-Admin erzeugte nur Cache-Konflikte ohne Nutzen | ✓ Good — saubere Trennung, kein Datenverlust |
| PostgreSQL statt SQLite | Produktionsreife DB, Connection-Pooling, JSON-native | ✓ Good — Docker-Compose, Drizzle-Migration nahtlos |
| Dexie komplett entfernt | Cache-Layer verursachte mehr Bugs als Nutzen, Kirche hat Mobilnetz | ✓ Good — 795 LOC weniger, keine Cache-Divergenz |
| Online-Only statt Offline-First | Mobilnetz-Abdeckung in der Kirche macht Offline überflüssig | ✓ Good — drastisch vereinfachte Architektur |
| idb-keyval → localStorage | IndexedDB-Overhead für kleine Key-Values unnötig | ✓ Good — synchroner Zugriff, eine Dependency weniger |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-25 after v7.0 milestone started*
