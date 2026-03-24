// Fester Kassen-PIN für St. Secundus Hennstedt
const DEFAULT_PIN = '140381';

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function setupPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  localStorage.setItem('pinHash', hash);
}

export async function ensureDefaultPin(): Promise<void> {
  const existing = localStorage.getItem('pinHash');
  if (!existing) {
    await setupPin(DEFAULT_PIN);
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  await ensureDefaultPin();
  const stored = localStorage.getItem('pinHash');
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}

export async function updateActivity(): Promise<void> {
  localStorage.setItem('lastActivity', String(Date.now()));
}

export async function isSessionValid(): Promise<boolean> {
  const lastStr = localStorage.getItem('lastActivity');
  const last = lastStr ? parseInt(lastStr, 10) : null;
  if (!last) return false;
  return Date.now() - last < 120 * 60 * 1000;
}

export async function hasPinSetup(): Promise<boolean> {
  await ensureDefaultPin();
  return true;
}

export async function logout(): Promise<void> {
  localStorage.setItem('lastActivity', '0');
}
