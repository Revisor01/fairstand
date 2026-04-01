---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: Inventur, Preis-History & Rechnungsexport
status: executing
stopped_at: Completed 28-01-PLAN.md (GET /api/reports/inventory Endpoint)
last_updated: "2026-04-01T21:47:23.398Z"
last_activity: 2026-04-01
progress:
  total_phases: 23
  completed_phases: 6
  total_plans: 19
  completed_plans: 18
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.
**Current focus:** Phase 28 — inventur-uebersicht-preis-auswertung

## Current Position

Phase: 28 (inventur-uebersicht-preis-auswertung) — EXECUTING
Plan: 2 of 2
Status: Ready to execute
Last activity: 2026-04-01

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v7.0]: Jeder Shop hat eigenes Sortiment — kein geteiltes Sortiment
- [v7.0]: Master-Shop (St. Secundus) verwaltet Shops (anlegen, PIN, deaktivieren), aber nicht deren Produkte
- [v7.0]: Berichte bleiben pro Shop — keine übergreifende Ansicht
- [v8.0]: Anforderungen kommen vom Kirchenkreis (Kevin Lembke) — Inventur, Preis-History, Rechnungsexport
- [v8.0]: Sale-Items speichern bereits EK/VK-Snapshot — Inventur-Auswertung großteils aus vorhandenen Daten ableitbar
- [v8.0]: Artikelnummer bleibt bei Preisänderungen gleich — nur EK/VK ändert sich
- [v8.0]: PRICE-01 (automatisches Logging) ist Fundament für Phase 28 und 29 — muss zuerst gebaut werden
- [v8.0]: CSV-Export mit Semikolon-Trennzeichen und UTF-8-BOM für Excel-Kompatibilität (Umlaute)
- [v8.0]: Neue DB-Tabellen: price_history, stock_movements — Drizzle-Migration in Phase 27
- [Phase 27]: Migration manuell geschrieben: drizzle-kit generate fehlte wegen legacy SQLite-Snapshots in postgresql-Projekt (Phase 27-01)
- [Phase 27]: referenceSaleId in stock_movements nullable text ohne Drizzle-Relation — FK nur zur Nachverfolgbarkeit (Phase 27-01)
- [Phase 27]: Preis-Logging nur bei existierenden Produkten — neues Produkt hat keinen alten Preis
- [Phase 27]: referenceSaleId in stock_movements zeigt auf gelöschten Sale — Audit-Trail bleibt erhalten nach Hard-Delete
- [Phase 28]: Three-query inventory pattern: aggregate per article, total stock value, EK breakdown in batch — avoids N+1 and keeps SQL readable
- [Phase 28]: COALESCE purchasePrice snapshot ensures historical EK accuracy even when product price changed after sale

### Pending Todos

None

### Blockers/Concerns

None

## Session Continuity

Last session: 2026-04-01T21:47:18.748Z
Stopped at: Completed 28-01-PLAN.md (GET /api/reports/inventory Endpoint)
Resume file: None
Next step: /gsd:plan-phase 27
