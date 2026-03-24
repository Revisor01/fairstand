---
phase: 12-bestandsampel-umlaute
plan: 01
subsystem: ui
tags: [react, tailwind, typescript, pwa, offline]

# Dependency graph
requires:
  - phase: 11-produktbilder-pdf-parsing
    provides: ArticleGrid und ProductList mit bestehender Bestandslogik
provides:
  - Bestandsampel-Dot (●) in ArticleGrid Kacheln (grün/gelb/rot)
  - Bestandsampel-Dot (●) in ProductList Produktzeilen (grün/gelb/rot)
  - Korrekte deutsche Umlaute in DailyReport, MonthlyReport, SettingsForm
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ampel-Dot: Unicode ● mit text-[10px] leading-none in flex items-center gap-1 Wrapper"
    - "Farblogik: rose-500 (stock===0), amber-500 (stock>0 && stock<=minStock), emerald-500 (sonst)"

key-files:
  created: []
  modified:
    - client/src/features/pos/ArticleGrid.tsx
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/admin/reports/DailyReport.tsx
    - client/src/features/admin/reports/MonthlyReport.tsx
    - client/src/features/admin/settings/SettingsForm.tsx

key-decisions:
  - "Ampel-Dot als inline span mit text-[10px] leading-none — kein separater Hook, kein neues Interface"
  - "isLowStock-Variable in ProductList beibehalten — Ampel-Dot ergaenzt bestehende red-600 Faerbung"
  - "Funktionsnamen wie handleAllesZurueck nicht umbenannt — Breaking Change unnoetig"

patterns-established:
  - "Bestandsampel-Pattern: <span className='flex items-center gap-1'><span className='text-[10px] leading-none {color}'>●</span>...</span>"

requirements-completed: [AMP-01, TXT-01]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 12 Plan 01: Bestandsampel + Umlaute Summary

**Farbige Bestandsampel (●) in Artikelkacheln und Produktliste, plus vollstaendige Umlaut-Bereinigung in allen sichtbaren UI-Texten**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T12:00:00Z
- **Completed:** 2026-03-24T12:08:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- ArticleGrid: Jede Kachel zeigt jetzt einen ●-Punkt (grün=ausreichend, gelb=niedrig, rot=0) direkt neben dem Bestandstext
- ProductList: Jede Produktzeile zeigt denselben ●-Punkt vor "Bestand: X"
- Alle sichtbaren Umlaut-Fehler in DailyReport, MonthlyReport und SettingsForm korrigiert
- Zusaetzliche Umlaut-Fehler gefunden und bereinigt: "verfuegbar", "Ueberzahlung", "fuer" in MonthlyReport und SettingsForm

## Task Commits

1. **Task 1: Bestandsampel-Dot in ArticleGrid und ProductList** - `44d2aad` (feat)
2. **Task 2: Umlaut-Korrekturen in sichtbaren UI-Texten** - `5518a41` (fix)

## Files Created/Modified

- `client/src/features/pos/ArticleGrid.tsx` - Ampel-Dot (●) mit emerald/amber/rose Farblogik in jeder Kachel
- `client/src/features/admin/products/ProductList.tsx` - Ampel-Dot (●) neben Bestand-Label je Produktzeile
- `client/src/features/admin/reports/DailyReport.tsx` - Tagesübersicht, Verkäufe, Keine Verkäufe korrigiert
- `client/src/features/admin/reports/MonthlyReport.tsx` - Verkäufe, verfügbar, Überzahlung, für korrigiert
- `client/src/features/admin/settings/SettingsForm.tsx` - "für Berichte" korrigiert

## Decisions Made

- Ampel-Dot als inline span mit `text-[10px] leading-none` in `flex items-center gap-1` Wrapper — kein separater Hook, kein neues Interface noetig
- `isLowStock`-Variable in ProductList beibehalten — der Ampel-Dot ergaenzt die bestehende `text-red-600` Faerbung des Bestandstexts
- Funktionsnamen wie `handleAllesZurueck` NICHT umbenannt — wuerde Breaking Change verursachen ohne sichtbaren Nutzen

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Zusaetzliche Umlaut-Fehler in MonthlyReport und SettingsForm**
- **Found during:** Task 2 (Umlaut-Scan aller TSX-Dateien)
- **Issue:** Plan listete explizit DailyReport:59/95/107/151 und MonthlyReport:141, aber beim vollstaendigen Scan wurden weitere sichtbare Umlaut-Fehler gefunden: "verfuegbar" (Z. 98), "Ueberzahlung" (Z. 161), "fuer" (Z. 193) in MonthlyReport und "fuer" (Z. 70) in SettingsForm
- **Fix:** Alle sichtbaren Texte mit Umlaut-Ersatzschreibweisen korrigiert
- **Files modified:** client/src/features/admin/reports/MonthlyReport.tsx, client/src/features/admin/settings/SettingsForm.tsx
- **Verification:** grep-Scan gibt keine Treffer mehr
- **Committed in:** 5518a41 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - fehlende Vollstaendigkeit)
**Impact on plan:** Erweiterung des Umlaut-Scans auf alle TSX-Dateien — genau wie im Plan vorgesehen. Kein Scope Creep.

## Issues Encountered

None.

## Next Phase Readiness

- Bestandsampel vollstaendig in ArticleGrid und ProductList implementiert
- Alle sichtbaren Umlaut-Fehler in TSX-Dateien bereinigt
- TypeScript-Compilation fehlerfrei
- Phase 12 ist abgeschlossen — bereit fuer naechste Milestone-Phase

---
*Phase: 12-bestandsampel-umlaute*
*Completed: 2026-03-24*
