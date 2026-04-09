---
gsd_state_version: 1.0
milestone: v11.0
milestone_name: EK-Preismanagement & Inventur-Genauigkeit
status: defining_requirements
stopped_at: null
last_updated: "2026-04-09"
last_activity: 2026-04-09
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.
**Current focus:** Defining requirements for v11.0 — EK-Preismanagement & Inventur-Genauigkeit

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-09 — Milestone v11.0 started

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

## Accumulated Context

### Decisions

- [v10.0 Roadmap]: 4 Phasen — IMG (33), XLSX-Export (34), Lagerdauer-Analyse (35), EK-Preiswarnung (36)
- [v10.0 Roadmap]: IMG-01 eigene Phase, da isolierte UI-Änderung in ArticleCard
- [v10.0 Roadmap]: EXP-04 + EXP-05 zusammen, da beide XLSX und dieselbe Bibliothek nutzen
- [v10.0 Roadmap]: ANA-01 + ANA-02 zusammen, da Markierung auf Lagerdauer-Datum aufbaut
- [v10.0 Roadmap]: IMP-01 eigene Phase, da ImportScreen-spezifisch und unabhängig von anderen Features
- [Phase 34-xlsx-export]: SheetJS aoa_to_sheet als XLSX-Pattern: Zahlen als Number-Typ, Bilanzzeilen als Leerzeilen
- [Phase 34-xlsx-export]: bg-green-700 für Excel-Buttons zur visuellen Unterscheidbarkeit von CSV (emerald) und PDF (blue)
- [Phase 35-lagerdauer-analyse]: db.execute(sql) statt Drizzle ORM für LATERAL JOIN — ORM unterstützt keine LATERAL JOINs nativ
- [Phase 35-lagerdauer-analyse]: Ladenhüter-Schwellwert: 90 Tage (>3 Monate ohne Verkauf)
- [Phase 36-ek-preiswarnung-beim-import]: Warnzeile als amber-50-Zeile nach parseWarning-Block, gleiche colSpan=9-Struktur
- [Phase 36-ek-preiswarnung-beim-import]: storedPurchasePriceCents optional im MatchedRow-Interface — nur bei status='known' befüllt
- [v11.0 DB-Reset]: DB auf Stand Null gesetzt aus 3 Rechnungen (2552695, 2552709, 2600988) — 106 Produkte, 503 Stück, 11 Preishistorien

### Pending Todos

None

### Blockers/Concerns

None

## Session Continuity

Last session: 2026-04-09
Stopped at: Milestone v11.0 initialization
Resume file: None
Next step: Define requirements, then `/gsd:plan-phase`
