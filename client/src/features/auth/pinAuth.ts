import { get, set } from 'idb-keyval';

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
  await set('pinHash', hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await get<string>('pinHash');
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}

export async function updateActivity(): Promise<void> {
  await set('lastActivity', Date.now());
}

export async function isSessionValid(): Promise<boolean> {
  const last = await get<number>('lastActivity');
  if (!last) return false;
  return Date.now() - last < 120 * 60 * 1000;
}

export async function hasPinSetup(): Promise<boolean> {
  const hash = await get<string>('pinHash');
  return Boolean(hash);
}

export async function logout(): Promise<void> {
  await set('lastActivity', 0);
}
