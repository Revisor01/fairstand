# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog 1.1.0](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [Semantic Versioning 2.0.0](https://semver.org/lang/de/).

Die Einträge bis v13.0 wurden nachträglich aus der Git-Historie rekonstruiert
und sind daher gröber gefasst als künftige Einträge.

## [Unreleased]

### Behoben

- Bildupload für Produkte funktionierte produktiv nicht (HTTP 415).
  `@fastify/multipart` war nur innerhalb der Import-Routen registriert;
  Fastify-Plugins gelten aber nur im Scope des registrierenden Plugins. Die
  Registrierung erfolgt jetzt app-weit. Der Rechnungsimport war nicht
  betroffen.
- Fehlende Datenbank-Migration für `products.categories` nachgeliefert. Die
  v13.0-Umstellung von `category` (text) auf `categories` (text[]) war nur
  manuell auf der Produktion gefahren worden — frische Installationen brachen
  beim Start mit `column "categories" does not exist`. Die neue Migration ist
  idempotent und läuft auch auf bereits angepassten Datenbanken durch.
- Sicherheitsupdates für 62 Dependabot-Alerts:
  - Client von 15 auf 0 Schwachstellen: `react-router-dom` 7.11 → 7.18.2,
    `vitest` 3.2.4 → 3.2.7, plus SemVer-kompatible Bumps.
  - `react-router-dom` entfernt — die Abhängigkeit war deklariert, wurde aber
    nirgends importiert (die Navigation läuft über `useState` in `App.tsx`).
  - Server von 14 auf 5 Schwachstellen: `nodemailer` 8.0.11 → 9.0.3
    (CRLF-Injection, TLS-Validierung), `drizzle-orm` 0.40.1 → 0.45.2
    (SQL-Injection über Identifier).

### Geändert

- PDF-Parser-Tests prüfen jetzt, ob die Fixtures lokal vorliegen, und
  überspringen die Suites andernfalls, statt fehlzuschlagen.
- `vitest.config.ts` im Server beschränkt Testläufe auf `src/`, damit nicht
  zusätzlich veraltete kompilierte Kopien aus `dist/` mitgetestet werden.

### Entfernt

- Echte Lieferantenrechnungen (`Süd-Nord-Kontor/`) und generierte
  Service-Worker-Artefakte (`client/dev-dist/`) aus der Versionskontrolle
  genommen. `.gitignore` entsprechend ergänzt.

### Sicherheit

- Dependabot Vulnerability Alerts, Dependabot Security Updates und CodeQL
  Default Setup für das Repository aktiviert.
- Path-Injection beim Bildupload behoben: Produkt-IDs werden vom Client
  vergeben und flossen ungeprüft in den Zielpfad, sodass ein
  authentifizierter Nutzer aus dem Bildverzeichnis ausbrechen konnte.
- Bild-Upload- und Ausleseroute mit Rate-Limits versehen (30/min bzw.
  300/min).
- Bildquellen im Produktformular werden gegen eine Whitelist geprüft, damit
  ein manipuliertes `imageUrl`-Feld nicht als `javascript:`- oder
  `data:`-URL im `src` landet.

#### Bekannte offene Punkte

- `xlsx` (ReDoS, Prototype Pollution): kein Patch verfügbar. Das Paket wird
  ausschließlich schreibend für Excel-Exporte genutzt (`XLSX.write`), es
  werden keine fremden Dateien eingelesen — der Angriffsvektor greift hier
  nicht.
- `esbuild` (moderate): nur transitiv über `drizzle-kit` als
  Dev-Abhängigkeit; betrifft ausschließlich den Entwicklungs-Server.

## [13.0] — 2026-04-10

### Hinzugefügt

- Multi-Kategorien: Produkte können mehreren Kategorien zugeordnet werden
  (`products.categories` als Array statt Einzelwert). Backend-Routen,
  Client-Typen, POS-Filter, Admin-UI und Import durchgängig umgestellt.

### Behoben

- `ITEM_RETURN` aktualisiert `sales.returned_items` korrekt.

## [12.0] — 2026-04-10

### Hinzugefügt

- Live-Suche im Artikelraster mit Teilmatch über Artikelnummer, Name und
  Kategorie.

## [11.0] — 2026-04-09

### Hinzugefügt

- FIFO-basierte Inventurbewertung (`computeFifoInventory`) mit
  Chargen-Anzeige im Inventur-Tab.
- EK-Preis beim Bestandsabgleich erfassbar (`STOCK_ADJUST` mit
  `purchasePriceCents`), auch aus dem Rechnungsimport heraus.
- Bestandswarnung als Glocken-Button mit Popover im Kassen-Header.

## [10.0] — 2026-04-04

### Hinzugefügt

- Excel-Export für Inventur und Verkaufshistorie.
- Lagerdauer-Anzeige und Ladenhüter-Filter in der Produktliste.
- EK-Preiswarnung im PDF-Import-Review.

## [9.0] — 2026-04-03

### Hinzugefügt

- Spendenmarkierung in der Verkaufstabelle.

### Geändert

- Abgelaufene Sitzungen lösen ein Logout-Event aus, statt die Seite neu zu
  laden.
- Inventurkosten werden periodenbasiert aus dem EK berechnet.

## [8.0] — 2026-04-02

### Hinzugefügt

- Inventur mit CSV- und PDF-Export, Einzelbeleg als PDF.
- CSV-Export der Verkaufshistorie.
- Preis-History je Produkt mit eigenem Tab in der Artikel-Statistik.

## [7.0] — 2026-03-27 (nicht getaggt)

### Hinzugefügt

- Warenkorb als Sidebar (umschaltbar) mit Swipe-Gesten zum Öffnen und
  Schließen.
- Entnahme-Dialog, Zeitraum-Buttons im Tagesbericht.
- Tastatureingabe für die PIN.
- Sticky Kategorie-Navigation mit Auto-Scroll.

### Geändert

- Responsives Kassen-Layout für iPad-Quer- und Hochformat.

## [6.0] — 2026-03-25

### Geändert

- Umstellung auf reinen Online-Betrieb: Dexie und `idb-keyval` entfernt,
  lokale Einstellungen laufen über `localStorage`, Daten kommen live über
  TanStack Query.
- Bei fehlender Verbindung zeigt die Kasse ein Offline-Overlay.

## [5.0] — 2026-03-24

### Hinzugefügt

- WebSocket-Anbindung mit automatischem Reconnect für Live-Aktualisierung.
- Offline-Indikator im Kassen-Header.

### Geändert

- Online-First-Architektur mit Dexie nur noch als Fallback beim Kaltstart.
- Manueller Sync-Button entfällt — Abgleich läuft automatisch.

## [4.0] — 2026-03-24

### Hinzugefügt

- Kategorien-Verwaltung mit eigener Tabelle, CRUD-Routen und Auswahl-UI.
- Bildupload mit Vorschau im Produktformular.
- Sync-Status-Anzeige mit 30-Sekunden-Retry.

### Geändert

- Artikelraster auf einheitliche `ArticleCard` umgestellt.

## [3.0] — 2026-03-24 (nicht getaggt)

### Hinzugefügt

- Produktbilder: Upload-Endpunkt, Auslieferung und Anzeige in Kasse und
  Verwaltung.
- Bestandsampel als farbiger Punkt in Artikelraster und Produktliste.
- README und MIT-Lizenz für die Nutzung durch andere Weltläden.

### Geändert

- PDF-Parser erkennt beide Rechnungsformate inklusive Rabatt-Spalte.
- Überarbeitete Verwaltungsoberfläche mit Pill-Tabs und mehr Weißraum.

## [2.0] — 2026-03-24

### Hinzugefügt

- Server-Sync und Mehr-Laden-Betrieb mit PIN-Authentifizierung.
- Verkaufshistorie mit Tagesbericht, Detailansicht und Artikel-Statistik.
- Storno kompletter Verkäufe und Rückgabe einzelner Artikel.
- Bestandsprüfung: Überverkauf wird blockiert.

## [1.0] — 2026-03-23

### Hinzugefügt

- Kassenoberfläche: Artikel antippen, bezahlen, Wechselgeld und Spende
  automatisch berechnen.
- Warenwirtschaft mit Produkten, Beständen und Mindestbestand-Warnung.
- Rechnungsimport: PDF-Rechnungen vom Süd-Nord-Kontor parsen und nach
  Freigabe übernehmen.
- Monats- und Jahresberichte mit Diagrammen und Marge.
- E-Mail-Versand der Berichte über Nodemailer mit Cron-Zeitplan.
- PWA mit Service Worker für die Nutzung auf dem iPad.

[Unreleased]: https://github.com/Revisor01/fairstand/compare/v13.0...HEAD
[13.0]: https://github.com/Revisor01/fairstand/compare/v12.0...v13.0
[12.0]: https://github.com/Revisor01/fairstand/compare/v11.0...v12.0
[11.0]: https://github.com/Revisor01/fairstand/compare/v10.0...v11.0
[10.0]: https://github.com/Revisor01/fairstand/compare/v9.0...v10.0
[9.0]: https://github.com/Revisor01/fairstand/compare/v8.0...v9.0
[8.0]: https://github.com/Revisor01/fairstand/compare/v6.0...v8.0
[7.0]: https://github.com/Revisor01/fairstand/compare/v6.0...v8.0
[6.0]: https://github.com/Revisor01/fairstand/compare/v5.0...v6.0
[5.0]: https://github.com/Revisor01/fairstand/compare/v4.0...v5.0
[4.0]: https://github.com/Revisor01/fairstand/compare/v2.0...v4.0
[3.0]: https://github.com/Revisor01/fairstand/compare/v2.0...v4.0
[2.0]: https://github.com/Revisor01/fairstand/compare/v1.0...v2.0
[1.0]: https://github.com/Revisor01/fairstand/releases/tag/v1.0
