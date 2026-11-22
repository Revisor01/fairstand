import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/index.js', () => ({
  db: { select: () => ({ from: () => ({ where: async () => [] }) }) },
}));

const { authRoutes } = await import('./auth.js');
const { clientIp, rateLimitOptions } = await import('../lib/clientIp.js');

async function server() {
  const app = Fastify();
  await app.register(rateLimit, rateLimitOptions);
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

describe('PIN-Anmeldung: Drossel je Client', () => {
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

  it('erlaubt: eine andere Adresse hinter demselben Proxy wird nicht mitgesperrt', async () => {
    app = await server();
    for (let i = 0; i < 5; i++) await anmelden(app, '203.0.113.7');
    expect((await anmelden(app, '203.0.113.7')).statusCode).toBe(429);
    expect((await anmelden(app, '198.51.100.9')).statusCode).toBe(401);
  });
});

describe('clientIp', () => {
  it('nimmt X-Real-IP, sonst die Verbindungsadresse', () => {
    expect(clientIp({ headers: { 'x-real-ip': ' 203.0.113.7 ' }, ip: '172.18.0.2' })).toBe('203.0.113.7');
    expect(clientIp({ headers: { 'x-real-ip': '2001:db8::1' }, ip: '172.18.0.2' })).toBe('2001:db8::1');
    expect(clientIp({ headers: {}, ip: '172.18.0.2' })).toBe('172.18.0.2');
    expect(clientIp({ headers: { 'x-real-ip': 'kein-ip' }, ip: '172.18.0.2' })).toBe('172.18.0.2');
    expect(clientIp({ headers: { 'x-real-ip': ['1.2.3.4', '5.6.7.8'] }, ip: '172.18.0.2' })).toBe('172.18.0.2');
  });
});
