# Phase 29: Export - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Verkaufshistorie, Inventur und Einzelbelege können als Datei heruntergeladen werden — CSV für Tabellenkalkulationen, PDF für Belege und den Jahresabschluss. Die Inventur-Übersicht muss sowohl als CSV als auch als PDF exportierbar sein (Kirchenkreis-Anforderung für Jahresabschluss).

</domain>

<decisions>
## Implementation Decisions

### CSV-Export
- Semikolon als Trennzeichen + UTF-8 BOM Header (0xEF 0xBB 0xBF) — Excel öffnet Umlaute korrekt
- Server-side Streaming via Fastify Reply (Content-Type: text/csv, Content-Disposition: attachment)
- Download-Button direkt in der jeweiligen Ansicht (Tagesübersicht für Verkaufshistorie, Inventur-Tab für Inventur)
- Verkaufshistorie-CSV: Datum, Artikel, Menge, VK, EK, Summe, Spende
- Inventur-CSV: Artikelname, Artikelnummer, Bestand, Verkaufte Menge, VK-Umsatz, EK-Kosten, Bestandswert

### PDF-Export
- Server-side PDF-Generierung (keine Client-side Library nötig)
- Inventur als PDF: Gleiche Daten wie CSV, als formatierte Tabelle mit Shop-Name, Jahr, Bestandswert-Summe — für den Jahresabschluss beim Kirchenkreis
- Einzelverkauf-PDF-Beleg: Im SaleDetailModal (Verkaufsdetail-Ansicht) — Shop-Name, Datum, Artikelliste (Name, Menge, Preis), Summe, Bezahlt, Wechselgeld, Spende
- PDF-Beleg Layout: Schlicht und professionell, Kirchengemeinde-Name im Header

### Claude's Discretion
- PDF-Library-Wahl (pdfkit, html-pdf-node, oder @react-pdf/renderer server-side)
- Genauer Button-Style und Platzierung
- Loading-States beim Download
- Dateiname-Pattern (z.B. inventur-2026-st-secundus.csv)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- GET /api/reports/inventory?year=XXXX — bereits in Phase 28 erstellt, liefert alle Inventur-Daten
- GET /api/reports/monthly — bestehende Verkaufsdaten
- DailyReport.tsx — Tagesübersicht wo CSV-Button für Verkaufshistorie hinkommt
- MonthlyReport.tsx — Inventur-Tab wo CSV/PDF-Buttons hinkommen
- SaleDetailModal.tsx — Verkaufsdetail wo PDF-Beleg-Button hinkommt
- reportTemplate.ts — bestehende HTML-Template-Funktionen für E-Mail-Berichte (Pattern für PDF)

### Established Patterns
- Fastify Reply für File-Downloads (Content-Disposition)
- TanStack Query für Fetch, aber Downloads gehen direkt via window.open oder fetch+blob
- Tailwind 4 für Button-Styling

### Integration Points
- server/src/routes/reports.ts — neue Export-Endpoints
- DailyReport.tsx — CSV-Download-Button
- MonthlyReport.tsx — CSV + PDF-Download-Buttons im Inventur-Tab
- SaleDetailModal.tsx — PDF-Beleg-Button

</code_context>

<specifics>
## Specific Ideas

- Inventur-PDF braucht beides: CSV (für Excel-Weiterverarbeitung) UND PDF (für den Jahresabschluss beim Kirchenkreis) — explizite Anforderung vom User
- PDF-Beleg für Einzelverkauf ist "nice to have" für Transparenz gegenüber dem Kirchenkreis

</specifics>

<deferred>
## Deferred Ideas

- Excel (XLSX) Export — CSV reicht für v8.0
- Automatischer PDF-Versand per Mail — erstmal nur manueller Download

</deferred>
