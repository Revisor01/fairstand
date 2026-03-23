# Roadmap: Fairstand Kassensystem

## Overview

Vier Phasen bauen das System von innen nach außen: Phase 1 liefert eine vollständig offline-fähige Kassen-App, die am ersten Gottesdienst einsetzbar ist. Phase 2 sichert die Daten mit Backend und Sync ab. Phase 3 bringt Verwaltung und Auswertungen. Phase 4 automatisiert den Rechnungsimport vom Süd-Nord-Kontor.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Offline-Kern & Kasse** - Vollständig offline-fähige PWA zum Kassieren auf dem iPad (completed 2026-03-23)
- [x] **Phase 2: Backend & Sync** - Fastify-Backend mit SQLite, Outbox-Sync und Docker-Deployment (completed 2026-03-23)
- [ ] **Phase 3: Warenwirtschaft & Berichte** - Produktverwaltung, Mindestbestände, Tagesübersicht, Spendenberichte
- [ ] **Phase 4: Rechnungsimport** - PDF-Upload und koordinatenbasiertes Parsen von Süd-Nord-Kontor-Rechnungen

## Phase Details

### Phase 1: Offline-Kern & Kasse
**Goal**: Mitarbeiterinnen können auf dem iPad offline kassieren, Wechselgeld und Spende berechnen und den Verkauf abschließen — ohne WLAN, installierbar als Home-Screen-App
**Depends on**: Nothing (first phase)
**Requirements**: POS-01, POS-02, POS-03, POS-04, POS-05, POS-06, POS-07, OFF-01, OFF-02, OFF-05, AUTH-01, AUTH-02, AUTH-03, UX-01, UX-02, UX-03, UX-04, DEP-01, DEP-02, DEP-03
**Success Criteria** (what must be TRUE):
  1. Mitarbeiterin kann Artikel antippen, sieht sofort Gesamtpreis im Warenkorb und kann Artikel entfernen oder Menge anpassen
  2. Mitarbeiterin gibt bezahlten Betrag ein, sieht Differenz, entscheidet Wechselgeld-Betrag — Rest wird automatisch als Spende angezeigt
  3. Verkaufsabschluss bucht Warenbestand ab und erfasst Umsatz und Spende atomar (auch ohne Netzverbindung)
  4. App ist als Home-Screen-Icon auf dem iPad installiert und startet vollständig offline ohne Fehlermeldung
  5. Der Laden ist passwortgeschützt und nach Neustart der PWA muss erneut eingeloggt werden
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Monorepo-Gerüst, Docker-Stack, GitHub Actions CI/CD (Wave 1)
- [x] 01-02-PLAN.md — Dexie-Schema, PIN-Auth, Service Worker, Seed-Daten (Wave 2)
- [x] 01-03-PLAN.md — Kassen-UI: Artikel-Grid, Warenkorb, Numpad, Bezahl-Flow, Zusammenfassung (Wave 3)

### Phase 2: Backend & Sync
**Goal**: Verkaufsdaten werden nicht nur lokal gespeichert, sondern mit dem Server synchronisiert — Datenverlust bei iPad-Reset ist ausgeschlossen
**Depends on**: Phase 1
**Requirements**: WAR-04, OFF-03, OFF-04
**Success Criteria** (what must be TRUE):
  1. Nach einem Verkauf (offline) erscheint der Datensatz auf dem Server, sobald das iPad wieder online ist
  2. Bestandsänderungen werden als Delta-Events synchronisiert, kein Absolutwert-Konflikt bei mehreren Geräten
  3. Konflikte (Last-Write-Wins via Timestamp) werden ohne manuellen Eingriff aufgelöst
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — Drizzle-Schema, DB-Singleton, POST /api/sync Endpoint, Dockerfile-Migration (Wave 1)
- [x] 02-02-PLAN.md — Client Sync-Engine (engine.ts + triggers.ts), Integration in main.tsx (Wave 2)

### Phase 3: Warenwirtschaft & Berichte
**Goal**: Verwalterin kann Produkte pflegen, Bestände im Blick behalten und Spendenberichte per Mail empfangen
**Depends on**: Phase 2
**Requirements**: POS-08, WAR-01, WAR-02, WAR-03, WAR-05, WAR-06, REP-01, REP-02, REP-03, REP-04
**Success Criteria** (what must be TRUE):
  1. Neue Produkte können angelegt, bearbeitet und deaktiviert werden — deaktivierte Produkte erscheinen nicht im Kassen-Grid
  2. Bei Unterschreitung des Mindestbestands erscheint eine sichtbare Warnung in der App
  3. Tagesübersicht nach dem Gottesdienst zeigt Anzahl Verkäufe, Gesamtumsatz und Gesamtspenden
  4. Spendenberichte (monatlich und jährlich) werden automatisch per E-Mail versendet
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Schema-Migration (Dexie v2 + Drizzle), Backend-Routes, Admin-Shell, STOCK_ADJUST-Handler (Wave 1)
- [ ] 03-02-PLAN.md — Produktverwaltungs-UI, Bestandskorrektur, Mindestbestand-Banner, Tagesübersicht (Wave 2)
- [ ] 03-03-PLAN.md — Monats-/Jahresberichte mit Charts, Mail-Service, Cron-Scheduler, Settings-UI (Wave 3)

### Phase 4: Rechnungsimport
**Goal**: Mitarbeiterin kann eine Rechnung vom Süd-Nord-Kontor als PDF hochladen, geprüfte Positionen freigeben und der Warenbestand wird automatisch gebucht
**Depends on**: Phase 3
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05
**Success Criteria** (what must be TRUE):
  1. PDF-Upload einer Süd-Nord-Kontor-Rechnung liefert eine editierbare Tabelle mit allen erkannten Positionen (Menge, Artikelnummer, Bezeichnung, EK-Preis, EVP, MwSt)
  2. Neue Artikel aus der Rechnung erscheinen als Produkt-Vorschläge zum Anlegen — kein blindes Auto-Import
  3. Nach manueller Freigabe wird der Warenbestand für alle Positionen gebucht (Zugangsbuchung)
**Plans**: TBD

Plans:
- [ ] 04-01: serverseitiges PDF-Parsing (pdfjs-dist, koordinatenbasiert), Review-UI, Freigabe-Workflow

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Offline-Kern & Kasse | 3/3 | Complete   | 2026-03-23 |
| 2. Backend & Sync | 2/2 | Complete   | 2026-03-23 |
| 3. Warenwirtschaft & Berichte | 1/3 | In Progress|  |
| 4. Rechnungsimport | 0/1 | Not started | - |
