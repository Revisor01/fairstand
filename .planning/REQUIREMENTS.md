# Requirements: Fairstand Kassensystem v1.1

**Defined:** 2026-03-23
**Core Value:** v1.0 live auf iPad nutzbar machen — Tech Debt beheben und auf server.godsapp.de deployen.

## v1.1 Requirements

### Tech Debt (aus v1.0 Audit)

- [ ] **TD-01**: LWW-Konfliktauflösung — sync.ts Produkt-Upsert von onConflictDoNothing() auf Timestamp-Vergleich umstellen
- [ ] **TD-02**: Produkt-Deaktivierung Server-Sync — handleToggleActive in ProductList.tsx muss PATCH /api/products/:id/deactivate aufrufen
- [ ] **TD-03**: Download-Sync Server→Client — Mechanismus zum Laden von Server-Produktdaten auf neuen/frischen Client
- [ ] **TD-04**: extra_donation_cents im MonthlyReport rendern — Überzahlungs-Spenden sichtbar machen

### Deployment & CI/CD

- [ ] **DEP-04**: GitHub Repository erstellen und Code pushen
- [ ] **DEP-05**: GitHub Actions Workflow — Docker Images für Client + Server bauen und zu GHCR pushen
- [ ] **DEP-06**: Domain fairstand.godsapp.de auf KeyHelp anlegen (vHost + SSL via KeyHelp API)
- [ ] **DEP-07**: Apache Custom Config für Traefik-Proxy (fairstand.godsapp.de → Traefik:8888 → Container)
- [ ] **DEP-08**: Docker-Compose Stack auf Portainer deployen via Webhook
- [ ] **DEP-09**: Portainer Webhook in GitHub Actions Secret eintragen für Auto-Deploy

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TD-01 | Phase 5 | Pending |
| TD-02 | Phase 5 | Pending |
| TD-03 | Phase 5 | Pending |
| TD-04 | Phase 5 | Pending |
| DEP-04 | Phase 6 | Pending |
| DEP-05 | Phase 6 | Pending |
| DEP-06 | Phase 6 | Pending |
| DEP-07 | Phase 6 | Pending |
| DEP-08 | Phase 6 | Pending |
| DEP-09 | Phase 6 | Pending |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
