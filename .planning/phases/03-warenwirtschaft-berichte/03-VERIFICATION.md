---
phase: 03-warenwirtschaft-berichte
verified: 2026-03-23T12:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Deaktiviertes Produkt verschwindet aus dem Kassen-Grid"
    expected: "Nach dem Deaktivieren eines Produkts via Admin erscheint es nicht mehr in ArticleGrid"
    why_human: "Logik ist korrekt implementiert ([shopId+active]==[SHOP_ID,1]-Query), aber visuelles Verschwinden ist nur live testbar"
  - test: "Mindestbestand-Banner erscheint im POS-Screen bei Unterschreitung"
    expected: "Gelbes Banner oben im POS-Screen mit Produktnamen und aktuellem Bestand"
    why_human: "Reaktives Dexie-Query korrekt implementiert, aber Anzeige erfordert echte Testdaten"
  - test: "Automatischer Mail-Versand (Cron) laeuft korrekt"
    expected: "Am 1. des Monats wird Bericht per Mail an konfigurierte Adresse gesendet"
    why_human: "Cron-Job korrekt konfiguriert (0 7 1 * *), aber E-Mail-Versand benoetigt laufenden Server mit SMTP-Konfiguration"
---

# Phase 3: Warenwirtschaft & Berichte — Verification Report

**Phase Goal:** Verwalterin kann Produkte pflegen, Bestände im Blick behalten und Spendenberichte per Mail empfangen
**Verified:** 2026-03-23
**Status:** passed
**Re-verification:** Nein — initiale Verifizierung

---

## Goal Achievement

### Observable Truths (Success Criteria aus ROADMAP.md)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Neue Produkte koennen angelegt, bearbeitet und deaktiviert werden — deaktivierte erscheinen nicht im Kassen-Grid | VERIFIED | ProductList.tsx (CRUD vollstaendig), ArticleGrid.tsx filtert via `[shopId+active]` Compound-Index auf `[SHOP_ID, 1]` |
| 2 | Bei Unterschreitung des Mindestbestands erscheint eine sichtbare Warnung | VERIFIED | LowStockBanner.tsx rendert amber-Banner, useLowStockCount-Hook filtert aktive Produkte mit `minStock > 0 && stock <= minStock`, eingebunden in POSScreen.tsx Zeile 121 |
| 3 | Tagesuebersicht nach dem Gottesdienst zeigt Anzahl Verkaeufe, Gesamtumsatz und Gesamtspenden | VERIFIED | DailyReport.tsx verwendet useLiveQuery auf db.sales, berechnet count/totalCents/donationCents, drei Kacheln als Grid, in AdminScreen reports-Tab eingebunden |
| 4 | Spendenberichte (monatlich und jaehrlich) werden automatisch per E-Mail versendet | VERIFIED | reportScheduler.ts mit Cron-Jobs (monatlich `0 7 1 * *`, jaehrlich `0 8 1 1 *`), sendReport() aus mailer.ts aufgerufen, Settings werden aus DB gelesen |

**Score: 4/4 Success Criteria verifiziert**

---

### Derived Must-Haves aus Plan-Frontmatter

#### Plan 03-01 Must-Haves (Wave 1: Schema + Backend + Admin-Shell)

| Truth | Status | Evidence |
|-------|--------|---------|
| Admin-Bereich ist ueber Menue erreichbar und zeigt Tab-Navigation | VERIFIED | App.tsx: `UnlockedApp` mit `activeView` State, POSScreen hat Verwaltung-Button (Zeile 163-178), AdminScreen.tsx zeigt 3 Tabs |
| STOCK_ADJUST Outbox-Eintraege werden vom Server korrekt verarbeitet | VERIFIED | server/src/routes/sync.ts Zeile 115-136: vollstaendiger STOCK_ADJUST-Handler mit StockAdjustSchema (Modul-Ebene, Zeile 38-43), Delta-Update auf products.stock |
| Produkte koennen einen Mindestbestand haben der pro Produkt einstellbar ist | VERIFIED | client/src/db/schema.ts: `minStock: number` im Product-Interface, Dexie v2 Migration vorhanden |
| Produkt-CRUD-Endpoints existieren auf dem Server | VERIFIED | server/src/routes/products.ts: GET, POST (LWW-Upsert), PATCH /activate, PATCH /deactivate; in index.ts registriert |
| Berichts-Endpoint liefert Umsatz, EK-Kosten, Marge, Spenden und Top-5-Artikel | VERIFIED | server/src/routes/reports.ts: `/reports/monthly` liefert `summary.cost_cents`, `summary.margin_cents`, `topArticles` via LEFT JOIN auf products.purchase_price |

#### Plan 03-02 Must-Haves (Wave 2: Produkt-UI + Mindestbestand + Tagesuebersicht)

| Truth | Status | Evidence |
|-------|--------|---------|
| Neue Produkte koennen angelegt werden mit allen Pflichtfeldern | VERIFIED | ProductForm.tsx: alle Felder (articleNumber, name, category, purchasePrice, salePrice, vatRate, stock, minStock), Math.round fuer Cent-Konvertierung, crypto.randomUUID() |
| Bestehende Produkte koennen bearbeitet werden | VERIFIED | ProductForm.tsx: isEdit-Branch aktualisiert per db.products.update(), Formular wird mit vorhandenen Werten befuellt |
| Produkte koennen deaktiviert werden und verschwinden aus dem Kassen-Grid | VERIFIED | ProductList.tsx: handleToggleActive setzt `active: !product.active`; ArticleGrid.tsx filtert mit `[shopId+active] === [SHOP_ID, 1]` |
| Warenbestand kann manuell korrigiert werden mit Zugang/Abgang und Grund | VERIFIED | StockAdjustModal.tsx: Delta-Eingabe, Grund-Feld, db.transaction mit modify() + db.outbox.add(STOCK_ADJUST) |
| Mindestbestand-Warnung erscheint als Banner im POS-Screen | VERIFIED | LowStockBanner.tsx in POSScreen.tsx importiert und als erstes Element gerendert (Zeile 121) |
| Mindestbestand-Warnung erscheint als Badge am Admin-Button/Toggle | VERIFIED | POSScreen.tsx Zeile 172-176: rote Badge-Zahl bei `lowStockCount > 0`; AdminScreen.tsx Zeile 42-46: Badge am Produkte-Tab |
| Produkt-Aenderungen werden bei Online-Status an den Server gesendet | VERIFIED | ProductForm.tsx: `if (navigator.onLine) { fetch('/api/products', ...) }` nach jedem Dexie-Write |
| Tagesuebersicht zeigt Anzahl Verkaeufe, Gesamtumsatz und Gesamtspenden | VERIFIED | DailyReport.tsx: drei Kacheln count/totalCents/donationCents, Datumsnavigation vorhanden |

#### Plan 03-03 Must-Haves (Wave 3: Berichte + Mail + Scheduler)

| Truth | Status | Evidence |
|-------|--------|---------|
| Spendenuebersicht kumuliert pro Monat und Jahr sichtbar | VERIFIED | MonthlyReport.tsx: fetch `/api/reports/monthly` und `/api/reports/yearly`, donation_cents angezeigt |
| Umsatzbericht mit Gesamtumsatz, EK-Kosten, Marge, Spenden und Top-5-Artikeln | VERIFIED | MonthlyReport.tsx: 5 Kacheln (Verkaeufe, Gesamtumsatz, EK-Kosten, Marge, Spenden) + Top-5-Tabelle |
| Balkendiagramm zeigt Monatsvergleich fuer Umsatz und Spenden | VERIFIED | ReportChart.tsx: Recharts BarChart mit `dataKey="umsatz"` und `dataKey="spenden"`, in MonthlyReport eingebunden |
| E-Mail-Adresse fuer Berichtsversand ist im Settings-Tab konfigurierbar | VERIFIED | SettingsForm.tsx: E-Mail-Input mit onBlur-Save, fetch PUT /api/settings, monatlich/jaehrlich Toggles |
| Automatischer Mail-Versand monatlich und jaehrlich konfigurierbar | VERIFIED | reportScheduler.ts: zwei CronJobs, liest `report_monthly`/`report_yearly` aus Settings-Tabelle |
| HTML-Mail mit formatierter Tabelle enthaelt Umsatz, EK-Kosten und Marge | VERIFIED | reportTemplate.ts: buildMonthlyReportHtml() mit Tabellen-Rows fuer Umsatz, EK-Kosten, Marge (fett + gruen); buildYearlyReportHtml() ebenfalls |

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `client/src/db/schema.ts` | Dexie v2 mit minStock-Migration | VERIFIED | `minStock: number` im Interface, `this.version(2)` mit upgrade-Callback vorhanden |
| `server/src/db/schema.ts` | Drizzle-Schema mit minStock + settings | VERIFIED | `minStock: integer('min_stock').notNull().default(0)`, `settings` Tabelle vorhanden |
| `server/src/routes/products.ts` | CRUD-Endpoints fuer Produkte | VERIFIED | Exportiert `productRoutes`, GET/POST/PATCH-Endpoints vollstaendig |
| `server/src/routes/reports.ts` | Aggregations-Endpoints mit Marge | VERIFIED | Exportiert `reportRoutes`, cost_cents + margin_cents in Response |
| `server/src/routes/settings.ts` | Settings CRUD | VERIFIED | Exportiert `settingsRoutes`, GET + PUT Endpoints |
| `client/src/features/admin/AdminScreen.tsx` | Admin-Shell mit Tab-Navigation | VERIFIED | 3 Tabs (Produkte, Berichte, Einstellungen), lowStockCount-Badge am Produkte-Tab |
| `client/src/App.tsx` | Navigation POS/Admin Toggle | VERIFIED | `activeView` State in UnlockedApp, POSScreen erhaelt `onSwitchToAdmin` + `lowStockCount` |
| `client/src/features/admin/products/ProductList.tsx` | Alphabetisch sortierte Produktliste | VERIFIED | useLiveQuery, `.sort((a, b) => a.name.localeCompare(b.name, 'de'))`, Kategorie-Filter |
| `client/src/features/admin/products/ProductForm.tsx` | Formular fuer Produkt-CRUD | VERIFIED | Alle Felder, Math.round Cent-Konvertierung, Server-Sync via fetch bei navigator.onLine |
| `client/src/features/admin/products/StockAdjustModal.tsx` | Modal fuer Bestandskorrektur | VERIFIED | STOCK_ADJUST in Outbox, Delta-Prinzip, Grund-Feld |
| `client/src/features/pos/LowStockBanner.tsx` | Banner-Komponente fuer Mindestbestand | VERIFIED | Importiert useLowStockProducts, rendert amber-Banner oder null |
| `client/src/hooks/useLowStockCount.ts` | Hook fuer Mindestbestand-Zaehler | VERIFIED | Exportiert useLowStockCount() und useLowStockProducts() |
| `client/src/features/admin/reports/DailyReport.tsx` | Tagesuebersicht aus lokalen Dexie-Daten | VERIFIED | useLiveQuery auf db.sales, drei Kacheln, Einzelverkaufstabelle |
| `client/src/features/admin/reports/MonthlyReport.tsx` | Monats-/Jahresberichte mit EK-Kosten/Marge | VERIFIED | fetch /api/reports/monthly + /api/reports/yearly, cost_cents + margin_cents angezeigt |
| `client/src/features/admin/reports/ReportChart.tsx` | Recharts-basiertes Balkendiagramm | VERIFIED | BarChart mit Umsatz + Spenden Bars, ResponsiveContainer |
| `client/src/features/admin/settings/SettingsForm.tsx` | Settings-Formular mit E-Mail-Config | VERIFIED | fetch /api/settings (GET + PUT), drei Einstellungen (Email, monatlich, jaehrlich) |
| `server/src/services/mailer.ts` | Nodemailer-Transport | VERIFIED | createTransport mit SMTP-Env-Vars, sendReport() exportiert, isMailConfigured() Guard |
| `server/src/services/reportTemplate.ts` | HTML-Template mit Marge | VERIFIED | buildMonthlyReportHtml() + buildYearlyReportHtml() mit Umsatz, EK-Kosten, Marge |
| `server/src/scheduler/reportScheduler.ts` | Cron-Jobs fuer Mail-Versand | VERIFIED | Monatlich `0 7 1 * *`, jaehrlich `0 8 1 1 *`, liest Settings aus DB, ruft sendReport() auf |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `client/src/App.tsx` | `client/src/features/admin/AdminScreen.tsx` | activeView state toggle | WIRED | UnlockedApp rendert `<AdminScreen>` wenn `activeView === 'admin'` |
| `server/src/routes/sync.ts` | `server/src/db/schema.ts` | STOCK_ADJUST handler | WIRED | Zeile 115-136: `entry.operation === 'STOCK_ADJUST'`, StockAdjustSchema auf Modul-Ebene definiert |
| `server/src/index.ts` | `server/src/routes/products.ts` | fastify.register | WIRED | Zeile 19: `await fastify.register(productRoutes, { prefix: '/api' })` |
| `server/src/routes/reports.ts` | `server/src/db/schema.ts` | JOIN auf products.purchasePrice | WIRED | LEFT JOIN products p ON p.id = json_extract(item.value, '$.productId'), cost_cents und margin_cents in Response |
| `server/src/scheduler/reportScheduler.ts` | `server/src/services/mailer.ts` | sendReport() Aufruf | WIRED | Zeilen 65, 119: `await sendReport(emailSetting.value, ...)` |
| `server/src/scheduler/reportScheduler.ts` | `server/src/db/schema.ts` | settings-Tabelle fuer E-Mail-Config | WIRED | `db.select().from(settings).where(eq(settings.key, 'report_email'))` |
| `client/src/features/admin/reports/MonthlyReport.tsx` | `server/src/routes/reports.ts` | fetch /api/reports/monthly + /yearly | WIRED | useEffect mit fetch(`/api/reports/monthly?shopId=${SHOP_ID}&year=${year}&month=${month}`) |
| `client/src/features/admin/reports/MonthlyReport.tsx` | `server/src/routes/reports.ts` | Zeigt cost_cents + margin_cents | WIRED | Kacheln fuer EK-Kosten (`summary.cost_cents`) und Marge (`summary.margin_cents`) vorhanden |
| `client/src/features/admin/settings/SettingsForm.tsx` | `server/src/routes/settings.ts` | fetch /api/settings | WIRED | GET fetch in useEffect, PUT fetch in saveSetting() |
| `client/src/features/admin/products/StockAdjustModal.tsx` | `client/src/db/schema.ts` | db.outbox.add STOCK_ADJUST | WIRED | Zeile 41-52: `db.outbox.add({ operation: 'STOCK_ADJUST', payload: { productId, delta, reason, shopId } })` |
| `client/src/features/pos/LowStockBanner.tsx` | `client/src/hooks/useLowStockCount.ts` | useLowStockProducts Hook | WIRED | `import { useLowStockProducts }` direkt in LowStockBanner.tsx |
| `client/src/App.tsx` | `client/src/hooks/useLowStockCount.ts` | lowStockCount Badge | WIRED | `useLowStockCount()` in UnlockedApp, als prop an POSScreen weitergegeben, Badge an Verwaltung-Button (POSScreen.tsx:172) |
| `client/src/features/admin/products/ProductForm.tsx` | `server/src/routes/products.ts` | fetch POST /api/products | WIRED | Zeilen 91-95 und 116-121: `if (navigator.onLine) { fetch('/api/products', { method: 'POST' }) }` |
| `client/src/features/admin/reports/DailyReport.tsx` | `client/src/db/schema.ts` | db.sales.where createdAt | WIRED | `db.sales.where('createdAt').between(dayStart, dayEnd).filter(s => s.shopId === SHOP_ID)` |

---

### Requirements Coverage

| Requirement | Source Plan | Beschreibung | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| POS-08 | 03-02 | Tagesuebersicht nach Gottesdienst: Anzahl Verkaeufe, Gesamtumsatz, Gesamtspenden | SATISFIED | DailyReport.tsx mit drei Kacheln aus lokalen Dexie-Daten, Datumswechsel moeglich |
| WAR-01 | 03-01, 03-02 | Produkte anlegen mit Artikelnummer, Bezeichnung, EK-Preis, VK-Preis, MwSt-Satz | SATISFIED | ProductForm.tsx mit allen Pflichtfeldern inkl. minStock, crypto.randomUUID(), db.products.add() |
| WAR-02 | 03-01, 03-02 | Produkte bearbeiten (Preise, Name, Bestand) | SATISFIED | ProductForm.tsx isEdit-Branch, db.products.update() |
| WAR-03 | 03-01, 03-02 | Produkte deaktivieren (nicht im Kassen-Grid, Daten erhalten) | SATISFIED | ProductList.tsx handleToggleActive, ArticleGrid.tsx filtert nur active=1 |
| WAR-05 | 03-01, 03-02 | Warenbestand kann manuell angepasst werden (Zugang/Korrektur) | SATISFIED | StockAdjustModal.tsx mit Delta-Prinzip, STOCK_ADJUST in Outbox fuer Server-Sync |
| WAR-06 | 03-01, 03-02 | Konfigurierbarer Mindestbestand mit visueller Warnung | SATISFIED | minStock-Feld in Schema, LowStockBanner im POS-Screen, Badge am Verwaltung-Button und Produkte-Tab |
| REP-01 | 03-03 | Spendenuebersicht kumuliert pro Tag, Monat und Jahr | SATISFIED | DailyReport.tsx (Tag), MonthlyReport.tsx (Monat/Jahr via API) |
| REP-02 | 03-03 | Umsatzbericht pro Monat und Jahr (Gesamtumsatz, Marge, Spenden) | SATISFIED | MonthlyReport.tsx zeigt total_cents, cost_cents, margin_cents, donation_cents; reports.ts liefert alle Werte |
| REP-03 | 03-03 | Konfigurierbare E-Mail-Adresse fuer Berichtsversand | SATISFIED | SettingsForm.tsx mit E-Mail-Input, PUT /api/settings speichert in settings-Tabelle |
| REP-04 | 03-03 | Optionaler automatischer Mail-Versand (monatlich und/oder jaehrlich) | SATISFIED | reportScheduler.ts zwei CronJobs, liest report_monthly/report_yearly aus DB, sendReport() via mailer.ts |

**Alle 10 Requirement-IDs vollstaendig abgedeckt.**

---

### Anti-Patterns Found

Keine Blocker-Anti-Patterns gefunden.

| Datei | Zeile | Muster | Schwere | Anmerkung |
|-------|-------|--------|---------|-----------|
| `server/src/routes/sync.ts` | 93 | `minStock` fehlt im SALE_COMPLETE product-Upsert | Info | Bei SALE_COMPLETE werden Produkte ohne minStock angelegt (default 0) — korrekt, da minStock serverseitig nicht relevant fuer Verkauf |
| `client/src/features/admin/reports/MonthlyReport.tsx` | 66 | Berichte nur online verfuegbar | Info | `if (!navigator.onLine) return ...` — bewusstes Design, Tagesuebersicht bleibt offline verfuegbar |

---

### Human Verification Required

#### 1. Deaktiviertes Produkt verschwindet aus Kassen-Grid

**Test:** Produkt im Admin-Bereich deaktivieren, dann zur Kasse wechseln
**Expected:** Deaktiviertes Produkt erscheint nicht mehr im ArticleGrid
**Why human:** Dexie Compound-Index-Query `[shopId+active] === [SHOP_ID, 1]` korrekt implementiert, aber reaktive Aktualisierung benoetigt live Test

#### 2. Mindestbestand-Banner im POS-Screen

**Test:** Bestand eines Produkts unter seinen minStock-Wert senken (via Bestandskorrektur), dann zur Kasse wechseln
**Expected:** Gelbes amber-Banner erscheint oben im POS-Screen mit Produktname und aktuellem Bestand
**Why human:** Reaktives Dexie-Query korrekt, aber visuelle Darstellung erfordert echte Testdaten

#### 3. Automatischer E-Mail-Versand via Cron

**Test:** SMTP konfigurieren, report_email und report_monthly=true setzen, Cron manuell triggern oder auf Stichtag warten
**Expected:** Formatierte HTML-Mail mit Umsatz, EK-Kosten, Marge, Spenden und Top-5-Artikeln kommt an
**Why human:** CronJob und sendReport() korrekt implementiert, aber E-Mail-Zustellung erfordert laufenden Server mit gueltiger SMTP-Konfiguration

---

## Zusammenfassung

Alle 4 Success Criteria der Phase sind vollstaendig erfuellt. Die Phase liefert:

- **Vollstaendige Produktverwaltung** (WAR-01 bis WAR-03, WAR-05, WAR-06): Anlegen, Bearbeiten, Deaktivieren, Bestandskorrektur mit Delta-Outbox-Sync, Mindestbestand-Warnung als Banner (POS) und Badge (Admin)
- **Tagesuebersicht** (POS-08): Offline verfuegbar aus lokalen Dexie-Daten, Datumswechsel moeglich
- **Monats- und Jahresberichte mit Marge** (REP-01, REP-02): Server-seitige Aggregation mit LEFT JOIN auf purchase_price, EK-Kosten und Marge in UI und Mail
- **Konfigurierbarer Mail-Versand** (REP-03, REP-04): Settings-UI, Nodemailer-Service, Cron-Scheduler mit monatlichem und jaehrlichem Job

Alle Artefakte sind substantiell implementiert (kein Placeholder-Content), alle Key Links sind verdrahtet. Der TypeScript-Build ist laut SUMMARY-Dokumentation fehlerfrei.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
