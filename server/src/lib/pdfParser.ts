import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Worker-Pfad setzen für Node.js Server-Umgebung (pdfjs-dist v5)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';

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
 * Zeile ist eine Positionsnummer-Zeile wenn das erste und einzige Item
 * eine laufende Nummer ist (z.B. "1.", "12.").
 * Beide Rechnungsformate trennen die Positionsnummer in eine eigene Zeile.
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
 */
function isInDesignationXRange(item: PdfTextItem, minX: number, maxX: number): boolean {
  const x = item.transform[4];
  return x >= minX && x <= maxX;
}

/**
 * Parsed eine einzelne Rechnungszeile.
 *
 * Layout (beide Formate):
 *   dataRow = [Menge, Artikelnummer, Bezeichnung..., (Rabatt%), Preis/St., MwSt%, Gesamt]
 *
 * Strategie "von hinten zählen":
 *   - letztes €-Item = Gesamt (verwerfen)
 *   - vorletztes €-Item = Preis/St.
 *   - letztes %-Item = MwSt (7 oder 19)
 *   - %-Item vor Preis/St. = Rabatt (ignorieren, kein parseWarning)
 *   - Bezeichnung = Items zwischen Index 2 und dem frühesten Preis/Prozent-Item
 */
function parseInvoiceRowFromItems(
  lineNumber: number,
  dataRow: PdfTextItem[],
  continuationRows: PdfTextItem[][]
): ParsedInvoiceRow | null {
  const warnings: string[] = [];

  if (dataRow.length < 3) {
    warnings.push('Zu wenige Spalten in Zeile');
  }

  // Item 0: Menge
  const quantityStr = dataRow[0]?.str.trim() ?? '';
  const quantity = parseInt(quantityStr, 10);
  if (isNaN(quantity)) {
    warnings.push(`Ungueltige Menge: "${quantityStr}"`);
  }

  // Item 1: Artikelnummer
  const articleNumber = dataRow[1]?.str.trim() ?? '';
  if (!articleNumber) {
    warnings.push('Artikelnummer fehlt');
  }

  // Finde Euro- und Prozent-Items ab Index 2
  const euroIndices: number[] = [];
  const percentIndices: number[] = [];

  for (let i = 2; i < dataRow.length; i++) {
    const str = dataRow[i].str.trim();
    if (str.includes('%')) {
      percentIndices.push(i);
    } else if (str.includes('€') && str !== '€') {
      // Nur Items mit echtem Wert (nicht alleinstehendes "€"-Token)
      euroIndices.push(i);
    }
  }

  // MwSt: letztes %-Item muss 7 oder 19 sein
  let vatRate: 7 | 19 | null = null;
  if (percentIndices.length > 0) {
    const mwstIdx = percentIndices[percentIndices.length - 1];
    vatRate = parseMwSt(dataRow[mwstIdx].str);
    if (vatRate === null) {
      warnings.push(`Unbekannter MwSt-Satz: "${dataRow[mwstIdx].str}"`);
    }
  } else {
    warnings.push('MwSt nicht gefunden');
  }

  // Preis/St.: zweitletztes €-Item (letztes ist Gesamt)
  let purchasePriceCents: number | null = null;
  if (euroIndices.length >= 2) {
    const priceIdx = euroIndices[euroIndices.length - 2];
    const priceVal = parseEuroCents(dataRow[priceIdx].str);
    if (priceVal !== null) {
      purchasePriceCents = priceVal;
    } else {
      warnings.push(`Ungültiger Preis/St.: "${dataRow[priceIdx].str}"`);
    }
  } else if (euroIndices.length === 1) {
    // Nur ein €-Item: koennte Preis/St. sein ohne Gesamt-Spalte auf dieser Zeile
    const priceVal = parseEuroCents(dataRow[euroIndices[0]].str);
    if (priceVal !== null) {
      purchasePriceCents = priceVal;
    } else {
      warnings.push(`Ungültiger Preis: "${dataRow[euroIndices[0]].str}"`);
    }
  } else {
    warnings.push('Preis/St. nicht gefunden');
  }

  // Bezeichnung: alle Items zwischen Index 2 und dem frühesten €/%-Item
  // Das früheste solcher Items bestimmt die rechte Grenze der Bezeichnung
  const allPriceIndices = [...euroIndices, ...percentIndices].filter((i) => i >= 2);
  const firstPriceIdx = allPriceIndices.length > 0 ? Math.min(...allPriceIndices) : dataRow.length;

  let designationItems = dataRow.slice(2, firstPriceIdx);
  let designationText = designationItems.map((i) => i.str.trim()).join(' ');

  // Fortsetzungszeilen hinzufuegen (mehrzeilige Bezeichnungen)
  const designationMinX = dataRow[2]?.transform[4] ?? 0;
  const designationMaxX = firstPriceIdx < dataRow.length
    ? dataRow[firstPriceIdx].transform[4]
    : 999;

  for (const contRow of continuationRows) {
    const contItems = contRow.filter((item) =>
      isInDesignationXRange(item, designationMinX - 10, designationMaxX + 10)
    );
    if (contItems.length > 0) {
      const contText = contItems.map((i) => i.str.trim()).join(' ');
      designationText = designationText + ' ' + contText;
    }
  }

  designationText = designationText.trim();

  // EVP aus kombinierter Bezeichnung extrahieren
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
 *
 * Layout-Erkenntnis: Die Positionsnummer ("1.", "2.", ...) steht in einer eigenen
 * Zeile, direkt gefolgt von der Datenzeile (Menge, Artikelnummer, Bezeichnung, etc.).
 * Beide Rechnungsformate (mit und ohne Rabatt-Spalte) folgen diesem Muster.
 */
export async function parseSuedNordKontorPdf(buffer: Buffer): Promise<ParsedInvoiceRow[]> {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  const allRows: ParsedInvoiceRow[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const textItems = textContent.items as PdfTextItem[];

    const rowGroups = groupByRows(textItems);

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

      // Positionsnummer-Zeile gefunden — Zeilennummer extrahieren
      const lineNumberStr = row[0].str.trim().replace('.', '');
      const lineNumber = parseInt(lineNumberStr, 10);
      if (isNaN(lineNumber)) {
        i++;
        continue;
      }

      // Nächste Zeile: Datenzeile mit Menge, Artikelnummer, Bezeichnung, Preis usw.
      // Diese Zeile darf keine Positionsnummer sein (ist sie nie in den Rechnungen)
      let dataRow: PdfTextItem[] | null = null;
      const continuationRows: PdfTextItem[][] = [];
      let j = i + 1;

      if (j < rowGroups.length && !isInvoiceRow(rowGroups[j]) && !isHeaderRow(rowGroups[j])) {
        dataRow = rowGroups[j];
        j++;

        // Weitere Zeilen: Fortsetzungszeilen fuer mehrzeilige Bezeichnungen (max 3)
        while (j < rowGroups.length && continuationRows.length < 3) {
          const nextRow = rowGroups[j];
          if (isInvoiceRow(nextRow) || isHeaderRow(nextRow)) break;
          if (nextRow.length > 0) {
            continuationRows.push(nextRow);
          }
          j++;
        }
      }

      if (dataRow && dataRow.length > 0) {
        const parsed = parseInvoiceRowFromItems(lineNumber, dataRow, continuationRows);
        if (parsed) {
          allRows.push(parsed);
        }
      }

      i = j;
    }
  }

  return allRows;
}
