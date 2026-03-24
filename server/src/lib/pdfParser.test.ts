import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseSuedNordKontorPdf } from './pdfParser.js';

/**
 * TDD Tests fuer den PDF-Parser.
 * Beide Rechnungsformate muessen korrekt geparst werden:
 * - Rechnung 2600988: Format A (ohne Rabatt-Spalte)
 * - Rechnung 2552709: Format B (mit Rabatt-Spalte)
 */

const PDF_DIR = join(process.cwd(), '..', 'Süd-Nord-Kontor');

describe('parseSuedNordKontorPdf — Format A (2600988, ohne Rabatt)', () => {
  it('parst die Rechnung ohne parseWarning', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2600988.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      expect(row.parseWarning, `Zeile ${row.lineNumber}: ${row.parseWarning}`).toBeUndefined();
    }
  });

  it('hat gueltige Mengenwerte > 0 fuer alle Zeilen', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2600988.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    for (const row of rows) {
      expect(row.quantity, `Zeile ${row.lineNumber}: Menge ungueltig`).toBeGreaterThan(0);
    }
  });

  it('hat erkannte Artikelnummern (nicht leer)', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2600988.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    for (const row of rows) {
      expect(row.articleNumber, `Zeile ${row.lineNumber}: Artikelnummer leer`).toBeTruthy();
    }
  });

  it('hat positive purchasePriceCents', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2600988.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    for (const row of rows) {
      expect(row.purchasePriceCents, `Zeile ${row.lineNumber}: Preis nicht positiv`).toBeGreaterThan(0);
    }
  });
});

describe('parseSuedNordKontorPdf — Format B (2552709, mit Rabatt-Spalte)', () => {
  it('parst die Rechnung ohne parseWarning', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2552709.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      expect(row.parseWarning, `Zeile ${row.lineNumber}: ${row.parseWarning}`).toBeUndefined();
    }
  });

  it('hat gueltige Mengenwerte > 0 fuer alle Zeilen', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2552709.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    for (const row of rows) {
      expect(row.quantity, `Zeile ${row.lineNumber}: Menge ungueltig`).toBeGreaterThan(0);
    }
  });

  it('hat erkannte Artikelnummern (nicht leer)', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2552709.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    for (const row of rows) {
      expect(row.articleNumber, `Zeile ${row.lineNumber}: Artikelnummer leer`).toBeTruthy();
    }
  });

  it('hat positive purchasePriceCents', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2552709.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    for (const row of rows) {
      expect(row.purchasePriceCents, `Zeile ${row.lineNumber}: Preis nicht positiv`).toBeGreaterThan(0);
    }
  });

  it('Bezeichnung enthaelt keine Prozent-Tokens (Rabatt-Spalte darf nicht in name landen)', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2552709.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    for (const row of rows) {
      expect(row.name, `Zeile ${row.lineNumber}: Bezeichnung enthaelt "%"`).not.toMatch(/%/);
    }
  });

  it('Bezeichnung enthaelt keine Euro-Tokens (Preis darf nicht in name landen)', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2552709.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    for (const row of rows) {
      // Erlaubt: EVP im Namen als Teil von "(Hersteller, EVP € 4,00)" ist ok — aber standalone "€ 2,35" nicht
      // Nach extractEvp sollte name sauber sein
      expect(row.name, `Zeile ${row.lineNumber}: Bezeichnung enthaelt "€ [0-9]"`).not.toMatch(/€\s*\d/);
    }
  });
});

describe('isInvoiceRow-Erkennungslogik', () => {
  it('erkennt "1." als Zeilenbeginn in beiden Formaten', async () => {
    // Indirekt getestet: Beide Rechnungen werden geparst und haben Zeile 1
    const buffer2600988 = readFileSync(join(PDF_DIR, 'Rechnung 2600988.pdf'));
    const rows2600988 = await parseSuedNordKontorPdf(buffer2600988);
    expect(rows2600988.some((r) => r.lineNumber === 1)).toBe(true);

    const buffer2552709 = readFileSync(join(PDF_DIR, 'Rechnung 2552709.pdf'));
    const rows2552709 = await parseSuedNordKontorPdf(buffer2552709);
    expect(rows2552709.some((r) => r.lineNumber === 1)).toBe(true);
  });
});
