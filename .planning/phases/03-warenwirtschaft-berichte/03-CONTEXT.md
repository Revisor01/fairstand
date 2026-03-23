# Phase 3: Warenwirtschaft & Berichte - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Produktverwaltung (CRUD, Soft-Delete, Mindestbestand), Tagesübersicht nach dem Gottesdienst, Spendenberichte mit Grafiken/Charts und Monats-/Jahresvergleichen, automatischer Mail-Versand. Eigener Admin-Bereich getrennt vom Kassen-Flow.

</domain>

<decisions>
## Implementation Decisions

### Produktverwaltung UI
- Eigener Admin-Bereich mit Tab-Navigation, getrennt vom Kassen-Flow, über Menü erreichbar
- Produkte alphabetisch sortiert mit Kategorie-Filter
- Nur Soft-Delete (deaktivieren) — keine echte Löschung, Verkaufshistorie bleibt intakt
- Bestandskorrektur: manuelles Eingabefeld für Zugang/Abgang mit Grund

### Berichte & Visualisierung
- Grafiken und Charts für Umsatz, Spenden, Marge
- Vergleiche zu anderen Monaten/Jahren (Balkendiagramm oder Liniendiagramm)
- Berichtsinhalt: Umsatz, EK-Kosten, Marge, Spenden, Top-5-Artikel
- Monat/Jahr-Auswahl per Dropdown
- HTML-Mail mit Styling für automatischen Versand (formatierte Tabelle, Farben, Logo)

### Mindestbestand-Warnung
- Badge im Admin-Bereich + Banner auf dem Kassen-Screen (sichtbar ohne Adminzugang)
- Standard-Mindestbestand: 0 (keine Warnung) — pro Produkt einstellbar
- Opt-in-Modell: nur Produkte mit konfiguriertem Mindestbestand werden überwacht

### Mail-Versand
- Konfigurierbare E-Mail-Adresse (eine einzelne)
- Optionaler automatischer Versand: monatlich und/oder jährlich
- Nodemailer über SMTP (Konfiguration via Umgebungsvariablen)

### Claude's Discretion
- Chart-Bibliothek (Recharts, Chart.js, oder native SVG)
- Cron-Job-Implementierung für automatischen Mail-Versand
- Admin-Layout und Navigation zwischen Kasse/Admin
- Quick-Buttons Konfigurierbarkeit (aus Phase 1 deferred — hier in Settings umsetzen)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/db/schema.ts` — Product-Interface mit stock, minStock, active Feldern
- `client/src/db/index.ts` — DB-Singleton, useLiveQuery Pattern
- `client/src/features/pos/ArticleGrid.tsx` — Kategorie-Tab-Pattern wiederverwendbar
- `server/src/routes/sync.ts` — Fastify-Route-Pattern, Zod-Validation
- `server/src/db/schema.ts` — Drizzle products-Tabelle

### Established Patterns
- Cent-Integer für Geldbeträge, formatEur() für Anzeige
- useLiveQuery für reaktive Dexie-Queries
- Tailwind 4 mit sky-400 als Primärfarbe
- Fastify-Route mit Zod-Schema-Validierung

### Integration Points
- App.tsx: Neuer Admin-Route neben POS-Route
- Sync-Engine: Produkt-Updates müssen auch synchronisiert werden
- Server: Neue API-Routes für Berichte und Settings
- Docker: SMTP-Env-Vars in docker-compose.yml

</code_context>

<specifics>
## Specific Ideas

- Quick-Buttons-Konfigurierbarkeit (aus Phase 1 CONTEXT.md Specifics) hier in einem Settings-Bereich umsetzen
- LWW-Gap aus Phase 2 (Produkt-Upsert onConflictDoNothing → onConflictDoUpdate) hier mit fixen
- Tagesübersicht soll nach dem Gottesdienst schnell die wichtigsten Zahlen zeigen

</specifics>

<deferred>
## Deferred Ideas

- Produktbilder im Grid (v2-Feature)
- CSV/PDF-Export von Berichten (v2)
- Komplexere Berichtsfilter (nach Kategorie, nach Produkt)

</deferred>
