# Phase 03: Warenwirtschaft & Berichte - Research

**Researched:** 2026-03-23
**Domain:** Produkt-CRUD, Bestandsverwaltung, Chart-Visualisierung, Cron-Job-Scheduling, Nodemailer HTML-Mail
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Produktverwaltung UI
- Eigener Admin-Bereich mit Tab-Navigation, getrennt vom Kassen-Flow, über Menü erreichbar
- Produkte alphabetisch sortiert mit Kategorie-Filter
- Nur Soft-Delete (deaktivieren) — keine echte Löschung, Verkaufshistorie bleibt intakt
- Bestandskorrektur: manuelles Eingabefeld für Zugang/Abgang mit Grund

#### Berichte & Visualisierung
- Grafiken und Charts für Umsatz, Spenden, Marge
- Vergleiche zu anderen Monaten/Jahren (Balkendiagramm oder Liniendiagramm)
- Berichtsinhalt: Umsatz, EK-Kosten, Marge, Spenden, Top-5-Artikel
- Monat/Jahr-Auswahl per Dropdown
- HTML-Mail mit Styling für automatischen Versand (formatierte Tabelle, Farben, Logo)

#### Mindestbestand-Warnung
- Badge im Admin-Bereich + Banner auf dem Kassen-Screen (sichtbar ohne Adminzugang)
- Standard-Mindestbestand: 0 (keine Warnung) — pro Produkt einstellbar
- Opt-in-Modell: nur Produkte mit konfiguriertem Mindestbestand werden überwacht

#### Mail-Versand
- Konfigurierbare E-Mail-Adresse (eine einzelne)
- Optionaler automatischer Versand: monatlich und/oder jährlich
- Nodemailer über SMTP (Konfiguration via Umgebungsvariablen)

### Claude's Discretion
- Chart-Bibliothek (Recharts, Chart.js, oder native SVG)
- Cron-Job-Implementierung für automatischen Mail-Versand
- Admin-Layout und Navigation zwischen Kasse/Admin
- Quick-Buttons Konfigurierbarkeit (aus Phase 1 deferred — hier in Settings umsetzen)

### Deferred Ideas (OUT OF SCOPE)
- Produktbilder im Grid (v2-Feature)
- CSV/PDF-Export von Berichten (v2)
- Komplexere Berichtsfilter (nach Kategorie, nach Produkt)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POS-08 | Tagesübersicht nach dem Gottesdienst: Anzahl Verkäufe, Gesamtumsatz, Gesamtspenden | Sales-Aggregation via Dexie `where('createdAt').between()` für Tagesfilter; optional Server-Route GET /api/reports/day |
| WAR-01 | Produkte anlegen mit Artikelnummer, Bezeichnung, EK-Preis, VK-Preis, MwSt-Satz | Fastify POST /api/products Route + Dexie-Sync; Schema-Migration für minStock |
| WAR-02 | Produkte bearbeiten (Preise, Name, Bestand) | Fastify PUT /api/products/:id; LWW via updatedAt; Dexie db.products.update() |
| WAR-03 | Produkte deaktivieren (nicht im Kassen-Grid, aber Daten erhalten) | active-Flag bereits im Schema; PATCH /api/products/:id + Dexie-Update; ArticleGrid filtert bereits auf active=1 |
| WAR-05 | Warenbestand kann manuell angepasst werden (Zugang/Korrektur) | STOCK_ADJUST OutboxEntry bereits im Schema; POST /api/stock-adjust Route + Frontend OutboxEntry |
| WAR-06 | Konfigurierbarer Mindestbestand pro Produkt mit visueller Warnung | minStock-Feld fehlt in beiden Schemas (Client + Server) — Schema-Migration v2 nötig |
| REP-01 | Spendenübersicht kumuliert pro Tag, Monat und Jahr | SQL: GROUP BY date(created_at/1000, 'unixepoch', 'start of month') auf sales.donation_cents |
| REP-02 | Umsatzbericht pro Monat und Jahr (Gesamtumsatz, Marge, Spenden) | JOIN sales + items-JSON + products; Drizzle sql-Template für komplexe Aggregationen |
| REP-03 | Konfigurierbare E-Mail-Adresse für Berichtsversand | Neue settings-Tabelle im Server-Schema oder SMTP-Env-Vars; idb-keyval für Client-Side-Config |
| REP-04 | Optionaler automatischer Mail-Versand (monatlich und/oder jährlich) | @fastify/schedule + toad-scheduler für Cron; Nodemailer für SMTP-Versand |
</phase_requirements>

---

## Summary

Phase 3 baut auf einem stabilen Fundament auf: Dexie-Schema, Sync-Engine und Fastify-Routes sind established. Die Phase teilt sich in zwei klar trennbare Hälften — Produktverwaltung (CRUD + Bestandskorrektur) und Berichte (Aggregation + Mail).

Das kritischste technische Detail ist die fehlende `minStock`-Spalte: Sie existiert im CONTEXT.md als "bereits vorhanden", ist aber in keiner der beiden Schema-Dateien (`client/src/db/schema.ts` und `server/src/db/schema.ts`) tatsächlich definiert. Plan 03-01 muss deshalb mit einer Schema-Migration beginnen — Dexie v2 für den Client, Drizzle-Migration für den Server.

Für Charts empfiehlt sich **Recharts** (3.8.0, React 19-kompatibel) über Chart.js oder native SVG: Es ist die Standard-Wahl im React-Ecosystem, liefert deklarative JSX-API und ist tree-shakeable. Der automatische Mail-Versand wird sauber über **@fastify/schedule** (6.0.0) + **toad-scheduler** als Fastify-Plugin gelöst — kein separater Cron-Daemon nötig.

**Primary recommendation:** Schema-Migration zuerst (minStock), dann Admin-UI-Gerüst, dann Berichte und Mail — in dieser Reihenfolge, da jede Stufe auf der vorherigen aufbaut.

---

## Standard Stack

### Core (bereits installiert, bestätigt)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie.js | 4.x | Client-seitige Produktverwaltung | Etabliert in Phase 1/2 |
| dexie-react-hooks | — | useLiveQuery für reaktive UI | Etabliert in Phase 1 |
| Fastify | 5.7.x | Backend-Routen für CRUD | Etabliert in Phase 1/2 |
| Drizzle ORM | 0.45.x | Server-seitiges Schema + Migrations | Etabliert in Phase 2 |
| better-sqlite3 | 12.8.x | SQLite-Datenbank | Etabliert in Phase 1 |
| Nodemailer | 8.0.3 | E-Mail-Versand | Bereits in CLAUDE.md Stack |
| Tailwind CSS 4 | 4.x | UI-Styling | Etabliert in Phase 1 |
| zod | 3.x | Schema-Validierung | Etabliert in Phase 2 |

### Neu hinzuzufügen
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.0 | Charts für Berichte | React 19-kompatibel, deklarative JSX-API, größtes React-Chart-Ecosystem |
| @fastify/schedule | 6.0.0 | Cron-Job-Plugin für Fastify | Offizielle Fastify-Lösung, kein externer Daemon, integriert toad-scheduler |
| toad-scheduler | 3.1.0 | Cron-Zeitplanung (Peer-Dep von @fastify/schedule) | Peer-Dependency, automatisch installiert |

### Alternatives Considered
| Statt | Alternative | Tradeoff |
|-------|-------------|----------|
| recharts | Chart.js | Chart.js ist imperativer (canvas-basiert), kein JSX, mehr Boilerplate in React. Recharts ist native React-Komponenten. |
| recharts | native SVG | Native SVG ist volle Kontrolle, aber ~300 Zeilen Boilerplate für Achsen, Tooltips, Legenden. Kein Gewinn für 2-3 Chart-Typen. |
| @fastify/schedule | node-cron (4.2.1) | node-cron ist standalone, funktioniert aber nicht als Fastify-Plugin — kein Zugriff auf Fastify-Instanz, Logger oder Lifecycle. @fastify/schedule ist idiomatischer. |
| @fastify/schedule | setTimeout-Loop | Kein Cron-Ausdruck, kein Neustart-Recovery, fehleranfällig. |

### Installation
```bash
# Frontend
cd client && npm install recharts

# Backend
cd server && npm install @fastify/schedule toad-scheduler
# Nodemailer ist bereits im Stack — nur installieren wenn noch nicht in package.json
cd server && npm install nodemailer && npm install -D @types/nodemailer
```

---

## Architecture Patterns

### Empfohlene Projektstruktur (Ergänzungen zu Phase 1/2)

```
client/src/
├── features/
│   ├── pos/                    # bestehend
│   ├── auth/                   # bestehend
│   └── admin/                  # NEU — Phase 3
│       ├── AdminScreen.tsx     # Tab-Navigation: Produkte | Berichte | Einstellungen
│       ├── products/
│       │   ├── ProductList.tsx
│       │   ├── ProductForm.tsx
│       │   └── StockAdjustModal.tsx
│       ├── reports/
│       │   ├── DailyReport.tsx        # POS-08
│       │   ├── MonthlyReport.tsx      # REP-01, REP-02
│       │   └── ReportChart.tsx        # Recharts-Wrapper
│       └── settings/
│           └── SettingsForm.tsx       # REP-03, Quick-Buttons

server/src/
├── routes/
│   ├── health.ts               # bestehend
│   ├── sync.ts                 # bestehend (STOCK_ADJUST ergänzen)
│   ├── products.ts             # NEU — CRUD
│   ├── reports.ts              # NEU — Aggregationen
│   └── settings.ts             # NEU — E-Mail-Config
├── services/
│   └── mailer.ts               # NEU — Nodemailer-Wrapper
├── scheduler/
│   └── reportScheduler.ts      # NEU — @fastify/schedule Cron
└── db/
    ├── schema.ts               # ERWEITERN — minStock, settings-Tabelle
    └── migrations/             # NEU — Drizzle-Migrationsdateien
```

### Pattern 1: Dexie Schema-Migration (v2 für minStock)

**Was:** Dexie-Datenbank-Schema muss von v1 auf v2 hochgestuft werden, um `minStock` hinzuzufügen.

**Kritisch:** `minStock` fehlt derzeit in `client/src/db/schema.ts`. Die CONTEXT.md-Aussage "bereits vorhanden" ist falsch — das Feld muss in dieser Phase ergänzt werden.

```typescript
// client/src/db/schema.ts — ERWEITERN
export interface Product {
  // ... bestehende Felder ...
  minStock: number; // NEU — 0 = kein Mindestbestand (Opt-in)
}

export class FairstandDB extends Dexie {
  constructor() {
    super('fairstand-db');
    // Version 1 — bestehend, NICHT anfassen
    this.version(1).stores({
      products: 'id, shopId, category, active, [shopId+active]',
      sales: 'id, shopId, createdAt, syncedAt',
      outbox: '++id, shopId, createdAt, operation',
    });
    // Version 2 — NEU für minStock
    // Keine stores()-Änderung nötig (minStock ist kein Index)
    // Dexie migriert automatisch, wenn Schema-Version erhöht wird
    this.version(2).upgrade(tx => {
      return tx.table('products').toCollection().modify(product => {
        if (product.minStock === undefined) {
          product.minStock = 0;
        }
      });
    });
  }
}
```

### Pattern 2: Drizzle-Migration für Server-Schema

**Was:** Server-Schema ebenfalls um `minStock` und neue `settings`-Tabelle erweitern.

```typescript
// server/src/db/schema.ts — ERWEITERN
export const products = sqliteTable('products', {
  // ... bestehende Spalten ...
  minStock: integer('min_stock').notNull().default(0), // NEU
});

export const settings = sqliteTable('settings', {  // NEU
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  shopId: text('shop_id').notNull(),
});
```

Migration via drizzle-kit:
```bash
cd server && npx drizzle-kit generate && npx drizzle-kit migrate
```

### Pattern 3: STOCK_ADJUST im Sync-Flow

**Was:** `STOCK_ADJUST` ist bereits als OutboxEntry-Operation im Client-Schema definiert, aber der Server-Handler in `sync.ts` ist noch nicht implementiert (Kommentar: "Phase 3 — noch nicht implementiert").

```typescript
// server/src/routes/sync.ts — ERGÄNZEN im if-else-Block
if (entry.operation === 'STOCK_ADJUST') {
  const adjustResult = StockAdjustSchema.safeParse(entry.payload);
  // Delta-Prinzip beibehalten: sql`${products.stock} + ${delta}`
  tx.update(products)
    .set({ stock: sql`${products.stock} + ${adjustResult.data.delta}` })
    .where(eq(products.id, adjustResult.data.productId))
    .run();
}
```

### Pattern 4: LWW-Fix (aus CONTEXT.md Specifics)

**Was:** Phase 2 verwendet `onConflictDoNothing()` für Produkt-Upsert beim Sale-Sync. Das bedeutet: Produktänderungen aus Phase 3 (Preise, Name) werden beim Sale-Sync NICHT übernommen, wenn das Produkt bereits existiert — das ist korrekt für Sales, aber der explizite Produkt-CRUD-Endpoint braucht `onConflictDoUpdate` mit LWW-Check.

```typescript
// Für den neuen PUT /api/products/:id Route:
db.insert(products)
  .values(newProduct)
  .onConflictDoUpdate({
    target: products.id,
    set: {
      name: sql`CASE WHEN excluded.updated_at > products.updated_at THEN excluded.name ELSE products.name END`,
      // ... alle mutable Felder mit LWW
    }
  })
  .run();
```

### Pattern 5: Recharts für Monats-/Jahresvergleich

```tsx
// Source: Recharts offizielle Docs — BarChart Pattern
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthData {
  month: string;   // "Jan", "Feb" etc.
  umsatz: number;  // Cent-Integer → formatEur() im Tooltip
  spenden: number;
  marge: number;
}

function RevenueChart({ data }: { data: MonthData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(v) => `${(v / 100).toFixed(0)}€`} />
        <Tooltip formatter={(v: number) => formatEur(v)} />
        <Legend />
        <Bar dataKey="umsatz" fill="#38bdf8" name="Umsatz" />
        <Bar dataKey="spenden" fill="#86efac" name="Spenden" />
        <Bar dataKey="marge" fill="#fbbf24" name="Marge" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 6: @fastify/schedule für Cron

```typescript
// server/src/scheduler/reportScheduler.ts
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { AsyncTask, CronJob } from 'toad-scheduler';

export async function reportScheduler(fastify: FastifyInstance) {
  // Monatlich: 1. des Monats, 08:00 Uhr
  const monthlyTask = new AsyncTask('monthly-report', async () => {
    const config = await getEmailConfig(); // aus settings-Tabelle
    if (!config.monthlyEnabled) return;
    await sendMonthlyReport(config.email);
  });

  fastify.scheduler.addCronJob(new CronJob(
    { cronExpression: '0 8 1 * *' },
    monthlyTask,
    { preventOverrun: true }
  ));

  // Jährlich: 1. Januar, 09:00 Uhr
  const yearlyTask = new AsyncTask('yearly-report', async () => {
    const config = await getEmailConfig();
    if (!config.yearlyEnabled) return;
    await sendYearlyReport(config.email);
  });

  fastify.scheduler.addCronJob(new CronJob(
    { cronExpression: '0 9 1 1 *' },
    yearlyTask,
    { preventOverrun: true }
  ));
}
```

```typescript
// server/src/index.ts — Plugin registrieren
import fastifySchedule from '@fastify/schedule';

await fastify.register(fastifySchedule);
await fastify.register(reportScheduler);
```

### Pattern 7: Nodemailer HTML-Mail

```typescript
// server/src/services/mailer.ts
import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendReport(to: string, subject: string, htmlBody: string) {
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'Fairstand <noreply@fairstand.godsapp.de>',
    to,
    subject,
    html: htmlBody,
  });
}
```

### Anti-Patterns to Avoid

- **Admin-Route ohne Auth-Guard:** Admin-Bereich muss hinter dem bestehenden PIN-Lock liegen. App.tsx zeigt POS nur bei `state === 'unlocked'` — Admin-Screen muss denselben Guard nutzen, kein separater Auth-Flow.
- **Separate Dexie-DB für Admin:** Admin-Daten (Produkte, Sales) liegen in derselben `FairstandDB`-Instanz. Keine zweite Datenbank anlegen.
- **Absolutwert bei Bestandskorrektur:** STOCK_ADJUST immer als Delta senden (`+5`, `-3`), nie als neuen Absolutwert. Das Delta-Prinzip aus OFF-04 gilt auch für manuelle Korrekturen.
- **Berichte nur clientseitig:** Aggregationen über Sales-Daten auf dem Server berechnen (Drizzle/SQLite). Client-seitige Aggregation über Dexie ist nicht zuverlässig, da ungesyncte Sales im IndexedDB stehen können, die auf dem Server noch fehlen.
- **HTML-Mail-Template als String-Konkatenation:** Template-Literal für HTML-Mails ist fehleranfällig bei Sonderzeichen. Einfaches Escaping (`String.replace()` für `<`, `>`, `&`) für alle dynamischen Werte verwenden.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen nutzen | Warum |
|---------|-------------------|-------------------|-------|
| Chart-Rendering | Eigene SVG-Achsen, Tooltips, Legenden | recharts | Tooltip-Positionierung, Responsiveness, Accessibility: alles bereits gelöst |
| Cron-Job-Scheduling | setTimeout-Loop, eigener Cron-Parser | @fastify/schedule + toad-scheduler | Timezone-Handling, DST-Kanten, Server-Restart-Recovery |
| SMTP-Verbindungsmanagement | Eigener TCP-Socket | nodemailer | AUTH, STARTTLS, Connection-Pooling, Retry-Logik |
| DB-Aggregationen | JS-Array-Reduktionen im Server-Code | Drizzle `sql` Template + SQLite GROUP BY | JOIN-Performance, korrekte NULL-Behandlung, Indexnutzung |
| Schema-Migration | Manuelle ALTER TABLE | drizzle-kit generate + migrate | Migrationsversionierung, Rollback-Tracking |

---

## Common Pitfalls

### Pitfall 1: Dexie Version increment vergessen

**Was passiert:** Wenn `minStock` zum Product-Interface hinzugefügt wird, aber `this.version()` nicht erhöht wird, bleibt die IndexedDB-Struktur der v1 erhalten. Bestehende Records haben kein `minStock`-Feld, was zu `undefined`-Fehlern in der UI führt.

**Warum:** Dexie-Versionierung ist explizit. Neue Felder ohne Index brauchen eine neue Versionsnummer und ein `upgrade()`-Callback, das bestehende Records mit Defaultwerten befüllt.

**Verhindert durch:** Immer `this.version(N+1).upgrade(tx => ...)` beim Hinzufügen neuer Pflichtfelder.

### Pitfall 2: Sales-Items sind JSON-String im Server

**Was passiert:** `sales.items` ist im Drizzle-Schema als `{ mode: 'json' }` definiert — Drizzle serialisiert/deserialisiert automatisch. Aber in Raw-SQL-Aggregationen (für Berichte) muss `json_each(items)` oder `json_extract()` genutzt werden, um auf einzelne Item-Felder zuzugreifen.

**Warum:** SQLite speichert JSON als TEXT. GROUP BY über Item-Felder ist ohne JSON-Funktionen nicht möglich.

**Verhindert durch:** Bericht-Queries nutzen SQLite-JSON-Funktionen:
```sql
SELECT json_extract(item.value, '$.productId') as product_id,
       SUM(json_extract(item.value, '$.quantity')) as total_qty
FROM sales, json_each(sales.items) as item
GROUP BY product_id
```

### Pitfall 3: Cron läuft in Docker-Timezone UTC

**Was passiert:** `0 8 1 * *` läuft um 08:00 UTC — im Sommer ist das 10:00 MESZ, im Winter 09:00 MEZ.

**Warum:** Docker-Container haben standardmäßig UTC.

**Verhindert durch:** Entweder UTC als Referenz akzeptieren (8 Uhr UTC = realistisch für kirchliche Nutzung) oder `TZ=Europe/Berlin` in `docker-compose.yml` setzen und Cron-Ausdruck entsprechend anpassen. Recommendation: `TZ=Europe/Berlin` in docker-compose.yml, Cron auf 07:00 UTC (= 08:00 MEZ / 09:00 MESZ — "früh genug").

### Pitfall 4: Admin-Tab-Navigation und React Router

**Was passiert:** Die App nutzt derzeit keinen React Router. Admin-Bereich per einfachem State-Toggle (POS vs. Admin) ist sauberer als Router-Einführung für diesen Scope.

**Warum:** Browser-Back-Button und Bookmark-URLs sind für eine installierte Home-Screen-PWA kein Nutzerbedürfnis.

**Verhindert durch:** `activeView: 'pos' | 'admin'` als useState in App.tsx, kein React Router einführen.

### Pitfall 5: Recharts und React 19 StrictMode

**Was passiert:** Recharts 3.x ist React 19-kompatibel (peerDependencies: `^19.0.0`). Kein bekanntes Problem mit StrictMode und Recharts 3.8.

**Warum bekannt:** Recharts 2.x hatte StrictMode-Probleme. Version 3.x adressiert das.

**Verhindert durch:** Explizit Version 3.x installieren (`npm install recharts@^3`).

### Pitfall 6: Nodemailer und fehlende SMTP-Env-Vars

**Was passiert:** Wenn SMTP-Env-Vars nicht gesetzt sind, schlägt `transport.sendMail()` beim Versuch mit einem kryptischen Fehler fehl.

**Warum:** Nodemailer erstellt den Transport ohne Validierung der Credentials.

**Verhindert durch:** Startup-Validierung im Server:
```typescript
if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
  fastify.log.warn('SMTP nicht konfiguriert — Mail-Versand deaktiviert');
}
```
Mail-Versand-Endpoints geben 503 zurück statt zu crashen, wenn SMTP nicht konfiguriert.

---

## Code Examples

### Tagesübersicht-Query (Dexie — POS-08)

```typescript
// client/src/features/admin/reports/DailyReport.tsx
// Aggregation über lokale Dexie-Daten für Tagesübersicht
const todaysales = await db.sales
  .where('createdAt')
  .between(startOfDay, endOfDay)
  .filter(s => s.shopId === SHOP_ID)
  .toArray();

const summary = {
  count: todaySales.length,
  totalCents: todaySales.reduce((s, sale) => s + sale.totalCents, 0),
  donationCents: todaySales.reduce((s, sale) => s + sale.donationCents, 0),
};
```

### Monatsbericht-Query (Drizzle + SQLite-Aggregation — REP-01, REP-02)

```typescript
// server/src/routes/reports.ts
const result = db.all(sql`
  SELECT
    SUM(total_cents) as total_cents,
    SUM(donation_cents) as donation_cents,
    COUNT(*) as sale_count
  FROM sales
  WHERE shop_id = ${shopId}
    AND created_at >= ${monthStart}
    AND created_at < ${monthEnd}
`);
```

Top-5-Artikel (JSON-Extraktion):
```typescript
const topArticles = db.all(sql`
  SELECT
    json_extract(item.value, '$.name') as name,
    SUM(CAST(json_extract(item.value, '$.quantity') AS INTEGER)) as total_qty,
    SUM(CAST(json_extract(item.value, '$.quantity') AS INTEGER) *
        CAST(json_extract(item.value, '$.salePrice') AS INTEGER)) as revenue_cents
  FROM sales, json_each(sales.items) as item
  WHERE sales.shop_id = ${shopId}
    AND sales.created_at >= ${monthStart}
    AND sales.created_at < ${monthEnd}
  GROUP BY json_extract(item.value, '$.productId')
  ORDER BY total_qty DESC
  LIMIT 5
`);
```

### Mindestbestand-Warning-Banner (WAR-06)

```tsx
// Reaktive Abfrage — aktualisiert sich bei Bestandsänderungen
const lowStockProducts = useLiveQuery(
  () => db.products
    .where('[shopId+active]')
    .equals([SHOP_ID, 1])
    .filter(p => p.minStock > 0 && p.stock <= p.minStock)
    .toArray(),
  []
);

// Im POS-Screen (sichtbar ohne Admin-Zugang):
{lowStockProducts && lowStockProducts.length > 0 && (
  <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-amber-800 text-sm">
    Mindestbestand unterschritten: {lowStockProducts.map(p => p.name).join(', ')}
  </div>
)}
```

### HTML-Mail-Template (REP-04)

```typescript
// server/src/services/reportTemplate.ts
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildMonthlyReportHtml(data: ReportData): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #0ea5e9;">Fairstand Monatsbericht ${escapeHtml(data.monthLabel)}</h1>
  <table style="width: 100%; border-collapse: collapse;">
    <tr style="background: #f0f9ff;">
      <th style="text-align: left; padding: 8px; border: 1px solid #e0f2fe;">Kennzahl</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">Wert</th>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e0f2fe;">Gesamtumsatz</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${escapeHtml(formatEur(data.totalCents))}</td>
    </tr>
    <!-- weitere Zeilen -->
  </table>
</body>
</html>`;
}
```

### docker-compose.yml Ergänzungen (SMTP + Timezone)

```yaml
# docker-compose.yml — server service environment ergänzen
services:
  server:
    environment:
      - PORT=3000
      - CORS_ORIGIN=https://fairstand.godsapp.de
      - TZ=Europe/Berlin
      # SMTP-Konfiguration (in .env-Datei oder Portainer Secrets):
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT:-587}
      - SMTP_SECURE=${SMTP_SECURE:-false}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM=${SMTP_FROM:-Fairstand <noreply@fairstand.godsapp.de>}
```

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Geändert wann | Impact |
|--------------|------------------|---------------|--------|
| node-cron (standalone) | @fastify/schedule als Plugin | Fastify 5.x-Ära | Zugriff auf Fastify-Logger und -Lifecycle |
| Recharts 2.x (StrictMode-Probleme) | Recharts 3.x (React 19-compat) | 2024 | Kein Workaround für StrictMode nötig |
| Chart.js (imperative API) | Recharts (deklarative JSX-API) | React-Mainstream seit 2022 | Kein `useRef`, kein `new Chart()` |

**Deprecated/outdated:**
- `moment.js`: Nicht verwenden, bereits in CLAUDE.md dokumentiert. `date-fns` für Datums-Formatierung (bereits im Stack).
- `cron` npm-Package: Älteres Paket, kein Fastify-Integration. `@fastify/schedule` ist der aktuelle Standard.

---

## Open Questions

1. **Sind Sales-Daten für Berichte auf Server oder Client zu aggregieren?**
   - Was wir wissen: Server hat alle gesyncten Sales in SQLite. Client hat alle lokalen Sales in Dexie (inkl. ungesyncte).
   - Was unklar: Sollen Berichte auch offline-Daten zeigen oder nur server-seitig aggregierte?
   - Recommendation: Tagesübersicht (POS-08) aus Dexie (lokal, also auch offline verfügbar). Monats-/Jahresberichte (REP-01, REP-02) über Server-Route — diese werden nur bei Online-Verbindung abgerufen, was akzeptabel ist, da Berichte nicht in der Kirche gebraucht werden.

2. **Quick-Buttons-Konfigurierbarkeit (Claude's Discretion)**
   - Was wir wissen: Aus Phase 1 CONTEXT.md deferred, soll in Phase 3 Settings umgesetzt werden.
   - Was unklar: Wie komplex? Welche Quick-Buttons gibt es?
   - Recommendation: Einfach halten — idb-keyval speichert eine Liste von Produkt-IDs, die im POS-Screen als "Quick-Access"-Buttons oben angezeigt werden. Konfiguration im Settings-Tab des Admin-Bereichs.

3. **settings-Tabelle vs. Env-Vars für E-Mail-Config**
   - Was wir wissen: E-Mail-Adresse soll konfigurierbar sein (REP-03). SMTP-Credentials sind sinnvoll als Env-Vars.
   - Recommendation: SMTP-Credentials als Env-Vars (Secrets im Portainer). Empfänger-E-Mail-Adresse + Monatlich/Jährlich-Toggle als Einträge in der `settings`-Tabelle (editierbar über UI ohne Docker-Neustart).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (bereits im Stack via CLAUDE.md) |
| Config file | Prüfen ob `vitest.config.ts` bereits existiert — Wave 0 Gap wenn nicht |
| Quick run command | `cd client && npx vitest run` |
| Full suite command | `cd client && npx vitest run && cd ../server && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WAR-01 | Produkt anlegen speichert alle Felder korrekt | unit | `npx vitest run src/features/admin/products` | Wave 0 |
| WAR-03 | Deaktiviertes Produkt erscheint nicht im ArticleGrid | unit | `npx vitest run src/features/pos/ArticleGrid` | Wave 0 |
| WAR-06 | Mindestbestand-Banner erscheint bei stock <= minStock | unit | `npx vitest run src/features/admin/lowStock` | Wave 0 |
| REP-01 | Spendenübersicht aggregiert korrekt nach Tag/Monat | unit | `npx vitest run server/src/routes/reports` | Wave 0 |
| REP-04 | Cron-Job löst Mail-Versand aus | manual | Manuell per API-Call gegen /api/reports/send-test | — |
| POS-08 | Tagesübersicht zeigt korrekte Summen | unit | `npx vitest run src/features/admin/reports/DailyReport` | Wave 0 |

### Wave 0 Gaps
- [ ] `client/src/features/admin/products/ProductForm.test.tsx` — deckt WAR-01, WAR-02, WAR-03
- [ ] `client/src/features/pos/ArticleGrid.test.tsx` — deckt WAR-03 (deaktivierte Produkte)
- [ ] `server/src/routes/reports.test.ts` — deckt REP-01, REP-02
- [ ] `client/vitest.config.ts` — falls nicht vorhanden
- [ ] `server/vitest.config.ts` — falls nicht vorhanden

---

## Sources

### Primary (HIGH confidence)
- npm registry `recharts@3.8.0` — Version und React 19 peerDependencies verifiziert via `npm view recharts`
- npm registry `@fastify/schedule@6.0.0` — Version und toad-scheduler peerDep verifiziert via `npm view`
- npm registry `nodemailer@8.0.3` — bereits in CLAUDE.md dokumentiert
- `client/src/db/schema.ts` — direktes Lesen des Quellcodes, minStock-Fehlen bestätigt
- `server/src/routes/sync.ts` — STOCK_ADJUST-Platzhalter "Phase 3 — noch nicht implementiert" direkt gelesen
- Dexie.js Dokumentation (CLAUDE.md) — useLiveQuery, Dexie.version().upgrade()-Pattern etabliert

### Secondary (MEDIUM confidence)
- Recharts offizielle Docs — BarChart/ResponsiveContainer API-Pattern
- @fastify/schedule GitHub README — AsyncTask + CronJob Pattern
- SQLite json_each() Dokumentation — für items-JSON-Aggregation

### Tertiary (LOW confidence)
- Cron-Timezone-Verhalten in Docker — basierend auf allgemeinem Docker-Wissen, nicht spezifisch verifiziert

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — Versionen via npm registry verifiziert
- Architecture: HIGH — Basiert auf direktem Lesen des bestehenden Codes
- Schema-Gap (minStock): HIGH — Fehlen direkt in Schema-Dateien verifiziert
- Pitfalls: MEDIUM — Meiste basieren auf etablierten Patterns, Docker-Timezone LOW
- Code Examples: MEDIUM — Patterns aus Docs, project-specific Anpassungen noch zu validieren

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stabile Bibliotheken, 30 Tage)
