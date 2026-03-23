---
phase: 03-warenwirtschaft-berichte
plan: "03"
subsystem: ui
tags: [react, recharts, nodemailer, toad-scheduler, fastify-schedule, cron, email, charts]

# Dependency graph
requires:
  - phase: 03-01
    provides: Backend-Routes fuer reports.ts und settings.ts mit cost_cents und margin_cents
  - phase: 03-02
    provides: AdminScreen mit Tab-Navigation (reports/settings), DailyReport
provides:
  - MonthlyReport-Komponente mit Dropdown-Navigation und 5 Kennzahl-Kacheln inkl. EK-Kosten und Marge
  - ReportChart-Komponente (Recharts BarChart) fuer Jahresverlauf Umsatz vs. Spenden
  - Nodemailer-Service mit Lazy-Init und isMailConfigured()-Guard
  - HTML-Mail-Templates (monatlich und jaehrlich) mit Umsatz, EK-Kosten, Marge, Spenden, Top-5-Artikel
  - Cron-Scheduler fuer monatlichen (1. des Monats 07:00 UTC) und jaehrlichen (1. Januar 08:00 UTC) Versand
  - SettingsForm-Komponente fuer E-Mail-Konfiguration und Versand-Toggles
affects: [phase-04, deployment]

# Tech tracking
tech-stack:
  added: [recharts@3, nodemailer, @fastify/schedule, toad-scheduler, @types/nodemailer]
  patterns:
    - Lazy-Init-Pattern fuer Nodemailer-Transport (kein Crash bei fehlenden SMTP-Env-Vars)
    - Cron als Fastify-Plugin mit toad-scheduler (AsyncTask + CronJob)
    - navigator.onLine-Guard in Frontend fuer server-only Features

key-files:
  created:
    - client/src/features/admin/reports/ReportChart.tsx
    - client/src/features/admin/reports/MonthlyReport.tsx
    - client/src/features/admin/settings/SettingsForm.tsx
    - server/src/services/mailer.ts
    - server/src/services/reportTemplate.ts
    - server/src/scheduler/reportScheduler.ts
  modified:
    - client/src/features/admin/AdminScreen.tsx
    - server/src/index.ts
    - client/package.json
    - server/package.json

key-decisions:
  - "@fastify/schedule registriert vor reportScheduler — fastify.scheduler muss dekoriert sein bevor reportScheduler darauf zugreift"
  - "toad-scheduler AsyncTask + CronJob direkt (kein SimpleIntervalJob) — CronJob unterstuetzt cronExpression fuer praezise Zeitplanung"
  - "isMailConfigured()-Guard am Anfang jedes Cron-Tasks — verhindert Fehler wenn SMTP nicht konfiguriert"
  - "navigator.onLine-Check in MonthlyReport — Berichte nur online verfuegbar, klarer Hinweis statt failed fetch"
  - "SettingsForm speichert sofort per PUT bei onBlur (Email) oder onChange (Checkboxen) — kein expliziter Speichern-Button fuer Checkboxen"

patterns-established:
  - "Recharts ResponsiveContainer + BarChart als Wrapper fuer alle Chart-Komponenten"
  - "Monatslabel-Array via date-fns format() + de-Locale fuer konsistente deutsche Monatsnamen"

requirements-completed: [REP-01, REP-02, REP-03, REP-04]

# Metrics
duration: 4min
completed: 2026-03-23
---

# Phase 03 Plan 03: Berichte + E-Mail-Versand Summary

**Recharts-Balkendiagramm fuer Jahresverlauf, Monatsberichte mit EK-Kosten und Marge, Nodemailer-Cron-Service und SettingsForm fuer E-Mail-Konfiguration**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-23T13:41:05Z
- **Completed:** 2026-03-23T13:45:03Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Monats-/Jahresberichte-UI mit Dropdown-Navigation, 5 Kennzahl-Kacheln (inkl. EK-Kosten und Marge), Top-5-Artikel-Tabelle und Jahreschart
- Recharts BarChart (sky-400 Umsatz, green-300 Spenden) mit responsivem Container
- Nodemailer-Service mit Lazy-Init, isMailConfigured()-Guard und SMTP-Env-Vars
- HTML-Mail-Templates fuer Monats- und Jahresberichte mit escapeHtml-Sicherung
- Cron-Scheduler via @fastify/schedule + toad-scheduler fuer automatischen Versand
- SettingsForm mit E-Mail-Input, monatlichem und jaehrlichem Versand-Toggle

## Task Commits

Jeder Task wurde atomar committed:

1. **Task 1: Recharts + Monats-/Jahresberichte-UI** - `128ca60` (feat)
2. **Task 2: Nodemailer-Service + Cron-Scheduler + Settings-UI** - `4cfa65a` (feat)

**Plan-Metadaten:** wird in nachfolgendem commit erfasst

## Files Created/Modified
- `client/src/features/admin/reports/ReportChart.tsx` - Recharts BarChart-Wrapper fuer Monatsvergleich
- `client/src/features/admin/reports/MonthlyReport.tsx` - Monats-/Jahresberichte mit Dropdown, Kacheln, Top-5, Chart
- `client/src/features/admin/settings/SettingsForm.tsx` - E-Mail-Konfiguration und Versand-Toggles
- `server/src/services/mailer.ts` - Nodemailer-Transport mit Lazy-Init
- `server/src/services/reportTemplate.ts` - HTML-Mail-Templates (monatlich + jaehrlich)
- `server/src/scheduler/reportScheduler.ts` - Cron-Jobs fuer monatlichen und jaehrlichen Versand
- `client/src/features/admin/AdminScreen.tsx` - MonthlyReport + SettingsForm eingebunden
- `server/src/index.ts` - @fastify/schedule + reportScheduler registriert

## Decisions Made
- `@fastify/schedule` vor `reportScheduler` registrieren — `fastify.scheduler` muss verfuegbar sein
- `toad-scheduler` `AsyncTask` + `CronJob` fuer praezise Cron-Expression-Zeitplanung
- `isMailConfigured()` am Anfang jedes Cron-Tasks — kein Crash bei fehlendem SMTP
- `navigator.onLine`-Guard in MonthlyReport — Offline-Hinweis statt failed fetch
- SettingsForm speichert sofort bei onBlur/onChange (kein Submit-Button fuer Checkboxen)

## Deviations from Plan

Keine — Plan wurde exakt wie geplant ausgefuehrt.

## Issues Encountered

Keine.

## User Setup Required

**SMTP-Konfiguration fuer E-Mail-Versand erforderlich.** Folgende Umgebungsvariablen muessen im Docker-Container gesetzt werden:

- `SMTP_HOST` — SMTP-Server-Hostname
- `SMTP_PORT` — SMTP-Port (Standard: 587)
- `SMTP_USER` — SMTP-Benutzername
- `SMTP_PASS` — SMTP-Passwort
- `SMTP_SECURE` — `true` fuer SSL/TLS (optional, Standard: false)
- `SMTP_FROM` — Absender-Adresse (optional, Standard: `Fairstand <noreply@fairstand.godsapp.de>`)

Ohne diese Konfiguration startet der Server normal, aber der automatische Mail-Versand ist deaktiviert (Startup-Warnung im Log).

## Next Phase Readiness

- Phase 03 vollstaendig abgeschlossen: Warenwirtschaft, Produktverwaltung, Berichte und E-Mail-Versand implementiert
- Phase 04 (PDF-Import + Rechnungsparsen) kann beginnen
- SMTP-Env-Vars muessen im Docker-Compose eingetragen werden fuer produktiven Mail-Versand

## Self-Check: PASSED

Alle Dateien vorhanden. Commits 128ca60 und 4cfa65a verifiziert.

---
*Phase: 03-warenwirtschaft-berichte*
*Completed: 2026-03-23*
