import type { FastifyInstance } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { validateSession } from '../lib/sessions.js';

// shopId → Set von aktiven WebSocket-Verbindungen
const clients = new Map<string, Set<WebSocket>>();

export type BroadcastMessage =
  | { type: 'products_changed'; shopId: string }
  | { type: 'categories_changed'; shopId: string }
  | { type: 'stock_changed'; shopId: string };

/**
 * Sendet ein Invalidierungs-Signal an alle verbundenen Clients desselben Shops.
 * Wird von products.ts, categories.ts und sync.ts nach Mutationen aufgerufen.
 */
export function broadcast(msg: BroadcastMessage): void {
  const conns = clients.get(msg.shopId);
  if (!conns) return;
  const payload = JSON.stringify(msg);
  for (const ws of conns) {
    if (ws.readyState === 1 /* WebSocket.OPEN */) {
      ws.send(payload);
    }
  }
}

export async function websocketRoutes(fastify: FastifyInstance) {
  await fastify.register(websocketPlugin);

  fastify.get('/api/ws', { websocket: true }, (socket, request) => {
    // Token aus Query-Parameter holen: /api/ws?token=...
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(1008, 'Token fehlt');
      return;
    }

    const session = validateSession(token);
    if (!session) {
      socket.close(1008, 'Ungültiger Token');
      return;
    }

    const { shopId } = session;

    // Client registrieren
    if (!clients.has(shopId)) {
      clients.set(shopId, new Set());
    }
    clients.get(shopId)!.add(socket);

    socket.on('close', () => {
      clients.get(shopId)?.delete(socket);
      if (clients.get(shopId)?.size === 0) {
        clients.delete(shopId);
      }
    });

    // Keepalive: Client kann pings senden, Server antwortet nicht explizit
    socket.on('error', () => {
      clients.get(shopId)?.delete(socket);
    });
  });
}
