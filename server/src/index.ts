import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifySchedule from '@fastify/schedule';
import { healthRoutes } from './routes/health.js';
import { syncRoutes } from './routes/sync.js';
import { productRoutes } from './routes/products.js';
import { reportRoutes } from './routes/reports.js';
import { settingsRoutes } from './routes/settings.js';
import { importRoutes } from './routes/import.js';
import { reportScheduler } from './scheduler/reportScheduler.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ?? '*',
});

await fastify.register(healthRoutes, { prefix: '/api' });
await fastify.register(syncRoutes, { prefix: '/api' });
await fastify.register(productRoutes, { prefix: '/api' });
await fastify.register(reportRoutes, { prefix: '/api' });
await fastify.register(settingsRoutes, { prefix: '/api' });
await fastify.register(importRoutes, { prefix: '/api' });
await fastify.register(fastifySchedule);
await fastify.register(reportScheduler);

const port = Number(process.env.PORT ?? 3000);
await fastify.listen({ port, host: '0.0.0.0' });
