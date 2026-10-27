// Sessions im Speicher: ein Neustart meldet ab, der Client meldet sich selbst neu an.

interface Session {
  shopId: string;
  createdAt: number;
}

const sessions = new Map<string, Session>();


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
