-- Migration 0006: Unique-Constraint für Artikelnummer pro Shop
-- Verhindert Duplikate beim Anlegen von Artikeln mit derselben Artikelnummer im gleichen Shop
CREATE UNIQUE INDEX IF NOT EXISTS products_article_number_shop_id_idx
  ON products (article_number, shop_id);
