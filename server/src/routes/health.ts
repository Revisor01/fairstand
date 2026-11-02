import type { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    // Der Deploy wartet auf diesen Commit, sonst gilt noch der alte Container als gesund.
    return { status: 'ok', timestamp: Date.now(), commit: process.env.GIT_SHA || null };
  });
}
