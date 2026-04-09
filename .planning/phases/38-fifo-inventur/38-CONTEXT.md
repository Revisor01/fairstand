# Phase 38: FIFO-Inventur - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Der Inventur-Report berechnet den Bestandswert auf Basis exakter historischer EK-Preise pro Wareneingang nach FIFO. Pro Artikel wird transparent aufgeschluesselt, welche Mengen zu welchem EK im Bestand liegen. Verkaeufe verbrauchen die aeltesten Wareneingaenge zuerst.

</domain>

<decisions>
## Implementation Decisions

### FIFO-Algorithmus
- Wareneingaenge (stock_movements type=restock und adjustment mit purchase_price_cents > 0) bilden die Eingangs-Chargen
- Verkaeufe (stock_movements type=sale) verbrauchen Chargen nach FIFO (aelteste zuerst)
- Fuer historische Daten ohne purchase_price_cents: aktueller Produkt-EK als Fallback
- Bestandswert = Summe(verbleibende Chargen-Menge x Chargen-EK)

### Inventur-Report Darstellung
- Pro Artikel: Aufklappbare Ansicht zeigt verbleibende Chargen (z.B. 3x a 1,20 EUR + 5x a 1,35 EUR)
- Bestandswert-Summe im Header basiert auf FIFO
- Hinweis aendern von Annaeherung zu nach FIFO

### API-Erweiterung
- Server-Endpoint GET /api/reports/inventory muss FIFO-Logik implementieren
- Pro Artikel: Array von ek_cents, quantity, date fuer verbleibende Chargen
- Bestehende Inventur-Exports (CSV, PDF, XLSX) zeigen den FIFO-basierten Bestandswert

### Claude's Discretion
- SQL-Query-Struktur fuer FIFO-Berechnung
- UI-Detailgrad der Chargen-Anzeige

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- InventurTab.tsx mit Preisperioden-Aufklappung
- reports.ts GET /reports/inventory Endpoint
- stock_movements Tabelle mit purchase_price_cents (Phase 37)
- price_histories Tabelle

### Integration Points
- server/src/routes/reports.ts
- client/src/features/admin/reports/InventurTab.tsx
- Inventur CSV/PDF/XLSX Exports

</code_context>

<specifics>
## Specific Ideas

- User will KEINE Durchschnittspreise - exakte EK-Preise pro Wareneingang
- Chargen-Anzeige pro Artikel transparent

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
