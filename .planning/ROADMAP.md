# Roadmap: Fairstand Kassensystem

## Milestones

- ✅ **v1.0 Fairstand Kassensystem** — Phases 1-4 (shipped 2026-03-23)
- 🚧 **v1.1 Tech Debt & Deployment** — Phases 5-6 (in progress)

## Phases

<details>
<summary>✅ v1.0 Fairstand Kassensystem (Phases 1-4) — SHIPPED 2026-03-23</summary>

- [x] Phase 1: Offline-Kern & Kasse (3/3 plans) — completed 2026-03-23
- [x] Phase 2: Backend & Sync (2/2 plans) — completed 2026-03-23
- [x] Phase 3: Warenwirtschaft & Berichte (3/3 plans) — completed 2026-03-23
- [x] Phase 4: Rechnungsimport (2/2 plans) — completed 2026-03-23

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Tech Debt & Deployment

### Phase 5: Tech Debt Fixes
**Goal**: Bekannte technische Schulden aus v1.0 beheben — LWW-Sync, Produkt-Deaktivierung, Download-Sync, Reporting-Lücke
**Depends on**: v1.0
**Requirements**: TD-01, TD-02, TD-03, TD-04
**Success Criteria** (what must be TRUE):
  1. Produkt-Upsert im Sync-Handler nutzt Timestamp-Vergleich (LWW) statt onConflictDoNothing
  2. Produkt-Deaktivierung wird per PATCH an den Server synchronisiert
  3. Frischer Client kann Produktdaten vom Server laden (Download-Sync)
  4. extra_donation_cents wird im Monatsbericht angezeigt
**Plans:** 2 plans

Plans:
- [x] 05-01-PLAN.md — LWW-Sync-Fix, PRODUCT_TOGGLE Server-Sync, extra_donation_cents Reportkarte
- [x] 05-02-PLAN.md — Download-Sync Server→Client mit manuellem "Daten laden" Button

### Phase 6: GitHub & Deployment
**Goal**: App auf server.godsapp.de live deployen — GitHub Repo, CI/CD Pipeline, Domain, Portainer Stack
**Depends on**: Phase 5
**Requirements**: DEP-04, DEP-05, DEP-06, DEP-07, DEP-08, DEP-09
**Success Criteria** (what must be TRUE):
  1. Code liegt auf GitHub mit funktionierendem Actions Workflow
  2. Docker Images werden automatisch gebaut und zu GHCR gepusht
  3. fairstand.godsapp.de ist erreichbar mit gültigem SSL-Zertifikat
  4. Push auf main löst automatisches Deployment via Portainer Webhook aus
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Offline-Kern & Kasse | v1.0 | 3/3 | Complete | 2026-03-23 |
| 2. Backend & Sync | v1.0 | 2/2 | Complete | 2026-03-23 |
| 3. Warenwirtschaft & Berichte | v1.0 | 3/3 | Complete | 2026-03-23 |
| 4. Rechnungsimport | v1.0 | 2/2 | Complete | 2026-03-23 |
| 5. Tech Debt Fixes | v1.1 | 0/2 | Not started | - |
| 6. GitHub & Deployment | v1.1 | 0/1 | Not started | - |
