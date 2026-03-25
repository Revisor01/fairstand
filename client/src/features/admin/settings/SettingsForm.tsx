import { useState, useEffect } from 'react';
import { Mail, Send, Info, Banknote, Plus, X, LayoutPanelTop } from 'lucide-react';
import { getShopId } from '../../../db/index.js';
import { authFetch } from '../../auth/serverAuth.js';

interface Setting {
  key: string;
  value: string;
  shopId: string;
}

const DEFAULT_QUICK_AMOUNTS = [500, 1000, 2000, 5000];

function formatEurSimple(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

export function SettingsForm() {
  const [reportEmail, setReportEmail] = useState('');
  const [reportMonthly, setReportMonthly] = useState(false);
  const [reportYearly, setReportYearly] = useState(false);
  const [cartSidebarEnabled, setCartSidebarEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [quickAmounts, setQuickAmounts] = useState<number[]>(DEFAULT_QUICK_AMOUNTS);
  const [newAmountStr, setNewAmountStr] = useState('');

  useEffect(() => {
    authFetch(`/api/settings?shopId=${getShopId()}`)
      .then(r => r.json())
      .then((rows: Setting[]) => {
        for (const row of rows) {
          if (row.key === 'report_email') setReportEmail(row.value);
          if (row.key === 'report_monthly') setReportMonthly(row.value === 'true');
          if (row.key === 'report_yearly') setReportYearly(row.value === 'true');
          if (row.key === 'cart_sidebar_enabled') setCartSidebarEnabled(row.value === 'true');
        }
      })
      .catch(() => {});

    // Schnellbeträge lokal laden
    const val = localStorage.getItem('quick_amounts');
    if (val) {
      try {
        const parsed = JSON.parse(val) as number[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuickAmounts(parsed);
        }
      } catch { /* default */ }
    }
  }, []);

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    setSavedKey(key);
    try {
      await authFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ key, value }),
      });
      setTimeout(() => setSavedKey(null), 1500);
    } catch {
      // ignorieren
    } finally {
      setSaving(false);
    }
  }

  function handleEmailBlur() {
    saveSetting('report_email', reportEmail);
  }

  function handleMonthlyChange(checked: boolean) {
    setReportMonthly(checked);
    saveSetting('report_monthly', checked ? 'true' : 'false');
  }

  function handleYearlyChange(checked: boolean) {
    setReportYearly(checked);
    saveSetting('report_yearly', checked ? 'true' : 'false');
  }

  function handleCartSidebarChange(checked: boolean) {
    setCartSidebarEnabled(checked);
    saveSetting('cart_sidebar_enabled', checked ? 'true' : 'false');
  }

  async function saveQuickAmounts(amounts: number[]) {
    const sorted = [...amounts].sort((a, b) => a - b);
    setQuickAmounts(sorted);
    localStorage.setItem('quick_amounts', JSON.stringify(sorted));
    setSavedKey('quick_amounts');
    setTimeout(() => setSavedKey(null), 1500);
  }

  function handleAddQuickAmount() {
    const val = parseFloat(newAmountStr.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    const cents = Math.round(val * 100);
    if (quickAmounts.includes(cents)) return;
    saveQuickAmounts([...quickAmounts, cents]);
    setNewAmountStr('');
  }

  function handleRemoveQuickAmount(cents: number) {
    saveQuickAmounts(quickAmounts.filter(a => a !== cents));
  }

  function handleResetQuickAmounts() {
    saveQuickAmounts(DEFAULT_QUICK_AMOUNTS);
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-sky-800">Einstellungen</h2>

      {/* Warenkorb-Layout */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-sky-700 flex items-center gap-2">
          <LayoutPanelTop size={16} />
          Warenkorb-Layout
        </h3>

        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={cartSidebarEnabled}
            onChange={e => handleCartSidebarChange(e.target.checked)}
            className="w-6 h-6 accent-sky-500"
          />
          <span className="text-sm text-slate-700">
            Warenkorb als feste Spalte auf breiten Screens anzeigen
          </span>
        </label>

        <p className="text-xs text-slate-500">
          Auf iPad im Querformat (ab 1024px Breite) wird der Warenkorb als feste rechte Spalte angezeigt.
          Auf iPhone und iPad im Hochformat bleibt das Slide-In Panel aktiv.
        </p>

        {savedKey === 'cart_sidebar_enabled' && !saving && (
          <span className="text-xs text-green-600">Gespeichert</span>
        )}
      </div>

      {/* Schnellbeträge */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-sky-700 flex items-center gap-2">
          <Banknote size={16} />
          Schnellbeträge (Kasse)
        </h3>
        <p className="text-xs text-slate-500">
          Diese Beträge werden als Schnellauswahl beim Bezahlen angezeigt.
        </p>

        {/* Aktuelle Beträge */}
        <div className="flex flex-wrap gap-2">
          {quickAmounts.map(cents => (
            <div
              key={cents}
              className="flex items-center gap-1 bg-sky-50 border border-sky-200 rounded-lg px-3 py-1.5 text-sm text-sky-700 font-medium"
            >
              {formatEurSimple(cents)}
              <button
                onPointerDown={() => handleRemoveQuickAmount(cents)}
                className="ml-1 text-sky-400 active:text-rose-500 transition-colors"
                title="Entfernen"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {quickAmounts.length === 0 && (
            <span className="text-xs text-slate-400">Keine Schnellbeträge konfiguriert</span>
          )}
        </div>

        {/* Neuen Betrag hinzufügen */}
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={newAmountStr}
            onChange={e => setNewAmountStr(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddQuickAmount()}
            placeholder="z.B. 5,00"
            className="flex-1 min-h-[44px] border border-slate-200 rounded-lg px-3 text-base focus:outline-none focus:border-sky-400"
          />
          <button
            onPointerDown={handleAddQuickAmount}
            className="bg-sky-500 active:bg-sky-700 text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
            title="Betrag hinzufügen"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Reset */}
        <button
          onPointerDown={handleResetQuickAmounts}
          className="text-xs text-slate-400 active:text-slate-600 text-left transition-colors"
        >
          Auf Standard zurücksetzen (5€, 10€, 20€, 50€)
        </button>

        {savedKey === 'quick_amounts' && !saving && (
          <span className="text-xs text-green-600">Gespeichert</span>
        )}
      </div>

      {/* E-Mail-Adresse */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-sky-700 flex items-center gap-2">
          <Mail size={16} />
          Berichts-E-Mail
        </h3>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-600" htmlFor="report-email">
            E-Mail-Adresse für Berichte
          </label>
          <input
            id="report-email"
            type="email"
            value={reportEmail}
            onChange={e => setReportEmail(e.target.value)}
            onBlur={handleEmailBlur}
            placeholder="beispiel@email.de"
            className="h-12 text-base border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
          />
          {savedKey === 'report_email' && !saving && (
            <span className="text-xs text-green-600">Gespeichert</span>
          )}
        </div>

        {/* Automatischer Versand */}
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
          <h3 className="text-sm font-semibold text-sky-700 flex items-center gap-2">
            <Send size={16} />
            Automatischer Versand
          </h3>

          <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={reportMonthly}
              onChange={e => handleMonthlyChange(e.target.checked)}
              className="w-6 h-6 accent-sky-500"
            />
            <span className="text-sm text-slate-700">Monatlichen Bericht per Mail senden</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={reportYearly}
              onChange={e => handleYearlyChange(e.target.checked)}
              className="w-6 h-6 accent-sky-500"
            />
            <span className="text-sm text-slate-700">Jaehrlichen Bericht per Mail senden</span>
          </label>
        </div>
      </div>

      {/* Hinweis SMTP */}
      <div className="bg-sky-50 rounded-xl p-4 text-sm text-sky-700 border border-sky-100 flex gap-3">
        <Info size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-medium mb-1">SMTP-Konfiguration</p>
          <p>Die SMTP-Konfiguration erfolgt ueber die Server-Umgebungsvariablen. E-Mail-Versand funktioniert nur wenn SMTP_HOST und SMTP_USER im Docker-Container gesetzt sind.</p>
        </div>
      </div>
    </div>
  );
}
