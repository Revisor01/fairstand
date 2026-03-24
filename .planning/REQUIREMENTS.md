# Requirements: Fairstand Kassensystem v6.0

**Defined:** 2026-03-24
**Core Value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.

## v6.0 Requirements

### Dexie Removal

- [ ] **DEX-01**: Dexie.js, dexie-react-hooks und idb-keyval sind komplett aus dem Projekt entfernt (package.json, imports, code)
- [ ] **DEX-02**: IndexedDB wird nirgends mehr verwendet — keine lokale Datenbank auf dem Client
- [ ] **DEX-03**: Outbox-Pattern komplett entfernt — kein sync/engine.ts, kein sync/triggers.ts, kein flushOutbox
- [ ] **DEX-04**: Warenkorb wird in TanStack Query / React State gehalten, nicht in IndexedDB
- [ ] **DEX-05**: Sales/Reports werden ausschließlich vom Server geladen (TQ queries), kein lokales Dexie-Query

### PostgreSQL Migration

- [x] **PG-01**: Server verwendet PostgreSQL statt SQLite (Drizzle ORM mit drizzle-orm/node-postgres)
- [x] **PG-02**: Docker-Compose enthält PostgreSQL-Container mit Volume für Datenpersistenz
- [x] **PG-03**: Alle Drizzle-Schema-Definitionen sind auf PostgreSQL-Syntax migriert (text → varchar, integer → serial etc.)
- [ ] **PG-04**: Bestehende SQLite-Daten können über ein Migrationsskript nach PostgreSQL übertragen werden
- [ ] **PG-05**: better-sqlite3 ist komplett entfernt (package.json, imports)

### Online-Only Architecture

- [ ] **ONL-01**: App zeigt bei fehlendem Internet einen klaren Hinweis — keine Funktionalität ohne Server
- [ ] **ONL-02**: Verkäufe/Entnahmen werden immer direkt an den Server gesendet — kein Fallback, kein Retry-Queue
- [ ] **ONL-03**: Service Worker dient nur noch für App-Shell-Caching (PWA Install), nicht für Daten-Caching

## Future Requirements

- **NATIVE-01**: Native iOS App via App Store (Apple Developer Account vorhanden)
- **SCALE-01**: Report-Scheduler iteriert über alle Shops
- **UX-01**: Storno rückgängig machen (un-cancel)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Offline-Modus | Bewusst entfernt — Cache verursacht mehr Probleme als er löst |
| Dexie/IndexedDB | Komplett entfernt in v6.0 |
| SQLite | Durch PostgreSQL ersetzt |
| Native App | Erst v7.0 — PWA reicht aktuell |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEX-01 | Phase 23 | Pending |
| DEX-02 | Phase 23 | Pending |
| DEX-03 | Phase 23 | Pending |
| DEX-04 | Phase 23 | Pending |
| DEX-05 | Phase 23 | Pending |
| PG-01 | Phase 22 | Complete |
| PG-02 | Phase 22 | Complete |
| PG-03 | Phase 22 | Complete |
| PG-04 | Phase 22 | Pending |
| PG-05 | Phase 22 | Pending |
| ONL-01 | Phase 23 | Pending |
| ONL-02 | Phase 23 | Pending |
| ONL-03 | Phase 23 | Pending |

**Coverage:**
- v6.0 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 — Traceability nach Roadmap v6.0 eingetragen*
