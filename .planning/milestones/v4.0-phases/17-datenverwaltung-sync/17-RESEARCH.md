# Phase 17: Datenverwaltung & Sync - Research

**Researched:** 2026-03-24
**Domain:** Kategorie-Verwaltung (Server-Schema + Admin-UI), Bild-Upload-Workflow, Sync-Fehlerbehandlung
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VRW-01 | Zentrales Kategorie-Management — Kategorien als eigene Entität verwalten, nicht nur als Freitext pro Produkt | Server-Tabelle `categories`, GET/POST/PATCH/DELETE-Routen, Dropdown in ProductForm statt Freitext-Input |
| VRW-02 | Produktbild-Upload verbessern — einfacherer Workflow für Bildzuweisung | Upload-Button direkt in ProductForm integrieren (kein zweiter Klick in der Liste mehr nötig), inline Preview |
| SYN-01 | Sync-Robustheit verbessern — Fehlerbehandlung und Retry-Logik optimieren | flushOutbox() hat bereits Retry (max 5 Attempts), fehlt: UI-Feedback, Toast bei dauerhaftem Fehler, Zustandsexposition an Komponenten |
</phase_requirements>

---

## Summary

Phase 17 hat drei klar abgegrenzte Teilbereiche, die alle im Online-only-Admin-Kontext laufen (Phase 14 hat den Offline-Guard gesetzt — kein Offline-Support in Admin nötig).

**VRW-01 (Kategorie-Management):** Kategorien existieren heute nur als Freitext-String `category: string` im `products`-Record — sowohl im Drizzle-Schema (server) als auch im Dexie-Schema (client). Der ProductForm hat einen einfachen `<input type="text">`. ProductList leitet Kategorien dynamisch aus den Produkten per `[...new Set(products.map(p => p.category))]` ab — keine eigene Entität. Eine neue `categories`-Tabelle auf dem Server ist nötig; Dexie erhält eine analoge Tabelle (v8). Das Produkt-Feld `category` bleibt ein String-Wert (nicht FK), wird aber aus der Kategorieliste befüllt.

**VRW-02 (Bild-Upload):** Der Upload-Endpunkt (`POST /api/products/:id/image`) ist fertig und funktioniert. Das Problem ist die UX: Der "Bild"-Button ist in der Produktliste versteckt, erscheint nur bei existierenden Produkten, und ist kontextarm (kein Preview, kein Hinweis ob bereits ein Bild vorhanden). Die Verbesserung liegt ausschließlich im Frontend: ProductForm bekommt einen integrierten Upload-Bereich mit Preview — kein neuer Endpunkt nötig.

**SYN-01 (Sync-Robustheit):** `flushOutbox()` in `engine.ts` hat bereits 5-Attempt-Retry-Logik und erhöht `attempts` bei Netzwerk- und Serverfehlern. Was fehlt: (a) kein Hook/Kontext der den Outbox-Stand nach außen trägt, (b) keine UI-Meldung wenn Einträge die 5-Attempt-Grenze erreichen, (c) kein sichtbares Sync-Indikator im POS-Bereich. Die Lösung ist ein `useSyncStatus`-Hook der Dexie live abfragt.

**Primary recommendation:** Drei getrennte Plan-Dateien — eine pro Anforderung. Alle rein online-only, kein Offline-Handling. Reihenfolge: VRW-01 (Schema-Änderung zuerst), VRW-02 (UI-only), SYN-01 (Hook + UI).

---

## Standard Stack

### Core (bereits im Projekt, keine neuen Abhängigkeiten nötig)

| Library | Version | Purpose | Verwendung in dieser Phase |
|---------|---------|---------|---------------------------|
| Drizzle ORM + drizzle-kit | aktuell | Tabellen-Definition + Migrations | Neue `categories`-Tabelle in server/src/db/schema.ts |
| better-sqlite3 | aktuell | SQLite-Zugriff | Kategorie-CRUD-Routen |
| Dexie.js | 4.3.0 | Lokale IndexedDB | Version 8 mit `categories`-Tabelle |
| dexie-react-hooks `useLiveQuery` | via Dexie | Reaktive Queries | Kategorienliste in ProductForm-Dropdown |
| Fastify | 5.7.x | HTTP-Routen | GET/POST/PATCH/DELETE /api/categories |
| React + useState/useEffect | 19.x | UI-State | ProductForm Upload-Preview, useSyncStatus |
| Tailwind CSS | 4.x | Styling | Upload-Dropzone, Sync-Badge |

Keine neuen npm-Pakete erforderlich.

---

## Architecture Patterns

### VRW-01: Kategorie-Entität

**Server-Schema-Änderung (server/src/db/schema.ts):**
```typescript
// Neue Tabelle hinzufügen
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),           // UUID
  shopId: text('shop_id').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});
```

Das Feld `products.category` bleibt `text('category')` — es speichert weiterhin den Namen als String-Snapshot. Keine FK-Relation nötig (verhindert Migrations-Komplexität bei Kategorieumbenennung und entspricht dem bestehenden LWW-Pattern).

**Migration:** Neue Datei via `drizzle-kit generate` erstellen. Bestehende Produkte behalten ihren `category`-String unverändert.

**Server-Routen (neue Datei: server/src/routes/categories.ts):**
- `GET /api/categories?shopId=xxx` — alle Kategorien des Shops, sortiert nach `sortOrder`
- `POST /api/categories` — neue Kategorie (id = UUID, shopId, name, createdAt)
- `PATCH /api/categories/:id` — umbenennen (name, ggf. sortOrder)
- `DELETE /api/categories/:id` — löschen (nur wenn kein Produkt diese Kategorie referenziert — prüfen via COUNT query)

**Client-Schema-Änderung (client/src/db/schema.ts):**
```typescript
// Neue Dexie-Entität
export interface Category {
  id: string;
  shopId: string;
  name: string;
  sortOrder: number;
  createdAt: number;
}

// In FairstandDB constructor: version(8)
this.version(8).stores({
  products: 'id, shopId, category, active, [shopId+active]',
  sales: 'id, shopId, createdAt, syncedAt, cancelledAt',
  outbox: '++id, shopId, createdAt, operation',
  cartItems: 'productId, shopId',
  categories: 'id, shopId, name',  // neu
});
```

**Sync-Pattern für Kategorien:** `downloadProducts()` um `downloadCategories()` ergänzen — gleicher Ansatz (Server → Dexie Replace für den Shop). Kategorien sind Admin-only, also kein Offline-Support nötig. Download beim Admin-Tab-Öffnen oder auf expliziten Button-Klick.

**ProductForm-Anpassung:** `<input type="text">` für Kategorie durch `<select>` + "Neue Kategorie" ersetzen:
```tsx
// Dropdown mit useLiveQuery
const categories = useLiveQuery(
  () => db.categories.where('shopId').equals(getShopId()).sortBy('name'),
  []
);

// Select-Element
<select value={values.category} onChange={...}>
  <option value="">-- keine Kategorie --</option>
  {categories?.map(cat => (
    <option key={cat.id} value={cat.name}>{cat.name}</option>
  ))}
</select>
```

**Kategorie-Verwaltungs-UI:** Neuer Sub-Tab oder Modal in der ProductList-Seite. Einfache Liste mit "Neue Kategorie"-Button, Inline-Edit und Löschen.

### VRW-02: Bild-Upload in ProductForm integrieren

**Aktueller Zustand:** Upload-Button ist in ProductList als Label-Element pro Zeile (`<label>Bild<input type="file" ...></label>`). Bild-Upload passiert direkt in `handleImageUpload()` in ProductList. ProductForm hat keinen Upload-Bereich.

**Problem:** Bei einem neuen Produkt muss die Nutzerin erst speichern, dann in der Liste den Bild-Button finden und klicken. Kein Preview.

**Lösung:** Upload-Bereich direkt in ProductForm (unten, nach den Pflichtfeldern):

```tsx
// In ProductForm: Bild-Preview + Upload
const [imagePreview, setImagePreview] = useState<string | null>(
  product?.imageUrl ?? null
);
const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

// Bei handleSave: wenn pendingImageFile vorhanden → upload nach Speichern
async function handleSave() {
  // ... bestehende Speicher-Logik ...
  const savedId = isEdit ? product.id : newProductData.id;
  if (pendingImageFile) {
    await uploadImage(savedId, pendingImageFile);
  }
  onClose();
}
```

**Upload-Komponente im Form:**
```tsx
<div className="flex flex-col gap-2">
  <label className="text-sm font-medium text-slate-600">Produktbild</label>
  {imagePreview && (
    <img src={imagePreview} alt="" className="w-24 h-24 object-cover rounded-xl" />
  )}
  <label className="flex items-center justify-center h-12 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-sky-400 text-sm text-slate-500">
    {imagePreview ? 'Bild ändern' : 'Bild auswählen'}
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      onChange={e => {
        const f = e.target.files?.[0];
        if (f) {
          setPendingImageFile(f);
          setImagePreview(URL.createObjectURL(f));
        }
      }}
    />
  </label>
</div>
```

Der "Bild"-Button in ProductList kann danach entfernt oder auf ein kleines Icon reduziert werden (weniger Buttons pro Zeile).

**Keine Server-Änderungen nötig** — `POST /api/products/:id/image` bleibt unverändert.

**Sonderfall neues Produkt:** UUID wird vor dem Server-POST generiert (`crypto.randomUUID()` bereits in ProductForm). Das Bild kann nach dem Dexie-Add und Server-POST mit dieser ID hochgeladen werden. Reihenfolge: (1) Dexie-Add, (2) Server-POST für Produkt, (3) Bild-Upload mit ID.

### SYN-01: Sync-Status-Hook + UI-Feedback

**Aktueller Zustand analysiert:**

`engine.ts` — `flushOutbox()`:
- Liest alle Outbox-Einträge mit `attempts < 5`
- Bei Netzwerkfehler: `attempts++`, silent return
- Bei 5xx-Fehler: `attempts++`, silent return
- Bei Erfolg: Einträge löschen, `downloadProducts()` fire-and-forget
- **Problem:** Einträge die `attempts >= 5` erreichen, werden nie wieder versucht und nie gelöscht. Keine UI-Meldung.

`triggers.ts` — Sync-Trigger:
- `online`-Event → `flushOutbox()`
- `visibilitychange` (visible + online) → `flushOutbox()`
- **Problem:** Kein periodisches Retry bei anhaltendem Fehler.

**Lösung — drei Teile:**

**Teil 1: `useSyncStatus`-Hook** (neue Datei `client/src/sync/useSyncStatus.ts`):
```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/index.js';
import { getShopId } from '../db/index.js';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export function useSyncStatus(): SyncStatus {
  const outbox = useLiveQuery(
    () => db.outbox.where('shopId').equals(getShopId()).toArray(),
    []
  );
  if (!outbox) return 'synced';
  const failed = outbox.filter(e => (e.attempts ?? 0) >= 5);
  const pending = outbox.filter(e => (e.attempts ?? 0) < 5);
  if (failed.length > 0) return 'failed';
  if (pending.length > 0) return 'pending';
  return 'synced';
}
```

**Teil 2: Sync-Badge in POS-Header** — kleines farbiges Icon (grün/gelb/rot) in der Kassen-Ansicht das den Status zeigt. Kein Modal, nur ein diskreter Punkt oder "Sync..." Text.

**Teil 3: Toast bei failed-Status** — wenn `useSyncStatus()` auf `'failed'` wechselt, Toast-Meldung: "Einige Verkäufe konnten nicht übertragen werden. Internetverbindung prüfen und App neu laden."

**Periodischer Retry:** In `triggers.ts` ein Interval hinzufügen (z.B. alle 30s) wenn `navigator.onLine`:
```typescript
setInterval(() => {
  if (navigator.onLine) void flushOutbox();
}, 30_000);
```

**Deadlock auflösen:** Einträge mit `attempts >= 5` sollten resettet werden können. Entweder über einen manuellen "Erneut versuchen"-Button (setzt alle `attempts` auf 0) oder automatisch beim nächsten `downloadProducts()`.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|-------------------|-------------|-------|
| Reaktive Kategorienliste im Dropdown | Eigener State + polling | `useLiveQuery(db.categories.where(...))` | Aktualisiert sich automatisch nach Add/Delete |
| Bild-Preview vor Upload | Canvas-API | `URL.createObjectURL(file)` | Nativ, kein Overhead |
| Outbox-Größe überwachen | polling interval | `useLiveQuery(db.outbox.where(...))` | Dexie feuert bei jeder Änderung |

---

## Common Pitfalls

### Pitfall 1: Kategorie-Löschen mit referenzierten Produkten
**Was schiefgeht:** Kategorie wird gelöscht, aber 10 Produkte haben noch `category = 'Schokolade'`. Nach dem Download stimmen die Kategorien nicht mehr mit den Produkten überein — der Filter-Tab zeigt "Schokolade" aus Produkten aber nicht in der Kategorienliste.
**Warum:** Da `products.category` ein freier String ist und keine FK-Relation, gibt es keinen DB-Level-Schutz.
**Wie vermeiden:** Server-Route `DELETE /categories/:id` prüft zuerst `SELECT COUNT(*) FROM products WHERE category = :name AND shop_id = :shopId`. Wenn > 0: 409 zurückgeben mit Hinweis wie viele Produkte betroffen sind. Frontend zeigt Fehlermeldung.

### Pitfall 2: Dexie-Version ohne .upgrade() bei neuer Tabelle
**Was schiefgeht:** Version 8 wird deklariert ohne `.upgrade()` — für neue Tabellen (wie `categories`) ist das aber korrekt und ausreichend, da Dexie die Tabelle automatisch anlegt. Fehler entsteht wenn man denkt eine `.upgrade()`-Funktion sei nötig.
**Wie vermeiden:** Neue Tabellen ohne Datenmigration brauchen kein `.upgrade()`. Es reicht die neue Version mit erweitertem `stores()`-Objekt zu definieren.

### Pitfall 3: Bild-Upload vor Server-Bestätigung des Produkts
**Was schiefgeht:** Beim neuen Produkt: Dexie-Add läuft, aber Server-POST für das Produkt schlägt fehl (z.B. Netzwerk). Dann schlägt der Bild-Upload auf `/api/products/:id/image` ebenfalls fehl (Produkt existiert nicht in DB). Trotzdem wird in Dexie ein Bild referenziert.
**Wie vermeiden:** `handleSave()` wartet auf den Server-POST-Erfolg (kein fire-and-forget bei neuem Produkt wenn Bild vorhanden). Erst wenn Server 201 zurückgibt, Bild hochladen. Wenn Bild-Upload fehlschlägt: `imageUrl` bleibt `undefined` — kein Fehler, nur kein Bild.

### Pitfall 4: Kategorie-Sync beim Admin-Login fehlt
**Was schiefgeht:** `downloadProducts()` wird bei Login aufgerufen (in App.tsx). Kategorien werden nicht geladen. Wenn die Nutzerin direkt in den Admin-Tab geht, ist `db.categories` leer — das Dropdown zeigt keine Optionen.
**Wie vermeiden:** `downloadCategories()` entweder (a) parallel zu `downloadProducts()` in App.tsx aufrufen, oder (b) am Anfang von ProductList/ProductForm ausführen wenn `db.categories` leer ist. Option (a) ist sauberer.

### Pitfall 5: flushOutbox attempts-Reset fehlt
**Was schiefgeht:** Nach dauerhaftem Serverfehler haben alle Outbox-Einträge `attempts = 5`. Wenn der Server wieder erreichbar ist, werden sie ignoriert (Filter `attempts < 5`). Verkäufe sind verloren.
**Wie vermeiden:** Beim manuellen "Erneut versuchen" alle `attempts` auf 0 setzen. Alternativ: In `flushOutbox()` beim Start einmalig prüfen ob alle Einträge `>= 5` haben — dann alle auf 0 setzen und retry erlauben.

---

## Code Examples

### Kategorie-Download (engine.ts ergänzen)
```typescript
// Source: Bestehendes downloadProducts()-Pattern in engine.ts
export async function downloadCategories(): Promise<void> {
  const shopId = getShopId();
  const res = await fetch(`/api/categories?shopId=${shopId}`);
  if (!res.ok) throw new Error(`Kategorie-Download fehlgeschlagen: ${res.status}`);
  const serverCats = await res.json() as Category[];

  await db.transaction('rw', db.categories, async () => {
    await db.categories.where('shopId').equals(shopId).delete();
    await db.categories.bulkPut(serverCats);
  });
}
```

### Kategorie-Delete-Route mit Sicherheitsprüfung
```typescript
// Source: Bestehendes Pattern aus server/src/routes/products.ts
fastify.delete('/categories/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const cat = db.select().from(categories).where(eq(categories.id, id)).get();
  if (!cat) return reply.status(404).send({ error: 'Nicht gefunden' });

  // Prüfen ob Produkte diese Kategorie referenzieren
  const count = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(and(eq(products.shopId, cat.shopId), eq(products.category, cat.name)))
    .get();

  if ((count?.count ?? 0) > 0) {
    return reply.status(409).send({
      error: `Kategorie wird von ${count!.count} Produkt(en) verwendet. Bitte zuerst Produkte umkategorisieren.`
    });
  }

  db.delete(categories).where(eq(categories.id, id)).run();
  return reply.send({ ok: true });
});
```

### useSyncStatus-Hook (vereinfacht)
```typescript
// Source: Dexie useLiveQuery-Pattern aus ProductList.tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getShopId } from '../db/index.js';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export function useSyncStatus(): SyncStatus {
  const outbox = useLiveQuery(
    () => {
      try {
        return db.outbox.where('shopId').equals(getShopId()).toArray();
      } catch {
        return Promise.resolve([]);
      }
    },
    []
  );
  if (!outbox || outbox.length === 0) return 'synced';
  if (outbox.some(e => (e.attempts ?? 0) >= 5)) return 'failed';
  return 'pending';
}
```

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Geändert in Phase | Impact |
|--------------|-----------------|-------------------|--------|
| Kategorien als Freitext | Kategorien als eigene Entität mit eigenem Endpoint | Phase 17 (diese Phase) | Konsistente Schreibweise, zentrale Verwaltung |
| Bild-Upload nur in Produktliste | Upload direkt in ProductForm mit Preview | Phase 17 (diese Phase) | Weniger Schritte, weniger Verwirrung |
| Sync-Fehler still ignoriert | Sichtbarer Sync-Status mit Toast bei Dauerfehlern | Phase 17 (diese Phase) | Nutzerin weiß wenn Verkäufe nicht übertragen wurden |

---

## Open Questions

1. **Kategorie-Umbenennung — Produkte aktualisieren?**
   - Was wir wissen: `products.category` ist ein String-Snapshot. Bei Umbenennung stimmt der Name nicht mehr.
   - Was unklar ist: Soll ein PATCH auf eine Kategorie alle Produkte mit dem alten Namen ebenfalls patchen (Bulk-Update)?
   - Empfehlung: Ja — `PATCH /categories/:id` führt ein `UPDATE products SET category = :newName WHERE shop_id = :shopId AND category = :oldName` aus. Einfach, keine FK-Komplexität.

2. **Wo lebt die Kategorie-Verwaltungs-UI?**
   - Was wir wissen: ProductList hat bereits einen Kategorie-Filter als Pill-Tabs.
   - Was unklar ist: Separater Sub-Tab "Kategorien" in AdminScreen, oder als Modal/Drawer in ProductList?
   - Empfehlung: Als kleiner "Kategorien verwalten"-Button am Ende des Kategorie-Filter-Bereichs in ProductList, öffnet ein einfaches Modal. Kein neuer Tab nötig.

3. **Sync-Badge: POS oder Admin?**
   - Was wir wissen: Verkäufe werden offline in der POS-Ansicht getätigt.
   - Was unklar ist: Zeige Sync-Status in POS-Header oder nur in Admin?
   - Empfehlung: Kleiner Status-Punkt im POS-Header (Kassen-Ansicht) — genau dort wo offline Aktionen stattfinden. Admin zeigt detailliertere Meldung.

---

## Sources

### Primary (HIGH confidence)
- Direktes Code-Lesen: `client/src/db/schema.ts` — Dexie v7-Stand, categories-Tabelle fehlt
- Direktes Code-Lesen: `server/src/db/schema.ts` — Drizzle-Schema, categories-Tabelle fehlt
- Direktes Code-Lesen: `client/src/sync/engine.ts` — Retry-Logik (attempts < 5), kein UI-Feedback
- Direktes Code-Lesen: `client/src/features/admin/products/ProductList.tsx` — Bild-Upload in Liste, Kategorie-Filter aus Produkten
- Direktes Code-Lesen: `client/src/features/admin/products/ProductForm.tsx` — Freitext-Input für Kategorie
- Direktes Code-Lesen: `server/src/routes/products.ts` — Image-Upload-Endpoint vollständig vorhanden
- Direktes Code-Lesen: `client/src/features/admin/AdminScreen.tsx` — Online-Guard bereits in Phase 14 implementiert

### Secondary (MEDIUM confidence)
- CLAUDE.md Technologie-Stack: Dexie 4.x, Drizzle ORM, Fastify 5.x Pattern-Beschreibungen
- REQUIREMENTS.md: Anforderungstexte VRW-01, VRW-02, SYN-01

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Libs bereits im Projekt vorhanden, kein neues Paket nötig
- Architecture (Kategorien): HIGH — klares Muster aus bestehenden Tabellen/Routen ableitbar
- Architecture (Bild-Upload): HIGH — Endpoint existiert, nur UI-Umstrukturierung
- Architecture (Sync): HIGH — engine.ts vollständig gelesen, Lücken klar identifiziert
- Pitfalls: HIGH — direkt aus Code-Analyse abgeleitet

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stabiler Stack)
