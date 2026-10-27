/** Formatiert Cent als Euro-Betrag, z. B. 789 → "7,89 €". */
export const formatEur = (cents: number): string =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
