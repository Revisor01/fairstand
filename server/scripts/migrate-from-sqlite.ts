#!/usr/bin/env tsx
/**
 * Standalone-Migrationsskript: SQLite → PostgreSQL
 *
 * Ausführung (vor Deployment, auf der Maschine wo SQLite-Datei liegt):
 *   SQLITE_PATH=/pfad/zur/fairstand.db DATABASE_URL=postgresql://... npx tsx server/scripts/migrate-from-sqlite.ts
 *
 * Das Skript ist idempotent: Wenn PostgreSQL bereits Daten enthält, wird abgebrochen.
 * Es importiert NICHTS aus server/src/ — vollständig eigenständig.
 */

import { Pool } from 'pg';

const SQLITE_PATH = process.env.SQLITE_PATH ?? './data/fairstand.db';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[Migration] Fehler: DATABASE_URL Umgebungsvariable nicht gesetzt');
  process.exit(1);
}

async function migrateFromSQLite(): Promise<void> {
  // Verzögerter Import von better-sqlite3 damit Fehler früh erkannt werden
  let Database: typeof import('better-sqlite3').default;
  try {
    Database = (await import('better-sqlite3')).default;
  } catch (err) {
    console.error('[Migration] Fehler: better-sqlite3 nicht installiert. npm install better-sqlite3 @types/better-sqlite3 ausführen.');
    process.exit(1);
  }

  // SQLite-Datei prüfen
  const { existsSync } = await import('fs');
  if (!existsSync(SQLITE_PATH)) {
    console.log(`[Migration] Kein SQLite-Backup unter ${SQLITE_PATH} — Migration übersprungen`);
    return;
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Idempotenz-Check: PostgreSQL bereits befüllt?
    const { rows: shopRows } = await pool.query('SELECT id FROM shops LIMIT 1');
    if (shopRows.length > 0) {
      console.log('[Migration] PostgreSQL bereits befüllt — Migration übersprungen');
      return;
    }

    console.log(`[Migration] Starte SQLite→PostgreSQL Migration von: ${SQLITE_PATH}`);

    // SQLite öffnen (innerhalb try damit Fehler korrekt behandelt werden)
    let sqlite: import('better-sqlite3').Database;
    try {
      sqlite = new Database(SQLITE_PATH, { readonly: true });
    } catch (err) {
      console.error(`[Migration] Fehler beim Öffnen der SQLite-Datei ${SQLITE_PATH}:`, err);
      throw err;
    }

    try {
      // Reihenfolge: shops → categories → products → sales → settings
      // (shops zuerst, weil andere Tabellen shop_id referenzieren)

      // Shops migrieren
      const sqliteShops = sqlite.prepare('SELECT * FROM shops').all() as any[];
      for (const row of sqliteShops) {
        await pool.query(
          'INSERT INTO shops (id, shop_id, name, pin, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [row.id, row.shop_id, row.name, row.pin, Number(row.created_at)]
        );
      }
      console.log(`[Migration] Shops: ${sqliteShops.length} migriert`);

      // Categories migrieren
      const sqliteCategories = sqlite.prepare('SELECT * FROM categories').all() as any[];
      for (const row of sqliteCategories) {
        await pool.query(
          'INSERT INTO categories (id, shop_id, name, sort_order, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [row.id, row.shop_id, row.name, Number(row.sort_order ?? 0), Number(row.created_at)]
        );
      }
      console.log(`[Migration] Kategorien: ${sqliteCategories.length} migriert`);

      // Products migrieren
      const sqliteProducts = sqlite.prepare('SELECT * FROM products').all() as any[];
      for (const row of sqliteProducts) {
        await pool.query(
          `INSERT INTO products
           (id, shop_id, article_number, name, category, purchase_price, sale_price,
            vat_rate, stock, min_stock, active, image_url, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id, row.shop_id, row.article_number, row.name, row.category ?? '',
            Number(row.purchase_price), Number(row.sale_price), Number(row.vat_rate),
            Number(row.stock ?? 0), Number(row.min_stock ?? 0),
            Boolean(row.active),  // SQLite speichert 0/1 → PostgreSQL boolean
            row.image_url ?? null,
            Number(row.updated_at),
          ]
        );
      }
      console.log(`[Migration] Produkte: ${sqliteProducts.length} migriert`);

      // Sales migrieren
      const sqliteSales = sqlite.prepare('SELECT * FROM sales').all() as any[];
      for (const row of sqliteSales) {
        // SQLite speichert items als JSON-String, PostgreSQL jsonb erwartet geparsten Wert
        const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
        await pool.query(
          `INSERT INTO sales
           (id, shop_id, items, total_cents, paid_cents, change_cents, donation_cents,
            type, created_at, synced_at, cancelled_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id, row.shop_id, JSON.stringify(items),
            Number(row.total_cents), Number(row.paid_cents),
            Number(row.change_cents), Number(row.donation_cents),
            row.type ?? null, Number(row.created_at),
            row.synced_at ? Number(row.synced_at) : null,
            row.cancelled_at ? Number(row.cancelled_at) : null,
          ]
        );
      }
      console.log(`[Migration] Verkäufe: ${sqliteSales.length} migriert`);

      // Settings migrieren
      const sqliteSettings = sqlite.prepare('SELECT * FROM settings').all() as any[];
      for (const row of sqliteSettings) {
        await pool.query(
          'INSERT INTO settings (key, value, shop_id) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING',
          [row.key, row.value, row.shop_id]
        );
      }
      console.log(`[Migration] Einstellungen: ${sqliteSettings.length} migriert`);

      console.log('[Migration] SQLite→PostgreSQL Migration erfolgreich abgeschlossen');
    } finally {
      sqlite.close();
    }
  } catch (error) {
    console.error('[Migration] Fehler bei Migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateFromSQLite().catch((err) => {
  console.error('[Migration] Abgebrochen:', err);
  process.exit(1);
});
