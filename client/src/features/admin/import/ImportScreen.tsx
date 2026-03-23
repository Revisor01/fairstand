import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';
import { db, SHOP_ID } from '../../../db/index.js';
import type { Product } from '../../../db/index.js';
import { flushOutbox } from '../../../sync/engine.js';
import { UploadZone } from './UploadZone.js';
import { ReviewTable } from './ReviewTable.js';
import type { MatchedRow } from './ReviewTable.js';

interface ParsedInvoiceRow {
  lineNumber: number;
  quantity: number;
  articleNumber: string;
  name: string;
  purchasePriceCents: number;
  evpCents: number | null;
  vatRate: 7 | 19;
  parseWarning?: string;
}

interface ParseResponse {
  rows: ParsedInvoiceRow[];
  filename: string;
}

interface ImportHistoryEntry {
  date: number;
  filename: string;
  positionCount: number;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ImportScreen() {
  const [rows, setRows] = useState<MatchedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([]);
  const [currentFilename, setCurrentFilename] = useState('');

  useEffect(() => {
    get<ImportHistoryEntry[]>('import-history').then(history => {
      if (history) setImportHistory(history);
    });
  }, []);

  async function handleFileSelected(file: File) {
    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import/parse', {
        method: 'POST',
        body: formData,
        // Kein Content-Type Header — Browser setzt multipart boundary automatisch
      });

      if (!res.ok) {
        const errorText = await res.text();
        setError('Fehler beim Verarbeiten der PDF: ' + errorText);
        return;
      }

      const data: ParseResponse = await res.json();
      setCurrentFilename(data.filename);

      // Matching gegen Dexie-Produktdatenbank
      const products = await db.products.where('shopId').equals(SHOP_ID).toArray();
      const productIndex = new Map(
        products.map(p => [p.articleNumber.toLowerCase().trim(), p])
      );

      const matchedRows: MatchedRow[] = data.rows.map(row => {
        const match = productIndex.get(row.articleNumber.toLowerCase().trim());
        return {
          ...row,
          status: match ? 'known' : 'new',
          existingProductId: match?.id,
          checked: true,
        };
      });

      setRows(matchedRows);
    } catch (err) {
      setError('Fehler beim Verarbeiten der PDF: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    } finally {
      setUploading(false);
    }
  }

  function handleRowChange(index: number, updates: Partial<MatchedRow>) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  }

  function handleToggleCheck(index: number) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, checked: !r.checked } : r));
  }

  function handleToggleAll() {
    const allChecked = rows.every(r => r.checked);
    setRows(prev => prev.map(r => ({ ...r, checked: !allChecked })));
  }

  async function handleCommit() {
    setCommitting(true);
    setError(null);

    try {
      const checkedRows = rows.filter(r => r.checked);

      for (const row of checkedRows) {
        let productId: string;

        if (row.status === 'new') {
          const newProduct: Product = {
            id: crypto.randomUUID(),
            shopId: SHOP_ID,
            articleNumber: row.articleNumber.trim(),
            name: row.name.trim(),
            category: '',
            purchasePrice: row.purchasePriceCents,
            salePrice: row.evpCents ?? 0,
            vatRate: row.vatRate,
            stock: 0,
            minStock: 0,
            active: true,
            updatedAt: Date.now(),
          };
          await db.products.add(newProduct);
          productId = newProduct.id;

          // Fire-and-forget Server-Sync fuer neues Produkt
          if (navigator.onLine) {
            fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newProduct),
            }).catch(() => {});
          }
        } else {
          productId = row.existingProductId!;
        }

        // Bestandsbuchung via Outbox (STOCK_ADJUST mit positivem Delta)
        await db.outbox.add({
          operation: 'STOCK_ADJUST',
          payload: {
            productId,
            delta: row.quantity,
            reason: 'Import Rechnung',
            shopId: SHOP_ID,
          },
          shopId: SHOP_ID,
          createdAt: Date.now(),
          attempts: 0,
        });

        // Lokalen Bestand direkt aktualisieren
        await db.products
          .where('id')
          .equals(productId)
          .modify((p: Product) => { p.stock += row.quantity; });
      }

      // Outbox flushen wenn online
      if (navigator.onLine) {
        await flushOutbox();
      }

      // Import-Historie aktualisieren
      const history = (await get<ImportHistoryEntry[]>('import-history')) ?? [];
      history.unshift({
        date: Date.now(),
        filename: currentFilename,
        positionCount: checkedRows.length,
      });
      const trimmedHistory = history.slice(0, 50);
      await set('import-history', trimmedHistory);
      setImportHistory(trimmedHistory);

      setSuccessMessage(`${checkedRows.length} Position${checkedRows.length === 1 ? '' : 'en'} gebucht.`);
      setRows([]);
    } catch (err) {
      setError('Fehler beim Buchen: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    } finally {
      setCommitting(false);
    }
  }

  const hasCheckedRows = rows.some(r => r.checked);

  return (
    <div className="flex flex-col gap-4 mt-4">
      <h2 className="text-lg font-semibold text-sky-800">Rechnungsimport</h2>

      {error && (
        <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
          {successMessage}
        </div>
      )}

      {rows.length === 0 && !uploading ? (
        <>
          <UploadZone onFileSelected={handleFileSelected} uploading={uploading} />

          {importHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-sky-700 mb-3">Letzte Importe</h3>
              <ul className="flex flex-col gap-2">
                {importHistory.map((entry, i) => (
                  <li key={i} className="flex items-center justify-between text-sm text-slate-600 border-t border-slate-50 pt-2 first:border-t-0 first:pt-0">
                    <span className="font-medium truncate mr-2">{entry.filename}</span>
                    <span className="text-slate-400 whitespace-nowrap">
                      {entry.positionCount} Pos. · {formatDate(entry.date)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          {uploading && (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-sky-600 font-semibold text-lg">PDF wird verarbeitet...</p>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <p className="text-sm text-slate-500">
                {rows.length} Position{rows.length === 1 ? '' : 'en'} gefunden —{' '}
                {rows.filter(r => r.status === 'known').length} bekannt,{' '}
                {rows.filter(r => r.status === 'new').length} neu
              </p>

              <ReviewTable
                rows={rows}
                onRowChange={handleRowChange}
                onToggleCheck={handleToggleCheck}
                onToggleAll={handleToggleAll}
              />

              <div className="flex flex-col gap-3">
                <button
                  onPointerDown={handleCommit}
                  disabled={committing || !hasCheckedRows}
                  className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 text-white font-semibold h-14 text-lg rounded-xl w-full transition-colors"
                >
                  {committing
                    ? 'Wird gebucht...'
                    : `Bestand buchen (${rows.filter(r => r.checked).length} Positionen)`}
                </button>
                <button
                  onPointerDown={() => setRows([])}
                  disabled={committing}
                  className="text-slate-500 hover:text-slate-700 text-sm py-2"
                >
                  Abbrechen
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
