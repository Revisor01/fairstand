# Phase 39: Bestandswarnungen-UX - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Bestandswarnungen als Glocken-Icon mit Badge-Zaehler im Header statt ausgeklappter Liste. Klick oeffnet eine aufgeraeumte Liste mit je einem Eintrag pro Artikel unter Mindestbestand.

</domain>

<decisions>
## Implementation Decisions

### Glocken-Icon im Header
- Lucide Bell Icon im POS-Header (neben Shop-Name oder Admin-Toggle)
- Badge-Zaehler (rote Zahl) zeigt Anzahl Artikel unter Mindestbestand
- Kein Badge wenn keine Warnungen (Glocke ohne Zahl)
- Bisherige ausgeklappte Warnliste im Header komplett entfernen

### Warnliste
- Dropdown/Popover bei Klick auf Glocke
- Pro Eintrag: Artikelname, aktueller Bestand, Mindestbestand
- Sortiert nach Dringlichkeit (niedrigster Bestand relativ zum Mindestbestand zuerst)
- Einfaches, aufgeraeumtes Design

### Claude's Discretion
- Popover vs Modal vs Sidebar fuer die Liste
- Exaktes Styling und Animationen
- Ob Warnungen auch im Admin-Bereich angezeigt werden

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Lucide Bell Icon bereits im Projekt (lucide-react)
- Bestehende Warnlogik in POS/Admin Header
- TanStack Query fuer Produkt-Daten (Bestand + Mindestbestand schon vorhanden)

### Integration Points
- client/src/features/pos/POSScreen.tsx oder Header-Komponente
- Bestehende Mindestbestand-Warnlogik finden und refaktorieren

</code_context>

<specifics>
## Specific Ideas

- Badge-Style aehnlich wie der bestehende Einstellungen-Badge
- Nicht voll ausgeklappt im Header (das war das Problem)

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
