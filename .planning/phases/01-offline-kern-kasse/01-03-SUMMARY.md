---
phase: 01-offline-kern-kasse
plan: 03
subsystem: pos-ui
tags: [pos, kasse, ui, dexie, warenkorb, bezahlung, spende]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [vollständige-kassen-ui, warenkorb-state, atomare-sale-transaktion]
  affects: [client/src/features/pos, client/src/App.tsx]
tech_stack:
  added: [dexie-react-hooks@4.2.0]
  patterns: [useLiveQuery-reaktiv, useReducer-warenkorb, dexie-transaktion-rw, cent-integer-arithmetik, slide-in-panel, numpad-buffer]
key_files:
  created:
    - client/src/features/pos/useCart.ts
    - client/src/features/pos/useSaleComplete.ts
    - client/src/features/pos/ArticleGrid.tsx
    - client/src/features/pos/CartPanel.tsx
    - client/src/features/pos/NumPad.tsx
    - client/src/features/pos/PaymentFlow.tsx
    - client/src/features/pos/SaleSummary.tsx
    - client/src/features/pos/POSScreen.tsx
    - client/src/features/pos/utils.ts
  modified:
    - client/src/App.tsx
    - client/package.json
decisions:
  - "dexie-react-hooks separat installiert: useLiveQuery ist in Dexie 4.x nicht im Hauptpaket enthalten"
  - "useLiveQuery mit explizitem Promise<Product[]>-Cast für strikte TypeScript-Typisierung"
  - "Preis-Snapshot im CartItem: salePrice beim Hinzufügen gespeichert, nie nachträglich aus DB aktualisiert"
  - "Korrigieren in Phase 1: Warenkorb mit Snapshot-Preisen neu befüllen, vollständige Storno-Logik ist DEFERRED"
metrics:
  duration: "~6 Minuten"
  completed: "2026-03-23T09:48:57Z"
  tasks: 2
  files: 10
requirements:
  - POS-01
  - POS-02
  - POS-03
  - POS-04
  - POS-05
  - POS-06
  - POS-07
  - UX-01
  - UX-02
  - UX-03
  - UX-04
---

# Phase 01 Plan 03: Kassen-UI Summary

**One-liner:** Vollständige Offline-Kasse mit reaktivem Artikel-Grid (useLiveQuery), Slide-In-Warenkorb (useReducer), Taschenrechner-Numpad mit Quick-Buttons, zweistufigem Wechselgeld/Spenden-Flow und atomarer Dexie-Transaktion (Sale + Bestandsdelta + OutboxEntry).

## What Was Built

Die eigentliche Kern-Kasse, die am ersten Gottesdienst einsetzbar ist. Alle Komponenten sind vollständig implementiert und TypeScript-clean gebaut.

### Task 1: useCart + useSaleComplete

**`useCart.ts`** — React-Hook mit `useReducer`:
- `ADD_ITEM`: Preis-Snapshot beim ersten Hinzufügen, quantity++ bei Duplikat
- `REMOVE_ITEM`, `UPDATE_QUANTITY` (≤0 → remove), `CLEAR`
- `total`: berechneter Wert `salePrice * quantity` summiert

**`useSaleComplete.ts`** — Atomare Dexie-Transaktion:
- Validierung: `paidCents < totalCents` → Fehler; `donationCents < 0` → Fehler
- `db.transaction('rw', [db.sales, db.products, db.outbox], ...)` — alles in einer Transaktion
- Bestandsreduzierung als Delta (`p.stock -= item.quantity`)
- OutboxEntry `SALE_COMPLETE` für spätere Sync-Phase

### Task 2: Kassen-UI Komponenten

**`ArticleGrid.tsx`**:
- `useLiveQuery` → `db.products.where('[shopId+active]').equals([SHOP_ID, 1]).toArray()`
- Kategorie-Tabs: "Alle" + alphabetisch sortierte unique Kategorien
- `grid-cols-[repeat(auto-fill,minmax(140px,1fr))]` — dynamisch fließend
- Kacheln: min-h-[80px], Name + Preis via `formatEur()`

**`CartPanel.tsx`**:
- `fixed inset-y-0 right-0` Slide-In mit `translate-x-full` / `translate-x-0` + `transition-transform duration-300`
- Overlay-Backdrop zum Schließen per Tap
- +/- Buttons (h-9 w-9, sky-100), Direkteingabe per `inputMode="numeric"`
- Footer: Gesamtsumme + "Bezahlen"-Button (h-14)

**`NumPad.tsx`**:
- Quick-Buttons: 5€, 10€, 20€, 50€ (hardcoded Standard, in v2 konfigurierbar)
- Buffer als String, Dezimalkomma europäisch, max 2 Nachkommastellen
- Konvertierung: `Math.round(parseFloat(buffer.replace(',', '.')) * 100)`
- Bestätigen: `bg-sky-400`, Löschen: `bg-rose-50`

**`PaymentFlow.tsx`**:
- Schritt 1: NumPad für Bezahlt-Betrag; Validierung paidCents ≥ totalCents
- Schritt 2: Info-Panel mit Gesamtpreis/Bezahlt/Differenz, Wechselgeld-Numpad, donationCents live als emerald-500 angezeigt
- "Abschließen"-Button ruft `onComplete(paidCents, changeCents)` auf

**`SaleSummary.tsx`**:
- Erfolgs-Icon (emerald-500 Haken), Umsatz/Wechselgeld/Spende
- "Nächster Kunde" (h-14, sky-400) + "Korrigieren" (rose-200 border)

**`POSScreen.tsx`**:
- `POSView = 'pos' | 'payment' | 'summary'` State Machine
- Orchestriert useCart + alle UI-Komponenten
- try/catch um completeSale mit Fehler-Banner

**`App.tsx`**: POSScreen eingebunden, Placeholder entfernt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `useLiveQuery` nicht in `dexie` Paket (Dexie 4.x)**
- **Found during:** Task 2 (erster Build-Versuch)
- **Issue:** Plan referenzierte `useLiveQuery` aus `dexie` oder `dexie-react-hooks`. In Dexie 4.x ist `useLiveQuery` nur in `dexie-react-hooks` verfügbar, nicht direkt im `dexie`-Paket.
- **Fix:** `dexie-react-hooks@4.2.0` installiert, Import auf `dexie-react-hooks` geändert
- **Files modified:** `client/package.json`, `client/src/features/pos/ArticleGrid.tsx`
- **Commit:** c495dd1

**2. [Rule 1 - Bug] TypeScript-Typen bei `useMemo` mit `useLiveQuery`-Rückgabe**
- **Found during:** Task 2 (Build-Fehler)
- **Issue:** `useLiveQuery` gibt `T | undefined` zurück, `categories` Array hatte `unknown[]` statt `string[]`
- **Fix:** Expliziter Return-Typ `(): string[]` im `useMemo`-Callback, `as Product[]`-Cast nach `products`-Check
- **Files modified:** `client/src/features/pos/ArticleGrid.tsx`
- **Commit:** c495dd1

## Known Stubs

**Keine.** Alle Daten-Verbindungen sind vollständig verdrahtet:
- ArticleGrid lädt Produkte reaktiv aus Dexie (Seed-Daten aus Plan 01-02 vorhanden)
- completeSale schreibt atomar in 3 Stores
- OutboxEntry für Sync vorbereitet (wird in Phase 2 verarbeitet)

Quick-Buttons (5€, 10€, 20€, 50€) sind hardcoded — gemäß Plan als "Standard in Phase 1, konfigurierbar in den Settings" geplant. Kein Stub, da Funktion vollständig vorhanden.

## Verification

**Automated Build-Check:** `npm run build` → 0 TypeScript-Fehler.

**Manuelle Verifikation (iPad/Chrome DevTools):**
1. App öffnen → PIN-Setup (6 Ziffern)
2. PIN einrichten → Artikel-Grid erscheint mit Kategorie-Tabs
3. Artikel antippen → Warenkorb öffnet sich von rechts
4. +/- und Direkteingabe ändern Menge
5. "Bezahlen" → NumPad mit Quick-Buttons
6. Betrag eingeben → Wechselgeld-Schritt mit Spende-Anzeige
7. Abschließen → Zusammenfassung
8. "Nächster Kunde" → Grid, leerer Warenkorb
9. IndexedDB: `fairstand-db → sales` enthält Verkauf

## Self-Check: PASSED

Alle 10 Dateien vorhanden. Beide Task-Commits (11c535e, c495dd1) verifiziert.
