/**
 * Laesst nur eigene Bildquellen durch (Serverpfad, Blob-URL der Dateiauswahl):
 * imageUrl kommt ueber den Sync vom Client und darf nicht als javascript:- oder
 * data:-URL in einem src landen.
 */
export function safeImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/images/')) return url;
  if (url.startsWith('blob:')) return url;
  return null;
}
