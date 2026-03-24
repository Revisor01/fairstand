# Phase 11: Produktbilder & PDF-Parsing - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

PDF-Parsing für Süd-Nord-Kontor Rechnungen verbessern (Rechnung 2552709 als Referenz). Produktbilder aus Etiketten-PDFs extrahieren und in Artikelkacheln anzeigen.

</domain>

<decisions>
## Implementation Decisions

### PDF-Parsing (Rechnung 2552709.pdf)
- Spaltenstruktur: Menge | Artikelnummer | Bezeichnung | Rabatt | Preis/St. | MwSt | Gesamt
- Aktuelles Problem: Alles landet in der Beschreibung — Menge, Preis, Artikelnummer werden nicht korrekt getrennt
- EVP steht IN der Bezeichnung als Klammer-Format: z.B. "(interArt, EVP €4,00)" oder "(Fairkauf, EVP €17,95)"
- Rabatt-Spalte existiert (10%, 22%, 25%, 30%)
- Preis/St. ist der EK-Preis nach Rabatt
- MwSt ist 7% oder 19%
- Testdateien: `Süd-Nord-Kontor/Rechnung 2552709.pdf` und `Süd-Nord-Kontor/Rechnung 2600988.pdf`

### Produktbilder
- Etiketten-PDFs liegen im Ordner `Süd-Nord-Kontor/` (3 Etiketten-Dateien)
- Bilder aus Etiketten-PDFs extrahieren (pdfjs-dist kann Bilder aus PDFs lesen)
- Bilder manuell in der Produktverwaltung zuweisbar
- Artikelkacheln zeigen Bild wenn vorhanden

### Claude's Discretion
- Bildformat/Größe für Thumbnails
- Wo Bilder gespeichert werden (Server-Dateisystem vs Base64 in DB)
- Wie Bilder den Produkten zugeordnet werden (imageUrl Feld in products)

</decisions>

<code_context>
## Existing Code Insights

### Key Files
- `server/src/lib/pdfParser.ts` — bestehender Parser, koordinatenbasiert, funktioniert für 2600988 aber nicht 2552709
- `server/src/routes/import.ts` — PDF Upload Endpoint
- `client/src/features/pos/ArticleGrid.tsx` — Artikelkacheln (zeigt aktuell Name + Preis + Bestand)
- `client/src/features/admin/products/ProductList.tsx` — Produktverwaltung
- `server/src/db/schema.ts` — products table (braucht imageUrl Spalte)
- `client/src/db/schema.ts` — Dexie Product interface (braucht imageUrl)

</code_context>

<specifics>
## Specific Ideas

- Etiketten-PDFs im Root: Etiketten__Regalleistenschilder_2026-03-23_*.pdf
- Bilder könnten als statische Dateien im Server-Container served werden (/api/images/:id)

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
