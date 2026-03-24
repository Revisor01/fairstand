import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifySchedule from '@fastify/schedule';
import { websocketRoutes } from './routes/websocket.js';
import { healthRoutes } from './routes/health.js';
import { syncRoutes } from './routes/sync.js';
import { productRoutes } from './routes/products.js';
import { reportRoutes } from './routes/reports.js';
import { settingsRoutes } from './routes/settings.js';
import { importRoutes } from './routes/import.js';
import { reportScheduler } from './scheduler/reportScheduler.js';
import { authRoutes } from './routes/auth.js';
import { categoryRoutes } from './routes/categories.js';
import { salesRoutes } from './routes/sales.js';
import { ensureShopSeeded } from './db/seed.js';
import { validateSession } from './lib/sessions.js';
import { pool } from './db/index.js';

const fastify = Fastify({ logger: true });

const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error('CORS_ORIGIN env var ist nicht gesetzt. Setze CORS_ORIGIN=https://fairstand.godsapp.de (oder mehrere Origins kommasepariert).');
}
const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
await fastify.register(cors, {
  origin: (origin, callback) => {
    // Erlaubt Requests ohne Origin-Header (z.B. direkte Server-zu-Server-Calls, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} ist nicht erlaubt`), false);
    }
  },
});

await fastify.register(rateLimit, {
  global: false, // Nur auf explizit markierten Routen aktiv
});

// Auth-Middleware: alle /api/* Routen außer /api/auth/* und /api/health
fastify.addHook('preHandler', async (request, reply) => {
  const url = request.url;
  // Öffentliche Endpoints: Auth (Login) + Health
  if (url.startsWith('/api/auth/') || url.startsWith('/api/health')) {
    return;
  }

  const authHeader = request.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Authentifizierung erforderlich' });
  }

  const token = authHeader.slice(7); // "Bearer " entfernen
  const session = validateSession(token);
  if (!session) {
    return reply.status(401).send({ error: 'Ungültiger oder abgelaufener Token' });
  }

  // Session an Request anhängen für shopId-Validierung in Routen
  (request as any).session = session;
});

// WebSocket-Route MUSS vor anderen Routen registriert werden
await fastify.register(websocketRoutes);

await fastify.register(healthRoutes, { prefix: '/api' });
await fastify.register(syncRoutes, { prefix: '/api' });
await fastify.register(productRoutes, { prefix: '/api' });
await fastify.register(reportRoutes, { prefix: '/api' });
await fastify.register(settingsRoutes, { prefix: '/api' });
await fastify.register(importRoutes, { prefix: '/api' });
await fastify.register(authRoutes, { prefix: '/api' });
await fastify.register(categoryRoutes, { prefix: '/api' });
await fastify.register(salesRoutes, { prefix: '/api' });
await fastify.register(fastifySchedule);
await fastify.register(reportScheduler);

fastify.addHook('onClose', async () => {
  await pool.end();
});

await ensureShopSeeded();

const port = Number(process.env.PORT ?? 3000);
await fastify.listen({ port, host: '0.0.0.0' });
