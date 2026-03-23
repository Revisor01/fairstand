# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird — auch ohne Internetverbindung.
**Current focus:** Phase 1 — Offline-Kern & Kasse

## Current Position

Phase: 1 of 4 (Offline-Kern & Kasse)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-03-23 — Roadmap erstellt, bereit für Phase-1-Planung

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack: React 19 + TypeScript + Vite + Dexie.js (Frontend), Fastify 5 + SQLite + Drizzle ORM (Backend)
- Offline: Dexie.js zwingend wegen Safari IndexedDB-Transaktionsfehler auf iPad
- Sync: Outbox-Pattern mit Delta-Events (nie Absolutwerte), Trigger via online/visibilitychange (kein Background Sync API auf iOS)

### Pending Todos

None yet.

### Blockers/Concerns

- iOS/Safari-Pitfall: navigator.storage.persist() Verhalten auf iOS 17+ Home-Screen-PWA noch nicht auf physischem Gerät validiert
- PDF-Parsing (Phase 4): Süd-Nord-Kontor PDF-Struktur unbekannt, muss mit echter Rechnung validiert werden

## Session Continuity

Last session: 2026-03-23
Stopped at: Roadmap erstellt, STATE.md initialisiert
Resume file: None
