/**
 * Laesst nur Bildquellen durch, die wir selbst erzeugen: den serverseitigen
 * Bildpfad und Blob-URLs aus der lokalen Dateiauswahl.
 *
 * Produkt-Datensaetze kommen ueber den Sync vom Client und werden serverseitig
 * uebernommen — ein manipuliertes imageUrl-Feld darf daher nicht als
 * javascript:- oder data:-URL in einem src landen.
 */
export function safeImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/images/')) return url;
  if (url.startsWith('blob:')) return url;
  return null;
}
