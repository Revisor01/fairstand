import { useState, useEffect } from 'react';
import { getShopId } from '../../../db/index.js';

interface Setting {
  key: string;
  value: string;
  shopId: string;
}

export function SettingsForm() {
  const [reportEmail, setReportEmail] = useState('');
  const [reportMonthly, setReportMonthly] = useState(false);
  const [reportYearly, setReportYearly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/settings?shopId=${getShopId()}`)
      .then(r => r.json())
      .then((rows: Setting[]) => {
        for (const row of rows) {
          if (row.key === 'report_email') setReportEmail(row.value);
          if (row.key === 'report_monthly') setReportMonthly(row.value === 'true');
          if (row.key === 'report_yearly') setReportYearly(row.value === 'true');
        }
      })
      .catch(() => {/* ignorieren bei Offline */});
  }, []);

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    setSavedKey(key);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, shopId: getShopId() }),
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

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-sky-800">Einstellungen</h2>

      {/* E-Mail-Adresse */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-sky-700">Berichts-E-Mail</h3>
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
            className="h-12 text-lg border border-slate-200 rounded-lg px-3 focus:outline-none focus:border-sky-400"
          />
          {savedKey === 'report_email' && !saving && (
            <span className="text-xs text-green-600">Gespeichert</span>
          )}
        </div>

        {/* Automatischer Versand */}
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
          <h3 className="text-sm font-semibold text-sky-700">Automatischer Versand</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reportMonthly}
              onChange={e => handleMonthlyChange(e.target.checked)}
              className="w-6 h-6 accent-sky-500"
            />
            <span className="text-sm text-slate-700">Monatlichen Bericht per Mail senden</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
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
      <div className="bg-sky-50 rounded-xl p-4 text-sm text-sky-700 border border-sky-100">
        <p className="font-medium mb-1">SMTP-Konfiguration</p>
        <p>Die SMTP-Konfiguration erfolgt ueber die Server-Umgebungsvariablen. E-Mail-Versand funktioniert nur wenn SMTP_HOST und SMTP_USER im Docker-Container gesetzt sind.</p>
      </div>
    </div>
  );
}
