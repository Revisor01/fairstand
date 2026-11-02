import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { healthRoutes } from './health.js';

async function abrufen() {
  const app = Fastify();
  await app.register(healthRoutes, { prefix: '/api' });
  const antwort = await app.inject({ method: 'GET', url: '/api/health' });
  await app.close();
  return antwort;
}

describe('GET /api/health', () => {
  const vorher = process.env.GIT_SHA;
  afterEach(() => {
    if (vorher === undefined) delete process.env.GIT_SHA;
    else process.env.GIT_SHA = vorher;
  });

  it('nennt den gebauten Commit', async () => {
    process.env.GIT_SHA = 'abc1234def';
    const antwort = await abrufen();
    expect(antwort.statusCode).toBe(200);
    expect(antwort.json()).toMatchObject({ status: 'ok', commit: 'abc1234def' });
  });

  it('meldet ohne Build-Angabe commit null', async () => {
    delete process.env.GIT_SHA;
    const antwort = await abrufen();
    expect(antwort.json().commit).toBeNull();
    expect(antwort.json().status).toBe('ok');
  });
});
