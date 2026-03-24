# Phase 4: Rechnungsimport - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

PDF-Upload einer Süd-Nord-Kontor-Rechnung, serverseitiges Parsing mit pdfjs-dist, editierbare Review-Tabelle mit Farbcodierung (bekannt/neu), selektive Freigabe mit Bestandsbuchung und automatischem Produkt-Anlegen für neue Artikel.

</domain>

<decisions>
## Implementation Decisions

### PDF-Upload & Parsing
- Neuer Tab "Import" im Admin-Bereich (4. Tab neben Produkte, Berichte, Einstellungen)
- Drag-and-Drop + Datei-Auswahl-Button (touch-optimiert für iPad)
- Parsing serverseitig mit pdfjs-dist auf Fastify — iPad hat begrenzte Rechenleistung
- Parse-Fehler werden inline pro Zeile als gelbe Warnung angezeigt

### Review-UI & Editierung
- Editierbare Tabelle mit allen Spalten: Menge, Artikelnummer, Bezeichnung, EK-Preis, EVP (VK-Preis), MwSt-Satz
- Farbcodierung: Grün = bekannter Artikel (Matching via Artikelnummer), Orange = neuer Artikel (Vorschlag zum Anlegen)
- Neue Artikel werden als Produkt-Vorschläge mit Pre-Fill aus Rechnungsdaten angelegt — Nutzerin bestätigt pro Artikel
- Checkbox pro Zeile — nur angehakte Positionen werden bei Freigabe gebucht

### Freigabe & Bestandsbuchung
- Großer "Bestand buchen"-Button am Ende der Tabelle — erst aktiv wenn mindestens eine Zeile angehakt
- Neue Produkte werden zuerst in Dexie angelegt, dann Bestand gebucht — ein Schritt für die Nutzerin
- Import-Historie als einfache Liste (Datum, Dateiname, Anzahl Positionen) — kein PDF-Speicher
- Import funktioniert nur online (PDF-Parsing ist serverseitig) — klarer Hinweis in der UI

### Claude's Discretion
- Koordinatenbasiertes Table-Parsing: Spalten-Erkennung und Zeilenextraktion aus dem PDF-Layout
- Matching-Algorithmus für Artikelnummern (exakte Übereinstimmung vs. Fuzzy)
- Fehlerbehandlung bei nicht-parseablen PDFs

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminScreen.tsx` — Tab-Navigation bereits vorhanden (Produkte, Berichte, Einstellungen), 4. Tab hinzufügen
- `ProductSchema` in `server/src/routes/products.ts` — Zod-Schema für Produktdaten, wiederverwendbar für Import-Validierung
- `products`-Tabelle in `server/src/db/schema.ts` — Drizzle-Schema mit articleNumber, purchasePrice, salePrice, vatRate
- `client/src/db/schema.ts` — Dexie-Schema für Client-seitige Produktspeicherung
- `@fastify/multipart` — bereits in CLAUDE.md als Dependency für Datei-Upload vorgesehen

### Established Patterns
- Cent-Integer für alle Preise (purchasePrice, salePrice in Cent)
- Zod-Validierung für alle Fastify-Routes
- Dexie + Outbox-Pattern für Offline-Sync
- Touch-optimierte UI mit Tailwind (h-16, große Buttons)

### Integration Points
- `AdminScreen.tsx` — neuer "Import"-Tab hinzufügen
- `server/src/index.ts` — neue Import-Route registrieren
- `server/src/routes/products.ts` — bestehende Produkt-Endpoints für Matching nutzen
- `docker-compose.yml` — ggf. Volume für temporäre PDF-Uploads

</code_context>

<specifics>
## Specific Ideas

- Süd-Nord-Kontor Rechnungen haben ein spezifisches Layout — koordinatenbasiertes Parsing mit pdfjs-dist
- Artikelnummer ist der primäre Matching-Key zwischen Rechnung und bestehendem Produkt
- EK-Preis in der Rechnung ist der Preis nach Rabatt
- EVP (Empfohlener Verkaufspreis) entspricht dem VK-Preis im System

</specifics>

<deferred>
## Deferred Ideas

- Unterstützung für andere Rechnungsformate (nicht nur Süd-Nord-Kontor)
- Automatische Erkennung des Rechnungsformats
- Bulk-Import mehrerer PDFs gleichzeitig
- OCR für gescannte/fotografierte Rechnungen

</deferred>
