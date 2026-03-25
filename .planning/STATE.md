---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: Multi-Shop & UX
status: unknown
stopped_at: Completed 25-02-PLAN.md
last_updated: "2026-03-25T00:28:25.725Z"
progress:
  total_phases: 20
  completed_phases: 3
  total_plans: 10
  completed_plans: 9
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.
**Current focus:** Phase 25 — shop-sortiment-isolation

## Current Position

Phase: 25 (shop-sortiment-isolation) — EXECUTING
Plan: 2 of 2

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
- [v7.0]: Jeder Shop verwaltet seine Produkte selbst nach PIN-Login
- [v7.0]: Berichte bleiben pro Shop — keine übergreifende Ansicht
- [v7.0]: Warenkorb flexibel: fixe Spalte (breit) oder Swipe-In (schmal)
- [v7.0]: is_master-Flag in shops-Tabelle steuert Sichtbarkeit der Shop-Verwaltung
- [v7.0]: Phase 25 baut auf Phase 24 auf — Shop-Isolation setzt Master-Admin voraus
- [Phase 24]: 403 statt 401 fuer deaktivierte Shops: semantisch korrekt — Identitaet bekannt, Zugriff verweigert
- [Phase 24]: Seed-Idempotenz: bestehende Shops werden auf isMaster geprueft und ggf. via UPDATE nachgepflegt
- [Phase 24]: requireMaster prueft isMaster per DB-Lookup statt JWT-Claim — authoritative, kein stale-Token-Risiko
- [Phase 24]: visibleTabs computed array pattern fuer bedingte Tabs statt inline JSX-Konditionale
- [Phase 25-02]: SALE/SALE_CANCEL überspringen fremde Produkte still (continue), STOCK_ADJUST/ITEM_RETURN melden Fehler explizit
- [Phase 25-02]: Kein shopId Query-Param im Produkt-Fetch — Server filtert ausschliesslich per session.shopId

### Pending Todos

- Plan Phase 24 via `/gsd:plan-phase 24`

### Blockers/Concerns

- Shop-Isolierung: Aktuell teilen sich alle Shops dieselben Produkte (shopId-Filter). Phase 25 muss das auf echtes Multi-Sortiment umbauen — jeder Shop hat eigene Produkte in der DB.
- Master-Rolle: Aktuell gibt es keine Rollenunterscheidung zwischen Shops. Phase 24 fügt is_master-Flag hinzu.

## Session Continuity

Last session: 2026-03-25T00:28:25.722Z
Stopped at: Completed 25-02-PLAN.md
Resume file: None
Next step: `/gsd:plan-phase 24`
