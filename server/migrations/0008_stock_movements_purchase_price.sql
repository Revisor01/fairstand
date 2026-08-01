-- v11.0 EK-Preismanagement: stock_movements.purchase_price_cents
--
-- Die Spalte kam mit dem FIFO-Inventurwert ins Drizzle-Schema, es wurde
-- seinerzeit aber keine Migration erzeugt (die Snapshots unter
-- migrations/meta/ sind defekt, weshalb drizzle-kit generate nicht lief).
-- Die Produktion wurde manuell angepasst; frische Installationen brachen
-- beim Inventur-Export mit 'column "purchase_price_cents" does not exist'.
--
-- Bewusst idempotent, damit sie auch auf der bereits manuell migrierten
-- Produktion fehlerfrei durchlaeuft.

ALTER TABLE "stock_movements"
	ADD COLUMN IF NOT EXISTS "purchase_price_cents" integer;
