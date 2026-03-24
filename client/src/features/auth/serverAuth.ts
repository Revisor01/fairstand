import { get, set, del } from 'idb-keyval';

// Session-Daten die lokal gespeichert werden
export interface StoredSession {
  shopId: string;
  shopName: string;
  token: string;
  lastActivity: number; // Unix-Timestamp ms
}

// POST /api/auth/pin aufrufen und Session lokal speichern
export async function serverLogin(pin: string): Promise<StoredSession | null> {
  try {
    const res = await fetch('/api/auth/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { shopId: string; shopName: string; token: string };
    const session: StoredSession = {
      shopId: data.shopId,
      shopName: data.shopName,
      token: data.token,
      lastActivity: Date.now(),
    };
    await set('session', session);
    return session;
  } catch {
    // Netzwerkfehler — offline-Fallback (getStoredSession prüft gespeicherte Session)
    return null;
  }
}

// Gespeicherte Session laden (für Offline-Fallback + App-Start-Check)
export async function getStoredSession(): Promise<StoredSession | null> {
  return await get<StoredSession>('session') ?? null;
}

// Session löschen (Logout)
export async function clearSession(): Promise<void> {
  await del('session');
}

// lastActivity aktualisieren (für Session-Timeout)
export async function updateActivity(): Promise<void> {
  const session = await getStoredSession();
  if (!session) return;
  await set('session', { ...session, lastActivity: Date.now() });
}

// Session-Timeout: 2 Stunden (120 Min) — identisch zu bisherigem pinAuth.ts
export async function isSessionValid(): Promise<boolean> {
  const session = await getStoredSession();
  if (!session) return false;
  return Date.now() - session.lastActivity < 120 * 60 * 1000;
}
