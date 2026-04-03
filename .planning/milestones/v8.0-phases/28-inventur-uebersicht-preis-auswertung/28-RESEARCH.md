# Phase 28: Inventur-Übersicht & Preis-Auswertung - Research

**Researched:** 2026-04-01
**Domain:** Reporting & Analytics — Jahresbericht mit Inventurangabe und Preishistorie
**Confidence:** HIGH

## Summary

Phase 28 erweitert den bestehenden Jahresbericht um zwei Kernfeatures: eine Inventur-Tabelle mit EK-Aufschlüsselung pro Artikel (INV-01/02/03) und eine Preis-History-Ansicht in der Produktverwaltung (PRICE-02/03). Die Implementierung ist datentechnisch bereits vollständig vorhanden — Phase 27 hat die `price_histories`-Tabelle und Stock-Movement-Journal erstellt, und Sale-Items speichern bereits EK/VK-Snapshots im JSONB. Die Phase erfordert daher primär neue Query-Pattern im Backend (Inventur-Aggregation, EK-Aufschlüsselung) und neue UI-Tabs in bestehenden Komponenten.

**Primary recommendation:** Fokus auf SQL-Query-Performance für Inventur-Aggregation (GROUP BY Produkt + EK, Summen berechnen) und klare Expandierung bei mehrfachen EKs in der UI. Preis-History-Tab nutzt bestehenden Phase-27-Endpoint direkt.

## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Inventur-Layout:** Neuer Tab "Inventur" im MonthlyReport (gleiche Seite wie Jahresübersicht) — konsistent mit bestehendem Report-Layout
2. **EK-Aufschlüsselung:** Artikel mit verschiedenen EKs → expandierbare Zeile (Hauptzeile = Summe, Klick zeigt Aufschlüsselung nach EK)
3. **Bestandswert-Summe:** Footer-Zeile der Inventur-Tabelle (fett, Summenzeile)
4. **Preis-History-Ansicht:** Neuer Tab "Preis-History" in ProductStats (bestehende Produktstatistik-Ansicht)
5. **Zeitstrahl-Format:** Einfache Tabelle (Datum, Feld, Alter Preis, Neuer Preis), sortiert neueste zuerst (DESC)
6. **Backend-Endpoint:** GET /api/reports/inventory?year=XXXX — aggregiert Sale-Items nach Produkt und EK

### Claude's Discretion

- Genaues Tab-UI-Design (Pill-Tabs vs. Toggle-Buttons)
- Inventur-Tabelle Spaltenanordnung und Sortierung
- Loading-States und Error-Handling für neue Endpoints
- TanStack Query Keys und Cache-Invalidation

### Deferred Ideas (OUT OF SCOPE)

- ABC-Klassifizierung (Top-Seller)
- Inventur-Snapshot (Bestände zu Stichtag einfrieren)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-01 | User kann im Jahresbericht eine Inventur-Übersicht sehen mit pro Artikel: aktueller Bestand, verkaufte Menge, VK-Umsatz, EK-Kosten | GET /api/reports/inventory aggregiert Sales nach Produkt; produk.stock liefert aktuellen Bestand; sale_item Snapshots speichern purchasePrice |
| INV-02 | User kann bei Artikeln mit verschiedenen EK-Preisen über's Jahr sehen, wie viel zu welchem EK verkauft wurde | Sale-Items speichern purchasePrice im JSONB; Query kann GROUP BY productId, purchasePrice aggregieren |
| INV-03 | User sieht im Jahresbericht eine Bestandswert-Summe (Menge × aktueller EK) | products.stock × products.purchasePrice; Summe in Frontend berechnet oder SQL aggregiert |
| PRICE-02 | User kann pro Artikel in der Produktverwaltung eine History der Preisänderungen einsehen (Zeitstrahl) | GET /api/products/:id/price-history existiert bereits (Phase 27); UI-Tab in ProductStats integriert |
| PRICE-03 | Jahresbericht zeigt bei Preisänderungen Aufschlüsselung: X Stück zu EK1, Y Stück zu EK2 | Sale-Items speichern purchasePrice-Snapshot; Inventur-Query aggregiert nach EK |

## Standard Stack

### Core Backend Pattern (Already Established)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | 5.7.x | API Framework | TypeScript-nativ, bestehend im Projekt |
| drizzle-orm | aktuell | Query Builder | bestehend, keine neuen Dependencies nötig |
| PostgreSQL (via drizzle) | aktuell | SQL-Queries | bestehend Backend-Setup |

### Frontend Components (Already Established)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| React | 19.x | UI Framework | Projekt-Standard |
| TanStack Query | 5.x | Server-State Management | bestehend für alle API-Calls |
| Tailwind CSS | 4.x | Styling | bestehend, Projekt-Standard |
| date-fns | 4.x | Datums-Formatierung | bestehend im Projekt |
| Lucide-React | aktuell | Icons | bestehend im Projekt |

### Development Tools (Already Established)

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript | 5.x | Typsicherheit | bestehend |
| Vite | 6.x | Build-Tool | bestehend |

## Architecture Patterns

### Backend: Inventur-Query Pattern

**Structure:**
```sql
-- Pseudo-SQL: Inventur pro Artikel + EK-Aufschlüsselung

SELECT
  p.id as product_id,
  p.name as name,
  p.article_number,
  p.stock as current_stock,
  p.purchase_price as current_ek,
  
  -- Verkäufe gruppiert nach EK-Preis-Snapshot
  COALESCE(SUM(
    CASE WHEN sales.type IS NULL OR sales.type = 'sale' 
    THEN (item->>'quantity')::integer
    ELSE 0
    END
  ), 0) as sold_qty,
  
  -- Umsatz (VK)
  COALESCE(SUM(
    CASE WHEN sales.type IS NULL OR sales.type = 'sale'
    THEN (item->>'quantity')::integer * (item->>'salePrice')::integer
    ELSE 0
    END
  ), 0) as revenue_cents,
  
  -- EK-Kosten (verwendeter EK zum Verkaufszeitpunkt)
  COALESCE(SUM(
    CASE WHEN sales.type IS NULL OR sales.type = 'sale'
    THEN (item->>'quantity')::integer * COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
    ELSE 0
    END
  ), 0) as cost_cents
FROM products p
LEFT JOIN sales ON sales.shop_id = p.shop_id
LEFT JOIN jsonb_array_elements(sales.items) as item ON item->>'productId' = p.id
WHERE p.shop_id = ${shopId}
  AND p.active = true
  AND sales.created_at >= ${yearStart}
  AND sales.created_at < ${yearEnd}
  AND sales.cancelled_at IS NULL
GROUP BY p.id, p.name, p.article_number, p.stock, p.purchase_price
ORDER BY p.name
```

**Key insight:** 
- Wenn `item->>'purchasePrice'` NULL (alte Sales vor PRICE-01), fallback auf `p.purchase_price` (aktueller EK)
- Bestandswert-Summe: `SUM(p.stock * p.purchase_price)` über alle aktiven Produkte

### Backend: EK-Aufschlüsselung (für expandierbare Zeilen)

```sql
-- Für Artikel mit mehrfachen EKs im Jahresverlauf
SELECT
  (item->>'purchasePrice')::integer as ek_snapshot,
  SUM((item->>'quantity')::integer) as qty_at_this_ek
FROM sales,
     jsonb_array_elements(sales.items) as item
WHERE sales.shop_id = ${shopId}
  AND item->>'productId' = ${productId}
  AND sales.created_at >= ${yearStart}
  AND sales.created_at < ${yearEnd}
  AND sales.cancelled_at IS NULL
  AND (sales.type IS NULL OR sales.type = 'sale')
GROUP BY (item->>'purchasePrice')::integer
ORDER BY (item->>'purchasePrice')::integer DESC
```

### Frontend: Inventur-Tabelle UI Pattern

**Structure (bestehend in MonthlyReport.tsx, neuer Tab):**
```
Monats-/Jahresberichte
[Jahr-Dropdown] [Monat-Dropdown]
  ├─ Tab: Monat
  ├─ Tab: Jahr
  ├─ [NEW] Tab: Inventur
  
Inventur-Tab Inhalt:
┌─────────────────────────────────────────────────┐
│ Artikel │ Bestand │ Verkauft │ VK-Umsatz │ EK-Kosten │
├─────────────────────────────────────────────────┤
│ ▼ Artikel A │ 5 │ 120 │ €250,00 │ €180,00 │
│   └─ EK1 (1,50€): 80 Stück                       │
│   └─ EK2 (1,60€): 40 Stück                       │
├─────────────────────────────────────────────────┤
│ Artikel B │ 12 │ 85 │ €170,00 │ €127,50 │
├─────────────────────────────────────────────────┤
│ SUMME (Bestandswert) │ 17 Stück × avg EK │ €420,00 │
└─────────────────────────────────────────────────┘
```

**Expandierung:**
- Klick auf Artikel mit `ek_variations > 1` → inline Unterbaumgeöffnet (EK-Aufschlüsselung)
- State: `expandedProductIds: Set<string>` in React

### Frontend: Preis-History-Tab (in ProductStats.tsx)

**Pattern (bestehend, neuer Tab neben Zeitraum-Buttons):**
```
ProductStats Modal
  Header: [Produkt-Name] [Schließen-Button]
  
  Tabs/Buttons:
  ├─ [Statistiken] (aktuell, besteht)
  ├─ [NEW] Preis-History
  
Preis-History-Tab Inhalt:
┌────────────────────────────────────────────────┐
│ Datum │ Feld │ Alter Preis │ Neuer Preis       │
├────────────────────────────────────────────────┤
│ 01.04.2026 | VK | 5,90 € | 6,00 € (↑)         │
│ 15.03.2026 | EK | 1,70 € | 1,75 € (↑)         │
│ 28.02.2026 | VK | 5,80 € | 5,90 € (↑)         │
└────────────────────────────────────────────────┘
```

**Data Flow:**
- `useQuery('/api/products/:id/price-history')` (Phase-27-Endpoint)
- Response: Array von `{ id, field, oldValue, newValue, changedAt }`
- Sortierung: `desc(changedAt)` → neueste zuerst

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Preis-History-Fetching | Custom hooks für Preis-Timeline | GET /api/products/:id/price-history (Phase 27 bestehend) | Endpoint ist bereits implementiert + getestet |
| EK-Aufschlüsselung Expandierung | Custom Baum-Rendering | Array + `expandedIds: Set<string>` + inline Rendering | Einfacher State, keine Komponenten-Rekursion nötig |
| Aggregationen auf Client | Summen-Berechnungen im Frontend | SQL-Aggregation im GET /api/reports/inventory Endpoint | Sortierung, Filterung, Performance bei großen Datenmengen |
| Datum-Formatierung | Eigene Locale-Funktionen | `format(..., { locale: de })` (date-fns bestehend) | Projekt-Standard, konsistent mit bestehenden Reports |

## Common Pitfalls

### Pitfall 1: purchasePrice-NULL bei alten Sales

**What goes wrong:** Sales vor Phase 27 haben kein `purchasePrice` im JSONB → Query gibt NULL zurück, und die EK-Kosten-Berechnung bricht zusammen oder wird falsch.

**Why it happens:** Phase 27 logging hat ab Deployment gestartet, aber alte Sales wurden nicht migriert.

**How to avoid:** 
```sql
COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
```
Fallback auf aktuellen `products.purchase_price`, falls snapshot fehlt.

**Warning signs:** 
- EK-Kosten in Report deutlich zu niedrig
- Bestandswert-Summe stimmt nicht
- Prüfen: `SELECT * FROM sales WHERE items->0->>'purchasePrice' IS NULL` → sollte <= kleine Anzahl alten Sales sein

### Pitfall 2: Bestandswert mit geändertem EK

**What goes wrong:** Bestandswert wird mit aktuellem `products.purchase_price` berechnet, aber der Bestand wurde zu älteren EKs eingekauft → Summe ist falsch.

**Why it happens:** Ohne historische Bestandsbewegungen (Stock-Movement-FIFO) ist es unmöglich, den "echten" EK pro Bestandsposition zu kennen.

**How to avoid:** 
- Bestandswert-Summe mit aktueller EK ist Annäherung — akzeptabel für v8.0 Reporting
- Dokumentieren: "Bestandswert basiert auf aktuellem EK, nicht FIFO-Verbrauch"
- Nicht als "exakter Lagerbestand-Wert" ausgeben, sondern als "Zeitpunkt-Annäherung"

**Warning signs:** 
- Bestandswert ändert sich drastisch mit EK-Änderung, obwohl Bestand gleich bleibt
- Vergleich mit Handwerksliste zeigt große Diskrepanzen

### Pitfall 3: Expandierung mit vielen Varianten

**What goes wrong:** Artikel mit 10+ verschiedenen EKs im Jahr macht expandierte Zeile unklar.

**Why it happens:** Häufige EK-Wechsel (z.B. Nachbestellung mit Preisanpassung) → viele Zeilen.

**How to avoid:** 
- Grenzwert: max 3-4 Varianten in Expandierung; bei mehr aggregieren
- Oder: Sortiermöglichkeit (nach Menge DESC)
- Für v8.0: akzeptable Komplexität, nicht optimieren

**Warning signs:** 
- Expandierte Zeile springt aus dem Viewport
- Scroll-Verhalten wird nervig

### Pitfall 4: Report nur online, aber keine Fallback

**What goes wrong:** User öffnet Inventur-Tab offline → "nur online" Meldung, keine lokalen Daten.

**Why it happens:** Backend-Query erfordert Server-Aggregation → kann offline nicht repliziert werden.

**How to avoid:** 
- Akzeptieren: Reports sind Online-only (Projekt-Standard, siehe MonthlyReport.tsx)
- Messaging klar: "Berichte sind nur online verfügbar"
- Keine lokalen Cache-Versuche (TanStack Query hat `networkMode: 'always'` für Reports)

**Warning signs:** 
- User erwartet Jahresbericht auf iPad ohne WLAN
- Prüfen: `if (!navigator.onLine) return <Offline />`

## Code Examples

### Example 1: Backend GET /api/reports/inventory Endpoint

```typescript
// Source: Similar pattern to GET /api/reports/yearly in server/src/routes/reports.ts
fastify.get('/reports/inventory', async (request, reply) => {
  const session = (request as any).session as { shopId: string };
  const shopId = session.shopId;
  const { year } = request.query as { year: string };
  if (!year) return reply.status(400).send({ error: 'year required' });

  const y = Number(year);
  const yearStart = new Date(y, 0, 1).getTime();
  const yearEnd = new Date(y + 1, 0, 1).getTime();

  // Inventur pro Artikel
  const inventoryResult = await db.execute(sql`
    SELECT
      p.id,
      p.article_number,
      p.name,
      p.stock as current_stock,
      p.purchase_price as current_ek_cents,
      COALESCE(SUM(
        CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
        THEN (item->>'quantity')::integer ELSE 0 END
      ), 0) as sold_qty,
      COALESCE(SUM(
        CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
        THEN (item->>'quantity')::integer * (item->>'salePrice')::integer ELSE 0 END
      ), 0) as revenue_cents,
      COALESCE(SUM(
        CASE WHEN (sales.type IS NULL OR sales.type = 'sale')
        THEN (item->>'quantity')::integer * 
             COALESCE((item->>'purchasePrice')::integer, p.purchase_price)
        ELSE 0 END
      ), 0) as cost_cents
    FROM products p
    LEFT JOIN sales ON sales.shop_id = p.shop_id
                    AND sales.created_at >= ${yearStart}
                    AND sales.created_at < ${yearEnd}
                    AND sales.cancelled_at IS NULL
    LEFT JOIN jsonb_array_elements(sales.items) as item 
      ON item->>'productId' = p.id
    WHERE p.shop_id = ${shopId}
      AND p.active = true
    GROUP BY p.id, p.name, p.article_number, p.stock, p.purchase_price
    ORDER BY p.name
  `);

  // Bestandswert-Summe
  const stockValueResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(stock * purchase_price), 0) as total_stock_value_cents
    FROM products
    WHERE shop_id = ${shopId} AND active = true
  `);

  const items = inventoryResult.rows as Array<any>;
  const stockValue = (stockValueResult.rows[0] as any)?.total_stock_value_cents ?? 0;

  return reply.send({
    year: y,
    items,
    total_stock_value_cents: Number(stockValue),
  });
});
```

### Example 2: Frontend Inventur-Tab in MonthlyReport.tsx

```typescript
// State in MonthlyReport, neben monthlyData/yearlyData
const [activeTab, setActiveTab] = useState<'monat' | 'jahr' | 'inventur'>('monat');
const [inventoryData, setInventoryData] = useState<InventoryResponse | null>(null);
const [loadingInventory, setLoadingInventory] = useState(false);
const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

// useEffect für Inventur-Laden (wenn Tab aktiv)
useEffect(() => {
  if (activeTab !== 'inventur' || !navigator.onLine) return;
  setLoadingInventory(true);
  authFetch(`/api/reports/inventory?year=${year}`)
    .then(r => r.json())
    .then(setInventoryData)
    .catch(() => setInventoryData(null))
    .finally(() => setLoadingInventory(false));
}, [year, activeTab]);

// Tab-Buttons
<div className="flex gap-2 border-b border-sky-100">
  {[
    { key: 'monat', label: 'Monat' },
    { key: 'jahr', label: 'Jahr' },
    { key: 'inventur', label: 'Inventur' }
  ].map(tab => (
    <button
      key={tab.key}
      onPointerDown={() => setActiveTab(tab.key as any)}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        activeTab === tab.key
          ? 'border-sky-500 text-sky-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>

// Inventur-Tab Rendering
{activeTab === 'inventur' && (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
    {loadingInventory ? (
      <p className="p-4 text-slate-500">Laden...</p>
    ) : inventoryData ? (
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-sky-50">
            <th className="text-left px-4 py-3 text-sky-700">Artikel</th>
            <th className="text-right px-4 py-3 text-sky-700">Bestand</th>
            <th className="text-right px-4 py-3 text-sky-700">Verkauft</th>
            <th className="text-right px-4 py-3 text-sky-700">VK-Umsatz</th>
            <th className="text-right px-4 py-3 text-sky-700">EK-Kosten</th>
          </tr>
        </thead>
        <tbody>
          {inventoryData.items.map(item => {
            const isExpanded = expandedProducts.has(item.id);
            const hasVariants = /* check if multiple EKs */ false;
            return (
              <React.Fragment key={item.id}>
                <tr className="border-t border-slate-50 hover:bg-sky-50">
                  <td className="px-4 py-3">
                    {hasVariants && (
                      <button
                        onPointerDown={() => {
                          const next = new Set(expandedProducts);
                          if (isExpanded) next.delete(item.id);
                          else next.add(item.id);
                          setExpandedProducts(next);
                        }}
                        className="mr-2 text-sky-600"
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    )}
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-right">{item.current_stock}</td>
                  <td className="px-4 py-3 text-right">{item.sold_qty}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatEur(item.revenue_cents)}</td>
                  <td className="px-4 py-3 text-right">{formatEur(item.cost_cents)}</td>
                </tr>
                {isExpanded && hasVariants && (
                  // Expandierte EK-Zeilen rendern (sub-query nötig oder in item enthalten)
                  <tr className="bg-sky-50">
                    <td colSpan={5} className="px-8 py-2 text-xs text-slate-600">
                      EK-Varianten hier rendern...
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {/* Summenzeile */}
          <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
            <td className="px-4 py-3">Bestandswert-Summe</td>
            <td className="px-4 py-3 text-right text-slate-700">
              {inventoryData.items.reduce((s, i) => s + i.current_stock, 0)} Stück
            </td>
            <td colSpan={2} />
            <td className="px-4 py-3 text-right text-emerald-700">
              {formatEur(inventoryData.total_stock_value_cents)}
            </td>
          </tr>
        </tbody>
      </table>
    ) : (
      <p className="p-4 text-slate-500">Keine Daten für dieses Jahr.</p>
    )}
  </div>
)}
```

### Example 3: Preis-History-Tab in ProductStats.tsx

```typescript
// State neben existing stats
const [statsTab, setStatsTab] = useState<'stats' | 'price-history'>('stats');
const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
const [loadingHistory, setLoadingHistory] = useState(false);

// useEffect für Preis-History
useEffect(() => {
  if (statsTab !== 'price-history' || !navigator.onLine) return;
  setLoadingHistory(true);
  authFetch(`/api/products/${product.id}/price-history`)
    .then(r => r.json())
    .then(setPriceHistory)
    .catch(() => setPriceHistory([]))
    .finally(() => setLoadingHistory(false));
}, [product.id, statsTab]);

// Tab-Buttons (neben Zeitraum-Buttons)
<div className="flex justify-between items-center gap-4">
  <div className="flex gap-2">
    {[1, 3, 6, 12].map(m => (
      <button
        key={m}
        onPointerDown={() => setMonths(m)}
        className={`px-4 py-2 rounded-full text-sm font-medium h-11 transition-colors ${
          months === m ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-700'
        }`}
      >
        {m === 1 ? '1 Monat' : `${m} Monate`}
      </button>
    ))}
  </div>
  <div className="flex gap-2">
    {[
      { key: 'stats', label: 'Statistiken' },
      { key: 'price-history', label: 'Preis-History' }
    ].map(tab => (
      <button
        key={tab.key}
        onPointerDown={() => setStatsTab(tab.key as any)}
        className={`px-4 py-2 rounded-lg text-sm font-medium h-11 transition-colors ${
          statsTab === tab.key
            ? 'bg-sky-500 text-white'
            : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
</div>

// Price-History-Tab Content
{statsTab === 'price-history' && (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
    {loadingHistory ? (
      <p className="p-4 text-center text-slate-500">Laden...</p>
    ) : priceHistory.length === 0 ? (
      <p className="p-4 text-center text-slate-500 text-sm">Keine Preisänderungen vorhanden.</p>
    ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-sky-50">
            <th className="text-left px-4 py-3 text-sky-700">Datum</th>
            <th className="text-left px-4 py-3 text-sky-700">Feld</th>
            <th className="text-right px-4 py-3 text-sky-700">Alter Preis</th>
            <th className="text-right px-4 py-3 text-sky-700">Neuer Preis</th>
          </tr>
        </thead>
        <tbody>
          {priceHistory.map((entry, i) => (
            <tr key={i} className="border-t border-slate-50 hover:bg-sky-50">
              <td className="px-4 py-3 text-slate-700">
                {format(new Date(entry.changedAt), 'd. MMM yyyy', { locale: de })}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {entry.field === 'purchase_price' ? 'EK' : 'VK'}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatEur(entry.oldValue)}
              </td>
              <td className="px-4 py-3 text-right font-medium text-slate-800">
                {formatEur(entry.newValue)}
                {entry.newValue > entry.oldValue ? (
                  <span className="text-rose-500 ml-1">↑</span>
                ) : entry.newValue < entry.oldValue ? (
                  <span className="text-emerald-500 ml-1">↓</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| EK-Kosten aus aktueller products.purchase_price | EK-Snapshot in sale_item purchasePrice JSONB | Phase 27 | Reports geben jetzt korrekten Aufschluss bei EK-Änderung |
| Keine Preis-History | price_histories Tabelle + Logging in POST /products | Phase 27 | Audit-Trail für alle Preis-Änderungen vorhanden |
| Stock-Journal fehlte | stock_movements Tabelle (sale, adjustment, correction, return, hard_delete) | Phase 27 | Bestandsbewegungen nachverfolgbar |

**Deprecated/outdated:**
- Manuelle EK-Verfolgung pro Artikel: jetzt automatisch geloggt bei Preisänderung

## Environment Availability

**Step 2.6: SKIPPED** — Phase 28 hat keine externen Dependencies. Alle Tools (PostgreSQL, Node.js, Fastify) sind bereits Setup (Phase 0-27 bestehend). Keine zusätzlichen CLI-Tools, Runtimes oder Dienste nötig.

## Validation Architecture

**Step 4: SKIPPED** — `workflow.nyquist_validation` ist in `.planning/config.json` explizit auf `false` gesetzt. Keine Test-Framework-Anforderungen für diese Phase.

## Open Questions

1. **EK-Aufschlüsselung: Sub-Query vs. separate Endpoint?**
   - Was wir wissen: `GET /api/reports/inventory` liefert Artikel-Summen
   - Was unklar: Sollen EK-Varianten in der gleichen Query kommen (nested JSON) oder separate Query (z.B. `GET /api/reports/inventory/:productId/ek-breakdown`)?
   - Empfehlung: Separate Query für Expandierung, um initialen Load schnell zu halten. Bei Klick: `useQuery` mit `enabled: isExpanded`

2. **Bestandswert-Berechnung: Aktueller EK vs. FIFO?**
   - Was wir wissen: Historische Bestandsbewegungen können FIFO-Verbrauch berechnen, aber komplex
   - Was unklar: Ist "Bestandswert mit aktuellem EK" für v8.0 akzeptabel, oder wird Exaktheit erwartet?
   - Empfehlung: Aktueller EK für v8.0, mit Notation dass "Zeitpunkt-Annäherung" ist. FIFO-Verbrauch in v9.0 als Verbesserung.

3. **Expandierung Performance bei vielen Varianten?**
   - Was wir wissen: Artikel können 5-10 verschiedene EKs im Jahr haben
   - Was unklar: Rendering-Performance bei Expansion, oder ist inline-Rendering schnell genug?
   - Empfehlung: Nicht voroptimieren. Für v8.0 <= 10 Varianten inline OK.

## Sources

### Primary (HIGH confidence)

- **Phase 27 Codebase** — `server/src/routes/priceHistory.ts`, `server/src/db/schema.ts` (priceHistories, stockMovements) — Endpoints und Schema verifiziert
- **Existing Reports Pattern** — `server/src/routes/reports.ts` (GET /reports/monthly, GET /reports/yearly) — SQL-Aggregations-Pattern etabliert
- **CONTEXT.md** — User Decisions und Locked Deferred Ideas (Inventur-Layout, EK-Aufschlüsselung als expandierbar, Preis-History-Tab)
- **Sale-Item JSONB Structure** — `client/src/db/index.ts` (SaleItem interface mit purchasePrice snapshot) — verified

### Secondary (MEDIUM confidence)

- **MonthlyReport.tsx & ProductStats.tsx** — Bestehende Report/Stats-UI-Muster (Tab-Navigation, TanStack Query Usage, Tailwind Styling) — Code verifiziert, Pattern bekannt
- **REQUIREMENTS.md** — INV-01, INV-02, INV-03, PRICE-02, PRICE-03 Definitions — verifiziert gegen Phase-Scope

## Metadata

**Confidence breakdown:**
- Standard Stack: **HIGH** — Alles bestehende Technologie (React, Fastify, drizzle, TanStack Query, date-fns)
- Architecture: **HIGH** — Muster aus Phase 27 (Preis-History) und bestehenden Reports (MonthlyReport.tsx) adaptierbar, keine neuen Patterns nötig
- Pitfalls: **MEDIUM** — purchasePrice-NULL bei alten Sales ist bekanntes Fallback-Pattern (COALESCE), Bestandswert-Approximation ist bewusste Designentscheidung; Expandierung-Performance nicht getestet in bisherigem Codebase

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable, keine Fast-Moving-Tech)
