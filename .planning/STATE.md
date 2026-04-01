---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: "Inventur, Preis-History & Rechnungsexport"
status: roadmap_ready
stopped_at: null
last_updated: "2026-04-01T12:00:00.000Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.
**Current focus:** Phase 27 — Preis-History & Bestandsverlauf

## Current Position

Phase: 27 (not started)
Plan: —
Status: Roadmap defined, ready for phase planning
Last activity: 2026-04-01 — Roadmap v8.0 created (Phases 27-29)

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

### Pending Todos

None

### Blockers/Concerns

None

## Session Continuity

Last session: 2026-04-01
Stopped at: Roadmap v8.0 created (Phases 27-29)
Resume file: None
Next step: /gsd:plan-phase 27
