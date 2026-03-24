import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Worker deaktivieren für Node.js Server-Umgebung
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

export interface ParsedInvoiceRow {
  lineNumber: number;
  quantity: number;
  articleNumber: string;
  name: string;
  purchasePriceCents: number;
  evpCents: number | null;
  vatRate: 7 | 19;
  parseWarning?: string;
}

interface PdfTextItem {
  str: string;
  transform: number[]; // [scaleX, skewX, skewY, scaleY, x, y]
  width: number;
}

/**
 * Gruppiert Text-Items nach Y-Koordinate (mit Toleranz).
 * Y absteigend sortieren (PDF: oben = grosse Werte).
 * Innerhalb jeder Zeile nach X aufsteigend sortieren.
 */
function groupByRows(items: PdfTextItem[], tolerance = 2): PdfTextItem[][] {
  const rowMap = new Map<number, PdfTextItem[]>();

  for (const item of items) {
    if (!item.str.trim()) continue; // Leerzeichen-Items ignorieren
    const y = Math.round(item.transform[5] / tolerance) * tolerance;
    if (!rowMap.has(y)) rowMap.set(y, []);
    rowMap.get(y)!.push(item);
  }

  return Array.from(rowMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, rowItems]) => rowItems.sort((a, b) => a.transform[4] - b.transform[4]));
}

/**
 * Zeile ist eine Rechnungsposition wenn das erste Item eine laufende Nummer ist (z.B. "1.", "12.").
 */
function isInvoiceRow(row: PdfTextItem[]): boolean {
  if (row.length === 0) return false;
  return /^\d+\.$/.test(row[0].str.trim());
}

/**
 * Tabellenkopf-Zeilen erkennen und ueberspringen.
 */
function isHeaderRow(row: PdfTextItem[]): boolean {
  return row.some(
    (item) => item.str.includes('Artikelnummer') || item.str.includes('Bezeichnung')
  );
}

/**
 * Euro-String zu Cent-Integer konvertieren.
 * "€ 2,35" -> 235
 * Gibt null zurueck bei ungueltigem Format.
 */
function parseEuroCents(str: string): number | null {
  const normalized = str.replace('€', '').replace(/\s/g, '').replace(',', '.');
  const val = parseFloat(normalized);
  if (isNaN(val) || val < 0) return null;
  return Math.round(val * 100);
}

/**
 * MwSt-Satz aus "19 %" oder "7 %" extrahieren.
 * Gibt nur 7 oder 19 zurueck, alles andere ist null.
 */
function parseMwSt(str: string): 7 | 19 | null {
  const match = str.match(/(\d+)\s*%/);
  if (!match) return null;
  const rate = parseInt(match[1], 10);
  return rate === 7 || rate === 19 ? rate : null;
}

/**
 * EVP aus der Bezeichnungsspalte extrahieren.
 * Erwartet Format: "Produktname (Hersteller, EVP € 4,00)"
 * Gibt cleanName (ohne EVP-Klammer) und evpCents zurueck.
 */
function extractEvp(designation: string): { cleanName: string; evpCents: number | null } {
  const evpMatch = designation.match(/EVP\s*€\s*([\d]+[,.][\d]{2})/i);
  if (!evpMatch) {
    return { cleanName: designation.trim(), evpCents: null };
  }

  const evpEur = parseFloat(evpMatch[1].replace(',', '.'));
  const evpCents = Math.round(evpEur * 100);

  // Klammer-Block mit EVP aus Name entfernen: "(Hersteller, EVP € X,XX)"
  const cleanName = designation.replace(/\s*\([^)]*EVP[^)]*\)/i, '').trim();

  return { cleanName, evpCents };
}

/**
 * Prüft ob ein Text-Item im X-Bereich der Bezeichnungsspalte liegt.
 * Die Bezeichnungsspalte liegt typischerweise nach der Artikelnummer (x > 100)
 * und vor den Preis-Spalten.
 * Wir verwenden einen pragmatischen Ansatz: Items zwischen Index 2 und vorletztem
 * Euro-Item in einer bekannten Hauptzeile als Bezeichnungs-X-Bereich.
 */
function isInDesignationXRange(item: PdfTextItem, minX: number, maxX: number): boolean {
  const x = item.transform[4];
  return x >= minX && x <= maxX;
}

/**
 * Parsed eine einzelne Rechnungszeile und moeglicherweise Fortsetzungszeilen.
 * Gibt die ParsedInvoiceRow oder null bei Fehler zurueck.
 */
function parseInvoiceRowFromItems(
  mainRow: PdfTextItem[],
  continuationRows: PdfTextItem[][]
): ParsedInvoiceRow | null {
  const warnings: string[] = [];

  // Laufende Nummer aus erstem Item (z.B. "1.") -> lineNumber = 1
  const lineNumberStr = mainRow[0].str.trim().replace('.', '');
  const lineNumber = parseInt(lineNumberStr, 10);
  if (isNaN(lineNumber)) return null;

  // Items ohne das laufende Nummer-Item
  const items = mainRow.slice(1);

  if (items.length < 3) {
    warnings.push('Zu wenige Spalten in Zeile');
  }

  // Item 0 (nach Nummer): Menge
  const quantityStr = items[0]?.str.trim() ?? '';
  const quantity = parseInt(quantityStr, 10);
  if (isNaN(quantity)) {
    warnings.push(`Ungueltige Menge: "${quantityStr}"`);
  }

  // Item 1: Artikelnummer
  const articleNumber = items[1]?.str.trim() ?? '';
  if (!articleNumber) {
    warnings.push('Artikelnummer fehlt');
  }

  // Bezeichnung: Items 2 bis N, dabei Euro-Items (enthalten "€") und Prozent-Items am Ende raushalten
  // Strategie: Von hinten nach vorne Euro- und Prozent-Items als Preis/MwSt identifizieren
  let purchasePriceCents: number | null = null;
  let vatRate: 7 | 19 | null = null;

  // Finde von hinten: letztes %-Item = MwSt, vorletztes €-Item = Preis/St., letztes €-Item = Gesamt
  const euroItems: number[] = [];
  const percentItems: number[] = [];

  for (let i = 2; i < items.length; i++) {
    const str = items[i].str.trim();
    if (str.includes('%')) percentItems.push(i);
    else if (str.includes('€') && str !== '€') euroItems.push(i);
    // Manche PDFs haben "€" als separates Token — nur Items mit tatsaechlichem Wert
  }

  // Letztes %-Item: MwSt
  if (percentItems.length > 0) {
    const mwstIdx = percentItems[percentItems.length - 1];
    const mwst = parseMwSt(items[mwstIdx].str);
    if (mwst !== null) {
      vatRate = mwst;
    } else {
      // Koennte Rabatt-Spalte sein (z.B. "30 %") — suche weiteres %-Item
      if (percentItems.length > 1) {
        const mwstIdx2 = percentItems[percentItems.length - 2];
        // Nein, nur das letzte ist MwSt (Rabatt kommt vor Preis/St.)
        // Versuche das vorletzte %-Item falls das letzte kein gueltiger MwSt-Satz ist
        const mwst2 = parseMwSt(items[mwstIdx2].str);
        if (mwst2 !== null) {
          vatRate = mwst2;
        } else {
          warnings.push(`Unbekannter MwSt-Satz: "${items[mwstIdx].str}"`);
        }
      } else {
        warnings.push(`Unbekannter MwSt-Satz: "${items[mwstIdx].str}"`);
      }
    }
  } else {
    warnings.push('MwSt nicht gefunden');
  }

  // Euro-Items: letztes = Gesamt (verwerfen), vorletztes = Preis/St.
  // Aber: Rabatt-Spalte ist leer oder "30 %" — kein Euro-Item
  // Daher: zweitletztes Euro-Item ist Preis/St., letztes ist Gesamt
  if (euroItems.length >= 2) {
    const priceIdx = euroItems[euroItems.length - 2];
    const priceVal = parseEuroCents(items[priceIdx].str);
    if (priceVal !== null) {
      purchasePriceCents = priceVal;
    } else {
      warnings.push(`Ungültiger Preis/St.: "${items[priceIdx].str}"`);
    }
  } else if (euroItems.length === 1) {
    // Nur ein Euro-Item: koennte Preis/St. sein ohne Gesamt-Spalte auf dieser Zeile
    const priceVal = parseEuroCents(items[euroItems[0]].str);
    if (priceVal !== null) {
      purchasePriceCents = priceVal;
    } else {
      warnings.push(`Ungültiger Preis: "${items[euroItems[0]].str}"`);
    }
  } else {
    warnings.push('Preis/St. nicht gefunden');
  }

  // Bezeichnung: alle Items zwischen Artikelnummer und erstem Preis/Prozent-Item
  const firstPriceOrPercentIdx = Math.min(
    ...[...euroItems, ...percentItems].filter((i) => i >= 2)
  );

  let designationItems = items.slice(2, isFinite(firstPriceOrPercentIdx) ? firstPriceOrPercentIdx : undefined);
  let designationText = designationItems.map((i) => i.str.trim()).join(' ');

  // Fortsetzungszeilen hinzufuegen (mehrzeilige Bezeichnungen)
  // X-Bereich der Bezeichnungsspalte aus Hauptzeile bestimmen
  const designationMinX = items[2]?.transform[4] ?? 0;
  const designationMaxX = firstPriceOrPercentIdx < items.length
    ? items[firstPriceOrPercentIdx].transform[4]
    : 999;

  for (const contRow of continuationRows) {
    // Nur Items im X-Bereich der Bezeichnungsspalte
    const contItems = contRow.filter((item) =>
      isInDesignationXRange(item, designationMinX - 10, designationMaxX + 10)
    );
    if (contItems.length > 0) {
      const contText = contItems.map((i) => i.str.trim()).join(' ');
      designationText = designationText + ' ' + contText;
    }
  }

  designationText = designationText.trim();

  // EVP aus kombinierter Bezeichnung extrahieren (nach Zusammenfuegen aller Zeilen)
  const { cleanName, evpCents } = extractEvp(designationText);

  const row: ParsedInvoiceRow = {
    lineNumber,
    quantity: isNaN(quantity) ? 0 : quantity,
    articleNumber,
    name: cleanName,
    purchasePriceCents: purchasePriceCents ?? 0,
    evpCents,
    vatRate: vatRate ?? 19,
  };

  if (warnings.length > 0) {
    row.parseWarning = warnings.join('; ');
  }

  return row;
}

/**
 * Parsed alle Seiten einer Sued-Nord-Kontor-Rechnung.
 * Liefert ein Array mit allen erkannten Rechnungspositionen.
 */
export async function parseSuedNordKontorPdf(buffer: Buffer): Promise<ParsedInvoiceRow[]> {
  // Worker deaktivieren fuer serverseitige Nutzung
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  const allRows: ParsedInvoiceRow[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = textContent.items as PdfTextItem[];

    const rowGroups = groupByRows(textItems);

    // Zeilen iterieren: Rechnungszeilen erkennen, Fortsetzungszeilen sammeln
    let i = 0;
    while (i < rowGroups.length) {
      const row = rowGroups[i];

      if (isHeaderRow(row)) {
        i++;
        continue;
      }

      if (!isInvoiceRow(row)) {
        i++;
        continue;
      }

      // Rechnungszeile gefunden — Fortsetzungszeilen sammeln (max 2)
      const continuationRows: PdfTextItem[][] = [];
      let j = i + 1;
      while (j < rowGroups.length && continuationRows.length < 2) {
        const nextRow = rowGroups[j];
        // Naechste Zeile ist Rechnungszeile oder Header -> stoppen
        if (isInvoiceRow(nextRow) || isHeaderRow(nextRow)) break;
        // Nur Zeilen hinzufuegen die nicht leer sind
        if (nextRow.length > 0) {
          continuationRows.push(nextRow);
        }
        j++;
      }

      const parsed = parseInvoiceRowFromItems(row, continuationRows);
      if (parsed) {
        allRows.push(parsed);
      }

      i = j; // Weiter nach den Fortsetzungszeilen
    }
  }

  return allRows;
}
