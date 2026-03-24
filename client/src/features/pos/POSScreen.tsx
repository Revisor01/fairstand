import { useState } from 'react';
import type { Sale } from '../../db/index.js';
import { ArticleGrid } from './ArticleGrid.js';
import { CartPanel } from './CartPanel.js';
import { PaymentFlow } from './PaymentFlow.js';
import { SaleSummary } from './SaleSummary.js';
import { LowStockBanner } from './LowStockBanner.js';
import { useCart } from './useCart.js';
import { completeSale } from './useSaleComplete.js';

type POSView = 'pos' | 'payment' | 'summary';

interface POSScreenProps {
  onLock: () => void;
  onSwitchToAdmin?: () => void;
  lowStockCount?: number;
}

export function POSScreen({ onLock, onSwitchToAdmin, lowStockCount = 0 }: POSScreenProps) {
  const cart = useCart();
  const [view, setView] = useState<POSView>('pos');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="min-h-screen bg-white flex flex-col">
        {error && (
          <div className="p-3 m-4 bg-rose-50 text-rose-600 rounded-xl text-sm">
            {error}
          </div>
        )}
        <div className="flex-1">
          <PaymentFlow
            totalCents={cart.total}
            onComplete={handlePaymentComplete}
            onCancel={() => {
              setError(null);
              setView('pos');
              setIsCartOpen(true);
            }}
          />
        </div>
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
        <h1 className="text-xl font-bold">Fairstand Kasse</h1>

        <div className="flex items-center gap-3">
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

      {/* Artikel-Grid */}
      <div className="flex-1 overflow-hidden">
        <ArticleGrid onAddToCart={product => {
          cart.addItem(product);
          setIsCartOpen(true);
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
