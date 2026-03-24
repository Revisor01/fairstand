# Phase 12: Bestandsampel & Umlaute - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Farbindikator (grün/gelb/rot) für Bestand + Umlaute (öäüß) konsequent in gesamter UI.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
- AMP-01: Grün = gut, Gelb = niedrig (≤ minStock), Rot = leer (0). In ProductList UND ArticleGrid.
- TXT-01: Alle ae→ä, oe→ö, ue→ü, ss→ß in der gesamten UI. Durchsuche ALLE .tsx Dateien.

</decisions>
