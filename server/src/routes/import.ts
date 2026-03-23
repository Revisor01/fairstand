import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { parseSuedNordKontorPdf } from '../lib/pdfParser.js';

export async function importRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB max
      files: 1,
    },
  });

  fastify.post('/import/parse', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Keine Datei uebermittelt' });
    }
    if (!data.filename.toLowerCase().endsWith('.pdf')) {
      return reply.status(400).send({ error: 'Nur PDF-Dateien erlaubt' });
    }

    try {
      const buffer = await data.toBuffer();
      const rows = await parseSuedNordKontorPdf(buffer);
      return reply.send({ rows, filename: data.filename });
    } catch (err) {
      fastify.log.error(err, 'PDF-Parsing fehlgeschlagen');
      return reply.status(422).send({
        error: 'PDF konnte nicht verarbeitet werden',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
