import { db, SHOP_ID } from './index.js';
import type { Product } from './schema.js';

// Seed-Daten aus Rechnung 2600988 (Süd-Nord-Kontor, 16.03.2026)
// purchasePrice = EK-Preis nach Rabatt in Cent (Preis/St. aus Rechnung × 100)
// salePrice = EVP in Cent (Empfohlener Verkaufspreis × 100)
// Alle Preise als Cent-Integer — kein Floating Point!
const SEED_PRODUCTS: Omit<Product, 'id' | 'shopId' | 'updatedAt'>[] = [
  // --- Kunsthandwerk & Accessoires (19 % MwSt) ---
  {
    articleNumber: '029-2029',
    name: 'Filz Untersetzer Love, Hellgrau (Frida Feeling)',
    category: 'Kunsthandwerk',
    purchasePrice: 759,  // €7,59 EK nach 30 % Rabatt
    salePrice: 1290,     // EVP €12,90
    vatRate: 19,
    stock: 1,
    active: true,
  },
  {
    articleNumber: '065-12824',
    name: 'Filzbeutel kleiner Waschbär 15 x 12 cm (Artisan)',
    category: 'Kunsthandwerk',
    purchasePrice: 700,  // €7,00 EK nach 30 % Rabatt
    salePrice: 1100,     // EVP €11,00 (Preis/St. entspricht EVP-Ableitung)
    vatRate: 19,
    stock: 1,
    active: true,
  },
  {
    articleNumber: '090067',
    name: 'Geschenkbänder Baumwolle bunt (EZA)',
    category: 'Kunsthandwerk',
    purchasePrice: 471,  // €4,71 EK nach 30 % Rabatt
    salePrice: 800,      // EVP €8,00
    vatRate: 19,
    stock: 1,
    active: true,
  },
  {
    articleNumber: '22968',
    name: 'Armband Jute Recycling Sari (EZA)',
    category: 'Kunsthandwerk',
    purchasePrice: 235,  // €2,35 EK nach 30 % Rabatt
    salePrice: 400,      // EVP €4,00
    vatRate: 19,
    stock: 1,
    active: true,
  },

  // --- Kaffee (7 % MwSt) ---
  {
    articleNumber: '8900999',
    name: "Bio 'Dein Pfund Fairness' Kaffee, gemahlen 500g (GEPA)",
    category: 'Kaffee',
    purchasePrice: 914,  // €9,14 EK nach 11 % Rabatt (×12 = €109,68)
    salePrice: 1099,     // EVP €10,99
    vatRate: 7,
    stock: 12,
    active: true,
  },

  // --- Schokolade (7 % MwSt) ---
  {
    articleNumber: '8901819',
    name: 'Zarte Bitter Minze Schokolade Bio (GEPA)',
    category: 'Schokolade',
    purchasePrice: 240,  // €2,40 EK nach 22 % Rabatt
    salePrice: 329,      // EVP €3,29
    vatRate: 7,
    stock: 10,
    active: true,
  },
  {
    articleNumber: '8951809',
    name: 'Grand Chocolat Espresso Caramel Bio Schokolade (GEPA)',
    category: 'Schokolade',
    purchasePrice: 291,  // €2,91 EK nach 22 % Rabatt
    salePrice: 399,      // EVP €3,99
    vatRate: 7,
    stock: 10,
    active: true,
  },
  {
    articleNumber: '8951810',
    name: 'Grand Chocolat Cardamom Bio Schokolade (GEPA)',
    category: 'Schokolade',
    purchasePrice: 291,
    salePrice: 399,      // EVP €3,99
    vatRate: 7,
    stock: 10,
    active: true,
  },
  {
    articleNumber: '8951811',
    name: 'Grand Chocolat Fleur de Sel Bio Schokolade (GEPA)',
    category: 'Schokolade',
    purchasePrice: 291,
    salePrice: 399,      // EVP €3,99
    vatRate: 7,
    stock: 10,
    active: true,
  },
  {
    articleNumber: '8951812',
    name: 'Grand Chocolat Café Blanc Bio Schokolade (GEPA)',
    category: 'Schokolade',
    purchasePrice: 291,
    salePrice: 399,      // EVP €3,99
    vatRate: 7,
    stock: 10,
    active: true,
  },

  // --- Süsswaren & Gebäck (7 % MwSt) ---
  {
    articleNumber: '8911761',
    name: 'Bio Zitronen-Thymian-Bonbons, 100g (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 189,  // €1,89 EK nach 22 % Rabatt
    salePrice: 259,      // EVP €2,59
    vatRate: 7,
    stock: 1,
    active: true,
  },
  {
    articleNumber: '8911915',
    name: 'Bio Schoko-Orangentaler Gebäck (GEPA)',
    category: 'Gebäck',
    purchasePrice: 182,  // €1,82 EK nach 22 % Rabatt
    salePrice: 249,      // EVP €2,49
    vatRate: 7,
    stock: 7,
    active: true,
  },
  {
    articleNumber: '8911917',
    name: 'Bio Mascobado-Lemon-Herzen Gebäck (GEPA)',
    category: 'Gebäck',
    purchasePrice: 182,
    salePrice: 249,      // EVP €2,49
    vatRate: 7,
    stock: 7,
    active: true,
  },
  {
    articleNumber: '8911918',
    name: 'Bio Marmor-Dinkel-Knusperchen Gebäck (GEPA)',
    category: 'Gebäck',
    purchasePrice: 209,  // €2,09 EK nach 10 % Rabatt
    salePrice: 249,      // EVP €2,49
    vatRate: 7,
    stock: 1,
    active: true,
  },
  {
    articleNumber: '8911925',
    name: 'Doblito Doppelkeks mit Kakaocreme (GEPA)',
    category: 'Gebäck',
    purchasePrice: 145,  // €1,45 EK nach 22 % Rabatt
    salePrice: 199,      // EVP €1,99
    vatRate: 7,
    stock: 14,
    active: true,
  },

  // --- Fairness-Riegel & Snacks (7 % MwSt) ---
  {
    articleNumber: '8961821',
    name: 'Bio caramel crunch fairness (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,  // €1,16 EK nach 22 % Rabatt
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },
  {
    articleNumber: '8961840',
    name: 'Bio cookies & choc fairness (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },
  {
    articleNumber: '8961841',
    name: 'Bio quinoa crisp fairness (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },
  {
    articleNumber: '8961842',
    name: 'Bio honey almond fairness (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },
  {
    articleNumber: '8961844',
    name: 'Bio poppy & vanilla fairness 45g (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },
  {
    articleNumber: '8961845',
    name: 'Bio yogurt & crisp fairness (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },
  {
    articleNumber: '8961846',
    name: 'Bio creamy espresso fairness (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },
  {
    articleNumber: '8961847',
    name: 'Bio double milk fairness (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },
  {
    articleNumber: '8961849',
    name: 'Bio coffee crunch fairness (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },
  {
    articleNumber: '8961880',
    name: 'Bio hazel nougat fairness (GEPA)',
    category: 'Süsswaren',
    purchasePrice: 116,
    salePrice: 159,      // EVP €1,59
    vatRate: 7,
    stock: 18,
    active: true,
  },

  // --- Sonstiges (7 % MwSt) ---
  {
    articleNumber: '9999902',
    name: 'Transportpauschale/DHL',
    category: 'Sonstiges',
    purchasePrice: 690,  // €6,90 ohne Rabatt
    salePrice: 738,      // EVP €7,38
    vatRate: 7,
    stock: 0,
    active: false, // kein Verkaufsartikel
  },

  // --- WeltPartner-Produkte (7 % MwSt) ---
  {
    articleNumber: 'fb5-14-010',
    name: 'Schoko-Nuss Pralinen "Von Herzen", bio° (WeltPartner)',
    category: 'Schokolade',
    purchasePrice: 373,  // €3,73 EK nach 20 % Rabatt
    salePrice: 499,      // EVP €4,99
    vatRate: 7,
    stock: 8,
    active: true,
  },
  {
    articleNumber: 'MO2-14-003',
    name: 'Fleur de Sel (Meersalz), Chili (WeltPartner)',
    category: 'Sonstiges',
    purchasePrice: 420,  // €4,20 EK nach 10 % Rabatt
    salePrice: 499,      // EVP €4,99
    vatRate: 7,
    stock: 1,
    active: true,
  },
  {
    articleNumber: 'PA0-14-002',
    name: 'Bio-Meeres-Mix, Fruchtgummi (WeltPartner)',
    category: 'Süsswaren',
    purchasePrice: 176,  // €1,76 EK nach 10 % Rabatt
    salePrice: 199,      // EVP €1,99 (Preis-Ableitung aus Menge/Gesamt)
    vatRate: 7,
    stock: 5,
    active: true,
  },
  {
    articleNumber: 'PY3-10-223',
    name: 'Veggie Fruits Fruchtgummi ohne Gelatine, kbA (El Puente)',
    category: 'Süsswaren',
    purchasePrice: 146,  // €1,46 EK nach 20 % Rabatt
    salePrice: 195,      // EVP €1,95
    vatRate: 7,
    stock: 10,
    active: true,
  },
  {
    articleNumber: 'sa5-10-900',
    name: 'Schoko-Nougat mit Minze (El Puente)',
    category: 'Schokolade',
    purchasePrice: 486,  // €4,86 EK nach 20 % Rabatt
    salePrice: 650,      // EVP €6,50
    vatRate: 7,
    stock: 8,
    active: true,
  },
  {
    articleNumber: 'sl9-14-002',
    name: 'Kokosriegel mit Vollmilchschokolade überzogen (WeltPartner)',
    category: 'Süsswaren',
    purchasePrice: 111,  // €1,11 EK nach 20 % Rabatt
    salePrice: 149,      // EVP €1,49
    vatRate: 7,
    stock: 24,
    active: true,
  },
  {
    articleNumber: 'SL9-14-003',
    name: 'Kokosriegel mit Edelbitter-Schokolade (WeltPartner)',
    category: 'Süsswaren',
    purchasePrice: 111,
    salePrice: 149,      // EVP €1,49
    vatRate: 7,
    stock: 24,
    active: true,
  },
];

export async function seedIfEmpty(): Promise<void> {
  const count = await db.products.where('shopId').equals(SHOP_ID).count();
  if (count > 0) return; // Bereits geseedet

  await db.products.bulkAdd(
    SEED_PRODUCTS.map(p => ({
      ...p,
      id: crypto.randomUUID(),
      shopId: SHOP_ID,
      updatedAt: Date.now(),
    }))
  );
}
