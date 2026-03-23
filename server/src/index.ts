import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { syncRoutes } from './routes/sync.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ?? '*',
});

await fastify.register(healthRoutes, { prefix: '/api' });
await fastify.register(syncRoutes, { prefix: '/api' });

const port = Number(process.env.PORT ?? 3000);
await fastify.listen({ port, host: '0.0.0.0' });
