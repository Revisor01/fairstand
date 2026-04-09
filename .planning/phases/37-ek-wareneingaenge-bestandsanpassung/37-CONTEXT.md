# Phase 37: EK-Wareneingänge & Bestandsanpassung - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous smart discuss)

<domain>
## Phase Boundary

Jede Bestandserhöhung — ob per PDF-Import oder manueller Anpassung — speichert den zugehörigen EK-Preis als eigene Bewegung in stock_movements. Neue Spalte `purchase_price_cents` in stock_movements. Neuer Bewegungstyp `restock` für Wareneingänge.

</domain>

<decisions>
## Implementation Decisions

### DB-Schema
- Neue Spalte `purchase_price_cents` (integer, nullable) in stock_movements — nullable, da negative Korrekturen (Schwund) keinen EK brauchen
- Neuer Typ `restock` für stock_movements.type bei Wareneingängen (PDF-Import)
- Drizzle-Migration für die neue Spalte

### StockAdjustModal
- "Preis anpassen"-Toggle (Switch/Checkbox) — standardmäßig aus
- Bei Aktivierung erscheint EK-Eingabefeld mit dem aktuellen Produkt-EK als Default
- Toggle nur bei positivem Delta sichtbar (Zugang), bei negativem Delta versteckt
- Bei positivem Delta OHNE Toggle: aktueller Produkt-EK wird automatisch als purchase_price_cents gespeichert

### PDF-Import
- Nach Import werden `restock`-Bewegungen pro Artikel erstellt (statt nur `adjustment`)
- EK-Preis aus der Import-Zeile (Netto-EK) wird in purchase_price_cents gespeichert
- Wenn sich der EK ändert (Import-EK ≠ Produkt-EK), wird auch price_histories aktualisiert

### Claude's Discretion
- API-Payload-Erweiterung für purchase_price_cents
- Reihenfolge der DB-Migration

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StockAdjustModal.tsx` — bestehendes Modal mit delta + reason Feldern
- `useAdjustStock()` Hook in useProducts.ts — POST /api/sync mit STOCK_ADJUST
- `ImportScreen.tsx` — POST /api/stock/adjust für Import-Bestandserhöhung
- stock_movements Tabelle existiert bereits mit type, quantity, reason

### Established Patterns
- Preise als Cent-Integer (purchasePrice, salePrice)
- Sync-Route (sync.ts) für STOCK_ADJUST — validiert Schema + Ownership
- price_histories Tabelle für EK/VK-Änderungen
- OutboxEvents für Broadcast an WebSocket-Clients

### Integration Points
- server/src/db/schema.ts — stock_movements erweitern
- server/src/routes/sync.ts — STOCK_ADJUST um purchase_price_cents erweitern
- client/src/features/admin/products/StockAdjustModal.tsx — Toggle + EK-Feld
- client/src/hooks/api/useProducts.ts — useAdjustStock Payload erweitern
- client/src/features/admin/import/ImportScreen.tsx — restock statt adjustment
- server/src/routes/stock.ts (oder products.ts) — Import-Endpoint erweitern

</code_context>

<specifics>
## Specific Ideas

- Toggle "Preis anpassen" im StockAdjustModal nur bei positivem Delta zeigen
- Bei Zugang ohne Toggle: aktueller Produkt-EK automatisch speichern
- Bei negativem Delta: purchase_price_cents = null (kein EK nötig)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
