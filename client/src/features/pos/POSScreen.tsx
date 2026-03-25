import { useState, useEffect } from 'react';
import { ShoppingCart, Settings, Lock, WifiOff } from 'lucide-react';
import { authFetch } from '../auth/serverAuth.js';
import type { Sale } from '../../db/index.js';
import { ArticleGrid } from './ArticleGrid.js';
import { CartPanel } from './CartPanel.js';
import { PaymentFlow } from './PaymentFlow.js';
import { SaleSummary } from './SaleSummary.js';
import { LowStockBanner } from './LowStockBanner.js';
import { useCart } from './useCart.js';
import { completeSale, completeWithdrawal } from './useSaleComplete.js';
import { getStoredSession } from '../auth/serverAuth.js';
import { useProducts } from '../../hooks/api/useProducts.js';

type POSView = 'pos' | 'payment' | 'summary';

interface POSScreenProps {
  onLock: () => void;
  onSwitchToAdmin?: () => void;
  lowStockCount?: number;
}

export function POSScreen({ onLock, onSwitchToAdmin, lowStockCount = 0 }: POSScreenProps) {
  const cart = useCart();
  const { data: products = [] } = useProducts();
  const [view, setView] = useState<POSView>('pos');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cartSidebarEnabled, setCartSidebarEnabled] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(() =>
    window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    getStoredSession().then(s => { if (s) setShopName(s.shopName); });
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    authFetch('/api/settings')
      .then(r => r.json())
      .then((rows: Array<{ key: string; value: string }>) => {
        const setting = rows.find(r => r.key === 'cart_sidebar_enabled');
        if (setting) setCartSidebarEnabled(setting.value === 'true');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (cart.invalidItems.length > 0) {
      setStockError(
        `Artikel nicht mehr verfügbar und aus Warenkorb entfernt: ${cart.invalidItems.join(', ')}`
      );
      cart.clearInvalidItems();
      const t = setTimeout(() => setStockError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [cart.invalidItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offline-Overlay — überschreibt gesamte UI bei fehlender Verbindung
  if (!isOnline) {
    return (
      <div className="fixed inset-0 z-50 bg-sky-50 flex flex-col items-center justify-center gap-6 p-8">
        <WifiOff size={64} className="text-sky-300" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Keine Internetverbindung</h2>
          <p className="text-slate-500 text-sm max-w-xs">
            Die Fairstand Kasse benötigt eine aktive Internetverbindung.
            Bitte WLAN oder Mobilfunk aktivieren.
          </p>
        </div>
      </div>
    );
  }

  async function handlePaymentComplete(paidCents: number, changeCents: number) {
    try {
      setError(null);
      const sale = await completeSale(cart.items, paidCents, changeCents);
      setLastSale(sale);
      setView('summary');
      setIsCartOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Abschließen.');
    }
  }

  function handleNext() {
    cart.clear();
    setLastSale(null);
    setView('pos');
  }

  function handleCorrect() {
    if (lastSale) {
      cart.clear();
      for (const saleItem of lastSale.items) {
        const proxyProduct = {
          id: saleItem.productId,
          shopId: '',
          articleNumber: saleItem.articleNumber,
          name: saleItem.name,
          category: '',
          purchasePrice: 0,
          salePrice: saleItem.salePrice,
          vatRate: 0,
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

  async function handleWithdrawal() {
    const reason = window.prompt('Grund der Entnahme (optional):', '');
    if (reason === null) return; // Abbruch
    try {
      setError(null);
      const sale = await completeWithdrawal(cart.items, products, reason);
      setLastSale(sale);
      setView('summary');
      setIsCartOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Entnahme.');
    }
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

  // Stock-aware quantity update wrapper
  async function handleUpdateQuantity(productId: string, quantity: number) {
    const product = products.find(p => p.id === productId);
    return cart.updateQuantity(productId, quantity, product?.stock);
  }

  // --- View: POS-Hauptansicht ---
  const cartItemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const shouldShowSidebar = cartSidebarEnabled && isLargeScreen;

  return (
    <div className="h-screen bg-sky-50 flex flex-col overflow-hidden">
      {/* Mindestbestand-Warnung */}
      <LowStockBanner />

      {/* Header */}
      <header className="bg-sky-400 text-white flex items-center justify-between px-4 py-3 shrink-0 shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold leading-tight">Fairstand Kasse</h1>
          {shopName && <p className="text-sky-100 text-xs leading-tight">{shopName}</p>}
          {!isOnline && (
            <span className="flex items-center gap-1 text-sky-200 text-xs mt-0.5">
              <WifiOff size={12} />
              Offline
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Warenkorb-Button mit Badge — nur wenn kein Sidebar-Modus */}
          {!shouldShowSidebar && (
            <button
              onPointerDown={() => setIsCartOpen(true)}
              className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:bg-sky-500 transition-colors"
              aria-label="Warenkorb öffnen"
            >
              <ShoppingCart size={26} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-sky-700 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          )}

          {/* Verwaltung-Button */}
          {onSwitchToAdmin && (
            <button
              onPointerDown={onSwitchToAdmin}
              className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-sky-500 active:bg-sky-700 transition-colors"
              aria-label="Verwaltung"
            >
              <Settings size={22} />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {lowStockCount}
                </span>
              )}
            </button>
          )}

          {/* Sperren-Button */}
          <button
            onPointerDown={onLock}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-sky-600 active:bg-sky-800 transition-colors"
            aria-label="Sperren"
          >
            <Lock size={20} />
          </button>
        </div>
      </header>

      {/* Stock-Fehler Toast */}
      {stockError && (
        <div className="mx-4 mt-2 px-4 py-3 bg-rose-50 text-rose-700 text-sm rounded-xl shadow-sm">
          {stockError}
        </div>
      )}

      {/* Inhalt-Bereich: flex-row auf lg+ wenn Sidebar aktiv */}
      <div className="flex flex-1 overflow-hidden">
        {/* Artikel-Grid */}
        <div className="flex-1 overflow-hidden">
          <ArticleGrid onAddToCart={product => {
            const result = cart.addItem(product);
            if (!result.added) {
              setStockError(`"${product.name}" ist nicht mehr auf Lager.`);
              setTimeout(() => setStockError(null), 2500);
            } else {
              setStockError(null);
              if (!shouldShowSidebar) setIsCartOpen(true);
            }
          }} />
        </div>

        {/* Sidebar-Modus: statische Warenkorb-Spalte */}
        {shouldShowSidebar && (
          <CartPanel
            sidebar={true}
            isOpen={true}
            items={cart.items}
            total={cart.total}
            onClose={() => {}}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={cart.removeItem}
            onCheckout={() => { setView('payment'); }}
            onWithdrawal={handleWithdrawal}
          />
        )}
      </div>

      {/* Slide-In Modus: bestehendes Verhalten */}
      {!shouldShowSidebar && (
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
          onWithdrawal={handleWithdrawal}
        />
      )}
    </div>
  );
}
