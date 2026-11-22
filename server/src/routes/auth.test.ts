import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/index.js', () => ({
  db: { select: () => ({ from: () => ({ where: async () => [] }) }) },
}));

const { authRoutes } = await import('./auth.js');

async function server() {
  const app = Fastify();
  await app.register(rateLimit, { global: false });
  await app.register(authRoutes, { prefix: '/api' });
  return app;
}

function anmelden(app: Awaited<ReturnType<typeof server>>, realIp?: string) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/pin',
    headers: realIp ? { 'x-real-ip': realIp } : {},
    payload: { pin: '000000' },
  });
}

describe('PIN-Anmeldung: Drossel', () => {
  let app: Awaited<ReturnType<typeof server>> | undefined;
  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('verboten: der sechste Versuch einer Adresse in der Minute bekommt 429', async () => {
    app = await server();
    const status = [];
    for (let i = 0; i < 6; i++) status.push((await anmelden(app, '203.0.113.7')).statusCode);
    expect(status).toEqual([401, 401, 401, 401, 401, 429]);
    const gesperrt = await anmelden(app, '203.0.113.7');
    expect(gesperrt.json().error).toBe('Zu viele Versuche. Bitte 1 Minute warten.');
    expect(gesperrt.json().token).toBeUndefined();
  });
});

