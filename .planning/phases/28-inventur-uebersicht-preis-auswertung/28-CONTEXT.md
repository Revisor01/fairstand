# Phase 28: Inventur-Übersicht & Preis-Auswertung - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Der Jahresbericht zeigt pro Artikel eine vollständige Inventur-Übersicht mit Bestand, Umsatz, EK-Kosten und Preisänderungen — alle Zahlen stimmen, auch wenn EK im Laufe des Jahres gestiegen ist. Zusätzlich gibt es eine Preis-History-Ansicht pro Artikel in der Produktverwaltung.

</domain>

<decisions>
## Implementation Decisions

### Inventur-Layout
- Neuer Tab "Inventur" im MonthlyReport (gleiche Seite wie Jahresübersicht) — konsistent mit bestehendem Report-Layout
- Artikel mit verschiedenen EKs: expandierbare Zeile — Hauptzeile zeigt Summe, Klick/Tap zeigt Aufschlüsselung nach EK
- Bestandswert-Summe als Footer-Zeile der Inventur-Tabelle (fett, Summenzeile) — Standard aus Buchhaltungssoftware

### Preis-History-Ansicht
- Neuer Tab "Preis-History" in ProductStats (bestehende Produktstatistik-Ansicht) — kein neuer Einstiegspunkt nötig
- Zeitstrahl als einfache Tabelle: Datum, Feld (EK/VK), Alter Preis, Neuer Preis — klar und scannbar
- Sortierung neueste zuerst (DESC) — letzter Preis sofort sichtbar

### Report-Integration (Backend)
- Neuer GET /api/reports/inventory?year=XXXX Endpoint — aggregiert Sale-Items gruppiert nach Produkt und EK
- Datenquelle für EK-Aufschlüsselung: Sale-Item-Snapshots (purchasePrice im JSONB der sales-Tabelle) — bereits vorhanden, kein neues Logging nötig
- Bestandswert-Summe: Aktive Produkte × aktueller EK (aus products-Tabelle)

### Claude's Discretion
- Genaues Tab-UI-Design (Pill-Tabs vs. Toggle-Buttons)
- Inventur-Tabelle Spaltenanordnung und Sortierung
- Loading-States und Error-Handling für neue Endpoints
- TanStack Query Keys und Cache-Invalidation

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- MonthlyReport.tsx — bestehende Jahresübersicht mit Dropdowns und Chart, hier wird neuer Tab eingefügt
- ProductStats.tsx — bestehende Produktstatistik-Ansicht, hier kommt Preis-History-Tab
- ReportChart.tsx — Recharts-Balkendiagramm, potenziell wiederverwendbar
- GET /api/reports/yearly — bestehendes Query-Pattern für Jahresberichte
- GET /api/products/:id/price-history — bereits in Phase 27 erstellt

### Established Patterns
- TanStack Query für alle Server-Reads (useQuery)
- Tailwind 4 für Styling
- Lucide-React Icons
- Cents-Integer für alle Preise (Division durch 100 in UI)
- shopId-Isolation in allen API-Calls via Session-Auth

### Integration Points
- MonthlyReport.tsx: Neuer Tab neben "Monat" und "Jahr"
- ProductStats.tsx: Neuer Tab für Preis-History
- server/src/routes/reports.ts: Neuer /inventory Endpoint
- server/src/index.ts: Route-Registration (falls nötig)

</code_context>

<specifics>
## Specific Ideas

- Die EK-Aufschlüsselung im Inventur-Tab nutzt die bereits in Sales gespeicherten purchasePrice-Snapshots — keine Abhängigkeit von der neuen price_history-Tabelle für Reports
- Die Preis-History-Ansicht in ProductStats nutzt den in Phase 27 erstellten GET /api/products/:id/price-history Endpoint

</specifics>

<deferred>
## Deferred Ideas

- ABC-Klassifizierung (Top-Seller) — eigener Milestone
- Inventur-Snapshot (Bestände zu Stichtag einfrieren) — nicht für v8.0

</deferred>
