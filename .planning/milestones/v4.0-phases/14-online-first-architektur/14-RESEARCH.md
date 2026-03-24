# Phase 14: Online-First Architektur - Research

**Researched:** 2026-03-24
**Domain:** Dexie.js Bulk-Sync, Offline-Guard-Pattern, React State Management
**Confidence:** HIGH — vollständige Codebase-Analyse, kein externer Stack-Research nötig

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ARCH-01 | downloadProducts() ersetzt den gesamten Dexie-Produktbestand durch Server-Daten — kein LWW, komplettes Replace | Dexie transaction: clear() + bulkPut() in einer Transaktion; engine.ts Zeilen 86–111 entfernen |
| ARCH-02 | Admin-Features (Produktverwaltung, Import, Berichte, Einstellungen) sind offline deaktiviert mit klarem Hinweis | AdminScreen.tsx Tab-Content ersetzen durch OfflineGuard-Komponente wenn !navigator.onLine |
| ARCH-03 | Offline funktionieren nur Verkauf, Storno und Einzelrückgabe — Outbox + lokaler Bestandszähler bleiben erhalten | useCart/StockAdjust/Storno bleiben unverändert; fire-and-forget Schreibwege in ProductForm + ImportScreen blockieren wenn offline |
</phase_requirements>

---

## Summary

Die aktuelle Sync-Architektur implementiert Last-Writer-Wins (LWW) per Produkt — `downloadProducts()` vergleicht `updatedAt`-Timestamps und überspringt Produkte, bei denen der lokale Timestamp neuer ist. Das führt zu drei Problemen: (1) Produkte die der Admin auf dem Server deaktiviert hat, bleiben in Dexie aktiv wenn ein Client die Deaktivierung offline verpasst hat. (2) Gelöschte Produkte verbleiben dauerhaft in Dexie, weil der Server sie nicht mehr schickt aber nichts sie lokal löscht. (3) Fire-and-forget PATCHes (`handleToggleActive`, `ProductForm.handleSave`) setzen `updatedAt` lokal auf `Date.now()` vor dem PATCH — späterer `downloadProducts()` ignoriert dann die Server-Wahrheit.

Die Lösung ist ein atomares Replace: innerhalb einer Dexie-Transaktion alle Produkte des Shops löschen, dann den Server-Stand per `bulkPut()` einsetzen. Das ist O(n) in Dexie und braucht keine Timestamp-Vergleiche. Für die Reconnect-Sequenz gilt: erst `flushOutbox()` abwarten (damit Server den aktuellen Bestand kennt), dann `downloadProducts()` — sonst zeigt der Client nach dem Replace einen Stand ohne die gerade gesyncten Bestandsänderungen.

Admin-Features (Produkte, Import, Berichte, Einstellungen) müssen bei `!navigator.onLine` einen Offline-Hinweis zeigen statt funktionsfähig zu sein. Das verhindert, dass fire-and-forget Schreibwege überhaupt ausgelöst werden. POSScreen, CartPanel, StockAdjustModal (über Outbox) und Storno/Rückgabe bleiben offline-fähig.

**Primary recommendation:** Ein atomares `db.transaction('rw', db.products, () => db.products.where('shopId').equals(shopId).delete() + db.products.bulkPut(serverProducts))` ersetzt den gesamten LWW-Block in `engine.ts`. Danach sind alle fire-and-forget Schreibwege in Admin-Komponenten obsolet und können entfernt werden.

---

## Vollständige Code-Inventur

### ARCH-01: downloadProducts() — was sich ändert

**Aktueller Code (`client/src/sync/engine.ts`, Zeilen 81–112):**

```typescript
// MUSS ENTFERNT WERDEN: LWW-Loop
for (const sp of serverProducts) {
  const existing = await db.products.get(mapped.id);
  if (!existing || mapped.updatedAt > existing.updatedAt) {  // <-- LWW-Check weg
    await db.products.put(mapped);
    upserted++;
  }
}
```

**Neuer Code — atomares Replace in einer Dexie-Transaktion:**

```typescript
export async function downloadProducts(): Promise<number> {
  const shopId = getShopId();
  const res = await fetch(`/api/products?shopId=${shopId}`);
  if (!res.ok) throw new Error(`Download fehlgeschlagen: ${res.status}`);
  const serverProducts: ServerProduct[] = await res.json();

  const mapped: Product[] = serverProducts.map(sp => ({
    id: sp.id,
    shopId: sp.shopId,
    articleNumber: sp.articleNumber,
    name: sp.name,
    category: sp.category,
    purchasePrice: sp.purchasePrice,
    salePrice: sp.salePrice,
    vatRate: sp.vatRate,
    stock: sp.stock,
    minStock: sp.minStock,
    active: Boolean(sp.active),
    imageUrl: sp.imageUrl ?? undefined,
    updatedAt: sp.updatedAt,
  }));

  await db.transaction('rw', db.products, async () => {
    await db.products.where('shopId').equals(shopId).delete();
    await db.products.bulkPut(mapped);
  });

  return mapped.length;
}
```

**Wichtig:** Das `ServerProduct`-Interface und die `mapped`-Umwandlung bleiben erhalten. Nur der for-Loop + LWW-Check verschwindet. Die Rückgabe ändert sich von `upserted` (Anzahl neuer) zu `mapped.length` (Gesamtanzahl) — das ist akkurater für das Feedback-Label in `ProductList.handleDownloadSync`.

### ARCH-01: flushOutbox → downloadProducts Sequenz

**Aktueller Code (`engine.ts`, Zeile 57):**

```typescript
// Nach erfolgreichem Flush: fire-and-forget
downloadProducts().catch(() => {}); // fire-and-forget
```

Hier liegt ein Problem: `flushOutbox()` gibt das Promise von `downloadProducts()` nicht ab — das Sync-Ergebnis ist nicht zuverlässig sequenziell. Bei Online-Events ist das bisher unkritisch, aber mit Server-Replace ist Reihenfolge zwingend:

1. `flushOutbox()` submitted Bestandsänderungen (STOCK_ADJUST, SALE_COMPLETE etc.)
2. Erst danach ist der Server-Bestand korrekt
3. Erst dann `downloadProducts()` — sonst zeigt der Client veraltete Bestandszahlen

**Neue Sequenz in `flushOutbox()`:** Das fire-and-forget bleibt (`downloadProducts().catch(() => {})`), aber die Sequenz innerhalb von `flushOutbox()` ist bereits korrekt — `downloadProducts()` wird erst nach dem `await db.outbox.bulkDelete(ids)` aufgerufen. Das ist hinreichend.

**`triggers.ts`:** Nur `flushOutbox()` auslösen — `downloadProducts()` kommt über den `flushOutbox`-internen Aufruf. Kein eigener `downloadProducts()`-Trigger nötig.

**`App.tsx` (UnlockedApp):** Beim Login-Mount wird `downloadProducts()` direkt aufgerufen (Zeilen 15–18). Hier ist keine Outbox, also kein Problem. Dieser Aufruf bleibt.

### ARCH-02: Admin-Offline-Guard

**Betroffene Dateien:**

| Datei | Was passiert offline |
|-------|----------------------|
| `client/src/features/admin/AdminScreen.tsx` | Tab-Content der 4 Tabs zeigt Offline-Banner statt Inhalt |
| `client/src/features/admin/products/ProductList.tsx` | Via AdminScreen gesperrt |
| `client/src/features/admin/products/ProductForm.tsx` | Via AdminScreen gesperrt |
| `client/src/features/admin/products/StockAdjustModal.tsx` | ACHTUNG: bleibt online-only (kein Outbox-Pattern nötig, ist bereits Outbox) |
| `client/src/features/admin/import/ImportScreen.tsx` | Via AdminScreen gesperrt |
| `client/src/features/admin/reports/DailyReport.tsx` | Via AdminScreen gesperrt |
| `client/src/features/admin/reports/MonthlyReport.tsx` | Via AdminScreen gesperrt (hat bereits `navigator.onLine`-Check, aber Modal wäre noch zugänglich) |
| `client/src/features/admin/settings/SettingsForm.tsx` | Via AdminScreen gesperrt |

**Empfohlener Ansatz:** Den Guard zentral in `AdminScreen.tsx` im Tab-Content-Block setzen, nicht in jeder Unterkomponente. `AdminScreen` rendert nur die Tab-Navigation, der `<main>`-Block prüft `navigator.onLine`:

```tsx
// In AdminScreen.tsx — useOnlineStatus Hook oder direktes State-Management
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

Dann im `<main>`:

```tsx
<main className="flex-1 p-6">
  {!isOnline ? (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
      <p className="text-slate-500 text-base font-medium">Internetverbindung erforderlich</p>
      <p className="text-slate-400 text-sm">Die Verwaltung ist nur online verfügbar.</p>
    </div>
  ) : (
    <>
      {tab === 'products' && <ProductList />}
      {tab === 'reports' && ...}
      {tab === 'import' && <ImportScreen />}
      {tab === 'settings' && <SettingsForm />}
    </>
  )}
</main>
```

**StockAdjustModal** ist eine Sonderrolle: Es wird bereits aus der Produktliste geöffnet — wenn die Produktliste offline gesperrt ist, ist das Modal nicht erreichbar. Das Modal selbst braucht keinen eigenen Guard.

**Wichtig:** Der Verwaltung-Button in `POSScreen.tsx` (Zeile 174) führt zu `AdminScreen` — dort wird der Guard greifen. Der Button selbst muss nicht gesperrt werden, weil das auch offline-hilfreich ist (Nutzerin sieht den Hinweis statt gar nichts).

### ARCH-03: Fire-and-Forget Schreibwege die offline blockiert werden müssen

Mit dem AdminScreen-Guard werden diese Schreibwege nie offline ausgelöst. Zur Dokumentation alle fire-and-forget Schreibwege in Admin-Komponenten:

**`ProductForm.tsx` (handleSave):**
- Zeilen 88–95: `fetch('/api/products', { method: 'POST' })` — wird nur aufgerufen `if (navigator.onLine)` (bereits gecheckt), aber der lokale Dexie-Write (`db.products.update/add`) passiert trotzdem offline
- Mit Admin-Guard ist das nicht mehr erreichbar offline

**`ProductList.tsx` (handleToggleActive):**
- Zeilen 54–57: `fetch('/api/products/${product.id}/${action}', { method: 'PATCH' })` — fire-and-forget mit `if (navigator.onLine)`
- Kritischstes Problem: Lokal wird `updatedAt: Date.now()` gesetzt, dann PATCH schlägt still fehl → LWW-Problem
- Mit Admin-Guard ist das nicht mehr erreichbar offline

**`ImportScreen.tsx` (handleCommit):**
- Zeilen 146–153: `fetch('/api/products', { method: 'POST' })` für neue Produkte — fire-and-forget mit `if (navigator.onLine)`
- Der Rest (STOCK_ADJUST Outbox) bleibt korrekt
- Mit Admin-Guard ist Import offline nicht zugänglich

**Was NICHT blockiert wird (bleibt offline-fähig):**
- `StockAdjustModal.tsx`: Schreibt Outbox-Eintrag, kein fire-and-forget
- `useCart.ts`: Kein Netzwerkzugriff, rein lokaler Reducer-State
- `POSScreen.tsx` → `completeSale`: Schreibt in Dexie + Outbox
- Storno/Rückgabe (DailyReport → SaleDetailModal): Schreiben in Outbox

### Dexie-Transaktionsmuster für Bulk-Replace

Dexie 4.x unterstützt `db.transaction('rw', table, callback)` mit async Callback. Das ist O(n) über IndexedDB-Batch-API.

```typescript
// Korrekte Syntax für Dexie 4.x (aus State.md: Phase 02-backend-sync Entscheidung)
await db.transaction('rw', db.products, async () => {
  await db.products.where('shopId').equals(shopId).delete();
  await db.products.bulkPut(mapped);
});
```

**Performance-Einschätzung:** Bei typischer Produktliste (50–200 Produkte) ist das vernachlässigbar schnell. `bulkPut()` ist Dexies optimierter Batch-Insert-Pfad, nicht einzelne `put()`-Calls.

**Keine Schema-Migration nötig:** Das Dexie-Schema ändert sich nicht. `updatedAt` bleibt im Schema für spätere Zwecke (Phase 15: Warenkorb-Validierung nutzt es). Das Feld wird nicht mehr für LWW genutzt, aber das ist kein Problem.

---

## Architecture Patterns

### Pattern 1: Atomares Server-Replace in Dexie

**Was:** `clear()` + `bulkPut()` in einer R/W-Transaktion
**Warum sicher:** Falls `downloadProducts()` mitten im Laufen fehlschlägt (Netzwerkabbruch), wird die Transaktion von Dexie automatisch zurückgerollt — Dexie hat entweder den alten oder neuen Stand, nie einen halbfertigen Zustand
**Wichtig:** Die Transaktion umschließt nur die Dexie-Operationen, nicht den `fetch()` — `fetch()` läuft vor der Transaktion

### Pattern 2: Zentraler Online-Status in AdminScreen

**Was:** `useState(navigator.onLine)` + `online`/`offline` EventListener in `AdminScreen`
**Warum zentral statt in jeder Unterkomponente:** Einfachere Logik, ein einziger Guard für alle 4 Tabs, keine doppelten EventListener
**Alternative wäre:** Eigener `useOnlineStatus`-Hook der in mehreren Komponenten genutzt wird — für diesen Use-Case overkill

### Pattern 3: Reconnect-Sequenz

```
online-Event → triggers.ts → flushOutbox()
                                  ↓ (nach Erfolg)
                              downloadProducts()  ← atomares Replace
```

Die Sequenz ist bereits korrekt implementiert in `engine.ts` Zeile 57. Keine Änderung nötig. `downloadProducts()` läuft fire-and-forget nach dem Flush — das ist korrekt, weil ein fehlgeschlagener Download beim nächsten Trigger erneut versucht wird.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Nutzen statt dessen | Warum |
|---------|-------------------|---------------------|-------|
| Atomarer Bulk-Replace | Eigene Transaktionslogik | `db.transaction('rw', db.products, ...)` + `db.products.where(...).delete()` + `db.products.bulkPut()` | Dexie 4 handelt Rollback, IDB-Transaktions-Grenzen und Batch-Performance intern |
| Online-Status-Reaktivität | Polling mit `setInterval(() => navigator.onLine)` | `window.addEventListener('online' / 'offline')` + React State | Echte Browser-Events, kein Polling-Overhead |

---

## Common Pitfalls

### Pitfall 1: Transaktion umschließt fetch()

**Was schiefläuft:** `fetch()` innerhalb der Dexie-Transaktion aufrufen
**Warum es passiert:** Verführerisch, den ganzen Download-Block in die Transaktion zu packen
**Wie vermeiden:** `fetch()` vor `db.transaction(...)` abschließen. IDB-Transaktionen sind nicht für async I/O-Wartezeiten gedacht — sie time-outen wenn der Browser die Transaktion zu lange offen lässt
**Korrekt:**
```typescript
const serverProducts = await fetchFromServer(); // AUSSERHALB der Transaktion
await db.transaction('rw', db.products, async () => {
  await db.products.where('shopId').equals(shopId).delete();
  await db.products.bulkPut(mapped);
});
```

### Pitfall 2: shopId-Filterung beim Delete vergessen

**Was schiefläuft:** `db.products.clear()` löscht Produkte ALLER Shops, nicht nur des aktuellen
**Warum es passiert:** Schnelle Umsetzung ohne Berücksichtigung der Multi-Shop-Architektur
**Wie vermeiden:** Immer `db.products.where('shopId').equals(shopId).delete()` statt `db.products.clear()`
**Konsequenz:** In einer Multi-Laden-Umgebung würden die Daten des anderen Ladens gelöscht

### Pitfall 3: navigator.onLine ist kein zuverlässiger Online-Indikator

**Was schiefläuft:** `navigator.onLine === true` aber fetch() schlägt trotzdem fehl (z.B. Server nicht erreichbar, WLAN ohne Internet)
**Warum es passiert:** `navigator.onLine` prüft nur ob das Gerät irgendeine Netzwerkverbindung hat
**Wie vermeiden:** `try/catch` um `downloadProducts()` behalten (ist bereits vorhanden). Der Admin-Guard basiert auf `navigator.onLine` — das ist für diese Anwendung ausreichend: in der Kirche ist der Unterschied "offline" vs. "online aber Server nicht erreichbar" für die Nutzerin nicht relevant
**Hinweis:** Der Guard verhindert nicht, dass Admin-Features bei einem Server-Fehler versagen — das ist kein neues Problem

### Pitfall 4: Reconnect-Download zeigt alten Sync-Zähler

**Was schiefläuft:** `handleDownloadSync` in `ProductList.tsx` zeigt "3 Produkte aktualisiert" obwohl alle 120 Produkte ersetzt wurden
**Warum es passiert:** Rückgabewert von `downloadProducts()` war bisher "Anzahl neuer/geänderter" — mit Server-Replace ist es "Gesamtanzahl"
**Wie vermeiden:** Rückgabewert semantisch anpassen: `return mapped.length` statt `return upserted`. Das Feedback-Label in `ProductList.handleDownloadSync` bleibt "X Produkte aktualisiert" — passt auch für Replace

### Pitfall 5: visibilitychange-Trigger läuft ohne shopId

**Was schiefläuft:** `triggers.ts` ruft `flushOutbox()` auf, auch wenn noch kein Shop gesetzt ist (Auth-State: 'locked')
**Warum es passiert:** `registerSyncTriggers()` wird einmal beim App-Start registriert, unabhängig vom Auth-State
**Aktueller Status:** `flushOutbox()` ruft `getShopId()` nicht direkt auf — es liest `db.outbox.where('createdAt')...` ohne Shop-Filter. Bei leerem Outbox passiert nichts. Kein echtes Problem, aber erwähnenswert
**Konsequenz für Phase 14:** Kein Handlungsbedarf

---

## Code Examples

### Server-Replace (Kern der Phase)

```typescript
// Source: Dexie 4.x API — db.transaction() + bulkPut()
export async function downloadProducts(): Promise<number> {
  const shopId = getShopId();
  const res = await fetch(`/api/products?shopId=${shopId}`);
  if (!res.ok) throw new Error(`Download fehlgeschlagen: ${res.status}`);
  const serverProducts: ServerProduct[] = await res.json();

  const mapped: Product[] = serverProducts.map(sp => ({
    id: sp.id,
    shopId: sp.shopId,
    articleNumber: sp.articleNumber,
    name: sp.name,
    category: sp.category,
    purchasePrice: sp.purchasePrice,
    salePrice: sp.salePrice,
    vatRate: sp.vatRate,
    stock: sp.stock,
    minStock: sp.minStock,
    active: Boolean(sp.active),
    imageUrl: sp.imageUrl ?? undefined,
    updatedAt: sp.updatedAt,
  }));

  await db.transaction('rw', db.products, async () => {
    await db.products.where('shopId').equals(shopId).delete();
    await db.products.bulkPut(mapped);
  });

  return mapped.length;
}
```

### Online-Status Hook in AdminScreen

```typescript
// Inline in AdminScreen.tsx — kein eigener Hook nötig
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const onOnline = () => setIsOnline(true);
  const onOffline = () => setIsOnline(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}, []);
```

### Offline-Hinweis-Block in AdminScreen

```tsx
{!isOnline ? (
  <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
    <p className="text-slate-500 text-base font-medium">
      Internetverbindung erforderlich
    </p>
    <p className="text-slate-400 text-sm">
      Die Verwaltung ist nur online verfügbar.
    </p>
  </div>
) : (
  // ... Tab-Inhalte
)}
```

---

## Alle betroffenen Dateien

| Datei | Art der Änderung | Umfang |
|-------|------------------|--------|
| `client/src/sync/engine.ts` | LWW-Loop durch atomares Replace ersetzen | ~15 Zeilen löschen, ~10 neu |
| `client/src/features/admin/AdminScreen.tsx` | Online-Status-State + Offline-Guard im main-Block | ~20 Zeilen neu |

**Keine Änderungen nötig an:**
- `client/src/sync/triggers.ts` — Sequenz bereits korrekt
- `client/src/App.tsx` — `downloadProducts()`-Aufruf beim Mount bleibt
- `client/src/features/pos/useCart.ts` — rein lokaler State, unberührt
- `client/src/features/pos/POSScreen.tsx` — bleibt offline-fähig
- `client/src/features/admin/products/StockAdjustModal.tsx` — Outbox-Pattern korrekt
- `client/src/features/admin/products/ProductForm.tsx` — wird via AdminScreen-Guard offline gesperrt, keine Eigenänderungen nötig
- `client/src/features/admin/products/ProductList.tsx` — wird via AdminScreen-Guard offline gesperrt
- `client/src/features/admin/import/ImportScreen.tsx` — wird via AdminScreen-Guard offline gesperrt
- `client/src/db/schema.ts` — kein Schema-Change, `updatedAt` bleibt für spätere Phase-15-Nutzung

**Zu prüfen:** Der `syncResult`-Text in `ProductList.handleDownloadSync` ("X Produkte aktualisiert") — nach dem Replace ist der Rückgabewert `mapped.length` (Gesamtanzahl). Das Feedback-Label passt auch für Replace und muss nicht geändert werden.

---

## Open Questions

1. **Verhalten wenn Server 0 Produkte zurückgibt**
   - Was wir wissen: `bulkPut([])` nach `delete()` löscht alle Produkte und fügt keine neuen ein
   - Was unklar ist: Ist das gewünschtes Verhalten? (Shop ohne Produkte)
   - Empfehlung: Kein Guard nötig — 0 Produkte ist ein valider Serverzustand. Die Kasse zeigt "Keine Produkte verfügbar"

2. **Soll der Verwaltung-Button in POSScreen offline deaktiviert werden?**
   - Was wir wissen: Mit Admin-Guard sieht die Nutzerin einen Offline-Hinweis wenn sie auf Verwaltung tippt
   - Was unklar ist: Ist das besser als den Button offline auszublenden?
   - Empfehlung: Button sichtbar lassen — Hinweistext ist informativer als ein verschwundener Button

---

## Sources

### Primary (HIGH confidence)

- Dexie.js 4.x API — direkte Code-Analyse des Projekts (`client/src/sync/engine.ts`, `client/src/db/schema.ts`)
- React EventListener-Pattern — direkte Code-Analyse (`client/src/features/admin/AdminScreen.tsx`)

### Secondary (MEDIUM confidence)

- Dexie-Transaktionssemantik: IDB-Transaktions-Timeout-Verhalten bei async I/O ist bekanntes Browser-Implementierungsdetail (HIGH confidence durch STATE.md-Entscheidungen Phase 02)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — kein neuer Stack, nur bestehende Dexie 4.x API
- Architecture: HIGH — vollständige Codebase-Analyse, alle Dateipfade verifiziert
- Pitfalls: HIGH — aus direkter Code-Analyse abgeleitet, nicht nur Training-Wissen

**Research date:** 2026-03-24
**Valid until:** Stabil — keine externen Dependencies, nur interne Architekturänderungen
