# Research Summary: v8.0 Inventur, Preis-History & Rechnungsexport

**Project:** Fairstand Kassensystem
**Domain:** POS System — Erweiterte Reporting & Export
**Researched:** 2026-04-01
**Overall Confidence:** MEDIUM-HIGH (core stack proven in v6.0+, new libs validated)

## Executive Summary

v8.0 erweitert das Online-Only Fairstand-System (React 19, Fastify 5, PostgreSQL 16) mit Inventur-Übersichten, Preis-History-Tracking und CSV/PDF-Exporte. Die Architektur bleibt simpel:

- **Datenbank:** 2 neue Tabellen (`product_price_history`, `stock_transactions`) via Drizzle-Migration
- **Backend:** CSV-Streaming via `fast-csv 5.x` in bestehende Fastify-Routes
- **Frontend:** PDF-Reports via `@react-pdf/renderer 4.3.2` (React-Components, keine HTML-Screenshot)
- **Optional:** PapaParse für Browser-CSV-Import (fallback)

**Stack-Impact:** Minimal. Drei neue npm-Packages, keine Architektur-Änderung, keine Service-Worker/Offline-Logik-Änderung.

## Key Findings

### Stack
- **@react-pdf/renderer 4.3.2** — 1.43M weekly downloads, v4.3.2+ (Jan 2026) hat Memory-Optimierungen. True PDF-Engine, nicht Screenshot-basiert. Besser als pdfmake/jsPDF für strukturierte Reports.
- **fast-csv 5.x** — 3.4M weekly downloads, Streaming-optimiert. Für CSV-Export bei 10K+ Zeilen Memory-sicher (3.4M vs. json2csv 1.1M).
- **PapaParse 5.4.1** — 2.8M weekly downloads, Browser-Einsatzfall. Optional für Upload-Fallback.

### Database
- `product_price_history` — Log aller EK/VK-Preisänderungen. Schreibt nur bei `PATCH /api/products`.
- `stock_transactions` — Optional aber recommended: jede Bewegung (Sale, Return, Restock) als Zeile. Ermöglicht Bestandsverlauf-Reports.

### Integration Points
- **Admin PATCH `/api/products/:id`** — Price-History-Zeile schreiben bei EK/VK-Änderung
- **New GET `/api/reports/inventory`** — Aggregiert Bestand + Verkaufte Menge + EK-Kosten via JOIN
- **New GET `/api/reports/inventory-csv`** — CSV-Stream mit Fastify, 200ms für 10K Zeilen
- **Frontend PDF** — Neue UI-Route `<InventoryReportPDF>` mit `PDFDownloadLink`

## Implications for Roadmap

### Phase Structure (Recommended)

**Phase 27 (v8.0a): Database Schema & API Backend**
- Ziel: `product_price_history`, `stock_transactions` Tables erstellen
- Drizzle Migration generieren + runnen
- `/api/reports/inventory` GET-Route implementieren (TanStack Query backend)
- Price-History Auto-Write in `PATCH /api/products` einbauen
- Deliverable: Backend-Routes tested, CSV-Export funktional
- Komplexität: Medium (Drizzle-Migration, SQL-Joins, Streaming)

**Phase 28 (v8.0b): CSV Export & React PDF**
- Ziel: CSV + PDF Downloads funktional
- npm install `@react-pdf/renderer`, `fast-csv`
- `/api/reports/inventory-csv` mit Streaming implementieren
- Frontend-Komponente `<InventoryReportPDF>` mit `PDFDownloadLink`
- Deliverable: Download-Buttons in Admin, Dateien Download im Browser
- Komplexität: Low (Libraries sind APIs, Copy-Paste-Pattern)

**Phase 29 (v8.0c): Preis-History UI & Stock-Transactions (optional)**
- Ziel: Artikel-Details mit Preis-Timeline, Bestandsverlauf
- Frontend-Query `priceHistoryByProduct` + Chart (Recharts)
- Stock-Transactions-Log implementieren (optional)
- Deliverable: Admin-UI zeigt "Preis-Historie" per Artikel
- Komplexität: Medium (Recharts-Integration, History-Query)

### Phase Dependencies

```
27: Schema + Backend Routes
  ↓ (Backend done)
28: CSV/PDF Export (parallel könnten 27/28 laufen)
  ↓
29: UI für Price-History (nur wenn 28 fertig)
```

### Avoided Pitfalls in Phases

| Phase | Pitfall | Mitigation in Roadmap |
|-------|---------|----------------------|
| 27 | Price-History bei jedem Sale schreiben | Explizit nur in `PATCH /api/products`, dokumentieren im Code |
| 27 | Große Queries ohne Index | `product_price_history(product_id, created_at)` Index in Migration |
| 28 | CSV-Encoding Umlaute | `fast-csv` mit `encoding: 'utf8'` konfigurieren, Test mit "Schökolade" |
| 28 | Memory-Spike bei PDF-Batchgen | Pagination in Phase 29: max 500 Artikel pro PDF-Seite |
| 29 | Alte Preise in Reports vergessen | Sales bereits `ek_price_cents` snapshot speichern (v5.0+), nutzen |

### Research Gaps (to investigate in phase-specific research)

- **PDF-Renderer Memory:** @react-pdf/renderer ab 5000 Artikeln testen, möglicherweise Backend-Side PDF (pdfmake) später
- **CSV-Encoding Edge Cases:** Sonderzeichen, Kommata in Produktnamen, numerische Formate testen
- **Stock-Transactions Granularität:** Einzelne Artikel pro Transaktion oder Batch pro Sale? (Empfehlung: Batch pro Sale)
- **Price-History Audit:** Soll `source` Column ('MANUAL', 'PDF_IMPORT') hinein? (Optional für Phase 29)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | @react-pdf/renderer, fast-csv sind bewährte Libraries mit hohem Download-Volumen. npm-Registry verifiziert. |
| **Database Schema** | MEDIUM-HIGH | Drizzle ORM bereits produktiv (v6.0+). Neue Tables sind Standard-Pattern (History-Tracking). |
| **Integration Points** | MEDIUM | Fastify Streaming + TanStack Query getestet in v6.0+, aber spezifische `/api/reports/*` Routes sind neu. |
| **Frontend PDF** | MEDIUM | @react-pdf/renderer-API documented, aber große Batch-Tests (5000+ Artikel) noch offen. |
| **CSV Encoding** | LOW-MEDIUM | fast-csv basics sicher, aber Umlaute/Spezialzeichen unter Last noch zu testen. |

## Open Questions

1. **Stock-Transactions Granularität:** Pro-Artikel oder Pro-Sale? (Empfehlung: Pro-Artikel für flexibles Reporting)
2. **PDF-Pagination Threshold:** Bei welcher Artikelzahl aufteilen? (500er-Chunks naheliegend)
3. **Excel-Export (XLSX):** In v8.0 oder defer? (Empfehlung: Defer bis Kirchenkreis-Feedback)
4. **Price-History Audit-Trail:** Wer hat wann was geändert? Lohnt sich `source` Column? (Nizza-zu-haben, nicht critical)

## Recommendations for Roadmap

1. **Phase 27 zuerst:** Database-Migrations stabilisieren, dann alles andere drauf bauen
2. **Phase 28/29 können parallel:** Backend (CSV/PDF) unabhängig vom UI-Timing
3. **Nicht in v8.0:** Excel-Export (deferrable), Audit-Trails (nice-to-have), Stock-Transactions-UI (optional)
4. **Testing-Fokus:** CSV mit Umlauten, PDF mit 2000+ Artikeln, Price-History bei gleichzeitigen Updates

## Confidence by Capability

| Capability | Confidence | Evidence |
|------------|------------|----------|
| Can generate PDFs from React | HIGH | @react-pdf/renderer 4.3.2 documented, 1.43M weekly downloads, used in production by dozens of projects |
| Can stream large CSVs | HIGH | fast-csv 3.4M downloads, Fastify piping pattern proven in v5.0+, no custom code needed |
| Can track price history | MEDIUM | Drizzle ORM proven (v6.0+), but new tables need Migration testing + Index verification |
| Can import CSV fallback | MEDIUM | PapaParse 2.8M downloads, but optional (not critical path) |

---

*Research Summary für: v8.0 Inventur, Preis-History & Rechnungsexport*
*Researched: 2026-04-01*
*Implications: Roadmap sollte 3 Phasen (~3-4 Wochen) reservieren, minimal Stack-Impact, Database-Migrations kritisch*
