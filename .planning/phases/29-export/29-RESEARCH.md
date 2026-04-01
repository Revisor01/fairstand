# Phase 29: Export - Research

**Researched:** 2026-04-02
**Domain:** CSV and PDF export, file streaming, document generation
**Confidence:** HIGH

## Summary

Phase 29 implementiert drei Export-Funktionen für Verkaufshistorie und Inventur: CSV für Excel-Kompatibilität (mit Umlauten), PDF für Belege und Jahresabschluss. Die technische Basis ist etabliert:

1. **CSV-Export:** Server-seitiges Streaming mit `csv-stringify` (Semikolon-Trennzeichen + UTF-8-BOM) über Fastify Reply
2. **PDF-Export:** PDFKit v0.18.0 (Pure Canvas-API, keine HTML-Rendering nötig) für Tabellen und Einzelbelege
3. **Integration:** Neue Endpoints in `server/src/routes/reports.ts`, Button-Wiring in bestehenden React-Komponenten (DailyReport, MonthlyReport, SaleDetailModal)

Die Anforderung nach CSV+PDF für die Inventur ist mit diesem Stack einfach umzusetzen — beide Formate nutzen dieselbe zugrundeliegende Datenbeschaffung (bestehender `/api/reports/inventory` Endpoint aus Phase 28).

**Primary recommendation:** Nutze `pdfkit` (v0.18.0) für alle PDF-Generierung, `csv-stringify` (v6.7.0) für CSV mit BOM-Optionen, beide Komponenten über Fastify Reply mit korrekten Content-Disposition-Headern streamen.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Semikolon als Trennzeichen + UTF-8 BOM Header (0xEF 0xBB 0xBF) für Excel-Kompatibilität mit Umlauten
- Server-side Streaming via Fastify Reply (Content-Type, Content-Disposition)
- Download-Button direkt in der jeweiligen Ansicht (Tagesübersicht für Verkaufshistorie, Inventur-Tab für Inventur)
- Inventur braucht BEIDES: CSV (für Excel-Weiterverarbeitung) UND PDF (für Jahresabschluss beim Kirchenkreis)

### Claude's Discretion
- PDF-Library-Wahl (pdfkit vs. html-pdf-node etc.)
- Genauer Button-Style und Platzierung
- Loading-States beim Download
- Dateiname-Pattern

### Deferred Ideas (OUT OF SCOPE)
- Excel (XLSX) Export — CSV reicht für v8.0
- Automatischer PDF-Versand per Mail — erstmal nur manueller Download

## Phase Requirements

| ID | Description | Research Support |
|----|----|---|
| EXP-01 | User kann Verkaufshistorie als CSV downloaden (Excel-kompatibel mit korrekten Umlauten) | csv-stringify mit BOM + UTF-8, Fastify streaming, `GET /api/reports/sales-csv?from=X&to=Y` |
| EXP-02 | User kann Inventur-Übersicht als CSV downloaden | csv-stringify + `GET /api/reports/inventory` bereits vorhanden, new `GET /api/reports/inventory-csv?year=X` |
| EXP-03 | User kann einzelne Verkäufe nachträglich als PDF-Beleg exportieren | pdfkit, new `GET /api/sales/:id/receipt-pdf`, Button in SaleDetailModal |

## Standard Stack

### Core CSV-Export

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| csv-stringify | 6.7.0 | CSV-Generierung mit Streaming-API | Industry-Standard für Node.js CSV, native BOM-Unterstützung, Transform-Stream für Fastify-Integration |
| pdfkit | 0.18.0 | PDF-Generierung (Canvas-API) | Etabliert (15+ Jahre), TypeScript-Typen via `@types/pdfkit`, kein External-Dependencies, Streams-native (`.pipe()`) |

### Dependencies (zu installieren)

```bash
npm install --save pdfkit csv-stringify @types/pdfkit
```

**Version verification:**
- `pdfkit`: v0.18.0 (latest as of 2026-04-02) — Node.js 6.7.0+ kompatibel
- `csv-stringify`: v6.7.0 (latest as of 2026-04-02) — Node.js 12+ kompatibel
- `@types/pdfkit`: Latest available (updated 2026-02-11 per npm)

### Supporting Libraries (bereits installiert)

| Library | Version | Purpose |
|---------|---------|---------|
| @fastify/cors | 10.x | CORS für Cross-Origin CSV/PDF-Downloads (falls nötig) |
| date-fns | 4.x | Datumformatierung in Dateinamen und CSV-Headers |
| zod | 3.x | Schema-Validierung für Query-Parameter (`?year=2026`) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| csv-stringify | fast-csv | Leicht leichter, aber weniger BOM-Control. csv-stringify ist Standard im Ecosystem. |
| pdfkit | html-pdf-node | Müsste HTML-Template in PDF rendern — über Headless-Browser (Puppeteer/Playwright). Overkill für strukturierte Tabellen. Größere Dependencies. |
| pdfkit | @react-pdf/renderer | Server-side React-to-PDF. Viel komplexer, browser-API-abhängig. Pdfkit ist schlicht/zuverlässig. |
| Manual Streaming | Stringable Library | Könnten CSV manuell generieren, aber csv-stringify spart Error-Handling (Quote-Escaping etc.). |

**Recommendation:** `csv-stringify + pdfkit` ist die Standard-Kombination für deutschsprachige Dokumente ohne externe Rendering-Infrastruktur.

## Architecture Patterns

### Recommended Project Structure

Neue Exports in bestehender Route-Struktur:

```
server/src/
├── routes/
│   ├── reports.ts              # Neue Endpoints: /reports/sales-csv, /reports/inventory-csv
│   └── sales.ts                # Neuer Endpoint: /sales/:id/receipt-pdf
├── services/
│   ├── reportTemplate.ts       # (existiert) HTML-Templates für E-Mail — erweitern für PDF-Beleg-HTML
│   └── csvExporter.ts          # (NEW) CSV-Streaming-Helper (optional, aber clean)
└── db/
    └── index.ts                # (existiert) Query-Helpers
```

### Pattern 1: CSV-Export über Fastify Reply Streaming

**What:** Server streamt CSV-Daten mit `csv-stringify`, antwortet mit `Content-Disposition: attachment` und UTF-8-BOM.

**When to use:** Große Datenmengen (>10k Zeilen), wo Memory-Effizienz kritisch ist. Für Inventur/Verkaufshistorie ideal.

**Example:**

```typescript
// server/src/routes/reports.ts
import { stringify } from 'csv-stringify';
import type { FastifyInstance } from 'fastify';

export async function reportRoutes(fastify: FastifyInstance) {
  // CSV-Export Verkaufshistorie
  fastify.get('/reports/sales-csv', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { from, to } = request.query as { from?: string; to?: string };
    
    if (!from || !to) return reply.status(400).send({ error: 'from, to required' });
    
    const fromTs = Number(from);
    const toTs = Number(to);
    
    // SQL Query für Verkaufshistorie (ähnlich wie in DailyReport)
    const result = await db.execute(sql`
      SELECT 
        created_at,
        items,
        total_cents,
        donation_cents,
        type,
        withdrawal_reason
      FROM sales
      WHERE shop_id = ${shopId}
        AND created_at >= ${fromTs}
        AND created_at <= ${toTs}
        AND cancelled_at IS NULL
      ORDER BY created_at
    `);
    
    // CSV-Headers
    const records = [
      ['Datum', 'Uhrzeit', 'Artikel', 'Menge', 'Preis (EUR)', 'Spende (EUR)', 'Typ'],
      ...result.rows.flatMap(sale => 
        (sale.items as any[]).map(item => [
          new Date(sale.created_at).toLocaleDateString('de-DE'),
          new Date(sale.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
          item.name,
          item.quantity,
          (item.salePrice / 100).toFixed(2),
          (sale.donation_cents / 100 / (sale.items.length)).toFixed(2), // Vereinfacht: Spende pro Zeile
          sale.type === 'withdrawal' ? 'Entnahme' : 'Verkauf'
        ])
      )
    ];
    
    // Streame CSV
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="verkaufshistorie-${new Date().toISOString().slice(0,10)}.csv"`);
    
    const stringifier = stringify({ 
      delimiter: ';',        // Semikolon für Excel
      bom: true,             // UTF-8 BOM
      quoted: true,          // Quote alle Felder (sicherer bei Umlauten)
    });
    
    stringifier.on('error', () => reply.status(500).send({ error: 'CSV generation failed' }));
    
    records.forEach(row => stringifier.write(row));
    stringifier.end();
    
    // Pipe stringifier in Reply
    return reply.send(stringifier);
  });
  
  // CSV-Export Inventur
  fastify.get('/reports/inventory-csv', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { year } = request.query as { year?: string };
    
    if (!year) return reply.status(400).send({ error: 'year required' });
    
    // Nutze bestehenden Inventory-Query aus Phase 28
    const inventoryData = await getInventoryData(shopId, Number(year)); // reuse Phase 28 logic
    
    const records = [
      ['Artikelname', 'Artikelnummer', 'Bestand', 'Verkauft', 'VK-Umsatz (EUR)', 'EK-Kosten (EUR)', 'Bestandswert (EUR)'],
      ...inventoryData.items.map(item => [
        item.name,
        item.article_number,
        item.current_stock,
        item.sold_qty,
        (item.revenue_cents / 100).toFixed(2),
        (item.cost_cents / 100).toFixed(2),
        ((item.current_stock * item.current_ek_cents) / 100).toFixed(2),
      ]),
      ['', '', '', '', '', 'GESAMT:', (inventoryData.total_stock_value_cents / 100).toFixed(2)],
    ];
    
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="inventur-${Number(year)}-${shopId}.csv"`);
    
    const stringifier = stringify({ 
      delimiter: ';',
      bom: true,
      quoted: true,
    });
    
    records.forEach(row => stringifier.write(row));
    stringifier.end();
    
    stringifier.on('error', () => reply.status(500).send({ error: 'CSV generation failed' }));
    return reply.send(stringifier);
  });
}
```

**Source:** [CSV Stringify - Usage](https://csv.js.org/stringify/), [Fastify Reply Streaming](https://fastify.dev/docs/latest/Reference/Reply/)

### Pattern 2: PDF-Beleg mit PDFKit

**What:** PDFKit generiert PDF-Tabelle mit Einzelverkauf-Details — kein HTML-Rendering, direktes Canvas-Zeichnen.

**When to use:** Kleine, strukturierte Dokumente (Belege, Rechnungen). Für Jahresabschluss-PDF auch.

**Example:**

```typescript
// server/src/routes/sales.ts
import PDFDocument from 'pdfkit';

export async function salesRoutes(fastify: FastifyInstance) {
  // PDF-Beleg für Einzelverkauf
  fastify.get('/sales/:id/receipt-pdf', async (request, reply) => {
    const session = (request as any).session as { shopId: string };
    const shopId = session.shopId;
    const { id } = request.params as { id: string };
    
    // Sale laden
    const [sale] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
    if (!sale || sale.shopId !== shopId) {
      return reply.status(404).send({ error: 'Sale not found' });
    }
    
    // Shop-Name laden (für Header)
    const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
    const shopName = shop?.name ?? 'Fairstand';
    
    // PDF-Dokument erstellen
    const doc = new PDFDocument();
    
    // Headers
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="beleg-${sale.id}-${new Date().toISOString().slice(0,10)}.pdf"`);
    
    // Metadaten
    doc.info.Title = `Beleg ${sale.id}`;
    doc.info.Author = 'Fairstand Kassensystem';
    
    // --- Inhalt ---
    
    // Shop-Header
    doc.fontSize(20).font('Helvetica-Bold').text(shopName, 50, 50);
    doc.fontSize(10).font('Helvetica').text('St. Secundus Hennstedt', 50, 75);
    
    // Beleg-Infos
    const saleDate = new Date(sale.createdAt);
    doc.fontSize(12).font('Helvetica-Bold').text('Verkaufsbeleg', 50, 110);
    doc.fontSize(10).font('Helvetica')
      .text(`Datum: ${saleDate.toLocaleDateString('de-DE')}`, 50, 135)
      .text(`Uhrzeit: ${saleDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`, 50, 155)
      .text(`Belegnummer: ${sale.id.slice(0,8)}`, 50, 175);
    
    // Artikel-Tabelle Header
    const tableTop = 210;
    const col1 = 50;   // Artikel
    const col2 = 350;  // Menge
    const col3 = 420;  // Preis
    
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Artikel', col1, tableTop);
    doc.text('Menge', col2, tableTop);
    doc.text('Summe (EUR)', col3, tableTop);
    
    // Trennlinie
    doc.moveTo(col1, tableTop + 20).lineTo(550, tableTop + 20).stroke();
    
    // Artikel-Zeilen
    const items = (sale.items ?? []) as any[];
    let y = tableTop + 35;
    const lineHeight = 20;
    
    for (const item of items) {
      const itemTotal = (item.salePrice * item.quantity / 100).toFixed(2);
      
      doc.fontSize(10).font('Helvetica');
      doc.text(item.name, col1, y, { width: 280, ellipsis: true });
      doc.text(`${item.quantity}×`, col2, y, { align: 'right' });
      doc.text(`${itemTotal}`, col3, y, { align: 'right' });
      
      y += lineHeight;
    }
    
    // Trennlinie vor Summen
    doc.moveTo(col1, y).lineTo(550, y).stroke();
    y += 15;
    
    // Summen-Sektion
    const totalEur = (sale.totalCents / 100).toFixed(2);
    const paidEur = (sale.paidCents / 100).toFixed(2);
    const changeEur = (sale.changeCents / 100).toFixed(2);
    const donationEur = (sale.donationCents / 100).toFixed(2);
    
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Summe:', col1, y);
    doc.text(`${totalEur} EUR`, col3, y, { align: 'right' });
    
    y += 25;
    doc.fontSize(11).font('Helvetica');
    doc.text('Gezahlt:', col1, y);
    doc.text(`${paidEur} EUR`, col3, y, { align: 'right' });
    
    y += 20;
    if (changeEur > '0.00') {
      doc.text('Wechselgeld:', col1, y);
      doc.text(`${changeEur} EUR`, col3, y, { align: 'right' });
      y += 20;
    }
    
    if (sale.donationCents > 0) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#10b981');
      doc.text('davon Spende:', col1, y);
      doc.text(`${donationEur} EUR`, col3, y, { align: 'right' });
      doc.fillColor('black');
      y += 20;
    }
    
    // Footer
    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8');
    doc.text('Fairstand Kassensystem • Ev.-Luth. Kirchengemeinde St. Secundus', 50, y + 40);
    doc.text('Automatisch generiert', 50, y + 55);
    
    // PDF finalisieren
    doc.end();
    
    // Pipe in Reply
    return reply.send(doc);
  });
}
```

**Source:** [PDFKit Getting Started](https://pdfkit.org/docs/getting_started.html)

### Pattern 3: PDF-Jahresabschluss (Inventur)

**What:** Ähnlich wie Beleg, aber größere Tabelle mit allen Artikeln — PDFKit unterstützt Multi-Page automatisch.

**Implementation:** Same wie Pattern 2, nur mehr Zeilen. PDFKit splitet automatisch auf neue Seite, wenn y > Seitenhöhe.

```typescript
// Vereinfachter Ansatz:
// Für große Tabellen: Artikel in Batches gruppieren, bei y > 700 neue Seite
if (y > 700) {
  doc.addPage();
  y = 50;
}
```

**Source:** [PDFKit Documentation](https://pdfkit.org/)

### Anti-Patterns to Avoid

- **Keine HTML-zu-PDF-Rendering für Belege:** Puppeteer/Playwright sind Overkill für strukturierte Daten. PDFKit ist schneller, leichter.
- **Synchrone CSV-Generierung:** `stringify()` blockiert. Nutze `.pipe()` oder Transform-Streams.
- **CSV ohne BOM in Excel:** Deutsche Umlaute werden verstümmelt ohne UTF-8-BOM (0xEF 0xBB 0xBF). csv-stringify mit `bom: true` ist Pflicht.
- **Dateigröße nicht beachtet:** Wenn Jahresabschluss >100MB wird — chunked CSV + Seitenaufteilung planen. Aber für ein Jahr sollte es <5MB sein.
- **Kein Error-Handling:** Stringifier kann bei Disk-Fehler crashen — `.on('error')` ist nötig.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV-Generierung mit BOM + Escaping | Manuelles String-Joining + Header-Prepending | csv-stringify | Quote-Escaping, BOM-Handling, Sonderzeichen sind fehleranfällig selbst zu machen |
| PDF-Tabellen-Layout | Canvas-Zeichnen mit Koordinaten-Berechnung | pdfkit (mit Wrapper) | Zeilenumbruch, Seitenwechsel, Font-Sizing erfordern viel Boilerplate |
| Content-Disposition-Headers | Manuell setzen, vergessen zu urlencode | reply.header() | Fastify macht Escaping richtig |

**Key insight:** CSV-BOM und PDF-Seitenwechsel sind Details, die Bibliotheken beherrschen — nicht reinventing wheels.

## Runtime State Inventory

**Phase 29 betrifft keine Runtime-State, nur neue Endpoints (kein Rename/Refactor).** — SKIPPED

## Common Pitfalls

### Pitfall 1: Umlaute in CSV werden zu "????" in Excel

**What goes wrong:** CSV wird generiert, aber in Excel sieht man "Äpfel" als "Ã¤pfel".

**Why it happens:** Excel erkennt UTF-8 nur mit BOM-Header (0xEF 0xBB 0xBF). Ohne BOM vermutet Excel Windows-1252.

**How to avoid:** `csv-stringify` mit `bom: true` Optionen:
```typescript
stringify({ 
  delimiter: ';',
  bom: true,      // ← PFLICHT
  quoted: true    // Alle Felder quoten (extra-safe)
})
```

**Warning signs:** User meldet "Umlaute falsch in Excel". Schnell-Test: CSV-Datei in Hex-Editor öffnen — sollte mit `EF BB BF` anfangen.

### Pitfall 2: PDF generiert sich nicht, hängt

**What goes wrong:** PDF-Endpoint friert ein, Browser wartet auf Response.

**Why it happens:** `doc.end()` wurde vergessen oder `.on('finish')` wurde nicht gewartet.

**How to avoid:** Immer `doc.end()` nach Inhalt aufrufen, nicht `reply.send(doc)` vor `end()`:

```typescript
// FALSCH
doc.text('Hallo');
reply.send(doc);  // Stream noch nicht finished
doc.end();

// RICHTIG
doc.text('Hallo');
doc.end();
reply.send(doc);  // Stream wird gepipet in Response
```

**Warning signs:** Browser zeigt "Loading..." unendlich lange.

### Pitfall 3: Große CSV blockt Server

**What goes wrong:** 1000+ Zeilen CSV → Node-Prozess friert, andere Anfragen warten.

**Why it happens:** Ganze CSV wird in RAM gepuffert statt gestreamt.

**How to avoid:** Nutze `csv-stringify` Stream-API, nicht array-to-string:

```typescript
// FALSCH (buffered)
const csv = stringify({ records });
reply.send(csv);

// RICHTIG (streamed)
const stringifier = stringify({ delimiter: ';', bom: true });
stringifier.pipe(reply.raw);  // oder reply.send(stringifier)
records.forEach(r => stringifier.write(r));
stringifier.end();
```

**Warning signs:** Speichernutzung steigt rapide während CSV-Download.

### Pitfall 4: PDF mit Umlauten sieht Kauderwelsch aus

**What goes wrong:** PDF zeigt "Äpfel" als "A\uFB00pfel" (falsch kombinierte Zeichen).

**Why it happens:** PDFKit nutzt Standard-Fonts (Helvetica, Times) die keine Unicode-Glyphen haben. Umlaute werden approximiert.

**How to avoid:** Custom TrueType-Font einbinden:

```typescript
doc.font('path/to/font.ttf');  // z.B. DejaVuSans.ttf (kostenlos, unterstützt ä/ö/ü)
doc.fontSize(12).text('Äpfel', x, y);
```

Oder sich vertrauen, dass Built-in Fonts gut genug sind (Helvetica hat auch Umlaut-Glyphen, aber nicht perfekt).

**Warning signs:** PDF-Viewer zeigt merkwürdige Zeichen statt ä/ö/ü.

## Code Examples

Verified patterns from official sources:

### CSV-Export mit BOM in Fastify

```typescript
import { stringify } from 'csv-stringify';
import type { FastifyInstance } from 'fastify';

fastify.get('/export-csv', async (request, reply) => {
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', `attachment; filename="export.csv"`);
  
  const stringifier = stringify({ 
    delimiter: ';',
    bom: true,
    quoted: true,
  });
  
  stringifier.on('error', (err) => {
    console.error('CSV stringify error:', err);
    reply.status(500).send({ error: 'CSV generation failed' });
  });
  
  // Schreibe Daten zeilenweise
  stringifier.write(['Spalte1', 'Spalte2', 'Äöü']);
  stringifier.write(['Wert1', 'Wert2', 'Müller']);
  stringifier.end();
  
  return reply.send(stringifier);
});
```

**Source:** [CSV Stringify - API](https://csv.js.org/stringify/api/), [Fastify Reply](https://fastify.dev/docs/latest/Reference/Reply/)

### PDF-Beleg mit PDFKit

```typescript
import PDFDocument from 'pdfkit';

fastify.get('/receipt/:id/pdf', async (request, reply) => {
  const doc = new PDFDocument();
  
  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', `attachment; filename="beleg.pdf"`);
  
  doc.fontSize(20).font('Helvetica-Bold').text('Beleg', 50, 50);
  doc.fontSize(12).font('Helvetica').text('Artikel: Äpfel', 50, 100);
  doc.fontSize(10).text('Menge: 5', 50, 125);
  doc.fontSize(10).text('Summe: 12,50 EUR', 50, 150);
  
  doc.end();
  
  return reply.send(doc);
});
```

**Source:** [PDFKit Getting Started](https://pdfkit.org/docs/getting_started.html)

### Query-Parameter Validation mit Zod

```typescript
import { z } from 'zod';

const csvQuerySchema = z.object({
  from: z.coerce.number(),
  to: z.coerce.number(),
  year: z.coerce.number().optional(),
});

fastify.get('/sales-csv', async (request, reply) => {
  const query = csvQuerySchema.parse(request.query);
  // query.from, query.to sind jetzt Numbers
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manuelles CSV-Stringjoin | csv-stringify Stream | ~2015 | Zuverlässiger, BOM-Unterstützung, kein Memory-Leak |
| Puppeteer für Belege | PDFKit Canvas-API | ~2018 | Schneller (kein Browser-Start), weniger Dependencies |
| localStorage für große Exports | Server-side Streaming | ~2020 | Größere Dateien möglich, weniger Client-RAM |
| Express + RP-Hack | Fastify native Streams | ~2021 | Saubere API, Backpressure-Handling built-in |

**Deprecated/outdated:**
- html-pdf (npm paket): Unmaintained seit 2019, nutzt alte Phantom.js. Nicht verwenden.
- pdfjs-dist für PDF-Generierung: pdfjs-dist ist nur für PDF-Parsing (Rechnungen lesen). Nicht für Generierung.

## Open Questions

1. **Font-Embedding für PDF-Belege notwendig?**
   - What we know: PDFKit hat Built-in Helvetica, Times, Courier (unterstützen ä/ö/ü aber nicht perfekt)
   - What's unclear: Ob Schreckschrift akzeptabel ist oder custom TrueType nötig
   - Recommendation: Start mit Helvetica (eingebaut), später zu DejaVuSans.ttf upgraden falls nötig

2. **Dateiname-Pattern für Exports?**
   - What we know: `inventur-2026-st-secundus.csv` ist lesbar
   - What's unclear: Soll shopId oder shopName im Dateinamen sein?
   - Recommendation: `inventur-{year}-{shopId}.csv` (shopId ist eindeutig, kürzer). Name optional im Dateinamen.

3. **Large PDF für Jahresabschluss — chunking nötig?**
   - What we know: Phase 28 erstellt Inventur für 1 Jahr mit allen Artikeln
   - What's unclear: Wie viele Artikel pro Shop realistische Größe? (10, 100, 1000?)
   - Recommendation: Keine Optimierung nötig bis real data zeigt >10MB PDFs. PDFKit handhabt +1000 Zeilen ohne Problem.

## Environment Availability

**Trigger:** Phase 29 nutzt nur bestehende Dateisystem + Node.js Runtime.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | PDF/CSV generation | ✓ | 20+ (per CLAUDE.md) | — |
| Fastify | HTTP Framework | ✓ | 5.7.x | — |
| filesystem | PDF/CSV disk write | ✓ | native | — |

**Missing dependencies with no fallback:**
- Keine (alles ist Runtime-Standard)

**Skip condition:** Phase hat keine externen Service-Dependencies (keine Printer-API, kein Cloud-Storage).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 (existing in package.json) |
| Config file | vitest.config.ts (if exists, else see Wave 0) |
| Quick run command | `npm test -- src/routes/reports.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-01 | CSV-Endpoint antwortet mit Semikolon + BOM + Umlauten | unit | `npm test -- reports.csv.test.ts` | ❌ Wave 0 |
| EXP-02 | Inventur-CSV erzeugt korrekten CSV mit Summen | unit | `npm test -- reports.csv.test.ts` | ❌ Wave 0 |
| EXP-03 | Receipt-PDF erzeugt PDF mit Artikel-Tabelle | unit | `npm test -- sales.pdf.test.ts` | ❌ Wave 0 |
| EXP-01,02 | CSV-Download im Browser speichert Datei mit Umlauten | e2e | `npm run test:e2e -- reports.spec.ts` | ❌ Wave 0 |
| EXP-03 | PDF-Button in SaleDetailModal öffnet PDF | e2e | `npm run test:e2e -- sales.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- src/routes/` (unit tests für Export-Endpoints)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/routes/reports.csv.test.ts` — CSV-Streaming, BOM-Header, Umlaute, Semikolon-Delimiter
- [ ] `tests/unit/routes/sales.pdf.test.ts` — PDF-Generierung, Text-Rendering, Tabellen-Layout
- [ ] `tests/e2e/reports.spec.ts` — CSV-Download im Browser, Dateiname-Validierung
- [ ] `tests/e2e/sales.spec.ts` — PDF-Download aus SaleDetailModal, Receipt-Content-Check
- [ ] Fixtures: `tests/fixtures/sales-sample.json`, `tests/fixtures/inventory-sample.json`

*(Bestehende Test-Infrastruktur: Vitest ist vorhanden, nur neue Routes/Specs nötig)*

## Sources

### Primary (HIGH confidence)

- [csv-stringify npm](https://www.npmjs.com/package/csv-stringify) — v6.7.0 verifiziert, BOM + Delimiter Support
- [pdfkit npm](https://www.npmjs.com/package/pdfkit) — v0.18.0 verifiziert, TypeScript types available
- [PDFKit Documentation](https://pdfkit.org/) — Official docs für PDF-Generierung
- [CSV Stringify API](https://csv.js.org/stringify/api/) — Stream-API, BOM-Option, Delimiter-Control
- [Fastify Reply API](https://fastify.dev/docs/latest/Reference/Reply/) — Streaming Response, Headers
- [Node.js fs Module](https://nodejs.org/api/fs.html) — Stream-basiertes File I/O (native)

### Secondary (MEDIUM confidence)

- [Best HTML to PDF libraries for Node.js - LogRocket](https://blog.logrocket.com/best-html-pdf-libraries-node-js/) — PDFKit vs. Alternativen, 2025 Overview
- [Best Node.js HTML to PDF Libraries for 2026 - APITemplate.io](https://apitemplate.io/blog/how-to-convert-html-to-pdf-using-node-js/) — Current ecosystem state
- [PDFKit npm Alternatives - IronPDF](https://ironpdf.com/nodejs/blog/compare-to-other-components/pdfkit-npm-alternatives/) — Trade-offs explained

### Tertiary (LOW confidence — informational only)

- [A full comparison of 6 JS libraries for generating PDFs - DEV Community](https://dev.to/handdot/generate-a-pdf-in-js-summary-and-comparison-of-libraries-3k0p) — Ecosystem overview, nicht aktuell verifiziert
- [Top JavaScript PDF generator libraries for 2026 - Nutrient](https://www.nutrient.io/blog/top-js-pdf-libraries/) — Commercial viewpoint, nicht primär authoritative

## Metadata

**Confidence breakdown:**

- **Standard Stack: HIGH** — csv-stringify v6.7.0 und pdfkit v0.18.0 sind aktuelle, stabile Versionen mit bewährtem Einsatz. npm-Versionen verifiziert.
- **Architecture Patterns: HIGH** — Fastify-Streaming ist Standard im Framework, csv-stringify + pdfkit sind idiomatic patterns im Ecosystem (2026).
- **Pitfalls: MEDIUM** — UTF-8-BOM-Issue ist dokumentiert (Umlaute in Excel häufiges Problem), PDF-Font-Issue less common aber bekannt. Error-Handling ist Best Practice, nicht empirisch in diesem Projekt validiert.
- **Environment: HIGH** — Keine externen Dependencies nötig, Node.js 20+ ist vorhanden (per CLAUDE.md).

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days — stabile, etablierte Libraries, wenig Churn)

**Checklist completed:**

- [x] Alle Domains untersucht (Stack, Patterns, Pitfalls)
- [x] Negative Claims verifiziert (html-pdf ist deprecated — via WebSearch + GitHub)
- [x] Multiple Sources cross-referenced (npm + official docs + blog posts)
- [x] URLs für authoritative sources vorhanden
- [x] Publication Dates geprüft (pdfkit latest 0.18.0, csv-stringify 6.7.0 — beide aktuell 2026-04-02)
- [x] Confidence Levels ehrlich assigniert
- [x] "Was könnte ich übersehen haben?" Review: Fonts, Multi-Page, Large Files, Browser-Compatibility — alle adressiert
- [x] Nicht applicable: Runtime State Inventory (keine Migration/Rename)
