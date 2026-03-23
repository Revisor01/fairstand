function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatEur(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
}

interface ReportData {
  monthLabel: string;
  saleCount: number;
  totalCents: number;
  costCents: number;
  marginCents: number;
  donationCents: number;
  topArticles: Array<{ name: string; total_qty: number; revenue_cents: number }>;
}

export function buildMonthlyReportHtml(data: ReportData): string {
  const topRows = data.topArticles.map(a => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e0f2fe;">${escapeHtml(a.name)}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${a.total_qty}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(a.revenue_cents)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #0ea5e9; margin-bottom: 24px;">Fairstand Monatsbericht ${escapeHtml(data.monthLabel)}</h1>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr style="background: #f0f9ff;">
      <th style="text-align: left; padding: 8px; border: 1px solid #e0f2fe;">Kennzahl</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">Wert</th>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e0f2fe;">Anzahl Verkaeufe</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${data.saleCount}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e0f2fe;">Gesamtumsatz</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(data.totalCents)}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e0f2fe;">EK-Kosten</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(data.costCents)}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e0f2fe; font-weight: bold;">Marge</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe; font-weight: bold; color: #10b981;">${formatEur(data.marginCents)}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #e0f2fe;">Spenden</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(data.donationCents)}</td>
    </tr>
  </table>
  ${data.topArticles.length > 0 ? `
  <h2 style="color: #0ea5e9; margin-bottom: 16px;">Top 5 Artikel</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr style="background: #f0f9ff;">
      <th style="text-align: left; padding: 8px; border: 1px solid #e0f2fe;">Artikel</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">Menge</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">Umsatz</th>
    </tr>
    ${topRows}
  </table>
  ` : ''}
  <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">Automatisch generiert vom Fairstand Kassensystem</p>
</body>
</html>`;
}

export function buildYearlyReportHtml(year: number, months: Array<{ month: number; sale_count: number; total_cents: number; cost_cents: number; margin_cents: number; donation_cents: number }>): string {
  const monthNames = ['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const totalSales = months.reduce((s, m) => s + m.sale_count, 0);
  const totalCents = months.reduce((s, m) => s + m.total_cents, 0);
  const totalCost = months.reduce((s, m) => s + m.cost_cents, 0);
  const totalMargin = months.reduce((s, m) => s + m.margin_cents, 0);
  const totalDonations = months.reduce((s, m) => s + m.donation_cents, 0);

  const monthRows = months.map(m => `
    <tr>
      <td style="padding: 8px; border: 1px solid #e0f2fe;">${monthNames[m.month - 1]}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${m.sale_count}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(m.total_cents)}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(m.cost_cents)}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(m.margin_cents)}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(m.donation_cents)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #0ea5e9; margin-bottom: 24px;">Fairstand Jahresbericht ${year}</h1>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr style="background: #f0f9ff;">
      <th style="text-align: left; padding: 8px; border: 1px solid #e0f2fe;">Gesamt</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">Wert</th>
    </tr>
    <tr><td style="padding: 8px; border: 1px solid #e0f2fe;">Verkaeufe</td><td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${totalSales}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #e0f2fe;">Umsatz</td><td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(totalCents)}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #e0f2fe;">EK-Kosten</td><td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(totalCost)}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #e0f2fe; font-weight: bold;">Marge</td><td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe; font-weight: bold; color: #10b981;">${formatEur(totalMargin)}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #e0f2fe;">Spenden</td><td style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">${formatEur(totalDonations)}</td></tr>
  </table>
  <h2 style="color: #0ea5e9; margin-bottom: 16px;">Monatsuebersicht</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr style="background: #f0f9ff;">
      <th style="text-align: left; padding: 8px; border: 1px solid #e0f2fe;">Monat</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">Verkaeufe</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">Umsatz</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">EK-Kosten</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">Marge</th>
      <th style="text-align: right; padding: 8px; border: 1px solid #e0f2fe;">Spenden</th>
    </tr>
    ${monthRows}
  </table>
  <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">Automatisch generiert vom Fairstand Kassensystem</p>
</body>
</html>`;
}
