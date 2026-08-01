-- v13.0 Multi-Kategorien: products.category (text) -> products.categories (text[])
--
-- Diese Migration wurde beim v13.0-Release versehentlich nicht erzeugt; die
-- Produktion wurde damals manuell per SQL angepasst. Sie ist daher bewusst
-- idempotent, damit sie sowohl auf frischen Installationen als auch auf der
-- bereits manuell migrierten Produktion fehlerfrei laeuft.

DO $$
BEGIN
	-- Neue Spalte anlegen, falls noch nicht vorhanden
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'products' AND column_name = 'categories'
	) THEN
		ALTER TABLE "products"
			ADD COLUMN "categories" text[] DEFAULT ARRAY[]::text[] NOT NULL;
	END IF;

	-- Bestandsdaten aus der alten Einzelspalte uebernehmen, falls diese noch existiert
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'products' AND column_name = 'category'
	) THEN
		UPDATE "products"
			SET "categories" = ARRAY["category"]
			WHERE "category" IS NOT NULL
				AND "category" <> ''
				AND "categories" = ARRAY[]::text[];

		ALTER TABLE "products" DROP COLUMN "category";
	END IF;
END $$;
