import { useState, useEffect } from 'react';
import type { Sale } from '../../db/index.js';
import { ArticleGrid } from './ArticleGrid.js';
import { CartPanel } from './CartPanel.js';
import { PaymentFlow } from './PaymentFlow.js';
import { SaleSummary } from './SaleSummary.js';
import { LowStockBanner } from './LowStockBanner.js';
import { useCart } from './useCart.js';
import { completeSale } from './useSaleComplete.js';
import { getStoredSession } from '../auth/serverAuth.js';
import { useSyncStatus, resetFailedEntries } from '../../sync/useSyncStatus.js';

type POSView = 'pos' | 'payment' | 'summary';

interface POSScreenProps {
  onLock: () => void;
  onSwitchToAdmin?: () => void;
  lowStockCount?: number;
}

export function POSScreen({ onLock, onSwitchToAdmin, lowStockCount = 0 }: POSScreenProps) {
  const cart = useCart();
  const syncStatus = useSyncStatus();
  const [view, setView] = useState<POSView>('pos');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>('');

  useEffect(() => {
    getStoredSession().then(s => { if (s) setShopName(s.shopName); });
  }, []);

  useEffect(() => {
    if (cart.invalidItems.length > 0) {
      setStockError(
        `Artikel nicht mehr verfügbar und aus Warenkorb entfernt: ${cart.invalidItems.join(', ')}`
      );
      cart.clearInvalidItems();
      // Toast nach 4 Sekunden ausblenden (längere Anzeigezeit als normale Stock-Fehler)
      const t = setTimeout(() => setStockError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [cart.invalidItems]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePaymentComplete(paidCents: number, changeCents: number) {
    try {
      setError(null);
      const sale = await completeSale(cart.items, paidCents, changeCents);
      setLastSale(sale);
      setView('summary');
      setIsCartOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Abschließen.');
      // view bleibt 'payment'
    }
  }

  function handleNext() {
    cart.clear();
    setLastSale(null);
    setView('pos');
  }

  function handleCorrect() {
    // Phase 1: Warenkorb mit gleichen Artikeln neu befüllen, view: 'pos'
    // Vollständige Storno-Logik ist DEFERRED (laut CONTEXT.md)
    if (lastSale) {
      cart.clear();
      // Artikel aus dem letzten Verkauf erneut in den Warenkorb laden
      // Da completeSale Preis-Snapshots enthält, laden wir sie direkt als items
      // useCart.addItem erwartet ein Product — wir setzen den State manuell via Umweg
      // Lösung: Artikel einzeln hinzufügen per Proxy-Produkt
      for (const saleItem of lastSale.items) {
        const proxyProduct = {
          id: saleItem.productId,
          shopId: '',
          articleNumber: saleItem.articleNumber,
          name: saleItem.name,
          category: '',
          purchasePrice: 0,
          salePrice: saleItem.salePrice, // Snapshot-Preis beibehalten
          vatRate: 0,
          // stock auf saleItem.quantity setzen damit der neue Stock-Check beim Re-Befüllen nicht blockiert
          stock: saleItem.quantity,
          active: true,
          minStock: 0,
          updatedAt: 0,
        };
        for (let i = 0; i < saleItem.quantity; i++) {
          cart.addItem(proxyProduct);
        }
      }
    }
    setLastSale(null);
    setView('pos');
    setIsCartOpen(true);
  }

  // --- View: Zusammenfassung ---
  if (view === 'summary' && lastSale) {
    return (
      <div className="min-h-screen bg-sky-50">
        <SaleSummary
          sale={lastSale}
          onNext={handleNext}
          onCorrect={handleCorrect}
        />
      </div>
    );
  }

  // --- View: Bezahlung ---
  if (view === 'payment') {
    return (
      <div className="min-h-screen">
        {error && (
          <div className="absolute top-4 left-4 right-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm z-10">
            {error}
          </div>
        )}
        <PaymentFlow
          totalCents={cart.total}
          items={cart.items}
          onComplete={handlePaymentComplete}
          onCancel={() => {
            setError(null);
            setView('pos');
            setIsCartOpen(true);
          }}
        />
      </div>
    );
  }

  // --- View: POS-Hauptansicht ---
  const cartItemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col">
      {/* Mindestbestand-Warnung */}
      <LowStockBanner />

      {/* Header */}
      <header className="bg-sky-400 text-white flex items-center justify-between px-4 py-3 shrink-0 shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold leading-tight">Fairstand Kasse</h1>
          {shopName && <p className="text-sky-100 text-xs leading-tight">{shopName}</p>}
        </div>

        <div className="flex items-center gap-3">
          {/* Sync-Status-Badge */}
          {syncStatus !== 'synced' && (
            <button
              onPointerDown={() => {
                if (syncStatus === 'failed') {
                  void resetFailedEntries();
                }
              }}
              title={
                syncStatus === 'failed'
                  ? 'Sync fehlgeschlagen — antippen zum Wiederholen'
                  : 'Synchronisierung läuft...'
              }
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${
                syncStatus === 'failed' ? 'bg-rose-400 animate-pulse' : 'bg-amber-300 animate-pulse'
              }`} />
              <span className={syncStatus === 'failed' ? 'text-rose-200' : 'text-sky-100'}>
                {syncStatus === 'failed' ? 'Sync fehlg.' : 'Syncing...'}
              </span>
            </button>
          )}

          {/* Warenkorb-Button mit Badge */}
          <button
            onPointerDown={() => setIsCartOpen(true)}
            className="
              relative min-h-[44px] min-w-[44px] flex items-center justify-center
              rounded-xl hover:bg-sky-500 active:bg-sky-600 transition-colors
            "
            aria-label="Warenkorb öffnen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {cartItemCount > 0 && (
              <span className="
                absolute -top-1 -right-1
                bg-white text-sky-700 text-xs font-bold
                w-5 h-5 rounded-full flex items-center justify-center
              ">
                {cartItemCount}
              </span>
            )}
          </button>

          {/* Verwaltung-Button mit Mindestbestand-Badge */}
          {onSwitchToAdmin && (
            <button
              onPointerDown={onSwitchToAdmin}
              className="
                relative text-sm bg-sky-500 px-3 py-2 rounded-lg min-h-[44px]
                hover:bg-sky-600 active:bg-sky-700 transition-colors
              "
            >
              Verwaltung
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {lowStockCount}
                </span>
              )}
            </button>
          )}

          {/* Sperren-Button */}
          <button
            onPointerDown={onLock}
            className="
              text-sm bg-sky-600 px-3 py-2 rounded-lg min-h-[44px]
              hover:bg-sky-700 active:bg-sky-800 transition-colors
            "
          >
            Sperren
          </button>
        </div>
      </header>

      {/* Stock-Fehler Toast */}
      {stockError && (
        <div className="mx-4 mt-2 px-4 py-3 bg-rose-50 text-rose-700 text-sm rounded-xl shadow-sm">
          {stockError}
        </div>
      )}

      {/* Artikel-Grid */}
      <div className="flex-1 overflow-hidden">
        <ArticleGrid onAddToCart={product => {
          const result = cart.addItem(product);
          if (!result.added) {
            setStockError(`"${product.name}" ist nicht mehr auf Lager.`);
            setTimeout(() => setStockError(null), 2500);
          } else {
            setStockError(null);
            setIsCartOpen(true);
          }
        }} />
      </div>

      {/* Warenkorb Slide-In */}
      <CartPanel
        isOpen={isCartOpen}
        items={cart.items}
        total={cart.total}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={cart.updateQuantity}
        onRemoveItem={cart.removeItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setView('payment');
        }}
      />
    </div>
  );
}
