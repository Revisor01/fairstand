# Stack Research: v8.0 Inventur, Preis-History & Rechnungsexport

**Domain:** POS System — Erweiterte Reporting & Export Features
**Researched:** 2026-04-01
**Confidence:** MEDIUM (library versions verified vs npm, integration patterns based on existing online-only stack)

## Executive Summary

v8.0 erweitert die **Online-Only-Stack** (React 19, Fastify 5, PostgreSQL 16, Drizzle ORM — siehe v6.0+) mit neuen Libraries für Inventur-Berichte, Preis-History-Tracking und CSV/PDF-Exporte. Die bestehende Stack bleibt unverändert. Neue Komponenten:

- **Datenschicht:** `product_price_history` + `stock_transactions` Tabellen (Drizzle ORM)
- **PDF-Export:** `@react-pdf/renderer 4.3.2` (React Component API für Reports)
- **CSV-Export:** `fast-csv 5.x` (Streaming im Backend via Fastify)
- **CSV-Import (optional):** `papaparse 5.x` (Browser-seitig fallback)

Keine Offline-Storage, keine IndexedDB, keine Service-Worker-Änderungen.

## Recommended Stack

### Core Technologies (UNVERÄNDERT von v6.0+)

| Technology | Version | Purpose | Status |
|------------|---------|---------|--------|
| React | 19.x | UI-Framework | ✓ Production |
| Vite | 6.x | Build-Tool | ✓ Production |
| Fastify | 5.7.x | Backend-API | ✓ Production |
| PostgreSQL | 16.x | Datenbank | ✓ Production |
| Drizzle ORM | aktuell | Schema + Migrations | ✓ Production |
| TanStack Query | 5.x | Server-State | ✓ Production |
| Tailwind CSS | 4.x | Styling | ✓ Production |
| Recharts | (aktuell) | Charts (Verkauf-Trends) | ✓ Production |

### NEW: Supporting Libraries für v8.0

| Library | Version | Purpose | When to Use | Rationale |
|---------|---------|---------|-------------|-----------|
| **@react-pdf/renderer** | 4.3.2 | PDF-Generierung aus React-Komponenten | Frontend: Inventur-Reports, Jahresberichte als PDF | v4.3.2+ hat Memory-Optimierungen (Jan 2026), 1.43M weekly downloads, maintained, true PDF-Engine (nicht Screenshot-basiert) |
| **fast-csv** | 5.0.x | CSV-Formatter + Parser mit Streaming | Backend: Export großer Verkaufs-/Bestandsmengen | 3.4M weekly downloads, Streaming-optimiert (keine Memory-Spike bei 10K+ Zeilen), Fastify-kompatibel |
| **papaparse** | 5.4.1 | CSV-Parser für Browser + Node.js | Optional: CSV-Import im Frontend (fallback bei Server-Fehler) | 2.8M weekly downloads, Browser-first (aber auch Node-capable), robust bei malformed CSV |
| **xlsx** | 0.18.5 | XLSX/Excel-Generierung | Optionale Phase: Falls Kirchenkreis Excel-Export später braucht | Standard-Tool für Spreadsheet-Exporte, deferrable bis Phase später |

### Database Schema Additions (Drizzle ORM)

| Table | Purpose | Key Columns | Notes |
|-------|---------|-------------|-------|
| `product_price_history` | EK/VK-Preisänderungen pro Artikel | `product_id`, `ek_price_cents`, `vk_price_cents`, `created_at`, `shop_id` | Schreibt eine Zeile bei Product-Update wenn Preis sich ändert |
| `stock_transactions` | Bestandsbewegungen (Verkauf, Rückgabe, Nachbuchung) | `product_id`, `quantity_delta`, `type` (SALE/RETURN/RESTOCK), `created_at`, `sale_id` (FK) | Grain: jede Transaktion ist eine Zeile für Bestandsverlauf-Reports |

**Nutzen:** `product_price_history` für EK/VK-Tracking per Artikel, `stock_transactions` für Bestandsverlauf + Mengenbericht. Snapshots in `sale_items.ek_price_cents` (bereits vorhanden) für korrekte Kosten-Berechnung.

## Installation

```bash
# PDF Export
npm install @react-pdf/renderer@4.3.2

# CSV Export (Backend)
npm install fast-csv@5.0.1

# Optional: CSV Import (Frontend)
npm install papaparse@5.4.1

# Drizzle (bereits installiert, aber drizzle-kit für migrations)
npm install -D drizzle-kit@latest
```

## Alternatives Considered

| Recommended | Alternative | Rationale für Ablehnung |
|-------------|-------------|-------------------------|
| **@react-pdf/renderer** | `pdfmake` | Nur wenn PDF-Template zu simpel für React-Komponenten. Für strukturierte, styling-komplexe Reports ist React-API besser. Pdfmake besser für `content:[]`-basierte Designs. |
| **@react-pdf/renderer** | `jsPDF` | Sehr leicht (~50 KB), aber low-level API (manuelle y-Position tracken). Reports brauchen höheres Abstraktionslevel. |
| **@react-pdf/renderer** | `html2pdf`/`html2canvas` | Screenshot-basiert = Styling-Fehler, Performance-Probleme bei großen Reports, nicht zuverlässig für Print. |
| **fast-csv** | `csv-stringify` (node-csv) | csv-stringify auch Stream-basiert, aber fast-csv ist verbreiteter (3.4M vs. ~500K weekly downloads), bessere Doku. |
| **fast-csv** | `papaparse` (im Backend) | Papa kann auch Node.js, aber wird für Browser-Parsing besser gepflegt. fast-csv für Backend-Streaming optimiert. |
| Nur **CSV** | **CSV + XLSX** | Kirchenkreis wahrscheinlich CSV-zufrieden. XLSX als Optionales Feature in Folge-Phase deferrable. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-to-pdf` | Deprecated, kein TypeScript, Wrapper um alte Libs | `@react-pdf/renderer` |
| `html2pdf` / `html2canvas` | Screenshot-basiert = Formatierungsfehler, Fonts falsch, Performance | `@react-pdf/renderer` |
| `pdf-lib` | Zu low-level (PDF-Operationen), designed für PDF-Manipulation (Signing, Merge), nicht Report-Gen | `@react-pdf/renderer` |
| `csv-parse` | Parser-only, brauchst du auch Formatter. Zwei Packages statt eins. | `fast-csv` (parse + format) |
| **IndexedDB/Dexie** für Preis-History | App ist Online-Only, kein Offline-Cache-Bedarf — History gehört nur auf Server | PostgreSQL + Drizzle (Source of Truth) |
| **Prisma** statt Drizzle | Zu schwer (Client-Generation, Binary), bereits mit Drizzle committed | Drizzle ORM (lightweight, bereits produktiv) |
| **SQLite** statt PostgreSQL | Migriert v6.0+, PostgreSQL ist besser für Reporting/Joins bei größeren Datenmengen | PostgreSQL + node-postgres (bereits v6.0+) |

## Stack Patterns für v8.0

### 1. Preis-History: Auto-Write bei Product-Update

```typescript
// Backend: Drizzle Schema (server/db/schema.ts)
export const productPriceHistory = pgTable('product_price_history', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  ekPriceCents: integer('ek_price_cents').notNull(),
  vkPriceCents: integer('vk_price_cents').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  // optional: source: 'MANUAL' | 'PDF_IMPORT' | 'API'
});

// Backend: Fastify Route (server/routes/products.ts)
app.patch('/api/products/:id', async (req, reply) => {
  const id = parseInt(req.params.id);
  const shopId = req.session!.shopId; // Session-erzwungen
  
  // Alte Preise fetch
  const [oldProduct] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.shopId, shopId)));
  
  const { ekPriceCents, vkPriceCents, ...otherFields } = req.body;
  
  // Update durchführen
  await db.update(products)
    .set({ ekPriceCents, vkPriceCents, ...otherFields })
    .where(and(eq(products.id, id), eq(products.shopId, shopId)));
  
  // History-Eintrag schreiben wenn Preis sich ändert
  if (oldProduct.ekPriceCents !== ekPriceCents || oldProduct.vkPriceCents !== vkPriceCents) {
    await db.insert(productPriceHistory).values({
      productId: id,
      ekPriceCents,
      vkPriceCents,
      shopId,
    });
  }
  
  reply.send({ success: true });
});
```

### 2. CSV-Export: Streaming via Fastify

```typescript
// Backend: fast-csv Streaming (server/routes/reports.ts)
import { format } from 'fast-csv';

app.get('/api/reports/inventory-csv', async (req, reply) => {
  const shopId = req.session!.shopId;
  
  // Aggregiere Daten (Bestand, VK-Preis, EK-Kosten)
  const inventory = await db
    .select({
      name: products.name,
      sku: products.sku,
      currentStock: products.stock,
      ekPriceCents: products.ekPriceCents,
      vkPriceCents: products.vkPriceCents,
    })
    .from(products)
    .where(eq(products.shopId, shopId));
  
  // CSV-Stream direkt zu Response (kein Memory-Buffer)
  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', 'attachment; filename="inventur.csv"');
  
  const csvStream = format({ headers: true })
    .on('error', (err) => console.error(err))
    .pipe(reply.raw); // ← Direkt zu HTTP-Response
  
  inventory.forEach(row => csvStream.write(row));
  csvStream.end();
});
```

### 3. PDF-Report im Frontend (React)

```typescript
// Frontend: React Component (client/pages/InventoryReport.tsx)
import { Document, Page, Text, View, PDFDownloadLink } from '@react-pdf/renderer';
import { useQuery } from '@tanstack/react-query';

const InventoryReportPDF = ({ inventory, month }: InventoryReportProps) => (
  <Document>
    <Page size="A4" style={{ padding: 40 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Inventur {month}</Text>
      
      {inventory.map(item => (
        <View key={item.id} style={{ marginBottom: 10, borderBottom: '1px solid #eee' }}>
          <Text>{item.name}</Text>
          <Text>Bestand: {item.stock} | VK: {formatCurrency(item.vkPrice)} | EK: {formatCurrency(item.ekPrice)}</Text>
        </View>
      ))}
    </Page>
  </Document>
);

export const InventoryReportPage = () => {
  const { data: inventory } = useQuery({
    queryKey: ['inventory', { month: '2026-03' }],
    queryFn: async () => {
      const res = await fetch('/api/reports/inventory?month=202603');
      return res.json();
    },
  });

  return (
    <PDFDownloadLink
      document={<InventoryReportPDF inventory={inventory} month="März 2026" />}
      fileName="inventur_2026_03.pdf"
    >
      {({ blob, url, loading }) => (
        <button disabled={loading}>
          {loading ? 'PDF wird generiert...' : '📥 PDF Herunterladen'}
        </button>
      )}
    </PDFDownloadLink>
  );
};
```

### 4. Stock-Transactions Tracking (optional aber recommended)

```typescript
// Backend: Bei jedem Sale, Rückgabe, oder Restock schreiben
app.post('/api/sales', async (req, reply) => {
  const shopId = req.session!.shopId;
  const { items, paid, donationCents } = req.body;
  
  // Sale-Eintrag
  const [sale] = await db.insert(sales).values({ shopId, paid, donationCents }).returning();
  
  // Bestandsabzug + Stock-Transactions
  for (const item of items) {
    // Sale Items
    await db.insert(saleItems).values({
      saleId: sale.id,
      productId: item.productId,
      quantitySold: item.quantity,
      ekPriceCents: /* snapshot */,
      vkPriceCents: /* snapshot */,
    });
    
    // Stock Transaction Log (für Bestandsverlauf-Reports)
    await db.insert(stockTransactions).values({
      productId: item.productId,
      quantityDelta: -item.quantity, // Negative = Abzug
      type: 'SALE',
      saleId: sale.id,
      shopId,
    });
  }
});
```

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@react-pdf/renderer@4.3.2` | React@18+, React@19 | v4.3.2+ (Jan 2026): Memory-Optimierungen für Batch-Rendering. Kein Breaking Change zu v4.0. |
| `fast-csv@5.0.x` | Node.js@18+ | Streaming API stabil, Fastify@5.x kompatibel. |
| `papaparse@5.4.x` | Node.js@18+, Browser | Browser-first, aber auch Node-capable via `Papa.NODE_STREAM_INPUT`. |
| `drizzle-orm@*` | PostgreSQL@16 | Keine Breaking Changes für neue Tables. `drizzle-kit` handles migrations. |
| `xlsx@0.18.5` (optional) | Node.js@18+ | Für zukünftige Phase, wenn Excel-Export kommt. Jetzt defer. |

## Integration mit bestehendem System

### 1. API-Routes erweitern

| Endpoint | Methode | Purpose | Uses Library |
|----------|---------|---------|--------------|
| `/api/products/:id` | PATCH | Product aktualisieren → Price-History schreiben | — (Drizzle) |
| `/api/reports/inventory` | GET | Jahresinventur mit aktuellem Bestand + Umsatz | — (TanStack Query, Drizzle) |
| `/api/reports/inventory-csv` | GET | CSV-Download mit Streaming | `fast-csv` |
| `/api/reports/inventory-pdf` | GET | PDF-Download (optional Backend oder Frontend) | `@react-pdf/renderer` (Frontend) |

### 2. Frontend-Queries (TanStack Query)

- `inventoryByMonth` — Aggregierter Bericht (Bestand + Verkaufte Menge + EK-Kosten)
- `priceHistoryByProduct` — EK/VK-Timeline für ein Artikel
- `stockTransactionsByProduct` — Bestandsverlauf (optional für Detail-Report)

### 3. Admin-Routes (unverändert)

- Produce-CRUD, Shop-Management, Report-Zugriff — keine neuen Middleware nötig
- Session-Auth erzwingt Shop-Isolation bereits (v5.0+)

## Drizzle Migrations für v8.0

```bash
# 1. Schema erweitern (server/db/schema.ts)
export const productPriceHistory = pgTable(...)
export const stockTransactions = pgTable(...)

# 2. Migration generieren (drizzle-kit)
drizzle-kit generate postgresql --name add_price_history_and_stock_tracking

# 3. Migration runnen (Docker Entrypoint oder manuell)
drizzle-kit migrate postgresql

# 4. Prüfe _drizzle_migrations Table
SELECT * FROM "__drizzle_migrations" ORDER BY id DESC LIMIT 5;
```

## Pitfalls to Avoid

| Pitfall | Problem | Prevention |
|---------|---------|-----------|
| **Price-History bei jedem Sale-Sync** | DB wird mit doppelten Einträgen gespammt | History-Zeile nur bei `PATCH /api/products`, nicht bei Sale-Completion |
| **Große PDF-Reports im Memory** | @react-pdf/renderer buffert DOM, >5000 Artikel = OOM | Pagination: max 500 Artikel pro PDF-Seite, oder Backend-Side PDF (Defer bis später) |
| **CSV ohne Streaming** | Alle Zeilen in Array, dann stringify → 50K+ Sales = Memory-Spike | `fast-csv` + `.pipe()` direkt zu Response |
| **Unklare Price-History-Quelle** | Manual-Update, PDF-Import, API — keine Audit | Optional: `source` Column in `product_price_history` |
| **Alte Preise vergessen** | Bericht nutzt nur aktuelle `product.vk_price` → Vergangenheit falsch | `sale_items.ek_price_cents` snapshot bereits vorhanden, für Multi-Month-Reports `product_price_history` joinnen |
| **CSV-Encoding-Fehler** | Umlaute (Schökolade, Größe) falsch in Excel | `fast-csv` mit `headers: true, encoding: 'utf8'` konfigurieren |

## Sources

- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) — Migration-Pattern + `drizzle-kit` (HIGH confidence, official docs)
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) — v4.3.2, 1.43M weekly downloads (HIGH confidence)
- [@react-pdf/renderer Docs](https://react-pdf.org/) — Component API, `PDFDownloadLink` (HIGH confidence, official docs)
- [fast-csv npm](https://npmtrends.com/export-to-csv-vs-fast-csv-vs-json2csv) — 3.4M weekly downloads vs. Alternativen (HIGH confidence)
- [PapaParse npm](https://www.npmjs.com/package/papaparse) — 5.4.1, 2.8M weekly downloads (HIGH confidence)
- [Fastify Streaming Responses](https://mojoauth.com/parse-and-generate-formats/parse-and-generate-csv-with-fastify) — Streaming-Pattern (MEDIUM confidence)
- [PostgreSQL Temporal Tables](https://wiki.postgresql.org/wiki/Temporal_Extensions) — Price-History Pattern (MEDIUM confidence)

---

*Stack research für: v8.0 Inventur, Preis-History & Rechnungsexport*
*Researched: 2026-04-01*
