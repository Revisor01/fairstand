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

/** Gruppiert Text-Items zu Zeilen: Y absteigend (PDF zählt von unten), X aufsteigend. */
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

/** Beide Rechnungsformate setzen die Positionsnummer ("1.") in eine eigene Zeile. */
function isInvoiceRow(row: PdfTextItem[]): boolean {
  if (row.length === 0) return false;
  return /^\d+\.$/.test(row[0].str.trim());
}

function isHeaderRow(row: PdfTextItem[]): boolean {
  return row.some(
    (item) => item.str.includes('Artikelnummer') || item.str.includes('Bezeichnung')
  );
}

/** "€ 2,35" → 235, sonst null. */
function parseEuroCents(str: string): number | null {
  const normalized = str.replace('€', '').replace(/\s/g, '').replace(',', '.');
  const val = parseFloat(normalized);
  if (isNaN(val) || val < 0) return null;
  return Math.round(val * 100);
}

/** Nur 7 oder 19, alles andere null. */
function parseMwSt(str: string): 7 | 19 | null {
  const match = str.match(/(\d+)\s*%/);
  if (!match) return null;
  const rate = parseInt(match[1], 10);
  return rate === 7 || rate === 19 ? rate : null;
}

/** Trennt "Produktname (Hersteller, EVP € 4,00)" in Name und EVP in Cent. */
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

function isInDesignationXRange(item: PdfTextItem, minX: number, maxX: number): boolean {
  const x = item.transform[4];
  return x >= minX && x <= maxX;
}

/** Von hinten zählen: letzter €-Wert Gesamt, vorletzter Preis/St., letztes % MwSt, % davor Rabatt. */
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

  // Das früheste €/%-Item ab Index 2 begrenzt die Bezeichnung rechts.
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

/** Ohne Timeout; parseSuedNordKontorPdf ruft das mit Timeout auf. */
async function _parsePdf(buffer: Buffer): Promise<ParsedInvoiceRow[]> {
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

/** Parst eine Süd-Nord-Kontor-Rechnung mit Timeout, damit ein kaputtes PDF den Server nicht blockiert. */
export async function parseSuedNordKontorPdf(buffer: Buffer): Promise<ParsedInvoiceRow[]> {
  const PDF_PARSE_TIMEOUT_MS = 30_000;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`PDF-Parsing Timeout: Verarbeitung dauerte länger als ${PDF_PARSE_TIMEOUT_MS / 1000}s`)),
      PDF_PARSE_TIMEOUT_MS,
    )
  );

  return Promise.race([_parsePdf(buffer), timeoutPromise]);
}
