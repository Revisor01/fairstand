# Phase 25: Shop-Sortiment-Isolation - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Jeder Shop hat ein vollständig unabhängiges Sortiment — Produkte, Preise und Bestand sind shop-spezifisch. Berichte und PDF-Imports bleiben pro Shop isoliert. Alle bestehenden API-Endpunkte filtern konsequent nach shopId aus der Session.

</domain>

<decisions>
## Implementation Decisions

### Daten-Isolation Strategie
- Neuer Shop startet leer — jeder Shop baut sein Sortiment selbst auf (per PDF-Import oder manuell)
- Session-Middleware injiziert shopId — Route-Handler bekommen shopId aus Session, nie aus Request-Body/Query
- UUIDs reichen als Produkt-IDs — shopId-Spalte filtert bereits, kein Prefix nötig
- Report-Scheduler bleibt Single-Shop — SCALE-01 ist Future Requirement, hier nicht umsetzen

### API & Routing
- Bestehende Endpunkte reichen — products, categories, sales, reports filtern bereits nach shopId aus Session
- Server-seitige WHERE-Clause auf shopId bei jedem GET/PATCH/DELETE — shopId kommt immer aus Session
- PDF-Import setzt shopId automatisch aus der Session auf alle neuen Produkte

### Client-seitige Isolation
- Minimale Client-Änderungen — Server filtert bereits, Client zeigt was Server liefert
- Shop-Name in der Titelzeile anzeigen damit klar ist welcher Shop aktiv ist
- Kategorien pro Shop isoliert — shopId in categories-Tabelle existiert bereits, Routes müssen konsequent filtern

### Claude's Discretion
- Reihenfolge der Route-Überprüfungen (welche Routes zuerst shopId-Audit bekommen)
- Ob bestehende Seed-Daten (St. Secundus Produkte) explizit eine shopId bekommen oder schon haben
- Fehlermeldungen bei Cross-Shop-Zugriffsversuchen

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Alle Tabellen haben bereits shopId-Spalte (products, sales, settings, categories, outboxEvents)
- Session-Store (lib/sessions.ts) mappt token → shopId
- TanStack Query Hooks für Produkte, Kategorien, Sales
- WebSocket broadcast() für Live-Updates
- AdminScreen.tsx Tab-System mit bedingter Sichtbarkeit (visibleTabs Pattern aus Phase 24)

### Established Patterns
- request.session.shopId für Shop-Isolation in allen Routes
- Drizzle ORM WHERE-Clauses: eq(table.shopId, shopId)
- Zod-Validation für Request-Bodies
- 403 für Zugriffsverletzungen

### Integration Points
- server/src/routes/products.ts — shopId-Filter bei GET, POST, PATCH
- server/src/routes/categories.ts — shopId-Filter bei allen CRUD-Operationen
- server/src/routes/reports.ts — shopId-Filter bei Tages- und Monatsberichten
- server/src/routes/import.ts — shopId bei PDF-Import auf neue Produkte setzen
- server/src/routes/sales.ts — shopId-Filter bei Verkaufs-Queries
- server/src/routes/settings.ts — shopId-Filter bei Einstellungen

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Fokus auf Audit aller bestehenden Routes für konsequente shopId-Filterung.

</specifics>

<deferred>
## Deferred Ideas

- SCALE-01: Report-Scheduler über alle Shops (Future Requirement)
- CROSS-01: Master-Admin übergreifende Berichte (Future Requirement)

</deferred>
