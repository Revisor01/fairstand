# Phase 15: Datenintegrität - Research

**Researched:** 2026-03-24
**Domain:** Datenkonsistenz — Berichtsberechnungen, Storno-Filterung, Warenkorb-Persistenz, Cart-Validierung
**Confidence:** HIGH (alle Befunde direkt aus Codeanalyse, keine externen Quellen nötig)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DAT-01 | Marge/EK-Preis korrekt berechnen und in Berichten anzeigen | Bugs in reports.ts identifiziert: alle SQL-Queries filtern `cancelled_at IS NULL` nicht — stornierte Sales fließen in EK-Berechnung und sale_count ein |
| DAT-02 | Stornierte Verkäufe aus Umsatz-Statistiken und Top-Artikel-Rankings rausrechnen | Gleiche SQL-Queries: WHERE-Klausel fehlt `AND cancelled_at IS NULL` in summary, costResult, topArticles und product stats |
| DAT-03 | Warenkorb überlebt Page-Reload (Dexie-Persistenz) | useCart nutzt `useReducer` mit In-Memory-State — kein Dexie-Schema für Cart vorhanden, Dexie v7 Migration nötig |
| VAL-01 | Cart-Validierung — ungültige/veraltete Artikel im Warenkorb erkennen und behandeln | useCart kennt nur Stock-Check beim Hinzufügen, keine Validierung gegen aktuellen Produktzustand nach Reload |
</phase_requirements>

---

## Summary

Phase 15 besteht aus vier klar abgegrenzten Problemen, die alle durch Code-Analyse vollständig lokalisiert werden konnten — ohne externe API-Recherche.

**DAT-01/DAT-02 (Berichte):** Alle SQL-Queries in `server/src/routes/reports.ts` filtern stornierte Verkäufe nicht heraus. `cancelled_at` existiert als Spalte in der `sales`-Tabelle, wird aber in keiner Report-Query mit `AND cancelled_at IS NULL` eingeschränkt. Das betrifft `summary` (Anzahl + Umsatz), `costResult` (EK-Berechnung), `topArticles` (Top-5-Ranking) und das Produkt-Stats-Endpoint. Der `DailyReport.tsx` macht das hingegen korrekt mit einem clientseitigen `filter(s => !s.cancelledAt)`.

**DAT-03 (Warenkorb-Persistenz):** `useCart.ts` verwendet `useReducer` mit `initialState = { items: [] }` — reiner React-In-Memory-State. Es gibt keine `cart`-Tabelle in Dexie (`schema.ts` hat nur `products`, `sales`, `outbox`). Bei Page-Reload ist der Cart leer. Lösung: neue Dexie-Tabelle `cartItems` in Version 7, `useCart` liest beim Mount aus Dexie und schreibt bei jeder Änderung zurück.

**VAL-01 (Cart-Validierung):** `checkStockBeforeAdd` prüft nur beim Hinzufügen ob Stock > 0. Nach einem Download-Sync (der Products komplett ersetzt) können Cart-Items auf nicht mehr existente, deaktivierte oder preisgeänderte Produkte zeigen. Es gibt aktuell keine Validierung des gespeicherten Carts gegen den aktuellen Produktzustand.

**Primary recommendation:** Fixes in dieser Reihenfolge — (1) SQL-Fixes in reports.ts (ein Plan, keine Abhängigkeiten), (2) Dexie v7 + useCart-Persistenz + Validation (ein Plan, da Dexie-Migration und Cart-Hook eng zusammenhängen).

---

## Standard Stack

Kein neuer Stack nötig. Alle Tools sind bereits installiert.

### Core (bereits vorhanden)
| Library | Version | Purpose | Warum relevant |
|---------|---------|---------|----------------|
| Dexie.js | 4.x | IndexedDB-Wrapper | Cart-Persistenz via neue Tabelle `cartItems` |
| dexie-react-hooks | vorhanden | `useLiveQuery` | Cart-State reaktiv aus Dexie lesen |
| better-sqlite3 + Drizzle | vorhanden | Server-DB | SQL-Fixes in reports.ts |
| React `useReducer` | vorhanden | Cart-State | Bleibt erhalten, wird um Dexie-Sync ergänzt |

### Kein neuer Paketinstall nötig

---

## Architecture Patterns

### Empfohlene Projektstruktur (Änderungen)

```
client/src/
├── db/schema.ts               # +version(7) mit cartItems-Tabelle
├── features/pos/
│   └── useCart.ts             # useReducer + Dexie-Sync Pattern
server/src/routes/
└── reports.ts                 # WHERE cancelled_at IS NULL überall einfügen
```

### Pattern 1: Dexie v7 Migration — neue cartItems-Tabelle

**Was:** `cartItems` als neue Tabelle mit `productId` als Primary Key. Kein Auto-Increment nötig — ein Produkt kann immer nur einmal im Cart sein (Quantity-Tracking).

**Wenn zu nutzen:** DAT-03 — jedes Mal wenn Cart-State beim Reload erhalten bleiben soll.

**Wichtig:** `shopId` muss in `cartItems` gespeichert werden, damit nach Shop-Wechsel/Lock der Cart isoliert bleibt.

```typescript
// schema.ts — version 7
this.version(7).stores({
  products: 'id, shopId, category, active, [shopId+active]',
  sales: 'id, shopId, createdAt, syncedAt, cancelledAt',
  outbox: '++id, shopId, createdAt, operation',
  cartItems: 'productId, shopId',  // productId = PK, kein ++
});
// Kein upgrade() Handler nötig — neue Tabelle startet leer
```

### Pattern 2: useCart mit Dexie-Sync (Lese-beim-Mount + Schreibe-bei-Änderung)

**Was:** `useReducer` bleibt für synchrone UI-Updates. Dexie wird als persistenter Spiegel daneben geführt — nicht als State-Quelle (kein `useLiveQuery`), weil das Reducer-Pattern bleiben soll.

**Wenn zu nutzen:** DAT-03 + VAL-01 (beim Mount kann gleichzeitig validiert werden).

```typescript
// useCart.ts — erweitertes Muster
export function useCart() {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [loaded, setLoaded] = useState(false);

  // Mount: aus Dexie laden + validieren
  useEffect(() => {
    async function loadAndValidate() {
      const shopId = getShopId();
      const stored = await db.cartItems
        .where('shopId').equals(shopId).toArray();

      if (stored.length === 0) {
        setLoaded(true);
        return;
      }

      // Validierung: Produkte aus Dexie für alle CartItem-productIds holen
      const productIds = stored.map(i => i.productId);
      const currentProducts = await db.products
        .where('id').anyOf(productIds).toArray();
      const productMap = new Map(currentProducts.map(p => [p.id, p]));

      const valid: CartItem[] = [];
      const invalid: string[] = [];

      for (const item of stored) {
        const p = productMap.get(item.productId);
        if (!p || !p.active) {
          invalid.push(item.name); // nicht mehr vorhanden oder deaktiviert
          continue;
        }
        // Preis-Snapshot bleibt — wir validieren nur Existenz und active-Status
        valid.push(item);
      }

      if (valid.length > 0) {
        dispatch({ type: 'LOAD', items: valid });
      }
      if (invalid.length > 0) {
        // Ungültige Artikel anzeigen — via Callback oder State
        // (genaue UI-Entscheidung dem Planner überlassen)
      }
      setLoaded(true);
    }
    loadAndValidate();
  }, []);

  // Schreiben: nach jeder Reducer-Aktion Dexie aktualisieren
  useEffect(() => {
    if (!loaded) return; // nicht vor dem ersten Laden überschreiben
    const shopId = getShopId();
    async function persist() {
      await db.transaction('rw', db.cartItems, async () => {
        await db.cartItems.where('shopId').equals(shopId).delete();
        if (state.items.length > 0) {
          await db.cartItems.bulkPut(
            state.items.map(i => ({ ...i, shopId }))
          );
        }
      });
    }
    persist();
  }, [state.items, loaded]);
  // ...
}
```

**Wichtig:** `loaded`-Flag verhindert, dass der leere `initialState` beim ersten Render Dexie löscht, bevor die gespeicherten Items geladen wurden.

### Pattern 3: LOAD-Action im Reducer

Der Reducer braucht eine neue `LOAD`-Action für das initiale Befüllen aus Dexie:

```typescript
type CartAction =
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; items: CartItem[] };  // NEU

// im Reducer:
case 'LOAD':
  return { items: action.items };
```

### Pattern 4: SQL-Fix in reports.ts — WHERE cancelled_at IS NULL

**Alle vier Queries** brauchen denselben Zusatz:

```sql
-- summary Query:
WHERE shop_id = ${shopId}
  AND created_at >= ${monthStart}
  AND created_at < ${monthEnd}
  AND cancelled_at IS NULL   -- NEU

-- costResult Query:
WHERE sales.shop_id = ${shopId}
  AND sales.created_at >= ${monthStart}
  AND sales.created_at < ${monthEnd}
  AND sales.cancelled_at IS NULL   -- NEU

-- topArticles Query:
WHERE sales.shop_id = ${shopId}
  AND sales.created_at >= ${monthStart}
  AND sales.created_at < ${monthEnd}
  AND sales.cancelled_at IS NULL   -- NEU

-- yearly months + monthlyCosts Queries: gleiche Ergänzung

-- product stats Query:
WHERE sales.shop_id = ${shopId}
  AND json_extract(item.value, '$.productId') = ${id}
  AND sales.created_at >= ${sinceTs}
  AND sales.cancelled_at IS NULL   -- NEU
```

### Anti-Patterns vermeiden

- **Anti-Pattern: `useLiveQuery` für Cart-State.** Würde Race-Conditions zwischen UI-Eingaben und Dexie-Lese-Updates erzeugen. Reducer-Pattern beibehalten, Dexie nur als persistenter Spiegel.
- **Anti-Pattern: Cart löschen wenn Produkt deaktiviert wird.** Beim Laden aus Dexie stille Bereinigung ist OK; während einer aktiven Session soll der Cart unangetastet bleiben (Mitarbeiterin könnte gerade zahlen).
- **Anti-Pattern: Preis-Snapshot beim Reload aktualisieren.** Bestehende Entscheidung aus Phase 1: `salePrice` im CartItem ist ein Snapshot zum Zeitpunkt des Hinzufügens und wird nicht nachträglich aus der DB aktualisiert. Das gilt auch nach Reload.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|-------------------|-------------|-------|
| Transaktionssicheres Löschen+Bulkput | Kein eigenes Lock-Handling | `db.transaction('rw', ...)` | Dexie garantiert atomares Read-Modify-Write |
| SQL NULL-Prüfung | Kein JS-seitiges Filter nach API-Aufruf | `AND cancelled_at IS NULL` in SQL | Filterung im DB-Layer ist korrekt und effizient |

---

## Common Pitfalls

### Pitfall 1: Dexie-Write vor dem ersten LOAD überschreibt gespeicherten Cart

**Was schiefläuft:** Wenn der `useEffect` für Dexie-Write auf `state.items` reagiert, feuert er auch beim initialen Render mit `initialState = { items: [] }` — bevor `loadAndValidate()` abgeschlossen ist. Ergebnis: Dexie wird sofort geleert.

**Warum es passiert:** React-Effects laufen nach dem ersten Render, beide Effects starten praktisch gleichzeitig.

**Wie vermeiden:** `loaded`-Flag (Boolean State). Persist-Effect prüft `if (!loaded) return`. Erst wenn `loadAndValidate()` `setLoaded(true)` setzt, darf Persist-Effect schreiben.

**Warnsignale:** Cart nach Reload immer leer, obwohl Items in Dexie sichtbar sind.

### Pitfall 2: cartItems bleibt nach Shop-Wechsel erhalten

**Was schiefläuft:** Wenn eine Mitarbeiterin den PIN-Lock betätigt und sich mit einem anderen Shop-PIN einloggt, sind noch die Cart-Items des vorigen Shops in Dexie.

**Warum es passiert:** `cartItems.where('shopId').equals(shopId)` liest nur für den aktuellen Shop — aber alte Einträge bleiben liegen.

**Wie vermeiden:** Beim `CLEAR`-Dispatch (nach Kaufabschluss) alle `cartItems` des aktuellen Shops aus Dexie löschen. Oder: `clear()` in `onLock()` aufrufen. Die einfachste Lösung: `CLEAR` löscht Dexie-Einträge für `getShopId()`.

**Warnsignale:** Cart zeigt nach Neu-Login Artikel eines anderen Ladens.

### Pitfall 3: CartItem-Interface hat kein shopId-Feld — Dexie-Table braucht es

**Was schiefläuft:** `CartItem = SaleItem` hat kein `shopId`. Wenn `cartItems` in Dexie nach `shopId` indiziert werden soll, muss das Interface erweitert werden.

**Wie vermeiden:** Separate `PersistedCartItem`-Interface (oder Inline-Typerweiterung) mit `shopId: string` nur für die Dexie-Tabelle. Im Reducer weiterhin `CartItem` ohne `shopId` verwenden.

### Pitfall 4: reports.ts — cancelled_at in SQLite ist NULL vs. 0

**Was schiefläuft:** SQLite speichert `cancelledAt` als INTEGER (Unix-Timestamp) oder NULL. `AND cancelled_at IS NULL` ist korrekt — aber `AND cancelled_at = 0` würde nicht funktionieren.

**Warum es passiert:** In SQLite-Drizzle wird ein optionaler `cancelledAt?: number`-Wert als NULL gespeichert wenn undefined. `WHERE cancelled_at IS NULL` ist die korrekte SQL-Syntax.

**Warnsignale:** Stornierte Verkäufe erscheinen weiterhin in Statistiken trotz WHERE-Klausel.

### Pitfall 5: Validation-Feedback während aktiver Kassen-Session zu aggressiv

**Was schiefläuft:** Wenn beim Mount des Hooks ein Artikel als deaktiviert erkannt und still entfernt wird, ohne UI-Feedback, bemerkt die Mitarbeiterin es nicht.

**Wie vermeiden:** Invalidierte Artikel nicht still löschen, sondern einen Toast oder eine Warnung zeigen. Cart-Abschluss blockieren solange ungültige Artikel vorhanden sind (oder sie explizit entfernen lassen).

---

## Code Examples

### Wo genau sind die Bugs in reports.ts

```typescript
// BUG: reports.ts Zeile 17 — summary filtert stornierte Verkäufe nicht
const summary = db.all(sql`
  SELECT COUNT(*) as sale_count, ...
  FROM sales
  WHERE shop_id = ${shopId}
    AND created_at >= ${monthStart}
    AND created_at < ${monthEnd}
    -- FEHLT: AND cancelled_at IS NULL
`);

// BUG: reports.ts Zeile 31 — costResult summiert EK für stornierte Verkäufe
const costResult = db.all(sql`
  SELECT COALESCE(SUM(...), 0) as cost_cents
  FROM sales, json_each(sales.items) as item
  LEFT JOIN products p ON p.id = json_extract(item.value, '$.productId')
  WHERE sales.shop_id = ${shopId}
    AND sales.created_at >= ${monthStart}
    AND sales.created_at < ${monthEnd}
    -- FEHLT: AND sales.cancelled_at IS NULL
`);

// BUG: reports.ts Zeile 44 — topArticles enthält Artikel aus stornierten Verkäufen
// BUG: reports.ts Zeile 87/102 — yearly summary + costs ebenfalls ohne Filter
// BUG: reports.ts Zeile 147 — product stats ohne Filter
```

### DailyReport macht es richtig (clientseitig)

```typescript
// DailyReport.tsx Zeile 37 — korrekt:
const active = sales.filter(s => !s.cancelledAt);
return {
  count: active.length,
  totalCents: active.reduce((sum, s) => sum + s.totalCents, 0),
  ...
};
// Das gleiche Muster muss in SQL auf dem Server nachgezogen werden.
```

### Dexie CartItem-Tabellen-Interface

```typescript
// In schema.ts — neues Interface für persistierte Cart-Einträge
export interface PersistedCartItem extends CartItem {
  shopId: string; // nötig für Dexie-Index und Shop-Isolation
}

// Tabellen-Declaration in FairstandDB:
cartItems!: EntityTable<PersistedCartItem, 'productId'>;
```

---

## State of the Art

| Alter Stand | Aktueller Fix | Wann | Impact |
|-------------|---------------|------|--------|
| DailyReport filtert stornierte Sales clientseitig korrekt | MonthlyReport / Reports-API muss dasselbe serverseitig tun | Phase 15 | Korrekte EK/Marge-Zahlen |
| useCart = reiner useState/useReducer ohne Persistenz | useCart + Dexie-Spiegel (LOAD on mount + persist on change) | Phase 15 | Kein Datenverlust bei Reload |
| Cart-Validierung = nur checkStockBeforeAdd beim Hinzufügen | Cart-Validierung beim Laden aus Dexie (existiert noch? aktiv?) | Phase 15 | Keine Geister-Artikel im Cart |

---

## Open Questions

1. **VAL-01: Was soll passieren wenn ungültige Artikel gefunden werden?**
   - Was wir wissen: Artikel aus Dexie können nach downloadProducts() nicht mehr existieren oder deaktiviert sein
   - Was unklar ist: Soll der Cart komplett blockiert werden (kein Checkout möglich) oder sollen ungültige Artikel mit einer Warnung angezeigt und entfernbar sein?
   - Empfehlung: Ungültige Artikel beim Mount aus dem Cart entfernen + Toast "X Artikel nicht mehr verfügbar und wurden entfernt". Das ist weniger aggressiv als Checkout-Block und passt zum Kontext (schnelle Kassensession).

2. **DAT-03: Soll der Cart auch bei Lock/Unlock persistent bleiben?**
   - Was wir wissen: `onLock()` in POSScreen ruft nicht `cart.clear()` auf
   - Was unklar ist: Erwartetes Verhalten — bleibt der Cart nach Lock + Unlock des gleichen Shops erhalten?
   - Empfehlung: Ja, Cart bleibt nach Lock/Unlock erhalten (gleiche Shop-Session). Cart wird nur nach erfolgreichem Kaufabschluss via `CLEAR` geleert. Das ist das natürliche Verhalten.

---

## Sources

### Primary (HIGH confidence)
- Direktanalyse `server/src/routes/reports.ts` — alle SQL-Queries identifiziert, Bugs durch fehlende `cancelled_at IS NULL` Filter bestätigt
- Direktanalyse `client/src/features/pos/useCart.ts` — `useReducer` ohne Dexie-Persistenz bestätigt
- Direktanalyse `client/src/db/schema.ts` — keine `cartItems`-Tabelle vorhanden, aktuell Version 6
- Direktanalyse `client/src/features/admin/reports/DailyReport.tsx` — korrekte clientseitige Storno-Filterung als Referenz
- Direktanalyse `client/src/features/pos/POSScreen.tsx` — Cart-Lifecycle (clear nach Kauf, nicht bei Lock)

### Secondary (MEDIUM confidence)
- Dexie v4 Dokumentation (aus Projektkonventionen) — `EntityTable`, `version().stores()`, `db.transaction('rw', ...)` Patterns

---

## Metadata

**Confidence breakdown:**
- Bug-Lokalisierung (DAT-01/DAT-02): HIGH — direkt aus SQL-Queries ablesbar
- Dexie-Persistenz-Pattern (DAT-03): HIGH — bekanntes Dexie-Pattern, im Projekt bereits verwendet
- Cart-Validierung (VAL-01): HIGH — Anforderungen klar, Umsetzung ist straightforward
- Pitfalls: HIGH — aus Codeanalyse abgeleitet, kein Raten

**Research date:** 2026-03-24
**Valid until:** 2026-06-24 (stabile Libraries, Bugs bekannt)
