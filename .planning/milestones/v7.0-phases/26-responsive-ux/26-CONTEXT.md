# Phase 26: Responsive UX - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Die App passt sich an jedes Gerät an — responsive Layout für Desktop, iPad und iPhone. Warenkorb-Verhalten (fixe Spalte vs. Slide-In) ist konfigurierbar als Shop-Einstellung. Kategorien-Navigation wird verbessert mit Sticky-Verhalten und stärkerem Kontrast.

</domain>

<decisions>
## Implementation Decisions

### Layout-Architektur
- Warenkorb-Verhalten als Shop-Einstellung im Admin (Settings): "Feste Spalte" ein/aus
- Wenn Einstellung aktiv UND Screen >= lg (1024px, iPad Landscape): Warenkorb als fixe rechte Spalte (w-80, 320px), kein Overlay, kein Modal
- Wenn Einstellung deaktiviert ODER Screen < lg: Warenkorb als Slide-In von rechts (bestehendes Verhalten)
- iPhone zeigt IMMER Slide-In — Bildschirm zu schmal für fixe Spalte
- CSS-only mit Tailwind lg:-Prefix für Breakpoint, Einstellung steuert ob Spalten-Layout aktiv
- Kein Overlay/Backdrop auf breiten Screens wenn Spalte aktiv

### Warenkorb Slide-In (Schmale Screens)
- Swipe von rechts öffnet den Warenkorb — natürliche iOS-Geste, zusätzlich zum Button
- Implementierung mit onPointerDown/Move/Up und Threshold — keine externe Library
- Swipe nach rechts schließt den Warenkorb (Swipe-to-dismiss)
- Bestehender X-Button und Backdrop-Tap bleiben als Alternative

### Kategorien-Navigation
- Horizontale Pill-Leiste beibehalten, aber sticky unter dem Header beim Scrollen
- Aktive Kategorie scrollt automatisch in den sichtbaren Bereich (scrollIntoView)
- Stärkerer visueller Kontrast: aktive Pill kräftiger + leichter Schatten, inaktive subtiler
- "Alle"-Kategorie-Pill bleibt als Default

### Claude's Discretion
- Exakter Swipe-Threshold (vermutlich 50-80px)
- Sticky-Implementation (CSS sticky vs. fixed positioning)
- Settings-Key-Name für die Warenkorb-Einstellung
- Genaue Farbwerte für verbessertes Kategorie-Styling
- Ob die Einstellung per WebSocket live auf alle Geräte pushed wird

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- POSScreen.tsx: Bestehendes Layout mit Header, ArticleGrid, CartPanel
- CartPanel.tsx: Slide-In Panel mit translate-x Transition, w-80/md:w-96
- ArticleGrid.tsx: Kategorie-Tabs (Pillen), Grid mit auto-fill 140px
- settings Route: GET/POST /api/settings mit shopId-Isolation (Composite Key)
- useProducts Hook: TanStack Query für Produktdaten
- Pointer-Events Pattern: onPointerDown/Up/Cancel für Touch

### Established Patterns
- Tailwind CSS für responsive Design (bg-sky-*, rounded-xl, min-h-[44px])
- isCartOpen State in POSScreen steuert CartPanel-Visibility
- getStoredSession() für Shop-Einstellungen im Client
- Settings als key-value in DB (key + shopId)

### Integration Points
- client/src/features/pos/POSScreen.tsx — Layout-Umbau für Spalten-Modus
- client/src/features/pos/CartPanel.tsx — Swipe-Gesten + Spalten-Modus
- client/src/features/pos/ArticleGrid.tsx — Sticky Kategorie-Tabs + Styling
- server/src/routes/settings.ts — Neue Einstellung "cart_sidebar"
- client/src/features/admin/settings/ — UI für Einstellung

</code_context>

<specifics>
## Specific Ideas

- Einstellung soll einfach als Toggle im Admin-Bereich Settings sein
- Swipe-Geste soll sich wie native iOS-Navigation anfühlen (Edge-Swipe)
- Auf iPad Portrait soll der Slide-In funktionieren, auf iPad Landscape die fixe Spalte (wenn aktiviert)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
