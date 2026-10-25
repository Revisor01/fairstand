// Die Start-PIN des ersten Ladens kommt aus der Umgebung, damit sie nie im
// öffentlichen Quelltext steht.
export function resolveSeedPin(env: NodeJS.ProcessEnv): string {
  const pin = env.INITIAL_SHOP_PIN?.trim() ?? '';
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error(
      'INITIAL_SHOP_PIN fehlt oder ist ungültig (4 bis 8 Ziffern). Sie wird nur beim ersten Start gebraucht, um den Master-Laden anzulegen.',
    );
  }
  return pin;
}
