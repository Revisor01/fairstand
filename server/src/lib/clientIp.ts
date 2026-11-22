import { isIP } from 'node:net';
import type { FastifyRequest } from 'fastify';

// Der vorgeschaltete Proxy überschreibt X-Real-IP; request.ip wäre für alle Clients dieselbe Proxy-Adresse.
export function clientIp(request: Pick<FastifyRequest, 'headers' | 'ip'>): string {
  const real = request.headers['x-real-ip'];
  const wert = typeof real === 'string' ? real.trim() : '';
  return isIP(wert) ? wert : request.ip;
}

export const rateLimitOptions = {
  global: false, // Nur auf explizit markierten Routen aktiv
  keyGenerator: clientIp,
};
