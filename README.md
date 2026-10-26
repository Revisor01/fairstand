<p align="center">
  <img src="client/public/icons/icon-512.png" alt="Fairstand" width="128" height="128">
</p>

<h1 align="center">Fairstand</h1>

<p align="center">
  Die Kasse für Weltläden und Fairstände in Kirchengemeinden —<br>
  läuft im Browser auf Tablet und Handy, mit Bestand und Monatsbericht.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Plattform-Web%20(PWA)-blue" alt="Plattform">
  <img src="https://img.shields.io/github/license/Revisor01/fairstand" alt="Lizenz">
</p>

## Worum es geht

Ein Fairstand nach dem Gottesdienst hat selten eine richtige Kasse: Preise
stehen auf Zetteln, das Wechselgeld liegt in einer Dose, und am Monatsende
fehlt der Überblick, was verkauft wurde und was nachbestellt werden muss.

Fairstand macht daraus eine Kasse zum Antippen. Die App läuft im Browser und
lässt sich auf Tablet oder Handy installieren. Jeder Verkauf geht sofort an
den Server; mehrere Geräte im selben Laden sehen Bestand und Verkäufe live.
Ein Server kann mehrere Läden getrennt führen, jeder mit eigener PIN.

Entstanden ist sie für den Fairstand der Ev.-Luth. Kirchengemeinde
St. Secundus Hennstedt.

## Funktionen

- **Kasse** — Artikel antippen, Betrag eingeben, Wechselgeld und Spende
  werden ausgerechnet
- **Live auf allen Geräten** — Bestand und Verkäufe aktualisieren sich
  sofort; ohne Verbindung zeigt die Kasse einen Hinweis statt still zu scheitern
- **Bestand** — Mindestbestand mit Ampel, Überverkauf wird verhindert
- **Rechnungsimport** — PDF-Rechnungen des Süd-Nord-Kontors einlesen und
  als Wareneingang übernehmen
- **Auswertungen** — Tagesübersicht, Artikelstatistik, Monats- und
  Jahresberichte, Export als Excel; Monatsbericht auf Wunsch per E-Mail
- **Storno und Rückgabe** — ganze Verkäufe oder einzelne Artikel
- **Produktbilder** — je Artikel ein Bild, das in der Kasse erscheint
- **Mehrere Läden** — getrennte Bestände und Berichte, Anmeldung per PIN

## Nutzung

Fairstand läuft unter **[fairstand.godsapp.de](https://fairstand.godsapp.de)**.
Im Browser öffnen, mit der PIN des Ladens anmelden und über „Zum
Startbildschirm hinzufügen“ als App installieren.

**Für andere Weltläden:** Die Kasse ist frei nutzbar, evangelisch wie
katholisch. Wer sie für den eigenen Laden möchte, meldet sich per
[Issue](https://github.com/Revisor01/fairstand/issues) oder E-Mail; dann
wird ein eigener Laden auf dem bestehenden Server eingerichtet.

## Versionen

Was sich wann geändert hat, steht in [CHANGELOG.md](CHANGELOG.md) — nach
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/), aus Sicht der
Nutzer:innen geschrieben. Die
[Releases](https://github.com/Revisor01/fairstand/releases) fassen jede
Version zusammen.

## Selbst betreiben

Nötig sind Node 22, npm und PostgreSQL 16 (oder Docker).

```bash
git clone https://github.com/Revisor01/fairstand.git
cd fairstand
```

**1. Datenbank anlegen.**

```bash
docker run -d --name fairstand-db -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=fairstand -p 5432:5432 postgres:16-alpine
```

**2. Server starten.** Er liest seine Einstellungen aus der Umgebung und
bricht ohne `CORS_ORIGIN` sofort ab. Das Schema legt `drizzle-kit migrate`
an; im Container geschieht das bei jedem Start von selbst.

```bash
cd server && npm install
export DATABASE_URL="postgresql://postgres:dev@localhost:5432/fairstand"
export CORS_ORIGIN="http://localhost:5173"
npx drizzle-kit migrate
npm run dev
# hört auf Port 3000
```

| Variable | Pflicht | Bedeutung |
|----------|---------|-----------|
| `DATABASE_URL` | ja | Verbindung zu PostgreSQL |
| `CORS_ORIGIN` | ja | erlaubte Adresse(n) der Oberfläche, kommagetrennt |
| `INITIAL_SHOP_PIN` | beim ersten Start | PIN des Master-Ladens, 4 bis 8 Ziffern; danach ohne Wirkung |
| `PORT` | nein | Port des Servers, Standard 3000 |
| `IMAGES_DIR` | nein | Ablage der Produktbilder, Standard `/app/data/images` |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | nein | Versand der Monatsberichte; ohne sie wird nichts verschickt |
| `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` | nein | Feinheiten des Mailversands |

**3. Oberfläche starten.**

```bash
cd client && npm install
npm run dev
# öffnet http://localhost:5173
```

Die Oberfläche ruft den Server immer unter `/api` auf derselben Adresse auf.
Oberfläche und Server müssen deshalb hinter einem gemeinsamen Reverse Proxy
liegen, der `/api` an den Server (Port 3000) und alles andere an die
Oberfläche weitergibt. Der Entwicklungsserver von Vite bringt dafür keine
Weiterleitung mit.

**4. Der erste Laden.** Beim ersten Start legt der Server einen Master-Laden
mit Beispielartikeln an. Seine PIN kommt aus `INITIAL_SHOP_PIN` (4 bis 8
Ziffern); fehlt sie beim ersten Start, bricht der Server mit einer Meldung ab.
Den Namen legt `server/src/db/seed.ts` fest. Der Master-Laden kann in der
Verwaltung weitere Läden anlegen.

**Mit Docker.** `client/Dockerfile` und `server/Dockerfile` bauen die beiden
Images. `docker-compose.portainer.yml` zeigt den Aufbau mit fertigen Images
aus der GitHub Container Registry; Datenbank-Passwort und SMTP-Werte kommen
dort aus der Umgebung.

**Excel-Export.** SheetJS wird nicht mehr über die npm-Registry ausgeliefert;
die Abhängigkeit zeigt auf die offizielle SheetJS-CDN. Ab npm 12 sind solche
Pakete gesperrt, lokal daher einmalig `npm install --allow-remote=all`.

**Tests.**

```bash
cd client && npx vitest run
cd server && npx vitest run
```

Die Tests des Rechnungsimports brauchen echte Lieferantenrechnungen. Die
liegen aus Datenschutzgründen nicht im Repository; fehlen sie, werden diese
Tests übersprungen.

## Aufbau

```
fairstand
├── client/    — Oberfläche: React, TypeScript, Vite, Tailwind;
│                TanStack Query, installierbar als PWA
│   └── src/features/
│       ├── pos/     — Kasse
│       ├── admin/   — Artikel, Import, Berichte, Einstellungen, Läden
│       └── auth/    — Anmeldung per PIN
└── server/    — API: Fastify, TypeScript, PostgreSQL mit Drizzle
    ├── src/routes/     — Verkäufe, Artikel, Abgleich, Berichte …
    ├── src/scheduler/  — Monats- und Jahresberichte
    └── migrations/     — Datenbankschema
```

**Worauf es beim Bauen ankommt:**
- **Der Server ist die Wahrheit.** Ein Verkauf gilt erst, wenn der Server ihn
  angenommen hat; die Geräte halten keinen eigenen Datenstand.
- **Jeder Laden sieht nur seine Daten.** Alle Abfragen laufen über die
  Laden-Kennung der Sitzung.
- **Beträge in Cent.** Preise und Summen sind ganze Zahlen, nie Kommazahlen.

## Mitmachen

Fehlermeldungen und Vorschläge sind willkommen — gern als
[Issue](https://github.com/Revisor01/fairstand/issues). Sicherheitslücken
bitte vertraulich melden, wie in [SECURITY.md](SECURITY.md) beschrieben. Pull
Requests laufen durch Tests und einen Secret-Scan; die Grundsätze für
Beiträge stehen in [CLAUDE.md](CLAUDE.md).

## Datenschutz

Fairstand erfasst keine Kund:innen. Gespeichert werden Artikel, Bestände und
Verkäufe des jeweiligen Ladens auf dem Server; auf dem Gerät liegen nur
Einstellungen.
Keine Analyse, keine Werbung, keine fremden Dienste.

## Lizenz

Fairstand steht unter der
[GNU Affero General Public License v3.0](LICENSE). Wer Fairstand verändert und
anderen zur Verfügung stellt, auch als Webdienst, legt seinen Quelltext unter
derselben Lizenz offen. Wer das nicht möchte, bekommt auf Anfrage eine
kommerzielle Lizenz ([mail@simonluthe.de](mailto:mail@simonluthe.de)). Für
Beiträge gilt [CONTRIBUTING.md](CONTRIBUTING.md).

## Kontakt

Pastor Simon Luthe · [mail@simonluthe.de](mailto:mail@simonluthe.de) ·
[simonluthe.de](https://simonluthe.de)
