---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 01-03-PLAN.md
last_updated: "2026-03-23T09:55:25.284Z"
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird — auch ohne Internetverbindung.
**Current focus:** Phase 01 — offline-kern-kasse

## Current Position

Phase: 2
Plan: Not started

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
| Phase 01 P01 | 6 | 2 tasks | 22 files |
| Phase 01 P02 | 3 | 2 tasks | 7 files |
| Phase 01 P03 | 6 | 2 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Stack: React 19 + TypeScript + Vite + Dexie.js (Frontend), Fastify 5 + SQLite + Drizzle ORM (Backend)
- Offline: Dexie.js zwingend wegen Safari IndexedDB-Transaktionsfehler auf iPad
- Sync: Outbox-Pattern mit Delta-Events (nie Absolutwerte), Trigger via online/visibilitychange (kein Background Sync API auf iOS)
- [Phase 01]: registerType: prompt statt autoUpdate — verhindert mid-Session-Reload der Kasse
- [Phase 01]: Traefik external:true — fairstand.godsapp.de über bestehenden Stack auf server.godsapp.de
- [Phase 01]: Cent-Integer für alle Geldbeträge — float-freie Arithmetik verhindert Rundungsfehler an Kasse
- [Phase 01]: idb-keyval für PIN-Hash und lastActivity — kein eigenes Dexie-Schema nötig für Config-Werte
- [Phase 01]: AuthState mit 4 Zuständen ('checking'|'setup'|'locked'|'unlocked') — checking verhindert Flicker beim App-Start
- [Phase 01]: dexie-react-hooks separat installiert: useLiveQuery ist in Dexie 4.x nicht im Hauptpaket enthalten
- [Phase 01]: Preis-Snapshot im CartItem: salePrice beim Hinzufügen gespeichert, nie nachträglich aus DB aktualisiert

### Pending Todos

None yet.

### Blockers/Concerns

- iOS/Safari-Pitfall: navigator.storage.persist() Verhalten auf iOS 17+ Home-Screen-PWA noch nicht auf physischem Gerät validiert
- PDF-Parsing (Phase 4): Süd-Nord-Kontor PDF-Struktur unbekannt, muss mit echter Rechnung validiert werden

## Session Continuity

Last session: 2026-03-23T09:50:26.348Z
Stopped at: Completed 01-03-PLAN.md
Resume file: None
