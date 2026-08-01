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
| Datenbank | PostgreSQL + Drizzle ORM |
| PDF-Parsing | pdfjs-dist 5 |
| Deployment | Docker, GitHub Actions, Portainer |

## Setup

### Voraussetzungen

- Node.js 20+
- PostgreSQL (lokal oder als Container)
- Docker (für Deployment)

### Konfiguration

Der Server erwartet folgende Umgebungsvariablen:

| Variable | Pflicht | Bedeutung |
|----------|---------|-----------|
| `DATABASE_URL` | ja | PostgreSQL-Verbindung, z. B. `postgresql://user:pass@localhost:5432/fairstand` |
| `CORS_ORIGIN` | ja | Erlaubte Origin(s), kommasepariert |
| `IMAGES_DIR` | nein | Ablage der Produktbilder (Standard: `/app/data/images`) |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | nein | E-Mail-Versand der Berichte; ohne diese bleibt der Versand deaktiviert |
| `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` | nein | Optionale SMTP-Feinheiten |

### Lokale Entwicklung

```bash
# Datenbank (Beispiel)
docker run -d --name fairstand-db -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=fairstand -p 5432:5432 postgres:16-alpine

# Server
cd server && npm install
export DATABASE_URL="postgresql://postgres:dev@localhost:5432/fairstand"
npx drizzle-kit migrate   # Schema anlegen
npm run dev

# Client
cd client && npm install && npm run dev
```

### Hinweis zu `xlsx` (SheetJS)

Die Excel-Exporte nutzen SheetJS. Das Paket wird seit 0.18.5 nicht mehr über
die npm-Registry ausgeliefert — die dortige Version ist eingefroren und
erhält keine Sicherheitsupdates. Die Abhängigkeit zeigt daher direkt auf die
offizielle SheetJS-CDN:

```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

Ab npm 12 sind Remote-Tarballs standardmäßig gesperrt. Lokal daher einmalig:

```bash
npm install --allow-remote=all
```

Der Docker-Build ist nicht betroffen (nutzt npm 10). Für ein Versionsupdate
die URL in `server/package.json` auf die neue Version anpassen.

### Tests

```bash
cd server && npm test
```

Die PDF-Parser-Tests brauchen echte Lieferantenrechnungen als Fixtures. Diese
liegen aus Datenschutzgründen nicht im Repo — fehlen sie, werden die
betroffenen Suites übersprungen. Zum vollständigen Durchlauf die Dateien
`Rechnung 2600988.pdf` und `Rechnung 2552709.pdf` nach `Süd-Nord-Kontor/`
im Projektwurzelverzeichnis legen.

### Docker Deployment

```bash
docker compose up -d
```

Oder via `docker-compose.portainer.yml` für Portainer-Stacks mit GHCR-Images.

Der Weg auf den Server: Push auf `main` → GitHub Actions baut die Images und
pusht sie nach GHCR → Portainer zieht sie per Webhook. Migrationen laufen
automatisch beim Containerstart, ein manueller Schritt ist nicht nötig.

Live: [fairstand.godsapp.de](https://fairstand.godsapp.de)

## Für andere Weltläden

Dieses Kassensystem ist **frei nutzbar für alle Weltläden** — evangelisch und katholisch. Wenn du Interesse hast, das System für deinen Weltladen einzusetzen, melde dich gerne:

- Erstelle ein [Issue](https://github.com/Revisor01/fairstand/issues) auf GitHub
- Wir richten dir einen Laden-Account ein

## Lizenz

MIT License — siehe [LICENSE](LICENSE)
