# Milestones

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
