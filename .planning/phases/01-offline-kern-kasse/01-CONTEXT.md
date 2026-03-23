# Phase 1: Offline-Kern & Kasse - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Vollständig offline-fähige PWA zum Kassieren auf dem iPad. Liefert: Projekt-Setup (Monorepo, Docker, CI/CD), Dexie-Schema mit Offline-Architektur, Service Worker + PWA-Manifest, und die komplette Kassen-UI (Grid, Warenkorb, Bezahl-Flow mit Spenden-Differenzierung). Passwortschutz (PIN), Touch-optimiert, hellblaues Design.

</domain>

<decisions>
## Implementation Decisions

### Kassen-Layout & Interaktion
- Artikel-Grid als dynamisch fließende Kacheln (nicht fixe Spaltenanzahl) mit Name + VK-Preis
- Warenkorb als Slide-In-Panel von rechts, liegt über dem Grid
- Mengenänderung: +/- Buttons pro Artikel UND Direkteingabe per Tap auf die Zahl
- Horizontale Kategorie-Tabs oben: "Alle" als erster Tab, danach die Kategorien (Schokolade, Kaffee, Kunsthandwerk etc.)

### Bezahl- & Spenden-Flow
- Großes Nummernfeld (Taschenrechner-Style) für Bezahlt-Betrag
- Quick-Buttons für typische Beträge (Standard: 5€, 10€, 20€, 50€) — konfigurierbar in den Settings
- Wechselgeld-Eingabefeld: Mitarbeiterin tippt Wechselgeld-Betrag, Rest wird live als Spende angezeigt
- Nach Verkaufsabschluss: Zusammenfassung (Umsatz, Spende, Wechselgeld) mit "Nächster Kunde"-Button
- "Korrigieren"-Button in der Zusammenfassung: öffnet den Verkauf wieder zum Bearbeiten (Storno/Korrektur)

### Technisches Fundament & Auth
- 6-Ziffern-PIN pro Laden (kein Username, kein Passwort-Text)
- Session-Dauer: 120 Minuten Auto-Logout bei Inaktivität
- Seed-Daten: Artikel aus der vorhandenen Rechnung 2600988 in die DB einpflegen (EK-Preise + EVP als VK-Preis)
- Monorepo-Struktur: `client/` + `server/` + `docker-compose.yml` im Root

### Claude's Discretion
- Konkrete Tailwind-Farbwerte für Hellblau-Palette
- Service Worker Caching-Strategie (Cache-First vs Network-First)
- Dexie-Schema-Design (Tabellen, Indizes)
- Docker-Compose Service-Konfiguration
- GitHub Actions Workflow-Details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Keine — Greenfield-Projekt

### Established Patterns
- Keine — wird in Phase 1 definiert

### Integration Points
- Rechnungs-PDFs im Ordner `Süd-Nord-Kontor/` — Rechnung 2600988 als Datenquelle für Seed-Artikel
- Deployment-Ziel: server.godsapp.de (Docker, Traefik, KeyHelp)
- GitHub MCP verfügbar für Repo-Erstellung
- Server-Worker in /Users/simonluthe/Documents/claude-workspaces/server für späteres Deployment

</code_context>

<specifics>
## Specific Ideas

- Artikel-Seed aus Rechnung 2600988: 33 Positionen mit Artikelnummer, Bezeichnung, EK-Preis (nach Rabatt), EVP (VK-Preis), MwSt-Satz
- Bei Spenden-Szenario "7,89€ Gesamtpreis, Kunde gibt 8€": Mitarbeiterin tippt Wechselgeld (z.B. 0€), Rest (0,11€) wird als Spende verbucht
- Quick-Buttons sollen in den Settings konfigurierbar sein (nicht hardcoded)

</specifics>

<deferred>
## Deferred Ideas

- Korrektur-Flow nach Verkaufsabschluss: Grundlegende Korrektur in Phase 1, vollständige Storno-Logik ggf. in späterer Phase
- Produktbilder im Grid (aus Etiketten-PDFs) — v2-Feature

</deferred>
