# Phase 30: Admin-Verwaltung - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Die Produktverwaltung wird vervollständigt: Inventur als eigener Admin-Tab, dauerhaftes Löschen von fehlerhaft angelegten Artikeln, und Umbenennung "Bestandskorrektur" → "Bestand anpassen". Keine neuen Features über ADMIN-01/02/03 hinaus.

</domain>

<decisions>
## Implementation Decisions

### Artikel Löschen (ADMIN-02)
- Lösch-Button in der ProductList-Zeile neben dem Deaktivieren-Button platzieren
- **Löschen nur möglich wenn keine Verkäufe existieren** — reiner Fehlerkorrektur-Mechanismus für falsch oder doppelt angelegte Artikel
- Artikel mit Verkaufshistorie können NICHT gelöscht werden, nur deaktiviert — sie müssen für Inventur erhalten bleiben
- Einfacher Bestätigungs-Dialog mit Artikelname und Hinweis "Unwiderruflich löschen"
- Löschbar unabhängig vom Aktivierungsstatus (aktiv oder deaktiviert)
- **Artikelnummern müssen unique sein** — Duplikat-Prüfung beim Anlegen/Bearbeiten (zusätzlicher Scope-Fund aus User-Feedback)

### Inventur-Tab (ADMIN-01)
- Neuer Tab "Inventur" in der Admin-Navigation, Position nach "Berichte"
- Jahresfilter beibehalten — identisch zum aktuellen View in MonthlyReport
- CSV/PDF-Export-Buttons 1:1 aus MonthlyReport extrahieren
- Inventur-Tab aus MonthlyReport komplett entfernen — kein Duplikat

### Umbenennung (ADMIN-03)
- "Bestandskorrektur" → "Bestand anpassen" (Heading + Button-Text in StockAdjustModal)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminScreen.tsx` — Tab-System mit `AdminTab` Type und dynamischem Tab-Array (Line 13, 19-25)
- `MonthlyReport.tsx` — Inventur-Implementation (Lines 320-440), Export-Logik (Lines 138-174)
- `ProductList.tsx` — Bestehende Aktions-Buttons pro Zeile (Deaktivieren, Bestand, Bild)
- `StockAdjustModal.tsx` — "Bestandskorrektur" Text (Lines 49, 120)
- `useProducts.ts` — Bestehende Mutations für activate/deactivate

### Established Patterns
- Admin-Tabs: Type-Union erweitern, Tab-Array ergänzen, Conditional Rendering in AdminScreen
- Mutations: TanStack Query `useMutation` mit `queryClient.invalidateQueries`
- Bestätigungs-Dialoge: Inline-Modals mit Pointer-Events für Touch

### Integration Points
- Backend: `server/src/routes/products.ts` — neuer DELETE-Endpoint
- Backend: Verkaufs-Check vor Delete (sales-Tabelle prüfen)
- Backend: Unique-Constraint auf Artikelnummer pro Shop
- Frontend: `AdminScreen.tsx` Tab-Type und Tab-Array erweitern
- Frontend: Inventur-Komponente aus MonthlyReport extrahieren

</code_context>

<specifics>
## Specific Ideas

- User betont: Löschen ist **nur** für Fehlerkorrekturen — doppelt angelegte oder falsch erfasste Artikel
- Artikelnummern-Unique-Check soll Duplikate beim Anlegen verhindern (proaktiver Schutz)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
