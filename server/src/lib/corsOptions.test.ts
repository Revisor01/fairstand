import { afterEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { buildCorsOptions } from './corsOptions.js';

const ORIGIN = 'https://kasse.example';
let app: FastifyInstance;

async function build() {
  app = Fastify();
  await app.register(cors, buildCorsOptions([ORIGIN]));
  app.delete('/api/products/:id', async () => ({ ok: true }));
  await app.ready();
  return app;
}

function preflight(origin: string, method: string) {
  return app.inject({
    method: 'OPTIONS',
    url: '/api/products/1',
    headers: { origin, 'access-control-request-method': method },
  });
}

afterEach(async () => {
  await app?.close();
});

describe('CORS', () => {
  it('erlaubt der eigenen Oberfläche PUT, PATCH und DELETE', async () => {
    await build();
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const res = await preflight(ORIGIN, method);
      expect(res.statusCode).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
      expect(res.headers['access-control-allow-methods']).toBe('GET, HEAD, PUT, PATCH, POST, DELETE');
    }
  });

  it('weist fremde Origins ab', async () => {
    await build();
    const res = await preflight('https://fremd.example', 'DELETE');
    expect(res.statusCode).toBe(500);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
