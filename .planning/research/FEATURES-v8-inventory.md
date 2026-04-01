# Feature Research: v8.0 Inventur, Preis-History & Rechnungsexport

**Projekt:** Fairstand Kassensystem (v8.0 Milestone)  
**Recherchiert:** 2026-04-01  
**Kontext:** Erweiterung existierender Kassenlogik um Nachverfolgbarkeit, Audit-Trail, und Export-Funktionen für Jahresabschluss

---

## Executive Summary

POS-Systeme in der Einzelhandelspraxis implementieren Inventurberichte, Preis-Historien, und Rechnungsexporte als Standard-Features:

1. **Inventur-Übersicht:** Artikel-für-Artikel-Bestandswert für Jahresabschluss. Berechnet aus: aktueller Bestand × historischem EK-Preis zum Verkaufszeitpunkt, nicht aktuellem Preis.
2. **Preis-History:** Separaten Audit-Log für jede EK/VK-Änderung mit Timestamp. Ermöglicht Nachverfolgbarkeit für Finanzamt und Revision.
3. **Stock-Movement-Log:** Vollständiger Audit Trail: wann was verkauft/nachgebucht/kassiert wurde — Basis für Inventurplausibilität.
4. **Rechnungsexport:** CSV/PDF der Verkaufsdaten mit EK-Snapshot-Preisen. Für Kirchenkreis-Berichte und Buchhalter-Handover.

**Neu in Fairstand:** v6.0 eliminierte Offline-Sync und Dexie.js. v8.0 muss diese neuen Features auf rein Online-Architektur aufbauen (PostgreSQL-Queries, Trigger, TanStack Query Caching).

---

## Table Stakes

**Features, die Jahresabschluss ohne Lücken braucht:**

| Feature | Warum erwartet | Komplexität | Abhängigkeiten |
|---------|----------------|-------------|-----------------|
| **Inventur-Übersicht im Jahresbericht** | Kirchengemeinde muss Bestandswert zum 31.12. nachweisen (Bilanzposition). Ohne Inventur keine Jahresabschluss-Glaubwürdigkeit. | Mittel (2–3 Tage) | Bestehende Sales-Tabelle, neue Price-History-Tabelle |
| **Preis-History-Tabelle (EK/VK-Audit-Log)** | Kontrolliert: Preise können nicht nachträglich "korrigiert" werden ohne Spur. Finanzamt/Revision kann Preis-Änderungen nachvollziehen. | Niedrig (1 Tag DDL + Trigger) | PostgreSQL TRIGGER, bestehende products-Tabelle |
| **Stock-Movement-Log** | Inventur-Diskrepanzen: "System sagt 10, Zählung sagt 8" — woher fehlten 2? Log zeigt: verkauft 1, Verderb 1. | Mittel (2 Tage mit Refactoring) | Trigger bei sales.INSERT, neue stock_movements-Tabelle |
| **Rechnungsexport (CSV + PDF)** | Finanzamt, Kirchenkreis, Buchhalter brauchen exportierbare Belege. Kein manuelles Ablesen nötig. | Niedrig (1 Tag CSV, 2 Tage PDF) | Bestehende Sales-Daten + optional Price-History |

---

## Differentiators

**Features, die Betriebssicherheit und Transparenz erweitern:**

| Feature | Nutzen | Komplexität | Anmerkungen |
|---------|--------|-------------|-----------|
| **Echtzeit-Preiswarnung beim Rechnungsimport** | PDF-Rechnung hat neuen EK-Preis → System flaggt vor Import "Preis geändert zu X€". | Mittel (1–2 Tage) | Nutzt bestehende PDF-Parser + neue Price-History. Verhindert Pricing-Fehler. |
| **Zyklische Inventur (ABC-Klassifizierung)** | Monatlich nur "A-Artikel" (Umsatz-Spitzenreiter) zählen, B-Artikel quartalsweise, C-Artikel 1x/Jahr. Spart Zeit, erhöht Sicherheit. | Niedrig (1 Tag SQL + UI) | Berechnung basierend auf Sales-Aggregate. Checklisten im Dashboard. |
| **Lagerdauer-Analyse** | "Bio-Kaffee: 6 Monate nicht verkauft" → Reorder-Planung. Identifiziert Ladenhüter. | Niedrig (<1 Tag) | `CASE WHEN last_sale_date IS NULL THEN ...` in Inventory-Report-Query. |
| **Verkauf-zu-Bestand-Ratio** | "Von 50 gekauften, 43 verkauft = 86% Nutzung" → Effizienzkontrolle. | Niedrig (<1 Tag) | Einfache Division in SQL oder Frontend. |

---

## Anti-Features (Bewusst nicht bauen)

| Anti-Feature | Warum zu komplex | Alternative |
|--------------|-----------------|-------------|
| **Automatische Preisanpassung (Demand-based)** | Erfordert Verkaufs-Saisonalität, ML. Für 30-50 Artikel unnötig. | Manueller Preis-Adjustment mit expliziter Dokumentation (Grund + Datum). |
| **Echtzeit-Prognose: "Wann läuft uns Kaffee aus?"** | Time-series-Analyse, Trend-Extrapolation. Für gelegentliche Kirchen-Verkäufe Overkill. | Einfache Regel: "Wenn Wochenverkauf > 5 Stück, Mindestbestand erhöhen." |
| **Multi-Lager-Transfers** | Nur eine Kirche. Nicht relevant. | Entnahmen-Buchungen wenn Ware anderswo hingeht. |
| **Kundenspezifische Preise / Rabatt-Staffeln** | Laufkundschaft, keine Verträge. | Globaler "Aktion"-Rabatt wenn nötig. |

---

## Feature Dependencies

```
┌─────────────────────────────────────────────┐
│ PriceHistory-Tabelle                        │
│ (speichert jede EK/VK-Änderung + Trigger)  │
└────────────┬────────────────────────────────┘
             │
             ├──> [Inventur-Report]
             │    (nutzt historische EK-Preise)
             │
             └──> [Echtzeit-Preiswarnung]
                  (beim PDF-Import)

┌──────────────────────────────┐
│ StockMovement-Tabelle        │
│ (SALE, ADDITION, ADJUSTMENT) │
└────────┬─────────────────────┘
         │
         └──> [Bestandsverlauf-Report]
              (audit trail pro Artikel)

┌──────────────────────┐
│ Sales-Snapshots      │
│ (ek_snapshot, vk_...) │
└────────┬─────────────┘
         │
         ├──> [Inventur-Report]
         │    (korrekter EK-Kosten)
         │
         └──> [Rechnungsexport]
              (authentische Preise zum VK-Zeit)
```

**Phasierung für v8.0:**
1. **Phase 1:** PriceHistory-DDL + Trigger (1 Tag)
2. **Phase 2:** StockMovement-Tabelle setup (1 Tag)
3. **Phase 3:** Inventur-Report-Query + Dashboard-UI (2 Tage)
4. **Phase 4:** Rechnungsexport (CSV/PDF) (1–2 Tage)
5. **Phase 5:** Zyklische Inventur UI (optional, Phase 5 oder v8.1)

---

## Expected Behavior aus POS-Industrie

### Pattern 1: Inventur-Report

**Input:**
- Alle Artikel aus products-Tabelle
- Alle Verkäufe 2026 aus sales-Tabelle
- Preis-Snapshots aus sales.ek_snapshot + price_history

**Output (Tabellenformat):**

```
Artikel               | Bestand | Qty Verkauft | VK-Umsatz | EK-Kosten | Gewinn  | Marge
─────────────────────┼─────────┼──────────────┼───────────┼───────────┼─────────┼──────
Bio-Kaffee 250g      |    8    |     87       |  261.00€  |  43.50€   | 217.50€ | 83.3%
Faire Schokolade 100g|   12    |     156      |  390.00€  |  78.00€   | 312.00€ | 80.0%
Kerzen Fair Trade    |    5    |     42       |  126.00€  |  63.00€   |  63.00€ | 50.0%
```

**Berechnung pro Artikel:**
```sql
SELECT
  p.id,
  p.name,
  p.stock as bestand,
  COUNT(s.id) as qty_verkauft,
  SUM(s.total) as vk_umsatz,
  SUM(s.ek_snapshot_cents) / 100.0 as ek_kosten,
  (SUM(s.total) - (SUM(s.ek_snapshot_cents) / 100.0)) as gewinn,
  ROUND(((SUM(s.total) - (SUM(s.ek_snapshot_cents) / 100.0)) / SUM(s.total) * 100)::NUMERIC, 1)
    as marge_prozent
FROM products p
LEFT JOIN sales s ON p.id = s.product_id AND s.cancelled_at IS NULL
WHERE p.shop_id = $1 AND YEAR(s.date) = 2026
GROUP BY p.id, p.name, p.stock
ORDER BY vk_umsatz DESC;
```

### Pattern 2: Preis-History-Tabelle (DDL + Trigger)

**Schema:**
```sql
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  
  -- alte und neue Preise in Cent
  old_ek_cents INTEGER,
  new_ek_cents INTEGER,
  old_vk_cents INTEGER,
  new_vk_cents INTEGER,
  
  changed_at TIMESTAMP DEFAULT NOW(),
  changed_by_user TEXT,      -- UUID oder E-Mail aus Session
  reason TEXT,               -- "Neue Rechnung Süd-Nord-Kontor", "Jahresanfang", etc.
  
  UNIQUE(product_id, shop_id, changed_at),
  INDEX idx_product_date (product_id, changed_at),
  INDEX idx_shop_date (shop_id, changed_at)
);

-- Trigger: Bei UPDATE auf products
CREATE TRIGGER price_change_audit
AFTER UPDATE OF ek_cents, vk_cents ON products
FOR EACH ROW
WHEN (
  OLD.ek_cents != NEW.ek_cents 
  OR OLD.vk_cents != NEW.vk_cents
)
BEGIN
  INSERT INTO price_history (
    product_id, shop_id,
    old_ek_cents, new_ek_cents,
    old_vk_cents, new_vk_cents,
    changed_at, changed_by_user, reason
  ) VALUES (
    NEW.id, NEW.shop_id,
    OLD.ek_cents, NEW.ek_cents,
    OLD.vk_cents, NEW.vk_cents,
    NOW(), CURRENT_USER, NULL -- reason wird im App-Code gesetzt
  );
END;
```

**Beispiel-Eintrag:**
```
product_id: 42 (Bio-Kaffee 250g)
old_ek_cents: 200 (2.00€)
new_ek_cents: 300 (3.00€)
old_vk_cents: 400 (4.00€)
new_vk_cents: 550 (5.50€)
changed_at: 2026-03-15 09:00:00
changed_by_user: "swantje@fairstand.godsapp.de"
reason: "Neue Lieferung Süd-Nord-Kontor — EK erhöht"
```

**Audit-Query (vollständige Preis-Historie eines Artikels):**
```sql
SELECT
  p.name,
  ph.old_ek_cents / 100.0 as "alter EK",
  ph.new_ek_cents / 100.0 as "neuer EK",
  ph.old_vk_cents / 100.0 as "alter VK",
  ph.new_vk_cents / 100.0 as "neuer VK",
  ph.changed_at,
  ph.changed_by_user,
  ph.reason
FROM price_history ph
JOIN products p ON ph.product_id = p.id
WHERE ph.product_id = $1
ORDER BY ph.changed_at DESC;
```

### Pattern 3: Stock-Movement-Log (Audit Trail)

**Schema:**
```sql
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL,
  
  movement_type TEXT CHECK (movement_type IN ('SALE', 'ADDITION', 'ADJUSTMENT', 'WITHDRAWAL')),
  quantity INTEGER NOT NULL,    -- kann negativ sein
  reference_id INTEGER,         -- FK zu sales.id oder stock_addition.id
  
  recorded_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,                   -- "Verderb erkannt", "Storno Verkauf #1234"
  
  INDEX idx_product_date (product_id, recorded_at),
  INDEX idx_movement_type (movement_type, recorded_at)
);

-- Trigger: Bei INSERT in sales (verkauft)
CREATE TRIGGER log_sale_stock_movement
AFTER INSERT ON sales
FOR EACH ROW
BEGIN
  INSERT INTO stock_movements (
    product_id, shop_id, movement_type, quantity, reference_id, notes
  ) VALUES (
    NEW.product_id, NEW.shop_id, 'SALE', -1, NEW.id,
    'Verkauf Transaktion #' || NEW.id
  );
  
  UPDATE products SET stock = stock - 1 WHERE id = NEW.product_id;
END;

-- Trigger: Bei INSERT in stock_additions (Rechnungsimport)
CREATE TRIGGER log_addition_stock_movement
AFTER INSERT ON stock_additions
FOR EACH ROW
BEGIN
  INSERT INTO stock_movements (
    product_id, shop_id, movement_type, quantity, reference_id, notes
  ) VALUES (
    NEW.product_id, NEW.shop_id, 'ADDITION', NEW.quantity, NEW.id,
    'Rechnung #' || NEW.receipt_id
  );
  
  UPDATE products SET stock = stock + NEW.quantity WHERE id = NEW.product_id;
END;
```

**Bestandsverlauf-Query (Audit Trail für ein Artikel):**
```sql
SELECT
  p.name,
  sm.movement_type,
  sm.quantity,
  sm.recorded_at,
  sm.notes,
  (SELECT COALESCE(SUM(quantity), 0)
   FROM stock_movements sm2
   WHERE sm2.product_id = p.id
     AND sm2.recorded_at <= sm.recorded_at
  ) as cumulative_stock
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
WHERE sm.product_id = $1
ORDER BY sm.recorded_at DESC;
```

### Pattern 4: Rechnungsexport

**CSV-Format (für Tagesabschluss oder Monatsreport):**

```csv
Datum,Uhrzeit,Artikel,Menge,VK-Einzelpreis,VK-Gesamt,EK-Einzelpreis,EK-Gesamt,Typ,Storniert
2026-04-01,14:23:15,Bio-Kaffee 250g,2,5.50,11.00,3.00,6.00,SALE,Nein
2026-04-01,14:25:02,Faire Schokolade 100g,1,2.50,2.50,1.20,1.20,SALE,Nein
2026-04-01,14:26:45,Kerzen Fair Trade,3,3.00,9.00,1.50,4.50,SALE,Nein
2026-04-01,15:10:33,Bio-Kaffee 250g,1,5.50,5.50,3.00,3.00,WITHDRAWAL,Nein
```

**PDF-Format (Kassenabschluss-Quittung zum Ausdrucken):**

```
════════════════════════════════════════════════
      FAIRSTAND KIRCHENGEMEINDE ST. SECUNDUS
        Kassenbericht — 01. April 2026
════════════════════════════════════════════════

Zeitraum: 01.04.2026 09:00–17:00 Uhr
Laden: Master Shop

Artikel                    Menge    VK-Total    EK-Total    Gewinn
─────────────────────────────────────────────────────────────────
Bio-Kaffee 250g               3      16.50€       9.00€       7.50€
Faire Schokolade 100g         1       2.50€       1.20€       1.30€
Kerzen Fair Trade             3       9.00€       4.50€       4.50€

SUMMEN (ohne Spenden)
Verkauf-Umsatz:                          27.50€
EK-Kosten:                               14.70€
Rohgewinn:                               12.80€
Rohgewinn-Marge:                        46.5%

SPENDEN (separat erfasst)
Spenden-Betrag:                           5.20€

KASSENSTAND
Eröffnungsbestand:                       50.00€
+ Verkäufe:                              27.50€
+ Spenden:                                5.20€
= Sollbestand:                           82.70€

Bestätigt durch Kassierer: _______________
Datum: 01.04.2026
```

**Implementierung (Backend):**

```typescript
// POST /api/reports/sales-export
export async function exportSalesReport(
  shopId: string,
  startDate: Date,
  endDate: Date,
  format: 'csv' | 'pdf'
): Promise<Buffer> {
  const sales = await db
    .select({
      id: sales.id,
      date: sales.date,
      product_id: sales.product_id,
      product_name: products.name,
      total: sales.total,
      ek_snapshot: sales.ek_snapshot_cents,
      vk_snapshot: sales.vk_snapshot_cents,
      type: sales.type,
      cancelled_at: sales.cancelled_at,
    })
    .from(sales)
    .innerJoin(products, eq(sales.product_id, products.id))
    .where(
      and(
        eq(sales.shop_id, shopId),
        gte(sales.date, startDate),
        lte(sales.date, endDate)
      )
    )
    .orderBy(desc(sales.date));

  if (format === 'csv') {
    return generateCSV(sales);
  } else {
    return generatePDF(sales);
  }
}

function generateCSV(sales: typeof sales): Buffer {
  const csv = [
    ['Datum', 'Uhrzeit', 'Artikel', 'Menge', 'VK-€', 'EK-€', 'Typ', 'Storno'],
    ...sales.map(s => [
      s.date.toLocaleDateString('de-DE'),
      s.date.toLocaleTimeString('de-DE'),
      s.product_name,
      '1', // lineitem quantity (in unserem Fall immer 1 pro Sale)
      (s.vk_snapshot / 100).toFixed(2),
      (s.ek_snapshot / 100).toFixed(2),
      s.type,
      s.cancelled_at ? 'Ja' : 'Nein',
    ])
  ];
  return Buffer.from(csvStringify(csv), 'utf-8');
}
```

---

## Complexity Assessment

| Feature | Tech-Aufwand | Datenschicht | Risiken & Mitigationen |
|---------|-------------|--------------|------------------------|
| **PriceHistory-Tabelle** | 1 Tag | Drizzle DDL + PostgreSQL Trigger | **Risiko:** Trigger-Fehler → Preis-Änderungen geloggt, aber NULL. **Mitigation:** Unit-Test Trigger mit Test-Updates. |
| **Inventur-Report** | 2–3 Tage | SQL GROUP BY (3 Tables); TanStack Query Caching | **Risiko:** Performance bei großen Sales-Mengen (1000+ Sales). **Mitigation:** Index auf `sales(product_id, cancelled_at, date)`. Pagination wenn nötig. |
| **Stock-Movement-Log** | 2 Tage Setup + Refactoring | Trigger auf sales.INSERT; ggf. bestehende Rechnungsimport-Logik anpassen | **Risiko:** Doppelte Buchungen wenn trigger + App-Code entfernt. **Mitigation:** Migration über `INSERT INTO stock_movements SELECT FROM sales WHERE ...` vor Trigger-Aktivierung. |
| **Rechnungsexport (CSV)** | 1 Tag | `node-postgres` Query + `csv-stringify` NPM | **Risiko:** Encoding (Umlaute). **Mitigation:** BOM + UTF-8 Output. |
| **Rechnungsexport (PDF)** | 2 Tage | html-pdf-node oder pdfkit | **Risiko:** Seitenumbruch, Font-Rendering. **Mitigation:** HTML-Template testen mit verschiedenen Datenmengen. |
| **Zyklische Inventur UI** | 1 Tag | SQL mit ABC-Klassifizierung; React Checklisten | **Risiko:** Änderungen während Zählung nicht live. **Mitigation:** Snapshot der Artikel-Liste beim Starten, nicht live. |

---

## Phasierung für v8.0

**Phase 1: Preis-History Setup (1 Tag)**
- Drizzle ORM Tabellen-Definition (price_history)
- PostgreSQL Trigger für products.UPDATE
- DB Migration mit `drizzle-kit migrate`
- Unit-Test: PATCH /products/:id triggert price_history-Eintrag

**Phase 2: Stock-Movement-Log Setup (1–2 Tage)**
- stock_movements Tabelle DDL
- Trigger für sales.INSERT (SALE) + stock_additions.INSERT (ADDITION)
- Bestehende Rechnungsimport-Logik: Refactoring von direktem `UPDATE products` zu `INSERT INTO stock_additions`
- Migration: Alle bestehenden Sales rückwirkend in stock_movements eintragen

**Phase 3: Inventur-Report (2 Tage)**
- SQL-Query mit GROUP BY, SUM aggregates, Price-History-Joins
- Dashboard-Seite "Inventur" mit Tabelle + Export-Button
- TanStack Query Hook für Report-Daten
- WebSocket-Updates wenn Bestand ändert (re-fetch)

**Phase 4: Rechnungsexport (1–2 Tage)**
- CSV-Generator für Tagesabschluss + Monatsexport
- PDF-Generator für Kassenquittung (html-pdf-node oder pdfkit)
- UI-Buttons im Tagesreport: "Alle Verkäufe exportieren" (CSV) oder "Kassenbericht als PDF"

**Phase 5 (Optional, v8.1): Zyklische Inventur UI**
- ABC-Klassifizierung-SQL
- Dashboard-Seite "Inventur-Planung" mit wöchentlicher/monatlicher Checkliste
- Checkboxen für "gezählt am ..."

---

## Confidence Assessment

| Bereich | Confidence | Begründung |
|---------|-----------|-----------|
| Inventur-Anforderungen | HIGH | POS-Industrie-Standard, mehrfach dokumentiert in Retail-Dokumentation. |
| Preis-History-Pattern | HIGH | Audit-Log-Pattern ist Best Practice, PostgreSQL Trigger sind etabliert. |
| Stock-Movement-Log | MEDIUM | Implementierungsdetails (Refactoring Rechnungsimport) könnten komplexer sein als erwartet. |
| Rechnungsexport (CSV) | HIGH | Standard-Format, unkompliziert. |
| Rechnungsexport (PDF) | MEDIUM | PDF-Generierung kann fragil sein (Seitenumbruch, Fonts). html2pdf einfacher als pdfkit, aber externe Abhängigkeit. |
| Zyklische Inventur UI | LOW | ABC-Klassifizierung erfordert Nutzer-Feedback ob Schwellwerte sinnvoll sind. |

---

## Noch zu klären (Research-Flags für Phase-Start)

1. **Darf Kirchengemeinde Preis-Änderungen selbst dokumentieren oder muss externer Auditor?**
   - Für diese Milestone relevant: Müssen wir `changed_by_user` validieren, oder kann jeder Admin ändern?
   - → Frage an Swantje klären.

2. **Welche Schwellwerte für ABC-Klassifizierung?**
   - "A" = Top 20% Umsatz? Top 30 Artikel?
   - → Zur Validierung in Phase 5.

3. **PDF-Generator: html-pdf-node (externen Chromium) oder pdfkit (rein Node.js)?**
   - html-pdf-node einfacher (HTML-Template), aber größere Node-Module.
   - pdfkit leichter, aber manuelle Layout-Logik.
   - → Decision in Phase 4.

4. **Rechnungsexport-Frequenz: Täglich, Wöchentlich, Monatlich, Ad-hoc?**
   - MVP: Ad-hoc Export nach Tagesabschluss.
   - → Erweitern basierend auf Nutzungs-Feedback.

---

## Sources

### Inventur & Stock Tracking
- [nventory.io: Inventory Reconciliation Software](https://nventory.io/us/solutions/inventory-reconciliation-control)
- [Deal POS: Tracking Product Inventory Movements](https://support.dealpos.com/en/articles/4773910-tracking-product-inventory-movements-using-the-inventory-log-stock-card)
- [Magestore: Inventory Movement Report](https://www.magestore.com/blog/inventory-movement-report/)
- [StoreHub: Stock Management via Audit Trail](https://care.storehub.com/en/articles/5726868-stock-management-how-to-track-stock-movement-using-audit-trail)
- [Lightspeed: A Complete Guide to Inventory Reconciliation](https://www.lightspeedhq.com/blog/inventory-reconciliation/)
- [Shopify: A Simple Guide to Cycle Counts](https://www.shopify.com/retail/cycle-count)
- [POSNation: Cycle Counts Best Practices for 2026](https://www.posnation.com/blog/cycle-counts-best-practices)

### Preis-History & Datenbank-Design
- [Red-Gate: Designing A Price History Database Model](https://www.red-gate.com/blog/price-history-database-model/)
- [Scrapewise: Competitive Pricing Database Design 2026](https://scrapewise.ai/blogs/competitive-pricing-database-mid-market-retailers-2026)
- [Medium: Price Drop Tracker System Design](https://dilipkumar.medium.com/price-drop-tracker-system-design-d2f9ed36a935)

### Rechnungsexport & Reporting
- [Lightspeed Retail: Exporting Sales Data](https://x-series-support.lightspeedhq.com/hc/en-us/articles/25534215415963-Exporting-your-Sales-Data-from-Retail-POS-X-Series)
- [orderbird: CSV Export for Sales Analysis](https://supportmini.orderbird.com/en_US/my-orderbird-sales-data/csv-export)
- [Razorpay: What is POS Invoice?](https://razorpay.com/blog/what-is-pos-invoice/)
- [VeryPDF: PDF to CSV Conversion in POS Systems](https://www.verypdf.com/wordpress/202506/top-use-cases-for-pdf-to-csv-conversion-in-retail-inventory-and-pos-systems-50509.html)

### POS Best Practices Allgemein
- [ConnectPOS: POS with Inventory Management 2026](https://www.connectpos.com/pos-with-inventory-management/)
- [Enhanced Retail: POS Sales and Inventory Reporting Best Practices](https://enhancedretailsolutions.com/best-practices/)
- [POSNation: 10 Inventory Management Best Practices](https://www.posnation.com/blog/inventory-management-best-practices)

---

*Research für: Fairstand Kassensystem v8.0 Milestone*
*Recherchiert: 2026-04-01*
