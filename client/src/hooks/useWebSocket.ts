import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getStoredSession } from '../features/auth/serverAuth.js';
import { getShopId } from '../db/index.js';

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(MIN_BACKOFF_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    async function connect() {
      if (unmountedRef.current) return;

      const session = await getStoredSession();
      if (!session?.token) return; // Kein Token — nicht verbinden

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const url = `${protocol}//${host}/api/ws?token=${encodeURIComponent(session.token)}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        backoffRef.current = MIN_BACKOFF_MS; // Erfolgreiche Verbindung → Backoff zurücksetzen
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: 'products_changed' | 'categories_changed' | 'stock_changed';
            shopId: string;
          };

          let shopId: string;
          try {
            shopId = getShopId();
          } catch {
            return; // Shop nicht gesetzt — ignorieren
          }

          // Nur Nachrichten für den eigenen Shop verarbeiten
          if (msg.shopId !== shopId) return;

          if (msg.type === 'products_changed' || msg.type === 'stock_changed') {
            queryClient.invalidateQueries({ queryKey: ['products', shopId] });
          }
          if (msg.type === 'categories_changed') {
            queryClient.invalidateQueries({ queryKey: ['categories', shopId] });
          }
        } catch {
          // Ungültige JSON-Nachricht — ignorieren
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        // Exponential Backoff mit Jitter
        const jitter = Math.random() * 500;
        const delay = Math.min(backoffRef.current + jitter, MAX_BACKOFF_MS);
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close(); // onclose wird dann reconnect triggern
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
