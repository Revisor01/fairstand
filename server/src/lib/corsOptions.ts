import type { FastifyCorsOptions } from '@fastify/cors';

// Ab @fastify/cors 11 erlaubt der Standard nur GET, HEAD und POST; die Kasse
// braucht für Produkte und Shops auch PUT, PATCH und DELETE.
export const CORS_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'];

export function buildCorsOptions(allowedOrigins: string[]): FastifyCorsOptions {
  return {
    methods: CORS_METHODS,
    origin: (origin, callback) => {
      // Ohne Origin-Header (Server-zu-Server, curl) gibt es keine CORS-Prüfung.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} ist nicht erlaubt`), false);
      }
    },
  };
}
