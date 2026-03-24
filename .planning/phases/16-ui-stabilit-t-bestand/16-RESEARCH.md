# Phase 16: UI-Stabilität & Bestand - Research

**Researched:** 2026-03-24
**Domain:** Touch-Event-Handling (iPad Safari PWA), Bestandswarnungs-UI
**Confidence:** HIGH

## Summary

Diese Phase adressiert zwei unabhängige, aber klar abgegrenzte Probleme: (1) das versehentliche Antippen von Artikelkacheln beim Scrollen auf dem iPad und (2) zu unauffällige Bestandswarnungen bei niedrigem Vorrat.

Der Scroll-vs-Tap-Bug entsteht, weil `onPointerDown` im ArticleGrid sofort feuert — noch bevor der Browser entschieden hat, ob der User scrollt oder tippt. Die Lösung ist ein Pointer-Movement-Threshold-Pattern: auf `pointerdown` die Startposition merken, auf `pointerup` prüfen ob die Bewegung unter einem Schwellenwert (z.B. 8px) geblieben ist, und nur dann die Aktion auslösen. Dieses Pattern funktioniert zuverlässig auf iPad Safari ohne externe Bibliothek.

Die Bestandsampel aus Phase 12 zeigt bereits einen farbigen Dot (●) und den Bestandstext. Das Problem ist Sichtbarkeit: der Dot ist `text-[10px]` klein und die Kachel zeigt keine strukturelle Hervorhebung bei kritischem Bestand. BST-01 verlangt "prominentere Hervorhebung" — das bedeutet visuell auffälligere Kacheln (z.B. farbiger Rand oder Hintergrundton bei gelbem/rotem Status) und eventuell eine deutlichere Zählung im Admin-Badge oder LowStockBanner.

**Primary recommendation:** Pointer-Movement-Threshold für ArticleGrid-Kacheln, farbige Kachelrahmen für gelben/roten Bestandsstatus.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UIX-01 | Scroll vs. Tap korrekt unterscheiden — kein versehentliches Antippen beim Scrollen im Artikel-Grid auf iPad | Pointer-Movement-Threshold-Pattern (pointerdown + pointerup mit Distanzcheck); ersetzt reines onPointerDown auf Kacheln |
| BST-01 | Bestandswarnungen verbessern — klarere/frühere Hinweise bei niedrigem Vorrat, prominentere Hervorhebung kritischer Bestände | Bestehender Dot ist 10px-Text, keine Kachelstruktur-Hervorhebung; Lösung: farbiger Kachelrahmen + verbesserter LowStockBanner |
</phase_requirements>

## Standard Stack

Kein neues Paket nötig. Die gesamte Lösung basiert auf bestehenden Abhängigkeiten:

### Core (bereits vorhanden)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI-Framework | Pointer Events via onPointerDown/onPointerUp Handler |
| Tailwind CSS | 4.x | CSS | Kachelfarben und Rahmen via Utility-Klassen |
| Dexie.js | 4.3.0 | IndexedDB | useLiveQuery reaktiv, keine Änderung nötig |

**Kein npm install nötig.** Alle Werkzeuge sind im Projekt vorhanden.

## Architecture Patterns

### Empfohlene Dateistruktur (Änderungen)
```
client/src/features/pos/
├── ArticleGrid.tsx       # Pointer-Movement-Threshold einbauen
├── LowStockBanner.tsx    # Visuell verstärken
└── POSScreen.tsx         # Unverändert (Badge-Logik bleibt)

client/src/features/admin/products/
└── ProductList.tsx       # Kachelstruktur für Bestandsstatus anpassen

client/src/hooks/
└── useLowStockCount.ts   # Unverändert — Logik korrekt
```

### Pattern 1: Pointer-Movement-Threshold (UIX-01)

**Was:** `onPointerDown` sofort feuern verursacht accidental taps beim Scrollen auf iOS. Die korrektes Lösung: Startposition auf `pointerdown` speichern, auf `pointerup` Distanz messen, Aktion nur bei < Schwellenwert auslösen.

**Warum `onPointerDown` das Problem ist:** Safari iOS dispatcht `pointerdown` sofort beim ersten Touchkontakt, noch bevor die Scroll-Geste erkannt wird. Die Aktion wird also ausgelöst, auch wenn der User direkt danach anfängt zu scrollen.

**Warum nicht `onClick` als Alternative:** `onClick` hat auf iOS Safari eine synthetische 300ms-Verzögerung (in PWA-Context teilweise noch aktiv) und löst auch bei kurzen Wischgesten aus, wenn der Finger kaum bewegt wurde.

**Empfohlenes Pattern:**

```typescript
// Source: Standard-Pattern für iOS Touch-Disambiguierung
function useScrollSafeTap(onTap: () => void, threshold = 8) {
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    startPos.current = null;
    if (dx < threshold && dy < threshold) {
      onTap();
    }
  };

  return { onPointerDown: handlePointerDown, onPointerUp: handlePointerUp };
}
```

**Verwendung im ArticleGrid:**

```typescript
// Ersetze onPointerDown={...} auf den Kachel-Buttons:
// VORHER:
onPointerDown={() => { if (product.stock > 0) onAddToCart(product); }}

// NACHHER: useScrollSafeTap Hook oder inline:
onPointerDown={(e) => { startPos.current = { x: e.clientX, y: e.clientY }; }}
onPointerUp={(e) => {
  if (!startPos.current) return;
  const dx = Math.abs(e.clientX - startPos.current.x);
  const dy = Math.abs(e.clientY - startPos.current.y);
  startPos.current = null;
  if (dx < 8 && dy < 8 && product.stock > 0) onAddToCart(product);
}}
```

**Wichtig:** `onPointerDown` auf Kategorie-Tabs (Zeile 57) und anderen Buttons NICHT ändern — diese scrollen nicht und profitieren von der schnellen Reaktion. Nur die Produktkacheln im scrollbaren Grid brauchen das neue Pattern.

**Schwellenwert:** 8px ist der etablierte Standard für Tap-vs-Scroll-Unterscheidung auf Touch-Screens. iOS erkennt Scroll-Gesten intern ab ca. 10px Bewegung — 8px gibt etwas Puffer nach unten, verhindert aber zuverlässig versehentliche Taps beim Scrollen.

### Pattern 2: Prominente Bestandsampel (BST-01)

**Aktueller Stand (v3.0 Bestandsampel, aus Phase 12):**
- Dot `●` in `text-[10px]` — sehr klein, leicht übersehen
- Bestandstext in `text-xs` (12px), grau für normalen Bestand
- Kachelhintergrund und Rahmen bleiben bei jedem Bestandsstatus identisch
- LowStockBanner: schmaler amber-farbiger Streifen oben in der POS-Ansicht mit Komma-separierter Produktliste
- Admin-Button hat rotes Badge mit Anzahl — zeigt nur eine Zahl, nicht welche Artikel

**Was BST-01 verlangt:** "klarere/frühere Hinweise" und "prominentere Hervorhebung kritischer Bestände"

**Empfohlene Verbesserungen:**

*In ArticleGrid (Kacheln):*
```typescript
// Kachel-className: farbigen linken Rahmen bei niedrigem/kritischem Bestand
className={`
  bg-white shadow-sm rounded-xl min-h-[80px] p-4
  flex flex-col justify-between items-start
  transition-colors text-left
  ${product.stock <= 0
    ? 'opacity-50 cursor-not-allowed border-l-4 border-rose-400'
    : product.minStock > 0 && product.stock <= product.minStock
      ? 'border-l-4 border-amber-400 active:bg-amber-50'
      : 'active:bg-sky-50'
  }
`}
```

*Dot und Text vergrößern:*
```typescript
// text-[10px] → text-xs für den Dot (minimal, konsistent mit Bestandstext)
// Bestandstext bei niedrigem Stand: font-semibold statt font-medium
<span className={`text-xs leading-none ${
  product.stock === 0 ? 'text-rose-500'
  : product.minStock > 0 && product.stock <= product.minStock ? 'text-amber-500'
  : 'text-emerald-500'
}`}>●</span>
```

*LowStockBanner verstärken:*
```typescript
// Aktuell: bg-amber-100 mit schmalem py-2
// Empfehlung: prominenterer Banner mit Icon und Zähler
<div className="bg-amber-50 border-b-2 border-amber-400 px-4 py-3 text-amber-900 text-sm flex items-start gap-2">
  <span className="text-amber-500 text-base shrink-0">⚠</span>
  <div>
    <span className="font-semibold">Mindestbestand unterschritten ({lowStockProducts.length}):</span>{' '}
    {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
  </div>
</div>
```

*ProductList (Admin):*
- Zeilenhintergrund bei niedrigem Bestand mit `bg-amber-50` highlight
- Der Bestandstext `font-medium` → `font-semibold` bei `isLowStock`
- Dot ist bereits vorhanden und korrekt implementiert

### Anti-Patterns to Avoid

- **`onPointerDown` mit `e.preventDefault()`:** Blockiert iOS-Scroll vollständig — Kacheln werden nicht mehr scrollbar
- **`touchstart`/`touchend`-Events direkt nutzen:** Nicht nötig in React — Pointer Events sind der modernere Weg und funktionieren auf iOS Safari seit iOS 13+
- **`onClick` mit `touch-action: none`:** Verhindert natürliches Scroll-Verhalten im Grid
- **Zu großen Threshold (> 15px):** Legitime Taps mit leicht zitterndem Finger werden dann ignoriert

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scroll-Detection | Keine eigene Scroll-Detection per `scroll`-Event | Pointer-Movement-Threshold (inline) | Scroll-Events sind asynchron und kommen nach dem Damage; Movement-Threshold ist synchron und deterministisch |
| Bestandszählung | Kein separater Endpoint für Bestandsstatus | `useLowStockProducts()` (bereits vorhanden) | Dexie LiveQuery ist bereits reaktiv und korrekt implementiert |

**Key insight:** Beide Anforderungen sind reine UI-Änderungen ohne Backend-Beteiligung. Kein neues State-Management, keine neuen Hooks (außer optionalem `useScrollSafeTap`), keine neuen API-Calls.

## Common Pitfalls

### Pitfall 1: `onPointerDown` auf `<button disabled>` feuert trotzdem
**Was geht schief:** In React feuert `onPointerDown` auch auf `disabled`-Buttons (anders als `onClick`). Der aktuelle Code prüft `product.stock > 0` inline im Handler — das ist korrekt. Das neue Pattern muss diese Prüfung behalten, sie darf nicht verloren gehen.
**Wie vermeiden:** Im `onPointerUp`-Handler dieselbe `product.stock > 0`-Prüfung behalten wie bisher.

### Pitfall 2: `useRef` für `startPos` vs. `useState`
**Was geht schief:** `useState` für die Startposition würde einen Re-Render auf `pointerdown` auslösen — unnötig und kann bei schnellem Tippen zu Timing-Problemen führen.
**Wie vermeiden:** `useRef` verwenden — kein Re-Render, synchron lesbar.

### Pitfall 3: `pointercancel` nicht behandeln
**Was geht schief:** iOS Safari feuert `pointercancel` wenn das System die Pointer-Geste übernimmt (z.B. bei Scroll-Start). Ohne Handler bleibt `startPos.current` gesetzt und die nächste `pointerup`-Sequenz triggert fälschlicherweise.
**Wie vermeiden:** `onPointerCancel` Handler hinzufügen: `startPos.current = null`.

```typescript
onPointerCancel={() => { startPos.current = null; }}
```

### Pitfall 4: Schwellenwert zu klein bei Produktbildern
**Was geht schief:** Kacheln mit Produktbild sind höher (20px Image + Content) — bei kleinen Screens können fingergroße Bewegungen > 8px entstehen, ohne dass ein Scroll beabsichtigt war.
**Wie vermeiden:** 8px ist konservativ genug. Bei Bedarf auf 10px erhöhen, aber nicht höher (dann werden echte Scroll-Starts manchmal als Taps erkannt).

### Pitfall 5: Bestandsampel-Logik ist inkonsistent bei `minStock === 0`
**Was geht schief:** Wenn `minStock === 0` (kein Mindestbestand definiert), zeigt die Ampel immer grün — auch wenn `stock` auf 2 oder 1 gefallen ist. Das ist by design, aber Nutzerinnen könnten erwarten, dass "1 Stk." trotzdem eine Warnung zeigt.
**Wie vermeiden:** Diese Logik nicht ändern. `minStock === 0` bedeutet bewusst "kein Mindestbestand gesetzt". BST-01 fordert keine Logikänderung, nur visuelle Verbesserung.

## Code Examples

### Produktkachel mit Movement-Threshold (vollständig)

```typescript
// Source: Standard Pointer-Event-Pattern für iOS Touch-Disambiguation
// Gilt für jeden <button> im filteredProducts.map() in ArticleGrid.tsx

const startPos = useRef<{ x: number; y: number } | null>(null);

// Im JSX:
<button
  key={product.id}
  onPointerDown={(e) => {
    startPos.current = { x: e.clientX, y: e.clientY };
  }}
  onPointerUp={(e) => {
    if (!startPos.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    startPos.current = null;
    if (dx < 8 && dy < 8 && product.stock > 0) {
      onAddToCart(product);
    }
  }}
  onPointerCancel={() => { startPos.current = null; }}
  disabled={product.stock <= 0}
  // className bleibt unverändert (+ optionaler Rahmen für Bestandsstatus)
>
```

**Hinweis:** Das `useRef` muss außerhalb des `.map()` in `ArticleGrid` liegen. Da `.map()` mehrere Kacheln rendert, gibt es zwei Optionen:
1. Den Threshold-Handler in eine eigene Komponente `<ArticleCard>` auslagern (empfohlen — jede Karte hat eigenes ref)
2. Eine Map `startPositions = useRef<Map<string, {x,y}>>(new Map())` mit `product.id` als Key

**Option 1 ist klarer** und folgt dem bestehenden Muster aus React-Projekten.

### ArticleCard-Extraktion (Empfehlung)

```typescript
// Neue Datei: client/src/features/pos/ArticleCard.tsx
interface ArticleCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ArticleCard({ product, onAddToCart }: ArticleCardProps) {
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const isLowStock = product.minStock > 0 && product.stock <= product.minStock;
  const isOutOfStock = product.stock <= 0;

  return (
    <button
      onPointerDown={(e) => { startPos.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        if (!startPos.current) return;
        const dx = Math.abs(e.clientX - startPos.current.x);
        const dy = Math.abs(e.clientY - startPos.current.y);
        startPos.current = null;
        if (dx < 8 && dy < 8 && !isOutOfStock) onAddToCart(product);
      }}
      onPointerCancel={() => { startPos.current = null; }}
      disabled={isOutOfStock}
      className={`
        bg-white shadow-sm rounded-xl min-h-[80px] p-4
        flex flex-col justify-between items-start
        transition-colors text-left
        ${isOutOfStock
          ? 'opacity-50 cursor-not-allowed border-l-4 border-rose-400'
          : isLowStock
            ? 'border-l-4 border-amber-400 active:bg-amber-50'
            : 'active:bg-sky-50'
        }
      `}
    >
      {/* ... bestehender Inhalt unverändert ... */}
    </button>
  );
}
```

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Wann geändert | Impact |
|--------------|------------------|---------------|--------|
| `touchstart`/`touchend` für Touch-Disambiguation | Pointer Events (`pointerdown`/`pointerup`) | iOS 13+ / 2019 | Unified API für Mouse + Touch + Stylus |
| Feste `onClick`-Verzögerung auf iOS (300ms) | `touch-action: manipulation` oder PWA `viewport` | ~2016 | In PWAs mit korrektem `viewport` meist nicht mehr nötig |

**Deprecated/outdated:**
- `fastclick.js`: Polyfill für 300ms-Tap-Delay, nicht mehr nötig in modernen Browsern und PWAs
- `hammer.js` für Tap-Detection: Overkill für diesen Anwendungsfall, keine Abhängigkeit rechtfertigt

## Open Questions

1. **Soll `ArticleCard` eine eigene Datei werden oder inline in `ArticleGrid.tsx` bleiben?**
   - Was wir wissen: Jede Kachel braucht ein eigenes `useRef` — das funktioniert nur in einer eigenen Komponente
   - Was unklar ist: Ob der Planner eine neue Datei bevorzugt oder das inline per ID-Map lösen will
   - Empfehlung: Eigene `ArticleCard.tsx`-Komponente — sauberer, testbarer, folgt React-Konventionen

2. **LowStockBanner: Maximale Produktanzahl im Text?**
   - Was wir wissen: Bei vielen niedrig bestandenen Produkten wird der Banner sehr lang
   - Was unklar ist: Ob ein "Zeige erste 3, dann +N weitere"-Pattern gewünscht ist
   - Empfehlung: Einfachste Lösung — Banner zeigt alle Produkte, scrollt intern wenn nötig. Für Phase 16 kein Over-Engineering.

## Validation Architecture

Phase 16 enthält ausschließlich UI-Änderungen ohne Geschäftslogik-Änderungen. Bestehende Unit-Tests sind nicht betroffen. Manuelle Überprüfung auf iPad ist die primäre Validierungsmethode.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vorhanden im Projekt) |
| Config file | `client/vite.config.ts` (Vitest-Config dort) |
| Quick run command | `cd client && npm run test` |
| Full suite command | `cd client && npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UIX-01 | Pointer-Movement-Threshold verhindert Tap bei > 8px Bewegung | unit | `cd client && npm run test -- ArticleCard` | ❌ Wave 0 (neue Komponente) |
| UIX-01 | Kachel-Tap unter 8px Bewegung löst onAddToCart aus | unit | `cd client && npm run test -- ArticleCard` | ❌ Wave 0 |
| BST-01 | Kachel mit stock <= minStock hat amber-Rahmen | visual/manual | n/a — manuell auf iPad | n/a |
| BST-01 | LowStockBanner zeigt Produkt wenn stock <= minStock | unit | `cd client && npm run test -- LowStockBanner` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Kein automatischer Test-Run erforderlich (reine UI-Änderungen)
- **Per wave merge:** `cd client && npm run test`
- **Phase gate:** Manuelle Verifikation auf iPad-Safari vor `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `client/src/features/pos/ArticleCard.test.tsx` — Pointer-Event-Threshold-Tests (UIX-01)
- [ ] `client/src/features/pos/LowStockBanner.test.tsx` — Banner-Render-Tests (BST-01)

*(Hinweis: Da beide Anforderungen primär visuell/tactile sind, ist manuelle iPad-Verifikation der kritischere Validierungsschritt als Unit-Tests. Tests decken die Logik ab, nicht das Rendering.)*

## Sources

### Primary (HIGH confidence)
- MDN: Pointer Events — `pointerdown`, `pointerup`, `pointercancel` auf iOS Safari verifiziert
- MDN: `clientX`/`clientY` Properties auf PointerEvent — Movement-Berechnung
- React 19 Docs: Synthetic Event System — `onPointerDown`/`onPointerUp` Handler

### Secondary (MEDIUM confidence)
- Apple Developer Documentation: iOS Safari Touch Event Timing — Scroll-Geste startet ab ca. 10px Bewegung
- Codebase-Analyse (HIGH confidence): Direkter Code-Read aller betroffenen Dateien — ArticleGrid.tsx, POSScreen.tsx, LowStockBanner.tsx, ProductList.tsx, useLowStockCount.ts

### Tertiary (LOW confidence)
- Allgemeines Community-Wissen über 8px als Standard-Touch-Threshold — verbreitet, aber kein offizielles Spec-Dokument

## Metadata

**Confidence breakdown:**
- Touch-Event-Pattern: HIGH — basiert auf MDN-Docs und direkter Codebase-Analyse
- Bestandsampel-UI: HIGH — direkter Code-Read, klare visuelle Änderungen ohne neue Logik
- Threshold-Wert (8px): MEDIUM — etablierte Community-Praxis, kein iOS-Spec dazu

**Research date:** 2026-03-24
**Valid until:** 2026-09-24 (stabile Web-Platform-APIs, kein Verfallsrisiko)
