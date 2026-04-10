# Phase 40: Live-Suche im POS-Dashboard - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Ein Suchfeld im ArticleGrid (POS-Dashboard) filtert das Artikelgrid live waehrend der Eingabe. Teilmatch ueber Artikelnummer, Name und Kategorie. Client-seitig (Produktliste bereits geladen).

</domain>

<decisions>
## Implementation Decisions

### Suchfeld Platzierung
- Im ArticleGrid-Header, oberhalb der Kategorie-Tabs
- Lucide Search Icon als Input-Adornment (links)
- Clear-Button (X) rechts wenn Text eingegeben
- Placeholder: "Artikel suchen..."

### Such-Logik
- Client-seitig ueber die bereits geladene products-Liste
- Case-insensitive Teilmatch via String.includes() nach toLowerCase()
- Suchfelder: articleNumber, name, category
- Leeres Suchfeld = keine Filterung (alle Artikel)
- Suche und Kategorie-Filter kombinierbar (AND-Verknuepfung)

### Performance
- Kein Debounce noetig bei ~106 Produkten (client-seitig, sofort)
- useMemo fuer gefilterte Liste (Abhaengigkeit: products, activeCategory, searchQuery)

### UX
- Focus auf Suchfeld beim Seiten-Load nicht noetig (iPad Touch)
- Bei aktivem Suchfeld werden Kategorie-Tabs trotzdem angezeigt
- Wenn Suchergebnis leer: freundliche Message "Keine Artikel gefunden"

### Claude's Discretion
- Styling der Suchleiste (Tailwind classes)
- Ob Artikelnummer exakt oder startsWith bevorzugt wird

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- ArticleGrid.tsx mit bestehender useMemo-Filterung nach Kategorie
- Lucide Search Icon bereits im Projekt
- useProducts Hook liefert alle benoetigten Felder

### Integration Points
- client/src/features/pos/ArticleGrid.tsx — Suchfeld hinzufuegen, filteredProducts erweitern
- Kein Backend-Change noetig
- Kein neuer Hook noetig

</code_context>

<specifics>
## Specific Ideas

- Suche ueber Artikelnummer, Name, Kategorie
- Live-Filterung (kein Submit-Button)
- Teilmatch (nicht nur startsWith)

</specifics>

<deferred>
## Deferred Ideas

- Fuzzy Search (Tippfehlertoleranz) — Out of Scope
- Server-seitige Suche — nicht noetig bei ~106 Produkten

</deferred>
