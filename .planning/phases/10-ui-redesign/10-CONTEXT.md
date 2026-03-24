# Phase 10: UI-Redesign - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Komplettes UI-Redesign: Kassendialog und Bezahlseite kompakt (wie der Abschlussdialog), mehr Luftigkeit überall, Live-Berechnung, Shop-Name in Titelzeile, Admin übersichtlicher.

</domain>

<decisions>
## Implementation Decisions

### Kassendialog & Bezahlseite
- Kassendialog NICHT fullscreen — kompakt wie der aktuelle Abschlussdialog eines Bezahlvorgangs
- Bezahlseite zeigt Artikelliste + Gesamtsumme groß
- Alles muss auf einen Blick erfassbar sein
- Live-Berechnung: sobald Betrag eingegeben wird, Wechselgeld/Spende sofort berechnen
- Referenz für den gewünschten Stil: der aktuelle SaleSummary-Dialog am Ende eines Verkaufs

### Layout & Styling
- Mehr Luftigkeit — Whitespace zwischen Elementen
- Kompakter — weniger gedrängt, nicht weniger Inhalt
- Stylischer — professioneller Look
- Nicht das gesamte Farbschema ändern — die sky-blue Basis bleibt

### Navigation & Header
- Shop-Name in der Titelzeile oben anzeigen (kommt aus getShopId/Server)
- Aktuell: "Sperren" Button + Admin-Button oben

### Admin-Bereich
- Einstellungen/Admin übersichtlicher
- Kompaktere Darstellung

### Claude's Discretion
- Konkrete Spacing-Werte (p-4 vs p-6 etc.)
- Ob Bezahlseite als Modal oder als eingebettete Ansicht
- Animation/Transitions
- Genaue Aufteilung der Admin-Tabs

</decisions>

<code_context>
## Existing Code Insights

### Key Files
- `client/src/features/pos/POSScreen.tsx` — Hauptscreen der Kasse
- `client/src/features/pos/CartPanel.tsx` — Warenkorb Slide-In
- `client/src/features/pos/PaymentFlow.tsx` — Bezahlseite
- `client/src/features/pos/SaleSummary.tsx` — Abschlussdialog (REFERENZ für gewünschten Stil!)
- `client/src/features/pos/ArticleGrid.tsx` — Artikel-Grid
- `client/src/features/admin/AdminScreen.tsx` — Admin mit Tabs
- `client/src/App.tsx` — Haupt-App mit Auth

### Established Patterns
- Tailwind 4 für Styling
- Touch-optimiert (min-h-[44px] Tap-Targets)
- sky-blue Farbschema (sky-50, sky-100, sky-400, sky-500, sky-700, sky-800)

</code_context>

<specifics>
## Specific Ideas

- Der Abschlussdialog (SaleSummary) ist das Vorbild für die kompakte Darstellung
- Bezahlseite soll genauso kompakt sein — Artikel sichtbar, Gesamtsumme groß, Eingabefeld für bezahlten Betrag
- Shop-Name kommt vom Server (über getStoredSession oder getShopId)

</specifics>

<deferred>
## Deferred Ideas

None

</deferred>
