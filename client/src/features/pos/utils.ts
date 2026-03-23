/**
 * Formatiert einen Cent-Integer als Euro-Betrag nach deutschem Format.
 * Pattern 3 aus RESEARCH.md
 *
 * @example formatEur(789) → "7,89 €"
 */
export const formatEur = (cents: number): string =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
