---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: Inventur, Preis-History & Rechnungsexport
status: executing
stopped_at: Completed 27-01-PLAN.md (Schema-Erweiterung priceHistories + stockMovements)
last_updated: "2026-04-01T16:33:17.240Z"
last_activity: 2026-04-01
progress:
  total_phases: 23
  completed_phases: 5
  total_plans: 17
  completed_plans: 15
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.
**Current focus:** Phase 27 — preis-history-bestandsverlauf

## Current Position

Phase: 27 (preis-history-bestandsverlauf) — EXECUTING
Plan: 2 of 3
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

### Pending Todos

None

### Blockers/Concerns

None

## Session Continuity

Last session: 2026-04-01T16:33:17.238Z
Stopped at: Completed 27-01-PLAN.md (Schema-Erweiterung priceHistories + stockMovements)
Resume file: None
Next step: /gsd:plan-phase 27
