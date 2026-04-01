# v8.0 Integration Checklist: Stack + Phases

**Purpose:** Vor jeder Phase checken: Was muss installiert, konfiguriert, migriert sein?

---

## Phase 27: Database Schema & API Backend

### Pre-Phase Prep
- [ ] Read STACK.md → `productPriceHistory`, `stockTransactions` schema
- [ ] Checkout latest `drizzle-kit` version: `npm install -D drizzle-kit@latest`
- [ ] Verify PostgreSQL 16 connection in Docker-Compose (existing)

### Schema Phase
- [ ] Add `productPriceHistory` table to `server/db/schema.ts`
  - Columns: `id`, `productId` (FK), `ekPriceCents`, `vkPriceCents`, `createdAt`, `shopId`
  - Index: `(product_id, created_at)` for history queries
- [ ] Add `stockTransactions` table (optional but recommended)
  - Columns: `id`, `productId` (FK), `quantityDelta`, `type` ('SALE'|'RETURN'|'RESTOCK'), `saleId` (FK, nullable), `createdAt`, `shopId`
- [ ] Drizzle migrations:
  ```bash
  drizzle-kit generate postgresql --name add_price_history_stock_tracking
  drizzle-kit migrate postgresql
  ```
- [ ] Verify schema in PostgreSQL:
  ```sql
  SELECT * FROM __drizzle_migrations ORDER BY id DESC LIMIT 1;
  SELECT * FROM product_price_history LIMIT 1; -- Should be empty
  SELECT * FROM stock_transactions LIMIT 1; -- Should be empty
  ```

### Backend Routes Phase
- [ ] Modify `server/routes/products.ts`:
  - In `PATCH /api/products/:id`: After product update, insert price-history row if EK/VK changed
  ```typescript
  // Pattern:
  if (oldProduct.ekPriceCents !== newEk || oldProduct.vkPriceCents !== newVk) {
    await db.insert(productPriceHistory).values({ productId: id, ekPriceCents: newEk, vkPriceCents: newVk, shopId });
  }
  ```
- [ ] Add `server/routes/reports.ts`:
  - `GET /api/reports/inventory?month=202603` — Returns aggregated inventory data
  - SQL query: JOIN products + sales + product_price_history, aggregate by product
  - Response: `[{ id, name, currentStock, soldThisMonth, ekCostTotal, vkRevenueTotal, ... }]`
- [ ] TanStack Query backend: implement `/api/reports/inventory` aggregation logic

### Testing Phase
- [ ] Unit test: Price-history insert on product update
- [ ] Unit test: `/api/reports/inventory` aggregation (edge case: multiple price changes)
- [ ] E2E test: Admin updates product price → price-history logged → report reflects it
- [ ] Deliverable: CSV `/api/reports/inventory-csv` functional (without UI yet)

### Gotchas
- **Index Performance:** Without `product_price_history(product_id)` index, aggregation queries will be slow
- **Compound Keys:** Ensure `(shopId, productId)` isolation in queries (existing pattern from v5.0+)
- **Test with Umlauts:** Insert product "Schökolade" → history row should store UTF-8 correctly

---

## Phase 28: CSV Export & React PDF

### Pre-Phase Prep
- [ ] Phase 27 merged + deployed to staging
- [ ] Install new packages:
  ```bash
  npm install @react-pdf/renderer@4.3.2
  npm install fast-csv@5.0.1
  ```
- [ ] Verify package.json locked versions

### CSV Export Phase
- [ ] Update `server/routes/reports.ts`:
  - Add `GET /api/reports/inventory-csv` endpoint
  - Use `fast-csv` formatter with streaming:
  ```typescript
  const csvStream = format({ headers: true, encoding: 'utf8' })
    .pipe(reply.raw);
  inventoryData.forEach(row => csvStream.write(row));
  csvStream.end();
  ```
  - Test with 10K+ rows → verify Memory stays <50MB
  - **Headers:** name, sku, stock, ekPrice, vkPrice, soldMonth, costTotal, revenueTotal
  - **Encoding:** Must be UTF-8 for Umlaute (fast-csv default)

### PDF Frontend Phase
- [ ] Create `client/pages/InventoryReport.tsx`:
  - Component: `<InventoryReportPDF>` using @react-pdf/renderer
  - Structure: Document → Page(s) → Text/View for rows
  - Max 500 rows per page (pagination)
  - Use `PDFDownloadLink` button component
- [ ] Integrate with TanStack Query:
  - Fetch `/api/reports/inventory` data
  - Pass to `<InventoryReportPDF>` as props
- [ ] Test scenarios:
  - 100 rows → PDF size < 500KB
  - 1000 rows → PDF size < 2MB (if acceptable)
  - 5000 rows → Warn user, offer CSV instead or paginated PDFs
- [ ] Add "Download CSV" button next to "Download PDF" in Admin

### Frontend Routes
- [ ] Add route `/admin/reports/inventory` (new page)
  - Month/year picker
  - "Download as PDF" button → `<PDFDownloadLink>`
  - "Download as CSV" button → link to `/api/reports/inventory-csv`
- [ ] Link from Admin dashboard

### Testing Phase
- [ ] E2E: Click "Download PDF" → file appears in Downloads folder
- [ ] E2E: Click "Download CSV" → file opens in Excel (if available)
- [ ] Edge case: Umlaute in product names ("Schökolade", "Größe") → verify in PDF + CSV
- [ ] Edge case: Very long product names → PDF wrapping works
- [ ] Performance: Generate 1000-row PDF → measure time

### Gotchas
- **Memory:** @react-pdf/renderer buffers DOM, >5000 rows may OOM. Recommend pagination.
- **CSV Encoding:** Always UTF-8, else Excel shows ??? for Umlaute
- **PDF Styling:** Default @react-pdf/renderer fonts are basic. Add custom fonts if fancy styling later.
- **Browser Support:** PDFDownloadLink requires JavaScript enabled (always true in this context)

---

## Phase 29: Price-History UI & Stock-Transactions (Optional)

### Pre-Phase Prep (if doing)
- [ ] Phase 28 merged + working
- [ ] Recharts already in stack (v3.0+), no new install needed

### Price-History UI
- [ ] Create `client/pages/PriceHistory.tsx`:
  - Select product from dropdown
  - Display timeline of EK + VK price changes
  - Chart: Recharts line chart with two series (EK in blue, VK in red)
  - Table below chart with dates + prices
- [ ] TanStack Query hook:
  - `GET /api/products/:id/price-history` endpoint (new)
  - Returns array of `{ createdAt, ekPriceCents, vkPriceCents }`
- [ ] Link from Product-Detail page → "Price History" tab

### Stock-Transactions (optional, skip if low priority)
- [ ] If doing: create `/admin/reports/stock-movements`
  - Select product → show all stock transactions (SALE/RETURN/RESTOCK)
  - Table columns: Date, Type, Quantity, Sale ID (link to sale), Notes
  - TanStack Query: `GET /api/products/:id/stock-transactions`

### Testing Phase
- [ ] E2E: Admin changes product price 3 times → price-history shows 3 entries
- [ ] E2E: Chart renders correctly with date range
- [ ] Edge case: Product with no price changes → "No history" message

### Gotchas
- **Index Performance:** `stock_transactions(product_id, created_at)` index critical
- **Chart Legend:** Ensure EK vs VK clearly labeled for non-technical users
- **Data Freshness:** Cache price-history for 5 mins (TanStack Query staleTime), dont hit DB every click

---

## Post-Phase 29: v8.0 Complete

### Checklist
- [ ] All 3 phases merged to main
- [ ] CI/CD: GitHub Actions builds + deploys docker image
- [ ] Staging: All features tested end-to-end
- [ ] Production: Manual smoke test
- [ ] Documentation: Admin guide updated with "Generate Reports" section
- [ ] Monitoring: No error spikes in Sentry

### Deliverables
- [ ] Feature: Inventur-Bericht (monatlich) mit Beständen + Kosten + Umsatz
- [ ] Feature: CSV-Export für Kirchenkreis-Buchführung
- [ ] Feature: PDF-Reports zum Downloaden
- [ ] Feature: Preis-History pro Artikel (optional)
- [ ] Docs: Admin-Guide für Report-Generierung

---

## Stack Verification Commands

```bash
# Verify new packages
npm list @react-pdf/renderer fast-csv papaparse
# Expected: @react-pdf/renderer@4.3.2, fast-csv@5.0.1, papaparse@5.4.1 (if added)

# Verify Drizzle migrations
npm run db:studio  # Opens Drizzle Studio (if drizzle-kit configured)
# Or:
psql -c "SELECT * FROM __drizzle_migrations;"

# Verify API routes
curl http://localhost:3000/api/reports/inventory | jq .
curl http://localhost:3000/api/reports/inventory-csv | head -5
```

---

## Rollback Plan

| Phase | If Failed | Rollback |
|-------|-----------|----------|
| 27 | Schema migration errors | `drizzle-kit migrate --force rollback` or manual SQL DELETE from __drizzle_migrations |
| 28 | CSV/PDF routes fail | Remove npm packages, revert server routes, re-deploy |
| 29 | UI breaks | Revert client routes, re-deploy |

**Staging first:** Always test phases in staging Docker container before main deployment.

---

*Integration Checklist für: v8.0 Inventur, Preis-History & Rechnungsexport*
*Updated: 2026-04-01*
