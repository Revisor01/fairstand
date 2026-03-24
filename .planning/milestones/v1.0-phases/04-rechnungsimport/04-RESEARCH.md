# Phase 4: Rechnungsimport - Research

**Researched:** 2026-03-23
**Domain:** PDF-Parsing (pdfjs-dist), Fastify Multipart Upload, Review-UI, Bestandsbuchung
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**PDF-Upload & Parsing**
- Neuer Tab "Import" im Admin-Bereich (4. Tab neben Produkte, Berichte, Einstellungen)
- Drag-and-Drop + Datei-Auswahl-Button (touch-optimiert für iPad)
- Parsing serverseitig mit pdfjs-dist auf Fastify — iPad hat begrenzte Rechenleistung
- Parse-Fehler werden inline pro Zeile als gelbe Warnung angezeigt

**Review-UI & Editierung**
- Editierbare Tabelle mit allen Spalten: Menge, Artikelnummer, Bezeichnung, EK-Preis, EVP (VK-Preis), MwSt-Satz
- Farbcodierung: Grün = bekannter Artikel (Matching via Artikelnummer), Orange = neuer Artikel (Vorschlag zum Anlegen)
- Neue Artikel werden als Produkt-Vorschläge mit Pre-Fill aus Rechnungsdaten angelegt — Nutzerin bestätigt pro Artikel
- Checkbox pro Zeile — nur angehakte Positionen werden bei Freigabe gebucht

**Freigabe & Bestandsbuchung**
- Großer "Bestand buchen"-Button am Ende der Tabelle — erst aktiv wenn mindestens eine Zeile angehakt
- Neue Produkte werden zuerst in Dexie angelegt, dann Bestand gebucht — ein Schritt für die Nutzerin
- Import-Historie als einfache Liste (Datum, Dateiname, Anzahl Positionen) — kein PDF-Speicher
- Import funktioniert nur online (PDF-Parsing ist serverseitig) — klarer Hinweis in der UI

### Claude's Discretion
- Koordinatenbasiertes Table-Parsing: Spalten-Erkennung und Zeilenextraktion aus dem PDF-Layout
- Matching-Algorithmus für Artikelnummern (exakte Übereinstimmung vs. Fuzzy)
- Fehlerbehandlung bei nicht-parseablen PDFs

### Deferred Ideas (OUT OF SCOPE)
- Unterstützung für andere Rechnungsformate (nicht nur Süd-Nord-Kontor)
- Automatische Erkennung des Rechnungsformats
- Bulk-Import mehrerer PDFs gleichzeitig
- OCR für gescannte/fotografierte Rechnungen
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMP-01 | PDF-Upload von Süd-Nord-Kontor Rechnungen | @fastify/multipart 9.4.0 für Fastify 5; multipart/form-data Upload; temporäre Buffer-Strategie ohne Disk-Write |
| IMP-02 | Automatisches Parsen: Menge, Artikelnummer, Bezeichnung, EK-Preis (nach Rabatt), EVP (VK-Preis), MwSt-Satz | pdfjs-dist 5.5.207 koordinatenbasiert; EVP steht als "EVP € X,XX" in der Bezeichnungsspalte; exakte Spaltenkoordinaten aus echten Rechnungen bekannt |
| IMP-03 | Prüf-Ansicht nach dem Parsen: alle erkannten Positionen editierbar | React State für ParsedRow[]-Array; inline Inputs für editierbare Felder; Cent-Konvertierung analog ProductForm |
| IMP-04 | Neue Artikel aus der Rechnung werden als Produkt-Vorschläge angelegt | Matching gegen Dexie `products`-Tabelle via articleNumber (case-insensitive); neue Artikel erhalten Status 'new', bekannte 'known' |
| IMP-05 | Bestandsbuchung (Zugang) erst nach manueller Freigabe | Bestehender STOCK_ADJUST-Outbox-Mechanismus wiederverwendbar; für neue Produkte: erst POST /api/products, dann Outbox-Eintrag |
</phase_requirements>

---

## Summary

Phase 4 implementiert den Rechnungsimport vom Süd-Nord-Kontor. Zwei echte Rechnungen (2552709 und 2600988) wurden analysiert — das PDF-Layout ist konsistent und maschinell generiert (TCPDF), was koordinatenbasiertes Parsing zuverlässig macht.

Die Rechnungen haben eine feste Spaltenstruktur: Laufende Nr. | Menge | Artikelnummer | Bezeichnung (mit Hersteller und "EVP € X,XX" in Klammern) | Rabatt | Preis/St. | MwSt | Gesamt. Der EVP (Empfohlener Verkaufspreis) ist nicht in einer eigenen Spalte, sondern als Teil der Bezeichnungsspalte eingebettet — das ist die entscheidende Parsing-Herausforderung. Rechnungen können mehrseitig sein (beide Beispiele: 2 Seiten), alle Seiten müssen verarbeitet werden.

Serverseitig wird `pdfjs-dist` (5.5.207) mit `@fastify/multipart` (9.4.0) kombiniert. Clientseitig wird der bestehende Produkt-Anlegen-Flow (ProductForm-Logik) und der Outbox-STOCK_ADJUST-Mechanismus direkt wiederverwendet. Kein neues Infrastruktur-Paradigma — die Phase verdrahtet bekannte Muster.

**Primary recommendation:** Verwende koordinatenbasiertes Parsing mit `getTextContent()` von pdfjs-dist — gruppiere Text-Items nach Y-Koordinate in Zeilen, dann nach X-Koordinate in Spalten. EVP per Regex aus der Bezeichnungsspalte extrahieren. Artikelnummer-Matching case-insensitive und trim-normalisiert.

---

## Echtes Rechnungslayout (HIGH confidence — aus Originaldokumenten)

### Spaltenstruktur (beide Rechnungen konsistent)

```
Lfd.Nr. | Menge | Artikelnummer | Bezeichnung              | Rabatt | Preis/St. | MwSt | Gesamt
  1.    |   3   | 042-HO0001-0  | Handkreuz Olivenholz ... |  30 %  |  € 2,35   |  19% | € 7,05
```

**Kritische Details:**
- Bezeichnungsspalte enthält: `Name (Hersteller, EVP € X,XX)` — Hersteller und EVP in Klammern am Ende
- Bei langen Bezeichnungen: Zeilenumbruch innerhalb der Bezeichnungsspalte (z.B. "Schneemann, Mütze farbig, 3er Set, 6 cm (Fairkauf,\nEVP € 17,95)")
- EVP-Regex: `EVP\s*€\s*([\d,]+)` — immer am Ende der Bezeichnung in Klammern
- MwSt: nur 7% oder 19%

### Artikelnummer-Formate (real, aus Rechnungen)

| Format | Beispiele |
|--------|-----------|
| Numerisch | `360060`, `8900999`, `22968` |
| Alphanumerisch mit Bindestrich | `042-HO0001-0`, `042-SP0002-5`, `227-094057` |
| Alphanumerisch gemischt | `IN0-30-054`, `KE7-80-984`, `fb5-14-010` |
| Sonderposition | `9999902` (Transportpauschale/DHL) — sollte filterbar sein |

**Case-Inkonsistenz beobachtet:** `sl9-14-002` (lowercase) vs `SL9-14-003` (uppercase) in derselben Rechnung. Matching MUSS case-insensitive sein.

### Mehrseiten-Verhalten

Beide Rechnungen: 2 Seiten. Seite 2 beginnt mit neuem Tabellenkopf (Menge | Artikelnummer | Bezeichnung | ...). Laufende Nummerierung setzt sich fort. Parsing muss ALLE Seiten verarbeiten und Tabellenkopf-Zeilen erkennen und überspringen.

### Preise in den Rechnungen

- `Preis/St.` = EK-Preis nach Rabatt (z.B. "€ 2,35") — das ist der `purchasePrice` im System
- EVP in der Bezeichnung (z.B. "EVP € 4,00") = empfohlener Verkaufspreis = `salePrice` im System
- Preise mit Euro-Zeichen, Komma als Dezimaltrennzeichen

---

## Standard Stack

### Core (für diese Phase neu)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdfjs-dist | 5.5.207 | Serverseitiges PDF-Parsing | Bereits in CLAUDE.md festgelegt; Mozilla-gepflegt; getTextContent() liefert Koordinaten pro Text-Item |
| @fastify/multipart | 9.4.0 | Datei-Upload in Fastify 5 | Offizielle Fastify-Erweiterung; unterstützt Buffer-basiertes Lesen ohne Disk-Write; bereits in CLAUDE.md vorgesehen |

### Bereits vorhanden (wiederverwendet)

| Library | Version | Purpose |
|---------|---------|---------|
| Fastify | 5.7.x | Backend-API — neue Route `POST /api/import/parse` |
| Dexie.js | 4.3.x | Lokale Produktdatenbank — Matching gegen `products`-Tabelle |
| Zod | 3.x | Schema-Validierung der Parse-Ergebnisse |
| Tailwind CSS | 4.x | Review-UI, editierbare Tabelle |
| React | 19.x | ImportScreen-Komponente |

### Installation (neue Pakete)

```bash
# Server
cd server && npm install pdfjs-dist @fastify/multipart

# Keine neuen Client-Pakete nötig
```

**Versionen verifiziert:** `npm view pdfjs-dist version` → 5.5.207, `npm view @fastify/multipart version` → 9.4.0

---

## Architecture Patterns

### Recommended Project Structure (neue Dateien)

```
server/src/routes/
└── import.ts              # POST /api/import/parse (Multipart + pdfjs-Parsing)

client/src/features/admin/
└── import/
    ├── ImportScreen.tsx   # Hauptkomponente: Upload-Zone + Review-Tabelle
    ├── UploadZone.tsx     # Drag-and-Drop + Button, online-only
    ├── ReviewTable.tsx    # Editierbare Tabelle mit Farbcodierung
    └── useImportStore.ts  # React State für Parse-Ergebnis + Checkbox-State
```

### Pattern 1: Fastify Multipart Upload mit pdfjs-dist (Buffer-Strategie)

pdfjs-dist benötigt auf Node.js einen `Uint8Array` oder `ArrayBuffer`. `@fastify/multipart` kann Dateien als Buffer lesen — kein temporäres Disk-Write nötig.

```typescript
// server/src/routes/import.ts
import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function importRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  fastify.post('/import/parse', async (request, reply) => {
    const data = await request.file();
    if (!data || data.mimetype !== 'application/pdf') {
      return reply.status(400).send({ error: 'Nur PDF-Dateien erlaubt' });
    }

    const buffer = await data.toBuffer();
    const uint8Array = new Uint8Array(buffer);

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    const rows = await parseInvoicePages(pdf);

    return reply.send({ rows });
  });
}
```

**Wichtig:** pdfjs-dist 5.x verwendet ESM. Import-Pfad: `pdfjs-dist/legacy/build/pdf.mjs` für Node.js-Kompatibilität (kein Canvas-Dependency im Legacy-Build).

### Pattern 2: Koordinatenbasiertes Parsing

pdfjs-dist `getTextContent()` liefert pro Seite eine Liste von `TextItem`-Objekten mit `str` (Text), `transform` (Position), und `width`. Die Y-Koordinate ist `transform[5]`, die X-Koordinate ist `transform[4]`.

```typescript
interface TextItem {
  str: string;
  transform: number[]; // [scaleX, skewX, skewY, scaleY, x, y]
  width: number;
}

// Zeilen gruppieren: Items mit gleichem Y-Wert (±Toleranz) gehören zusammen
function groupByRows(items: TextItem[], tolerance = 2): TextItem[][] {
  const rows: Map<number, TextItem[]> = new Map();
  for (const item of items) {
    const y = Math.round(item.transform[5] / tolerance) * tolerance;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y)!.push(item);
  }
  // Nach Y absteigend sortieren (PDF-Koordinaten: oben = groß)
  return Array.from(rows.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, items]) => items.sort((a, b) => a.transform[4] - b.transform[4]));
}
```

### Pattern 3: EVP-Extraktion aus Bezeichnungsspalte

Die Bezeichnung enthält EVP als eingebetteten Text: `"Handkreuz Olivenholz (interArt, EVP € 4,00)"`. Bei mehrzeiligen Bezeichnungen können EVP-Daten auf der nächsten Zeile stehen.

```typescript
// EVP aus Bezeichnung extrahieren
function extractEvp(designation: string): { cleanName: string; evpCents: number | null } {
  // Regex: EVP € X,XX oder EVP €X,XX
  const evpMatch = designation.match(/EVP\s*€\s*([\d]+[,.][\d]{2})/i);
  if (!evpMatch) return { cleanName: designation.trim(), evpCents: null };

  const evpEur = parseFloat(evpMatch[1].replace(',', '.'));
  const evpCents = Math.round(evpEur * 100);

  // Klammer-Block mit EVP aus Name entfernen
  const cleanName = designation
    .replace(/\s*\([^)]*EVP[^)]*\)/i, '')  // "(Hersteller, EVP € X,XX)"
    .trim();

  return { cleanName, evpCents };
}
```

### Pattern 4: Rechnungspositionen erkennen

Tabellenzeilen beginnen mit einer laufenden Nummer (`1.`, `2.`, ...). Zeilen ohne diese Nummer sind Fortsetzungen (mehrzeilige Bezeichnungen) oder andere Inhalte (Summen, Footer).

```typescript
// Zeilenerkennung: Zeile ist Rechnungsposition wenn erstes Item "N." (Zahl + Punkt)
function isInvoiceRow(row: TextItem[]): boolean {
  if (row.length === 0) return false;
  return /^\d+\.$/.test(row[0].str.trim());
}

// Tabellenkopf-Zeile erkennen und überspringen
function isHeaderRow(row: TextItem[]): boolean {
  return row.some(item => item.str.includes('Artikelnummer') || item.str.includes('Bezeichnung'));
}
```

### Pattern 5: Mehrseitige PDFs verarbeiten

```typescript
async function parseInvoicePages(pdf: pdfjsLib.PDFDocumentProxy): Promise<ParsedRow[]> {
  const allRows: ParsedRow[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const textItems = content.items as TextItem[];

    const rowGroups = groupByRows(textItems);
    const invoiceRows = rowGroups
      .filter(isInvoiceRow)
      .map(rowToInvoiceEntry);

    allRows.push(...invoiceRows);
  }

  return allRows;
}
```

### Pattern 6: Artikelnummer-Matching (Client-seitig)

Matching erfolgt Client-seitig gegen die Dexie-Datenbank, nachdem der Server die Parse-Ergebnisse geliefert hat. So bleibt der Server zustandslos.

```typescript
// ImportScreen.tsx
async function matchAgainstProducts(rows: ParsedRow[]): Promise<MatchedRow[]> {
  const allProducts = await db.products
    .where('shopId').equals(SHOP_ID)
    .toArray();

  // Index aufbauen: articleNumber.toLowerCase().trim() -> Product
  const productIndex = new Map(
    allProducts.map(p => [p.articleNumber.toLowerCase().trim(), p])
  );

  return rows.map(row => {
    const key = row.articleNumber.toLowerCase().trim();
    const match = productIndex.get(key);
    return {
      ...row,
      status: match ? 'known' : 'new',
      existingProductId: match?.id,
      checked: true, // Default: alle angehakt
    };
  });
}
```

**Entscheidung zu Fuzzy-Matching:** Kein Fuzzy-Matching — exakte Übereinstimmung nach case-insensitiver Normalisierung reicht aus. Artikelnummern sind strukturiert und stabil. Fuzzy-Matching würde falsche Matches riskieren.

### Pattern 7: Bestandsbuchung nach Freigabe

```typescript
// Freigabe-Handler in ImportScreen.tsx
async function handleCommit(checkedRows: MatchedRow[]) {
  for (const row of checkedRows) {
    // Neue Produkte zuerst anlegen
    if (row.status === 'new') {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        shopId: SHOP_ID,
        articleNumber: row.articleNumber,
        name: row.name,
        purchasePrice: row.purchasePriceCents,
        salePrice: row.evpCents ?? 0,
        vatRate: row.vatRate,
        stock: 0, // wird durch Buchung gesetzt
        minStock: 0,
        category: '',
        active: true,
        updatedAt: Date.now(),
      };
      await db.products.add(newProduct);
      // Fire-and-forget Server-Sync (wie in ProductForm)
      if (navigator.onLine) {
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProduct),
        }).catch(() => {});
      }
    }

    // Bestandsbuchung via Outbox (STOCK_ADJUST mit positivem Delta)
    await db.outbox.add({
      operation: 'STOCK_ADJUST',
      payload: {
        productId: row.status === 'known' ? row.existingProductId! : newProductId,
        delta: row.quantity, // Zugang: positiv
        reason: `Import Rechnung ${invoiceNumber}`,
        shopId: SHOP_ID,
      },
      shopId: SHOP_ID,
      createdAt: Date.now(),
      attempts: 0,
    });
  }

  // Outbox flushen wenn online
  if (navigator.onLine) await flushOutbox();
}
```

### Pattern 8: ImportScreen Tab-Integration

`AdminScreen.tsx` muss den Typ `AdminTab` um `'import'` erweitern und einen vierten Tab-Button hinzufügen.

```typescript
// AdminScreen.tsx — Änderungen
type AdminTab = 'products' | 'reports' | 'settings' | 'import';

// Neuer Tab-Button (vor Einstellungen oder am Ende)
<button
  onPointerDown={() => setTab('import')}
  className={`flex-1 py-4 text-sm font-semibold transition-colors ${
    tab === 'import' ? 'bg-sky-500 text-white' : 'text-sky-700 hover:bg-sky-50'
  }`}
>
  Import
</button>

// Tab-Inhalt
{tab === 'import' && <ImportScreen />}
```

### Anti-Patterns zu vermeiden

- **PDF auf Disk speichern:** Kein temporäres File-System-Write. Buffer direkt an pdfjs übergeben — vereinfacht Docker-Setup, kein Volume nötig für Uploads.
- **clientseitiges Parsing:** pdfjs-dist im Browser ist möglich, aber iPad hat begrenzte Rechenleistung (locked decision). Immer serverseitig.
- **Absolutwerte für Bestandsbuchung:** Nicht `stock = N` setzen, sondern `delta = +N` via STOCK_ADJUST — konsistent mit bestehender Outbox-Architektur (OFF-04).
- **Blindes Auto-Import:** Kein automatisches Buchen nach dem Parsen. Immer Review-UI mit Checkboxen zuerst.
- **EVP aus separater Spalte erwarten:** EVP steht in der Bezeichnungsspalte in Klammern — kein eigenes Spalten-Item in pdfjs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF-Text-Extraktion | Eigener Binary-Parser | pdfjs-dist `getTextContent()` | Handles encoding, fonts, compressed streams |
| Multipart-File-Upload | Raw `Content-Type: multipart/form-data` Parsing | `@fastify/multipart` | Edge Cases mit Boundaries, encoding |
| Cent-Konvertierung | Eigene parseFloat-Logik | Muster aus ProductForm (`toCents()`) | Bereits getestet, gleiche Komma→Punkt-Logik |
| Produkt-Anlegen | Neuer API-Endpoint | Bestehender `POST /api/products` + Dexie-Add | LWW-Upsert bereits implementiert |
| Bestandsbuchung | Direkter Datenbank-Write | STOCK_ADJUST via Outbox + `flushOutbox()` | Sync-Mechanismus bereits vorhanden |

**Key insight:** Phase 4 verdrahtet existierende Mechanismen. Der einzige wirklich neue Code ist das PDF-Parsing und die Review-UI. Alles andere (Produkte anlegen, Bestand buchen, Sync) ist bereits fertig.

---

## Common Pitfalls

### Pitfall 1: pdfjs-dist Node.js Import-Pfad

**What goes wrong:** `import * as pdfjsLib from 'pdfjs-dist'` schlägt in Node.js fehl wegen Browser-spezifischer Worker-Abhängigkeiten.
**Why it happens:** pdfjs-dist 5.x ist primär auf Browser ausgerichtet. Node.js braucht den Legacy-Build ohne Canvas.
**How to avoid:** Import-Pfad: `pdfjs-dist/legacy/build/pdf.mjs`. Kein Worker nötig für serverseitiges Parsing: `pdfjsLib.GlobalWorkerOptions.workerSrc = ''` oder Worker deaktivieren.
**Warning signs:** Fehler "Cannot find module 'canvas'" oder "Worker is not defined".

```typescript
// Korrekt für Node.js:
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// Worker-Deaktivierung für serverseitige Nutzung:
// pdfjs-dist 5.x deaktiviert Worker automatisch wenn workerSrc nicht gesetzt
```

### Pitfall 2: Mehrzeilige Bezeichnungen im Koordinaten-Parsing

**What goes wrong:** Langer Produktname bricht in PDF auf zwei Zeilen um. Die zweite Zeile hat eine andere Y-Koordinate — der Parser erkennt sie nicht als Fortsetzung.
**Why it happens:** PDF-Renderer rendert jede Zeile als separate Text-Items. Es gibt keine semantische "Zelle"-Einheit.
**How to avoid:** Nach dem Parsen der Hauptzeile (erkannt durch laufende Nummer): Die nächste Zeile ohne Nummer, deren X-Koordinate im Bereich der Bezeichnungsspalte liegt, als Fortsetzung des Bezeichnungsfeldes behandeln.
**Warning signs:** Produktnamen enden mit Komma, EVP-Angabe fehlt in der Zeile (weil auf nächster Zeile).

### Pitfall 3: Sonderpositionen (Transportpauschale)

**What goes wrong:** Artikel `9999902 Transportpauschale/DHL` wird als reguläre Position importiert und als neues Produkt angelegt.
**Why it happens:** Transportkosten stehen als reguläre Tabellenzeile in der Rechnung.
**How to avoid:** Beim Matching erkennen und visuell kennzeichnen — entweder automatisch deselektieren (Checkbox nicht angehakt) oder als Hinweis "Nicht-Warenposition" markieren. Nicht silently filtern — Nutzerin soll entscheiden.
**Warning signs:** Checkbox für Transportpauschale standardmäßig aktiviert.

### Pitfall 4: @fastify/multipart Plugin-Registrierung

**What goes wrong:** `@fastify/multipart` muss VOR der Route registriert werden, sonst: "Multipart plugin not registered".
**Why it happens:** Fastify Dekorator-System: `request.file()` ist nur verfügbar wenn Plugin registriert ist.
**How to avoid:** `fastify.register(multipart, {...})` in der Route-Datei ODER in `index.ts` vor der Import-Route registrieren. In einer Route-Datei: `await fastify.register(multipart)` am Anfang der Funktion.

### Pitfall 5: Preis-Parsing (Euro-Format)

**What goes wrong:** `parseFloat("2,35")` ergibt `2` in JavaScript (stoppt beim Komma).
**Why it happens:** JavaScript erwartet Punkt als Dezimaltrennzeichen.
**How to avoid:** Vor parseFloat immer `.replace(',', '.')`. Bereits als `toCents()`-Funktion in ProductForm vorhanden — exakt gleiche Logik für Parser verwenden.

### Pitfall 6: Import ist Online-Only

**What goes wrong:** Nutzerin versucht Import ohne Internetverbindung — PDF kann nicht ans Backend gesendet werden.
**Why it happens:** Parsing ist serverseitig (locked decision).
**How to avoid:** In `ImportScreen.tsx` prüfen ob `navigator.onLine`. Wenn offline: Klare Meldung anzeigen, Upload-Zone deaktiviert. Analog zu `MonthlyReport.tsx` (Phase 3 hat dieses Pattern bereits implementiert).

---

## Code Examples

### pdfjs-dist Node.js Setup (serverseitig)

```typescript
// Source: pdfjs-dist npm 5.5.207, Node.js Legacy Build
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function parseSuedNordKontorPdf(buffer: Buffer): Promise<ParsedInvoiceRow[]> {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  const allRows: ParsedInvoiceRow[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageRows = extractTableRows(textContent.items as PdfTextItem[]);
    allRows.push(...pageRows);
  }

  return allRows;
}
```

### @fastify/multipart Route-Registrierung

```typescript
// Source: @fastify/multipart 9.4.0 Docs
import multipart from '@fastify/multipart';

export async function importRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB max
      files: 1,                    // nur 1 Datei
    },
  });

  fastify.post('/import/parse', async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'Keine Datei übermittelt' });
    if (!data.filename.toLowerCase().endsWith('.pdf')) {
      return reply.status(400).send({ error: 'Nur PDF-Dateien erlaubt' });
    }

    const buffer = await data.toBuffer();
    const rows = await parseSuedNordKontorPdf(buffer);
    return reply.send({ rows, filename: data.filename });
  });
}
```

### Preisangabe aus PDF parsen

```typescript
// "€ 2,35" -> 235 (Cent-Integer)
function parseEuroCents(str: string): number | null {
  // Entfernt "€", Leerzeichen, ersetzt Komma durch Punkt
  const normalized = str.replace('€', '').replace(/\s/g, '').replace(',', '.');
  const val = parseFloat(normalized);
  if (isNaN(val) || val < 0) return null;
  return Math.round(val * 100);
}

// MwSt aus "19 %" oder "7 %" extrahieren
function parseMwSt(str: string): 7 | 19 | null {
  const match = str.match(/(\d+)\s*%/);
  if (!match) return null;
  const rate = parseInt(match[1], 10);
  return (rate === 7 || rate === 19) ? rate : null;
}
```

### ParsedRow Zod-Schema (für API-Response-Validierung)

```typescript
// Zod-Schema für den API-Response von /api/import/parse
const ParsedRowSchema = z.object({
  lineNumber: z.number().int(),
  quantity: z.number().int().positive(),
  articleNumber: z.string(),
  name: z.string(),
  purchasePriceCents: z.number().int().nonnegative(),
  evpCents: z.number().int().nonnegative().nullable(), // null wenn nicht gefunden
  vatRate: z.union([z.literal(7), z.literal(19)]),
  parseWarning: z.string().optional(), // gelbe Warnung bei Parsing-Unsicherheit
});

export type ParsedRow = z.infer<typeof ParsedRowSchema>;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pdf-parse` für Text-Extraktion | `pdfjs-dist` mit Koordinaten | ~2023 (pdf-parse unmaintained) | Koordinaten ermöglichen Spalten-Erkennung |
| pdfjs-dist als Browser-only | `pdfjs-dist/legacy/build/pdf.mjs` für Node | pdfjs v3+ | Kein Canvas nötig für serverseitiges Parsing |
| @fastify/multipart v8 | @fastify/multipart v9 (für Fastify 5) | 2024 (Fastify 5 Release) | v9 ist Pflicht für Fastify 5 Kompatibilität |

**Deprecated/Outdated:**
- `pdf-parse`: Offiziell unmaintained — nicht verwenden
- `@fastify/multipart` < v9: Inkompatibel mit Fastify 5 — Version in package.json muss ≥ 9.x sein

---

## Open Questions

1. **Spalten-X-Koordinaten im echten PDF**
   - What we know: Das Layout ist konsistent über beide Rechnungen. Die Spalten liegen visuell an festen Positionen.
   - What's unclear: Die exakten X-Koordinatenwerte aus `pdfjs-dist getTextContent()` sind ohne einen Live-Test-Lauf unbekannt. Das PDF-Koordinatensystem variiert je nach Seitengröße und Skalierung.
   - Recommendation: Im ersten Task einen Debug-Endpunkt oder Logging-Schritt einbauen, der die rohen Text-Items mit Koordinaten ausgibt. Dann Spalten-Schwellen kalibrieren. Alternativ: spaltenunabhängige Strategie via laufender Nummer + bekannte Reihenfolge der Felder.

2. **Bezeichnung bei exakt einem Zeilenumbruch vs. mehreren**
   - What we know: In Rechnung 2552709 brechen mehrere Positionen in der Bezeichnungsspalte auf 2 Zeilen um. EVP erscheint dann auf der zweiten Zeile.
   - What's unclear: Ob mehr als 2 Zeilen pro Bezeichnung vorkommen können.
   - Recommendation: Implementierung soll bis zu 2 Fortsetzungszeilen sammeln, bevor eine neue laufende Nummer eine neue Position signalisiert. Das deckt alle beobachteten Fälle ab.

3. **Sonderzeichen und Sonderformate in Artikelnummern**
   - What we know: Artikelnummern enthalten Bindestriche, Zahlen, Buchstaben in Groß- und Kleinschreibung.
   - What's unclear: Ob zukünftige Rechnungen weitere Sonderzeichen einführen.
   - Recommendation: Matching generisch über `trim().toLowerCase()` — kein angepasstes Format-Normalisierung nötig.

---

## Sources

### Primary (HIGH confidence)
- Originaldokumente: `Süd-Nord-Kontor/Rechnung 2552709.pdf` und `Rechnung 2600988.pdf` — Layout-Analyse, Spaltenstruktur, Artikelnummern, EVP-Format
- `server/src/routes/products.ts` — ProductSchema, LWW-Upsert-Pattern
- `server/src/routes/sync.ts` — STOCK_ADJUST Outbox-Pattern
- `client/src/db/schema.ts` — Product-Interface, FairstandDB-Schema
- `client/src/features/admin/products/ProductForm.tsx` — toCents/toEur Konvertierung, fire-and-forget Sync
- `client/src/sync/engine.ts` — flushOutbox-Pattern
- `client/src/features/admin/AdminScreen.tsx` — Tab-Struktur für Integration

### Secondary (MEDIUM confidence)
- npm registry: `npm view pdfjs-dist version` → 5.5.207 (verifiziert 2026-03-23)
- npm registry: `npm view @fastify/multipart version` → 9.4.0 (verifiziert 2026-03-23)
- CLAUDE.md Projekt-Stack-Dokumentation — pdfjs-dist und @fastify/multipart als vorgesehene Pakete

### Tertiary (LOW confidence)
- pdfjs-dist Node.js Legacy-Build Import-Pfad (`pdfjs-dist/legacy/build/pdf.mjs`) — aus bekanntem Community-Muster, sollte im ersten Task verifiziert werden

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — aus package.json und CLAUDE.md verifiziert, npm-Versionen live geprüft
- Rechnungs-Layout: HIGH — aus echten Originaldokumenten analysiert, nicht hypothetisch
- pdfjs-dist Parsing-Pattern: MEDIUM — API-Pattern bekannt, exakte Koordinatenwerte erst durch Live-Test verifizierbar
- Architektur-Integration: HIGH — alle Integrationspunkte aus bestehendem Code gelesen

**Research date:** 2026-03-23
**Valid until:** 2026-06-23 (pdfjs-dist: 30 Tage; Rechnungslayout: stabil solange Süd-Nord-Kontor Format nicht ändert)
