# Fairstand Kassensystem

Eine Offline-fähige Progressive Web App (PWA) als Kassensystem für Fairstand-Weltläden. Entwickelt für den Fairstand der Ev.-Luth. Kirchengemeinde St. Secundus Hennstedt.

## Features

- **Kasse** — Artikel antippen, bezahlen, Wechselgeld/Spende automatisch berechnen
- **Offline-fähig** — Funktioniert ohne Internet, synchronisiert automatisch wenn online
- **Multi-Laden** — Mehrere Läden mit PIN-Authentifizierung
- **Warenwirtschaft** — Produkte verwalten, Bestand tracken, Mindestbestand-Warnung
- **Rechnungsimport** — PDF-Rechnungen vom Süd-Nord-Kontor parsen und importieren
- **Verkaufshistorie** — Tagesübersicht, Artikel-Statistik, Monats-/Jahresberichte
- **Storno & Rückgabe** — Verkäufe stornieren, einzelne Artikel zurückgeben
- **Bestandsprüfung** — Überverkauf wird blockiert, Ampel-Indikator (grün/gelb/rot)
- **Produktbilder** — Bilder pro Artikel hochladen und in der Kasse anzeigen

## Tech Stack

| Komponente | Technologie |
|------------|------------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Offline-DB | Dexie.js 4 (IndexedDB) |
| Backend | Fastify 5, TypeScript |
| Datenbank | SQLite + Drizzle ORM |
| PDF-Parsing | pdfjs-dist 5 |
| Deployment | Docker, GitHub Actions, Portainer |

## Setup

### Voraussetzungen

- Node.js 20+
- Docker (für Deployment)

### Lokale Entwicklung

```bash
# Client
cd client && npm install && npm run dev

# Server
cd server && npm install && npm run dev
```

### Docker Deployment

```bash
docker compose up -d
```

Oder via `docker-compose.portainer.yml` für Portainer-Stacks mit GHCR-Images.

## Für andere Weltläden

Dieses Kassensystem ist **frei nutzbar für alle Weltläden** — evangelisch und katholisch. Wenn du Interesse hast, das System für deinen Weltladen einzusetzen, melde dich gerne:

- Erstelle ein [Issue](https://github.com/Revisor01/fairstand/issues) auf GitHub
- Wir richten dir einen Laden-Account ein

## Lizenz

MIT License — siehe [LICENSE](LICENSE)
