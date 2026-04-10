---
plan: 40-01
status: complete
completed: 2026-04-10
---

# Summary 40-01: Live-Suche im ArticleGrid

## One-liner
Suchfeld im ArticleGrid mit Live-Filterung ueber Artikelnummer, Produktname und Kategorie (Teilmatch, case-insensitive).

## Was gebaut
- `searchQuery` State in ArticleGrid.tsx (useState)
- `filteredProducts` useMemo erweitert: filtert erst nach Kategorie, dann nach Suchbegriff (Teilmatch ueber articleNumber, name, category)
- Suchfeld mit Lucide Search Icon (links) und Clear-Button X (rechts) im ArticleGrid-Header, oberhalb Kategorie-Tabs
- "Keine Artikel gefunden für X" Text bei leerem Suchergebnis
- Bestehender Kategorie-Filter bleibt funktional (AND-Verknuepfung mit Suche)

## Files modified
- client/src/features/pos/ArticleGrid.tsx

## Requirements covered
- SUCH-01: Suchfeld ueber Artikelgrid ✓
- SUCH-02: Live-Filterung waehrend Eingabe (kein Submit) ✓
- SUCH-03: Artikelnummer-Suche (Teilmatch) ✓
- SUCH-04: Produktname-Suche (Teilmatch) ✓
- SUCH-05: Kategorie-Suche ✓
