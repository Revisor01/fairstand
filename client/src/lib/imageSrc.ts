/** Nur eigene Bildquellen, weil imageUrl über den Sync kommt und kein javascript:- oder data:-src werden darf. */
export function safeImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/images/')) return url;
  if (url.startsWith('blob:')) return url;
  return null;
}
