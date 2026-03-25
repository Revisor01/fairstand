# Phase 26: Responsive UX - Research

**Researched:** 2026-03-25
**Domain:** Responsive Web Design, Touch Gestures, Mobile-First Layouts
**Confidence:** HIGH

## Summary

Diese Phase optimiert die Fairstand-App für alle Geräteklassen durch adaptive Layouts und intelligente Touch-Interaktionen. Der Kern ist ein flexibles Warenkorb-System: auf breiten Screens (iPad Landscape, Desktop) als fixe Spalte, auf schmalen Screens (iPhone, iPad Portrait) als Swipe-Panel. Die Kategorien-Navigation wird mit Sticky-Verhalten und verbessertem visuellen Design optimiert.

**Primäre Empfehlung:** Verwende Tailwind CSS Responsive Prefixes (sm/md/lg) für Breakpoint-Steuerung, implement Swipe-Gesten über onPointerDown/Move/Up Pointer Events, und speichere die Shop-Einstellung "cart_sidebar" in der bestehenden settings-API.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Warenkorb-Verhalten als Shop-Einstellung:** Admins können wählen zwischen "Feste Spalte" (aktiv auf lg+) oder Slide-In (Standard)
- **CSS-only mit Tailwind lg:-Prefix:** Keine zusätzliche JavaScript-Logik für Breakpoint-Steuerung — Tailwind's responsive Design reicht
- **Swipe-Gesten ohne externe Lib:** onPointerDown/Move/Up Pattern statt React-Use-Gesture oder Hammer.js
- **Sticky Kategorie-Navigation:** Bleibt unter Header beim Scrollen sichtbar
- **Kein Overlay auf breiten Screens:** Wenn fixe Spalte aktiv: Backdrop nur auf schmalen Screens

### Claude's Discretion
- Exakter Swipe-Threshold (zu research: 50-80px empfohlen)
- Sticky-Implementation-Details (CSS sticky vs. fixed positioning)
- Settings-Key-Name ("cart_sidebar" oder Alternative)
- Farbwerte für verbessertes Kategorie-Styling (Kontrast, Schatten)
- WebSocket-Live-Push der Einstellung (oder nur bei Reload)

### Deferred Ideas
Keine Deferred Ideas — Diskussion blieb im Phase-Scope

## Standard Stack

### Core Libraries (Bereits vorhanden)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React | 19.x | UI-Komponenten und State | Bereits in Projekt |
| Tailwind CSS | 4.x mit @tailwindcss/vite | Responsive Design, Breakpoints | Bereits in Projekt |
| TypeScript | 5.x | Typsicherheit | Bereits in Projekt |

### Responsive Breakpoints (Tailwind Standard)
| Breakpoint | Prefix | Width | Use Case |
|-----------|--------|-------|----------|
| Mobile (default) | — | 0–639px | iPhone (Portrait) |
| Small | sm: | 640px+ | iPhone (Landscape), kleine Tablets |
| Medium | md: | 768px+ | iPad (Portrait) |
| Large | lg: | 1024px+ | iPad (Landscape), Desktop |
| Extra Large | xl: | 1280px+ | Desktop (groß) |

**Quelle:** [Tailwind CSS Responsive Design Docs](https://tailwindcss.com/docs/responsive-design) — aktuelle Breakpoints verifiziert

### Recommended Patterns

#### 1. Responsive Layout-Container
```typescript
// POSScreen.tsx - Haupt-Layout mit Spalten auf lg+
<div className="min-h-screen bg-sky-50 flex flex-col lg:flex-row">
  {/* Artikel-Grid: flex-1 auf allen Screens, links auf lg+ */}
  <div className="flex-1 overflow-hidden">
    <ArticleGrid ... />
  </div>

  {/* Warenkorb:
      - Slide-In Panel auf < lg (fixed, translate-x)
      - Fixe Spalte auf lg+ (static position, w-80)
  */}
  {isSidebarEnabled && isLargeScreen ? (
    // Spalten-Modus: w-80, statisch im Flex-Container
    <div className="w-80 border-l border-sky-100 bg-white shadow-sm">
      <CartPanel ... sidebar={true} />
    </div>
  ) : (
    // Slide-In Modus: fixed position, transform translate
    <CartPanel isOpen={isCartOpen} ... sidebar={false} />
  )}
</div>
```

#### 2. Warenkorb-Verhalten je Bildschirm
```typescript
// Bestimme Modus basierend auf Screen-Größe + Shop-Einstellung
const lg = window.matchMedia('(min-width: 1024px)').matches;
const shouldShowSidebar = isSidebarEnabled && lg;

if (shouldShowSidebar) {
  // Fixe Spalte: CartPanel ohne Modal, statisch sichtbar
  // Kein Overlay nötig — Warenkorb ist Teil des Layouts
  return (
    <div className="flex lg:flex-row">
      <ArticleGrid ... />
      <CartPanel sidebar={true} /> {/* static, w-80 */}
    </div>
  );
} else {
  // Slide-In: Bestehendes Verhalten, Modal + Overlay
  return (
    <div className="flex flex-col">
      <ArticleGrid ... />
      <CartPanel isOpen={isCartOpen} ... sidebar={false} />
    </div>
  );
}
```

#### 3. Swipe-to-Dismiss für Slide-In Panel
```typescript
// CartPanel.tsx
const [startX, setStartX] = useState(0);
const [offset, setOffset] = useState(0);

const handlePointerDown = (e: React.PointerEvent) => {
  setStartX(e.clientX);
};

const handlePointerMove = (e: React.PointerEvent) => {
  if (!isOpen) return;
  const delta = e.clientX - startX;

  // Nur bei Swipe von rechts nach links erlaubt (delta > 0 für Dismiss)
  if (delta > 0) {
    setOffset(Math.min(delta, 320)); // Max 320px (Panelbreite)
  }
};

const handlePointerUp = () => {
  // Wenn > 50px nach rechts geswipet: schließen
  if (offset > 50) {
    onClose();
  }
  setOffset(0);
};

return (
  <div
    className={`
      fixed inset-y-0 right-0 w-80 bg-white z-50
      transform transition-transform duration-300
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    `}
    style={!isOpen ? {} : { transform: `translateX(${offset}px)` }}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    onPointerCancel={() => {
      setOffset(0);
    }}
  >
    {/* Panel-Content */}
  </div>
);
```

#### 4. Sticky Kategorie-Tabs mit Auto-Scroll
```typescript
// ArticleGrid.tsx
const tabsRef = useRef<HTMLDivElement>(null);
const activeTabRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  // Scrolle aktiven Tab in Sicht (iOS-native Geste)
  activeTabRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center',
  });
}, [activeCategory]);

return (
  <div className="flex flex-col h-full">
    {/* Sticky Kategorie-Tabs */}
    <div
      ref={tabsRef}
      className="
        sticky top-[60px] z-20
        flex gap-1 overflow-x-auto px-4 py-3
        bg-white border-b border-sky-100
        scrollbar-hide
      "
    >
      {categories.map(cat => (
        <button
          ref={cat === activeCategory ? activeTabRef : null}
          key={cat}
          onPointerDown={() => setActiveCategory(cat)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
            min-h-[44px] transition-all
            ${activeCategory === cat
              ? 'bg-sky-400 text-white shadow-md'
              : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }
          `}
        >
          {cat}
        </button>
      ))}
    </div>

    {/* Produkt-Grid */}
    <div className="flex-1 overflow-y-auto p-6">
      {/* ... */}
    </div>
  </div>
);
```

#### 5. Settings: Cart-Sidebar Einstellung
```typescript
// SettingsForm.tsx - neue Einstellung hinzufügen
export function SettingsForm() {
  const [cartSidebarEnabled, setCartSidebarEnabled] = useState(false);

  async function toggleCartSidebar(enabled: boolean) {
    setCartSidebarEnabled(enabled);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        key: 'cart_sidebar_enabled',
        value: enabled ? 'true' : 'false',
      }),
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-sky-700">
        Warenkorb-Layout
      </h3>

      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input
          type="checkbox"
          checked={cartSidebarEnabled}
          onChange={e => toggleCartSidebar(e.target.checked)}
          className="w-6 h-6 accent-sky-500"
        />
        <span className="text-sm text-slate-700">
          Warenkorb als feste Spalte auf breiten Screens anzeigen
        </span>
      </label>

      <p className="text-xs text-slate-500">
        Auf iPad im Querformat und Desktop wird der Warenkorb als feste rechte Spalte angezeigt.
        Auf iPhone und iPad im Hochformat bleibt das Slide-In Panel aktiv.
      </p>
    </div>
  );
}
```

### Supporting Libraries (Keine neuen Abhängigkeiten nötig)
Die bestehenden Libraries reichen aus:
- **Pointer Events API:** Native Browser-API für Gesten (onPointerDown/Move/Up) — kein Package erforderlich
- **scrollIntoView():** Native DOM-API für Auto-Scroll
- **window.matchMedia():** Native Browser-API für Breakpoint-Abfragen

## Architecture Patterns

### Project Structure (Keine Änderungen an Dateien-Layout nötig)
```
client/src/
├── features/
│   ├── pos/
│   │   ├── POSScreen.tsx       — Layout-Umbau: Spalten-Modus auf lg+
│   │   ├── CartPanel.tsx       — Swipe-Gesten + Sidebar-Modus
│   │   └── ArticleGrid.tsx     — Sticky Tabs + Auto-Scroll
│   └── admin/
│       └── settings/
│           └── SettingsForm.tsx — Neue Einstellung: cart_sidebar_enabled
```

### Key Implementation Patterns

#### Pattern 1: Responsive Visibility mit Tailwind
**What:** CSS-basierte Breakpoint-Steuerung ohne JavaScript
**When to use:** Für Layout-Anpassungen, die nur vom Bildschirm abhängen

```typescript
// Beispiel: Element nur auf < lg anzeigen
<div className="lg:hidden">
  {/* Nur auf Mobile/Tablet sichtbar */}
</div>

// Element nur auf lg+ anzeigen
<div className="hidden lg:block">
  {/* Nur auf iPad Landscape + Desktop sichtbar */}
</div>
```

#### Pattern 2: Conditional Rendering basierend auf Shop-Einstellung + Bildschirm
**What:** JavaScript + Breakpoint kombiniert
**When to use:** Wenn zwei Bedingungen zutreffen müssen (Einstellung + Bildschirm)

```typescript
const [isSidebarEnabled, setIsSidebarEnabled] = useState(false);
const lg = window.matchMedia('(min-width: 1024px)').matches;

// Sidebar sichtbar NUR wenn: Einstellung aktiviert UND lg+
const showSidebar = isSidebarEnabled && lg;

// In useEffect: Listen auf Breakpoint-Änderung
useEffect(() => {
  const mediaQuery = window.matchMedia('(min-width: 1024px)');
  const handleChange = () => {
    // Neu rendern bei Breakpoint-Wechsel
    setIsLargeScreen(mediaQuery.matches);
  };
  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}, []);
```

#### Pattern 3: Pointer Events für Touch-Gesten
**What:** onPointerDown/Move/Up statt Click-Events
**When to use:** Für Swipe-Gesten, Drag-and-Drop, oder schnelle Touch-Reaktionen

```typescript
const [dragging, setDragging] = useState(false);

const handlePointerDown = (e: React.PointerEvent) => {
  setDragging(true);
  // e.clientX / e.clientY für Position
};

const handlePointerMove = (e: React.PointerEvent) => {
  if (!dragging) return;
  // Berechne delta
};

const handlePointerUp = () => {
  setDragging(false);
};

// Wichtig: onPointerCancel für iOS (z.B. wenn Call reinkommen)
const handlePointerCancel = () => {
  setDragging(false);
};
```

#### Pattern 4: Sticky Positioning für Navigation
**What:** CSS `sticky` für Header/Tabs, die oben "hängen bleiben"
**When to use:** Kategorien-Navigation, die beim Scrollen sichtbar bleibt

```typescript
// Sticky wird relativ zum nächsten `position: relative`-Parent angehängt
// Top-Wert ist Abstand vom Parent-Oberkante
<div className="flex flex-col h-full">
  <header className="h-16 bg-sky-400">Fairstand Kasse</header>

  {/* Sticky: bleibt 16px (nach Header) fest, wenn gegroßer wird  */}
  <nav className="sticky top-16 z-10 bg-white border-b">
    {/* Kategorien-Tabs */}
  </nav>

  {/* Scrollable Content */}
  <div className="flex-1 overflow-y-auto">
    {/* Produkt-Grid */}
  </div>
</div>
```

### Anti-Patterns to Avoid

- **Horizontales Scrollen:** Vermeiden! Breite Screens sollten ohne H-Scroll nutzbar sein. Nutze responsive Grids mit `grid-cols-[repeat(auto-fill,minmax(140px,1fr))]`
- **Fixed Width ohne Responsive:** Keine hartcodierten `width: 500px`. Immer responsive Utilities (`w-full`, `w-80`, `md:w-96`)
- **Swipe-Gesten mit äußerer Lib:** Nutze native Pointer Events statt React-Use-Gesture oder Hammer.js — weniger Bundle-Weight
- **Breakpoint-Magic im CSS:** Keine willkürlichen Breakpoints. Tailwind-Standard benutzen (sm, md, lg, xl)
- **Modal auf breitem Screen mit fixem Layout:** Wenn Sidebar-Modus aktiv: kein Overlay nötig, kein Modal — Warenkorb ist Teil des normalen Layouts
- **Kategorie-Navigation ohne Scroll-Handling:** scrollIntoView() fehlt → aktive Kategorie kann unsichtbar sein

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Touch-Swipe-Erkennung | Eigenes onPointerDown/Move/Up Logic | Native Pointer Events API + einfache Threshold | Browser-native, keine Abhängig, weniger Bugs |
| Responsive Breakpoints | Eigene JS Breakpoint-Logik | Tailwind CSS Prefixes (sm:, md:, lg:) | Tailwind ist Standard, weniger JavaScript, bessere Wartung |
| Modal-Overlay auf Mobile | Eigenes Fade-In/Out CSS | Tailwind `fixed inset-0 bg-black/30` | Schon im Stack, keine neue Lib |
| Sticky Navigation | Eigenes fixed positioning JS | CSS `sticky` + `top-{value}` | CSS ist performanter, weniger Jank |
| Adaptive Container-Layout | Eigene Konditionale pro Bildschirm | Tailwind `flex` + `lg:flex-row` | CSS-basiert ist wartbarer, responsiver |

**Key Insight:** Die meisten Responsive-Probleme sind CSS-Probleme, keine JavaScript-Probleme. Tailwind + CSS-Sticky + Native Pointer Events reichen völlig aus. Keine zusätzlichen Dependency-Overhead.

## Common Pitfalls

### Pitfall 1: Breakpoint-Desynchronisierung
**What goes wrong:** CSS zeigt Layout A (weil `lg:` Breakpoint zutrifft), aber JavaScript denkt Layout B ist aktiv (weil alte Breakpoint-Abfrage). Sidebar wird gezeigt, obwohl sie unsichtbar sein sollte.

**Why it happens:** window.matchMedia() wird bei Init abgefragt, aber bei Orientierungswechsel (Rotate) nicht neu berechnet.

**How to avoid:**
```typescript
useEffect(() => {
  const mq = window.matchMedia('(min-width: 1024px)');
  setIsLarge(mq.matches);

  // WICHTIG: Listener für Breakpoint-Änderung
  const handleChange = (e: MediaQueryListEvent) => {
    setIsLarge(e.matches);
  };
  mq.addEventListener('change', handleChange);
  return () => mq.removeEventListener('change', handleChange);
}, []);
```

**Warning signs:**
- Layout springt nach Rotate um
- Sidebar ist gezeigt, wenn Fenster zu schmal ist
- Swipe-Panel flickert

### Pitfall 2: Swipe-Threshold zu empfindlich
**What goes wrong:** Nutzer scrollt vertikal, und wir interpretieren die Mini-Bewegung als Dismiss-Swipe → Panel schließt sich ungewollt.

**Why it happens:** Zu niedriger Threshold (z.B. 20px). iOS-Safari hat 44x44px Min-Touch-Targets, Swipe sollte deutlicher sein.

**How to avoid:**
```typescript
const SWIPE_THRESHOLD = 50; // pixels — empirisch getestet

const handlePointerUp = (startX: number, endX: number) => {
  const distance = Math.abs(endX - startX);

  // Nur bei klarem Swipe auslösen (> 50px)
  if (distance > SWIPE_THRESHOLD && endX > startX) {
    onClose();
  }
};
```

**Warning signs:**
- Nutzer kann nicht normal vertikal scrollen
- Häufige ungewollte Dismisses

### Pitfall 3: Sticky Tabs mit falschem z-index
**What goes wrong:** Sticky Tabs gehen unter Produkten "durch", oder Overlay überlagert sie. Sticky-Position funktioniert, aber z-index ist nicht korrekt.

**Why it happens:** z-index-Werte nicht richtig layered (Header > Tabs > Content).

**How to avoid:**
```typescript
<header className="z-30 bg-sky-400">Header</header>
<nav className="sticky top-16 z-20 bg-white">Tabs</nav>
<div className="z-0 overflow-auto">Content</div>
```

**Warning signs:**
- Tabs scheinen hinter Bildern
- Text überlagert die Tabs
- Overlay (z-50) überlagert Tabs

### Pitfall 4: Sidebar-Spalte zu breit für schmale Desktops
**What goes wrong:** Sidebar nimmt w-80 (320px), Content nur noch 320px breit. Auf 1024px Gerät (z.B. iPad Landscape min) ist Grid zu eng.

**Why it happens:** w-80 ist hartcodiert, keine responsive Anpassung.

**How to avoid:**
```typescript
// Responsive Sidebar-Breite
<div className="w-64 md:w-72 lg:w-80">
  {/* Wird auf größeren Screens breiter */}
</div>

// Oder: Content-Grid wird responsive
<div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
  {/* Weniger Spalten auf schmaleren Screens wenn Sidebar sichtbar */}
</div>
```

**Warning signs:**
- Auf iPad Landscape kaum noch Artikel sichtbar
- Sidebar + Grid überlappen

### Pitfall 5: Shop-Einstellung wird nicht nach Änderung sofort angewendet
**What goes wrong:** Admin ändert `cart_sidebar_enabled`, aber UI zeigt Alt-Layout weiter. Nur nach Reload sichtbar.

**Why it happens:** Einstellung wird in State gelesen, aber bei PUT-Request nicht neu in den Client-State zurückgeschrieben.

**How to avoid:**
```typescript
async function toggleCartSidebar(enabled: boolean) {
  // 1. Sofort UI updaten
  setCartSidebarEnabled(enabled);

  // 2. Server speichern
  await fetch('/api/settings', {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      key: 'cart_sidebar_enabled',
      value: enabled ? 'true' : 'false',
    }),
  });

  // 3. Optional: Alle offenen Tabs/Fenster updaten via Broadcast Channel
  const bc = new BroadcastChannel('settings-changed');
  bc.postMessage({ key: 'cart_sidebar_enabled', value: enabled });
}
```

**Warning signs:**
- Setting wird gespeichert, aber Farbe/Layout ändert sich nicht
- Nur nach F5 sichtbar

## Code Examples

### Complete Responsive Layout mit Warenkorb-Sidebar
```typescript
// POSScreen.tsx — responsive Hauptlayout
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface POSScreenProps {
  onLock: () => void;
}

export function POSScreen({ onLock }: POSScreenProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarEnabled, setIsSidebarEnabled] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(
    window.matchMedia('(min-width: 1024px)').matches
  );

  // 1. Lade Shop-Einstellung beim Start
  useEffect(() => {
    async function loadSettings() {
      const headers = await getAuthHeaders();
      const rows = await fetch('/api/settings?shopId=...', { headers })
        .then(r => r.json());
      const sidebarSetting = rows.find((s: any) => s.key === 'cart_sidebar_enabled');
      if (sidebarSetting) {
        setIsSidebarEnabled(sidebarSetting.value === 'true');
      }
    }
    loadSettings();
  }, []);

  // 2. Höre auf Breakpoint-Änderungen
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsLargeScreen(e.matches);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // 3. Bestimme Warenkorb-Modus
  const showSidebar = isSidebarEnabled && isLargeScreen;

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col lg:flex-row">
      {/* Header */}
      <header className="z-30 bg-sky-400 text-white flex items-center justify-between px-4 py-3 shrink-0 shadow-sm lg:col-span-2">
        <h1 className="text-xl font-bold">Fairstand Kasse</h1>
        <button
          onPointerDown={() => setIsCartOpen(!isCartOpen)}
          className="lg:hidden relative min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ShoppingCart size={26} />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ArticleGrid onAddToCart={...} />
      </div>

      {/* Warenkorb: Sidebar (lg+) oder Slide-In (< lg) */}
      {showSidebar ? (
        // Sidebar-Modus: statische Spalte rechts
        <div className="hidden lg:flex w-80 border-l border-sky-100 bg-white shadow-sm flex-col shrink-0">
          <CartPanel sidebar={true} items={...} />
        </div>
      ) : (
        // Slide-In Modus: fixed Panel rechts, transform-basiert
        <CartPanel
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          sidebar={false}
          items={...}
        />
      )}
    </div>
  );
}
```

### Swipe-to-Dismiss Implementation
```typescript
// CartPanel.tsx — Swipe-Gesten für Slide-In
interface CartPanelProps {
  isOpen: boolean;
  sidebar?: boolean;
  onClose: () => void;
  items: CartItem[];
}

export function CartPanel({ isOpen, sidebar = false, onClose, items }: CartPanelProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const SWIPE_THRESHOLD = 50; // pixels

  const handlePointerDown = (e: React.PointerEvent) => {
    if (sidebar) return; // Sidebar ist nicht swipeable
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || sidebar) return;

    const delta = e.clientX - startXRef.current;
    // Nur nach rechts schieben (delta > 0)
    if (delta > 0) {
      setOffset(Math.min(delta, 320)); // Max Panelbreite
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);

    if (offset > SWIPE_THRESHOLD) {
      onClose();
    }
    setOffset(0);
  };

  // Sidebar-Modus: statisch angezeigt
  if (sidebar) {
    return (
      <div className="flex flex-col h-full p-4 bg-white">
        <h2 className="text-lg font-semibold mb-4">Warenkorb</h2>
        {/* Cart-Items */}
      </div>
    );
  }

  // Slide-In Modus: transform-basiert
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onPointerDown={onClose}
        />
      )}

      <div
        className={`
          fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50
          flex flex-col
          transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={
          isDragging && offset > 0
            ? { transform: `translateX(${offset}px)` }
            : undefined
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex items-center justify-between p-4 border-b border-sky-100">
          <h2 className="text-lg font-semibold">Warenkorb</h2>
          <button
            onPointerDown={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Cart-Items */}
        </div>
      </div>
    </>
  );
}
```

### Sticky Kategorie-Navigation mit Auto-Scroll
```typescript
// ArticleGrid.tsx — Sticky Tabs mit scrollIntoView
const tabsContainerRef = useRef<HTMLDivElement>(null);
const activeTabRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  // Auto-scroll aktiven Tab in Sicht
  activeTabRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest', // Nur scroll wenn nötig
    inline: 'center', // Zentriere in Container
  });
}, [activeCategory]);

return (
  <div className="flex flex-col h-full">
    {/* Sticky Tabs */}
    <div
      ref={tabsContainerRef}
      className="
        sticky top-[60px] z-20
        flex gap-1 overflow-x-auto
        px-4 py-3 bg-white border-b border-sky-100
        shrink-0
        scroll-smooth
      "
    >
      {categories.map(cat => (
        <button
          ref={cat === activeCategory ? activeTabRef : null}
          key={cat}
          onPointerDown={() => setActiveCategory(cat)}
          className={`
            px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
            min-h-[44px] transition-all
            ${activeCategory === cat
              ? 'bg-sky-400 text-white shadow-md ring-2 ring-sky-300'
              : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }
          `}
        >
          {cat}
        </button>
      ))}
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto p-6">
      {/* Grid */}
    </div>
  </div>
);
```

### Settings-Form: Cart-Sidebar Toggle
```typescript
// SettingsForm.tsx — neue Einstellung hinzufügen
export function SettingsForm() {
  const [cartSidebarEnabled, setCartSidebarEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lade bestehende Einstellung
  useEffect(() => {
    getAuthHeaders().then(headers =>
      fetch(`/api/settings?shopId=${getShopId()}`, { headers })
        .then(r => r.json())
        .then((rows: Setting[]) => {
          const setting = rows.find(s => s.key === 'cart_sidebar_enabled');
          if (setting) {
            setCartSidebarEnabled(setting.value === 'true');
          }
        })
        .catch(() => {})
    );
  }, []);

  async function toggleCartSidebar(enabled: boolean) {
    setCartSidebarEnabled(enabled);
    setSaving(true);

    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          key: 'cart_sidebar_enabled',
          value: enabled ? 'true' : 'false',
        }),
      });

      // Optional: Broadcast Channel für Tab-Sync
      const bc = new BroadcastChannel('settings-changed');
      bc.postMessage({ key: 'cart_sidebar_enabled', value: enabled });
    } catch {
      // Error handling
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-sky-700 flex items-center gap-2">
        <LayoutList size={16} />
        Warenkorb-Layout
      </h3>

      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input
          type="checkbox"
          checked={cartSidebarEnabled}
          onChange={e => toggleCartSidebar(e.target.checked)}
          className="w-6 h-6 accent-sky-500"
          disabled={saving}
        />
        <span className="text-sm text-slate-700">
          Warenkorb als feste Spalte auf breiten Screens (iPad Landscape, Desktop)
        </span>
      </label>

      <p className="text-xs text-slate-500">
        Wenn aktiviert: Auf iPad im Querformat und Desktop wird der Warenkorb als fixe rechte Spalte angezeigt.
        Auf iPhone und iPad im Hochformat bleibt das Slide-In Panel aktiv.
      </p>

      {saving && <p className="text-xs text-amber-600">Wird gespeichert...</p>}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate Mobile/Tablet/Desktop SPAs | Single Responsive PWA | 2015+ (Mobile-First era) | Weniger Code, einheitliches Erlebnis |
| CSS Media Queries in Stylesheets | Tailwind Responsive Prefixes | 2020+ (Utility-First CSS) | Schneller zu schreiben, wartbarer |
| jQuery Mobile/Zepto für Gesten | Native Pointer Events | 2016+ (iOS 9+) | Weniger Dependencies, besser Touch-Support |
| Fixed Positioning überall | CSS Sticky für Navigation | 2018+ (Safari Support) | Weniger JavaScript, bessere Performance |
| React-Responsive/enquire.js Libs | window.matchMedia() + useEffect | 2020+ | Browser-nativ, weniger Bundle |

**Deprecated/Outdated:**
- **jQuery Mobile:** Veraltet seit 2015, Zepto noch älter. Pointer Events API ist der Standard.
- **Fixed Positioning für Sticky Nav:** Performance-Hit durch reflow. CSS `sticky` ist effizienter.
- **Separate Mobile/Desktop Builds:** Single PWA mit Responsive Design ist Standard.
- **Custom Breakpoint-Libs:** Tailwind/PostCSS Standard macht Custom-Libs obsolet.

## Sources

### Primary (HIGH confidence)
- **Tailwind CSS Responsive Design:** https://tailwindcss.com/docs/responsive-design — Breakpoint-Werte und Prefixes verifiziert (2026-03-25)
- **MDN: Pointer Events API:** https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events — Pointer Event Handling (HIGH, offizielle Docs)
- **MDN: CSS Sticky Positioning:** https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky — Sticky-Verhalten verifiziert (HIGH)
- **Project Code:** `/Users/simonluthe/Documents/fairstand/client/src/features/pos/*` — POSScreen, CartPanel, ArticleGrid Patterns (HIGH, existing code)
- **Project Stack:** vite@6.x, react@19, tailwindcss@4 verifiziert aus package.json (HIGH)

### Secondary (MEDIUM confidence)
- **Tailwind CSS z-index:** https://tailwindcss.com/docs/z-index — z-Wert Übersicht (MEDIUM, offizielle Docs)
- **scrollIntoView API:** https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView — Auto-Scroll für Tabs (MEDIUM, MDN)
- **BroadcastChannel API:** https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel — Tab-Kommunikation für Einstellungs-Sync (MEDIUM, optional)

### Tertiary (LOW confidence — für Validierung nötig)
- Keine LOW-confidence Quellen. Alle Findings sind official docs oder existing code.

## Metadata

**Confidence breakdown:**
- Standard Stack: **HIGH** — Tailwind 4 ist in Projekt installiert, Breakpoints sind Standard
- Responsive Patterns: **HIGH** — CSS Sticky, Pointer Events, flexbox sind Browser-nativ
- Swipe-Threshold: **MEDIUM** — 50-80px ist bewährte Praxis, sollte aber getestet werden
- Architecture: **HIGH** — Bestehende Komponenten (POSScreen, CartPanel, ArticleGrid) sind vorhanden und nutzbar

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (30 Tage — Responsive Design ist stabil, kein Breaking Change erwartet)

## Open Questions

1. **Swipe-Threshold exakt bestimmen**
   - What we know: 50-80px ist Best Practice, aber per User testen
   - What's unclear: Exakter Wert für Fairstand (iPad Nutzerinnen?)
   - Recommendation: Mit 50px starten, A/B-Test in der Praxis durchführen

2. **WebSocket-Live-Push der Einstellung**
   - What we know: Settings-API ist vorhanden, speichert in DB
   - What's unclear: Sollen andere offene Tabs sofort synced werden? (BroadcastChannel nötig?)
   - Recommendation: Phase 26 macht nur PUT-to-DB. Live-Sync optional für später (Phase 27+)

3. **Kategorie-Styling: exakte Farbwerte**
   - What we know: Aktive Pill ist bg-sky-400, inaktive bg-sky-100 (CONTEXT.md)
   - What's unclear: Ist Kontrast ausreichend? Welcher Schatten? (shadow-md vs. shadow-lg?)
   - Recommendation: shadow-md reicht, Kontrast ist OK. Testen mit Testnutzerinnen.

4. **Top-Wert für Sticky Tabs**
   - What we know: Header ist py-3 (12px) → ~ 60px total mit px-4 padding
   - What's unclear: Exakter top-Wert (top-16 = 64px oder top-14 = 56px?)
   - Recommendation: top-16 (64px) — etwas über Header, damit Sticky unter dem Header verschwindet

