# Requirements: Fairstand Kassensystem v5.0

**Defined:** 2026-03-24
**Core Value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird — auch ohne Internetverbindung.

## v5.0 Requirements

### Live Architecture

- [x] **LIVE-01**: Wenn online, laufen alle Produkt-/Kategorie-Reads über TanStack Query direkt gegen die Server-API — kein Dexie-Umweg, kein manueller Sync-Button
- [x] **LIVE-02**: Produkt-/Kategorie-Writes (CRUD) gehen direkt an den Server, UI aktualisiert sich über Query-Invalidation sofort
- [ ] **LIVE-03**: Verkäufe und Entnahmen werden online direkt an den Server gepostet (kein Outbox-Umweg)
- [ ] **LIVE-04**: WebSocket-Verbindung pusht Produkt-/Kategorie-/Bestandsänderungen live an alle verbundenen Clients — kein Polling, kein manuelles Nachladen
- [ ] **LIVE-05**: Dexie dient nur noch als Offline-Cache für POS — wird beim Online-Start automatisch befüllt, nicht als primäre Datenquelle
- [x] **LIVE-06**: TanStack Query mit networkMode 'online' (Admin) und 'offlineFirst' (POS) steuert die Datenquelle automatisch
- [ ] **LIVE-07**: Der manuelle Sync-Button und downloadProducts()/downloadCategories() werden entfernt — WebSocket + Query-Invalidation ersetzt alles

### Offline-Fallback

- [ ] **OFFL-01**: POS funktioniert vollständig offline mit TanStack Query Offline-Cache + Dexie-Fallback
- [ ] **OFFL-02**: Verkäufe/Entnahmen werden offline in die Outbox geschrieben und bei Reconnect automatisch geflusht
- [ ] **OFFL-03**: Online/Offline-Wechsel wird nahtlos erkannt — Datenquelle schaltet automatisch um, ohne Benutzerinteraktion

### Security & Hardening

- [x] **SEC-01**: CORS erlaubt nur explizit konfigurierte Origins (kein Wildcard-Default)
- [x] **SEC-02**: PIN-Eingabe hat Server-seitiges Rate-Limiting (max. 5 Versuche pro Minute pro IP)
- [x] **SEC-03**: Server validiert shopId gegen die authentifizierte Session — kein Zugriff auf fremde Shop-Daten

### Bugfixes & Tech Debt

- [x] **FIX-01**: Report-Scheduler filtert stornierte Verkäufe (AND cancelled_at IS NULL) in allen 4 SQL-Queries
- [x] **FIX-02**: PDF-Parser hat 30-Sekunden-Timeout via Promise.race(), bricht bei hängenden PDFs ab
- [x] **FIX-03**: PDF-Upload validiert tatsächliches PDF-Format (Magic Bytes), nicht nur Dateiendung

## Future Requirements

Deferred — nicht in v5.0 Scope.

- **SCALE-01**: Report-Scheduler iteriert über alle Shops statt hardcoded shopId
- **SCALE-02**: Horizontal-Scaling: PostgreSQL statt SQLite wenn >1 Instance
- **UX-01**: "Last synced" Anzeige in Reports — wie alt sind die angezeigten Daten
- **UX-02**: Storno rückgängig machen (un-cancel)
- **TEST-01**: Cart-Validierung nach Produkt-Deaktivierung End-to-End testen
- **TEST-02**: PDF-Parser Edge-Cases: Multi-Page, lange Namen, ungewöhnliche MwSt

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-Tab Support | App designed für einzelnes iPad, kein SharedWorker nötig |
| Real-time Collaboration (mehrere Kassen gleichzeitig) | Ein Fairstand = ein Gerät |
| Service Worker Background Sync | iOS unterstützt es nicht, online/visibilitychange reicht |
| TanStack Query PersistQueryClient | Dexie-Cache reicht für Offline, kein localStorage nötig |
| Produkt-Upsert bei SALE_COMPLETE | Absichtlich entfernt in v4.0 — Produkte nur über eigenen Endpoint |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LIVE-01 | Phase 19 | Complete |
| LIVE-02 | Phase 19 | Complete |
| LIVE-03 | Phase 20 | Pending |
| LIVE-04 | Phase 20 | Pending |
| LIVE-05 | Phase 20 | Pending |
| LIVE-06 | Phase 19 | Complete |
| LIVE-07 | Phase 20 | Pending |
| OFFL-01 | Phase 21 | Pending |
| OFFL-02 | Phase 21 | Pending |
| OFFL-03 | Phase 21 | Pending |
| SEC-01 | Phase 18 | Complete |
| SEC-02 | Phase 18 | Complete |
| SEC-03 | Phase 18 | Complete |
| FIX-01 | Phase 18 | Complete |
| FIX-02 | Phase 18 | Complete |
| FIX-03 | Phase 18 | Complete |

**Coverage:**
- v5.0 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after roadmap v5.0 created*
