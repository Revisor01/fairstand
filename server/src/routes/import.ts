import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { parseSuedNordKontorPdf } from '../lib/pdfParser.js';

/**
 * Prueft ob ein Buffer ein gueltiges PDF ist anhand der Magic Bytes.
 * PDF-Dateien beginnen immer mit "%PDF" (0x25 0x50 0x44 0x46).
 */
function isPdf(buf: Buffer): boolean {
  return buf.length >= 4 &&
    buf[0] === 0x25 && // %
    buf[1] === 0x50 && // P
    buf[2] === 0x44 && // D
    buf[3] === 0x46;   // F
}

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
      if (!isPdf(buffer)) {
        return reply.status(400).send({ error: 'Datei ist kein gültiges PDF (Magic Bytes ungültig)' });
      }
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
