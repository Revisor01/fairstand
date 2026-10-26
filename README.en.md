<p align="center">
  <img src="client/public/icons/icon-512.png" alt="Fairstand" width="128" height="128">
</p>

<h1 align="center">Fairstand</h1>

<p align="center">
  The till for fair-trade shops and stalls in parishes —<br>
  runs in the browser on tablet and phone, with stock and monthly report.
</p>

<p align="center">
  <a href="README.md">Deutsch</a> · <b>English</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Web%20(PWA)-blue" alt="Platform">
  <img src="https://img.shields.io/github/license/Revisor01/fairstand" alt="License">
</p>

## What it is about

A fair-trade stall after the Sunday service rarely has a proper till: prices
are on slips of paper, the change sits in a tin, and at the end of the month
nobody knows what was sold and what needs reordering.

Fairstand turns this into a till you tap. The app runs in the browser and can
be installed on a tablet or phone. Every sale goes to the server immediately;
several devices in the same shop see stock and sales live. One server can run
several shops separately, each with its own PIN. The interface is in German.

It was built for the fair-trade stall of the Lutheran parish of St. Secundus in
Hennstedt.

## Features

- **Till** — tap items, enter the amount paid; change and donation are
  calculated
- **Live on every device** — stock and sales update instantly; without a
  connection the till shows a notice instead of failing silently
- **Stock** — minimum stock with a traffic light, overselling is prevented
- **Invoice import** — read PDF invoices from Süd-Nord-Kontor and book them as
  incoming goods
- **Reports** — daily overview, item statistics, monthly and yearly reports,
  export to Excel; monthly report by email if you like
- **Cancellations and returns** — whole sales or single items
- **Product images** — one image per item, shown in the till
- **Several shops** — separate stock and reports, login by PIN

## Usage

Fairstand runs at **[fairstand.godsapp.de](https://fairstand.godsapp.de)**.
Open it in the browser, log in with the shop's PIN and install it as an app via
“Add to Home Screen”.

**For other fair-trade shops:** you can request a shop of your own on the
existing server — by [issue](https://github.com/Revisor01/fairstand/issues) or
email.

## Versions

What changed when is in [CHANGELOG.md](CHANGELOG.md) (in German, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)). The
[releases](https://github.com/Revisor01/fairstand/releases) summarise each
version.

## Running it yourself

You need Node 22, npm and PostgreSQL 16 (or Docker).

```bash
git clone https://github.com/Revisor01/fairstand.git
cd fairstand
```

**1. Create the database.**

```bash
docker run -d --name fairstand-db -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=fairstand -p 5432:5432 postgres:16-alpine
```

**2. Start the server.** It reads its settings from the environment and stops
immediately without `CORS_ORIGIN`. `drizzle-kit migrate` creates the schema;
in the container this happens automatically on every start.

```bash
cd server && npm install
export DATABASE_URL="postgresql://postgres:dev@localhost:5432/fairstand"
export CORS_ORIGIN="http://localhost:5173"
npx drizzle-kit migrate
npm run dev
# listens on port 3000
```

| Variable | Required | Meaning |
|----------|----------|---------|
| `DATABASE_URL` | yes | connection to PostgreSQL |
| `CORS_ORIGIN` | yes | allowed address(es) of the interface, comma-separated |
| `INITIAL_SHOP_PIN` | on first start | PIN of the master shop, 4 to 8 digits; no effect afterwards |
| `PORT` | no | server port, default 3000 |
| `IMAGES_DIR` | no | storage for product images, default `/app/data/images` |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | no | sending the monthly reports; without them nothing is sent |
| `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` | no | mail details |

**3. Start the interface.**

```bash
cd client && npm install
npm run dev
# opens http://localhost:5173
```

The interface always calls the server at `/api` on the same address. Interface
and server therefore have to sit behind a shared reverse proxy that passes
`/api` to the server (port 3000) and everything else to the interface. The Vite
development server does not provide that forwarding.

**4. The first shop.** On first start the server creates a master shop with
sample items. Its PIN comes from `INITIAL_SHOP_PIN` (4 to 8 digits); if it is
missing on first start, the server stops with a message. The name is set in
`server/src/db/seed.ts`. The master shop can create further shops in the admin
area.

**With Docker.** `client/Dockerfile` and `server/Dockerfile` build the two
images. `docker-compose.portainer.yml` shows the setup with ready-made images
from the GitHub Container Registry; database password and SMTP values come from
the environment there.

**Excel export.** SheetJS is no longer distributed via the npm registry; the
dependency points to the official SheetJS CDN. From npm 12 such packages are
blocked, so run `npm install --allow-remote=all` once locally.

**Tests.**

```bash
cd client && npx vitest run
cd server && npx vitest run
```

The invoice import tests need real supplier invoices. For privacy reasons they
are not in the repository; if they are missing, these tests are skipped.

## Structure

```
fairstand
├── client/    — interface: React, TypeScript, Vite, Tailwind;
│                TanStack Query, installable as a PWA
│   └── src/features/
│       ├── pos/     — till
│       ├── admin/   — items, import, reports, settings, shops
│       └── auth/    — PIN login
└── server/    — API: Fastify, TypeScript, PostgreSQL with Drizzle
    ├── src/routes/     — sales, items, sync, reports …
    ├── src/scheduler/  — monthly and yearly reports
    └── migrations/     — database schema
```

**What matters when building it:**
- **The server is the truth.** A sale only counts once the server has accepted
  it; the devices keep no data of their own.
- **Every shop only sees its own data.** All queries go through the shop ID of
  the session.
- **Amounts in cents.** Prices and totals are integers, never decimals.

## Contributing

Bug reports and suggestions are welcome as an
[issue](https://github.com/Revisor01/fairstand/issues). Please report security
issues privately as described in [SECURITY.md](SECURITY.md). Pull requests go
through tests and a secret scan; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Privacy

Fairstand does not record customers. The server stores items, stock and sales
of each shop; the device only keeps settings. No analytics, no advertising, no
third-party services.

## License

Fairstand is licensed under the
[GNU Affero General Public License v3.0](LICENSE). If you modify it and make
it available to others, including as a web service, you publish your source
code under the same license. The [LICENSE](LICENSE) file is authoritative;
contributions follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Contact

Pastor Simon Luthe · [mail@simonluthe.de](mailto:mail@simonluthe.de) ·
[simonluthe.de](https://simonluthe.de)
