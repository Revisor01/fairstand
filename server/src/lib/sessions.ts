// In-Memory Session Store
// Token → { shopId, createdAt }
// Kein DB-Overhead; Sessions überleben keinen Server-Neustart (akzeptabel — Client logged automatisch re-ein)

interface Session {
  shopId: string;
  createdAt: number;
}

const sessions = new Map<string, Session>();

// Session lifetime: 30 Tage (wie idb-keyval auf Client, kein expliziter Ablauf)
// Für jetzt: Sessions bleiben bis Server-Neustart

export function createSession(token: string, shopId: string): void {
  sessions.set(token, { shopId, createdAt: Date.now() });
}

export function validateSession(token: string): Session | null {
  return sessions.get(token) ?? null;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

// Sichtbar für /api/auth/logout (optional, für sauberes Logout)
export function getSessionCount(): number {
  return sessions.size;
}
