# Milestones

## v6.0 Pure Online (Shipped: 2026-03-24)

**Phases completed:** 2 phases, 6 plans, 10 tasks

**Key accomplishments:**

- postgres:16-alpine in docker-compose mit Health Check, pg Pool in Drizzle, alle 6 Tabellen von sqliteTable auf pgTable migriert, TypeScript-Build clean
- Alle synchronen better-sqlite3-Aufrufe (.run()/.get()/.all()) in 7 Server-Dateien auf async/await + node-postgres umgestellt, SQLite-JSON-Funktionen durch PostgreSQL-Äquivalente ersetzt, TypeScript-Build fehlerfrei
- Standalone SQLite→PostgreSQL Migrationsskript mit idempotenten INSERT...ON CONFLICT DO NOTHING Queries für alle 5 Tabellen; better-sqlite3 vollständig aus server/package.json entfernt (PG-05)
- One-liner:
- idb-keyval komplett aus 5 Dateien entfernt — Session, PIN, Import-Historie und Schnellbetraege nutzen jetzt synchrones localStorage

---

## v5.0 Online-First Live Architecture (Shipped: 2026-03-24)

**Phases completed:** 4 phases, 11 plans, 17 tasks

**Key accomplishments:**

- Report-Scheduler filtert jetzt stornierte Verkäufe (5 SQL-Queries), CORS akzeptiert keinen Wildcard-Default mehr sondern verlangt explizite CORS_ORIGIN Env-Var
- Magic-Byte-Validierung und 30s Promise.race()-Timeout härten den PDF-Upload-Endpoint gegen Nicht-PDF-Uploads und indefinit blockierende Parser-Aufrufe
- One-liner:
- useProducts.ts
- Four admin components migrated from useLiveQuery/Dexie to TanStack Query — reads from server, writes via mutations with automatic query invalidation
- ArticleGrid im POS auf TanStack Query mit networkMode 'offlineFirst' umgestellt — Kasse zeigt gecachte Produkte wenn offline (LIVE-06), gleicher queryKey wie Admin für gemeinsamen Cache
- @fastify/websocket-Endpoint /api/ws mit Token-Auth, shopId-basiertem broadcast() und Invalidierungs-Signalen aus products, categories und sync
- completeSale/completeWithdrawal senden Verkäufe online direkt via POST /api/sync ohne Outbox-Umweg; useProducts/useCategories schreiben nach jedem Fetch fire-and-forget in Dexie als Offline-Cache für Phase 21.
- One-liner:
- flushOutbox() invalidiert nach Sync ['products', shopId] via optionalem QueryClient; POS-Header zeigt WifiOff-Badge bei fehlender Verbindung

---

## v4.0 Datenqualität & Stabilität (Shipped: 2026-03-24)

**Phases completed:** 11 phases, 17 plans, 28 tasks

**Key accomplishments:**

- shops-Tabelle in Drizzle + POST /api/auth/pin Endpoint + idempotenter Seed mit Shop "St. Secundus Hennstedt" und 33 Produkten
- Server-PIN-Auth mit idb-keyval-Session + dynamischer shopId-Modul-Variable ersetzt hardcodierte SHOP_ID-Konstante; Dexie auf Version 3 mit products.clear()-Upgrade
- One-liner:
- Artikelkacheln zeigen Bestand (Ausverkauft/Noch X/X Stk.) via AddItemResult-Pattern mit 6 Vitest Unit-Tests
- Tippbare Verkaufszeilen in DailyReport mit SaleDetailModal (Artikel-Breakdown offline) und serverseitiger Artikel-Statistik via ProductStats-Komponente mit GET /api/reports/product/:id/stats
- Storno (STOR-01):
- PaymentFlow von 2-Step-Fullscreen auf Ein-Screen-Karte umgestellt: Artikelliste, Live-Wechselgeld/Spende-Berechnung, Shop-Name in POS- und Admin-Header via getStoredSession()
- Artikel-Grid luftiger (gap-4/p-6/p-4) und Admin-Tab-Navigation auf scrollbare Pill-Tabs umgestellt
- PDF-Parser auf spaltenbasierte Von-hinten-Strategie umgestellt: beide Rechnungsformate (2552709 mit Rabatt, 2600988 ohne) parsen korrekt; imageUrl als nullable Spalte in products-Schema + Migration
- Vollstaendiger Bild-Workflow: Multipart-Upload-Endpoint in Fastify, Bild-Button mit Datei-Picker in Produktverwaltung, conditional Bildanzeige auf Artikelkacheln
- Farbige Bestandsampel (●) in Artikelkacheln und Produktliste, plus vollstaendige Umlaut-Bereinigung in allen sichtbaren UI-Texten
- LWW-Loop durch atomares Server-Replace in downloadProducts() ersetzt und AdminScreen mit Offline-Guard versehen — eliminiert drei Bugs: Phantom-Produkte, Geist-Deaktivierungen und stale Timestamps
- Sechs AND cancelled_at IS NULL-Filter in alle fuenf SQL-Report-Queries eingefuegt, damit stornierte Verkauefe nicht mehr in Umsatz, Marge, EK-Kosten, Spenden, Top-Artikel und Produktstatistiken einfliessen
- One-liner:
- One-liner:
- categories-Tabelle mit 4 REST-Routen, Dexie v8 + downloadCategories-Sync, CRUD-Modal in ProductList und Dropdown-Auswahl in ProductForm
- Bild-Upload mit URL.createObjectURL-Vorschau in ProductForm integriert, Bild-Button aus ProductList entfernt, useSyncStatus-Hook + 30s-Retry + pulsierender Sync-Badge im POS-Header

---

## v2.0 Server-Sync, Multi-Laden & Kernfunktionen (Shipped: 2026-03-24)

**Phases completed:** 3 phases, 6 plans, 8 tasks

**Key accomplishments:**

- shops-Tabelle in Drizzle + POST /api/auth/pin Endpoint + idempotenter Seed mit Shop "St. Secundus Hennstedt" und 33 Produkten
- Server-PIN-Auth mit idb-keyval-Session + dynamischer shopId-Modul-Variable ersetzt hardcodierte SHOP_ID-Konstante; Dexie auf Version 3 mit products.clear()-Upgrade
- One-liner:
- Artikelkacheln zeigen Bestand (Ausverkauft/Noch X/X Stk.) via AddItemResult-Pattern mit 6 Vitest Unit-Tests
- Tippbare Verkaufszeilen in DailyReport mit SaleDetailModal (Artikel-Breakdown offline) und serverseitiger Artikel-Statistik via ProductStats-Komponente mit GET /api/reports/product/:id/stats
- Storno (STOR-01):

---

## v1.0 Fairstand Kassensystem (Shipped: 2026-03-23)

**Phases completed:** 4 phases, 10 plans, 17 tasks

**Key accomplishments:**

- One-liner:
- One-liner:
- One-liner:
- Drizzle-Schema mit drei SQLite-Tabellen, idempotenter POST /api/sync Endpoint und automatische Container-Migration via drizzle-kit
- Offline-Outbox-Flush via fetch('/api/sync') mit iOS-kompatiblen Triggern (online + visibilitychange) und Retry-Guard nach 5 fehlgeschlagenen Versuchen
- 1. [Rule 2 - Missing Functionality] Verwaltung-Button im POSScreen
- Vollstaendige Produktverwaltungs-UI mit Kategorie-Filter, Bestandskorrektur via Delta-Outbox, Mindestbestand-Banner im POS-Screen plus Badge am Verwaltung-Button, und Tagesuebersicht mit drei Kennzahlen-Kacheln
- Recharts-Balkendiagramm fuer Jahresverlauf, Monatsberichte mit EK-Kosten und Marge, Nodemailer-Cron-Service und SettingsForm fuer E-Mail-Konfiguration
- 1. [Rule 1 - Bug] @ts-expect-error Direktive entfernt
- Drag-and-Drop PDF-Upload mit editierbarer Review-Tabelle, Dexie-Matching und STOCK_ADJUST Outbox-Buchung nach manueller Freigabe — integriert als 4. Import-Tab im Admin-Bereich

---
