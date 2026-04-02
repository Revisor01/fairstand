// Session-Daten die lokal gespeichert werden
export interface StoredSession {
  shopId: string;
  shopName: string;
  token: string;
  lastActivity: number; // Unix-Timestamp ms
  isMaster: boolean;
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
    const data = await res.json() as { shopId: string; shopName: string; token: string; isMaster: boolean };
    const session: StoredSession = {
      shopId: data.shopId,
      shopName: data.shopName,
      token: data.token,
      lastActivity: Date.now(),
      isMaster: data.isMaster,
    };
    localStorage.setItem('session', JSON.stringify(session));
    return session;
  } catch {
    // Netzwerkfehler — offline-Fallback (getStoredSession prüft gespeicherte Session)
    return null;
  }
}

// Gespeicherte Session laden (für Offline-Fallback + App-Start-Check)
export async function getStoredSession(): Promise<StoredSession | null> {
  const raw = localStorage.getItem('session');
  return raw ? JSON.parse(raw) as StoredSession : null;
}

// Session löschen (Logout)
export async function clearSession(): Promise<void> {
  localStorage.removeItem('session');
}

// lastActivity aktualisieren (für Session-Timeout)
export async function updateActivity(): Promise<void> {
  const session = await getStoredSession();
  if (!session) return;
  localStorage.setItem('session', JSON.stringify({ ...session, lastActivity: Date.now() }));
}

// Session-Timeout: 2 Stunden (120 Min) — identisch zu bisherigem pinAuth.ts
export async function isSessionValid(): Promise<boolean> {
  const session = await getStoredSession();
  if (!session) return false;
  return Date.now() - session.lastActivity < 120 * 60 * 1000;
}

// Auth-Header für API-Requests (Token aus gespeicherter Session)
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getStoredSession();
  if (!session?.token) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.token}`,
  };
}

// Fetch-Wrapper der bei 401 automatisch zum Login zurückkehrt
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const headers = await getAuthHeaders();
  // Remove Content-Type for requests without body (e.g. DELETE, GET) to avoid Fastify FST_ERR_CTP_EMPTY_JSON_BODY
  if (!options?.body) {
    delete headers['Content-Type'];
  }
  const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
  if (res.status === 401) {
    localStorage.removeItem('session');
    window.location.reload();
    // Nie erreicht, aber TypeScript braucht ein return
    return res;
  }
  return res;
}
