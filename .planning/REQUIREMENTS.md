# Requirements: Fairstand Kassensystem

**Defined:** 2026-04-10
**Core Value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.

## v13.0 Requirements

Requirements für Milestone v13.0 — Multi-Kategorien.

### Multi-Kategorien

- [ ] **MCAT-01**: Ein Produkt kann mehreren Kategorien zugeordnet werden (Schema: products.categories text[])
- [ ] **MCAT-02**: Bestehende Produkte werden automatisch migriert (single category → array mit einer Kategorie)
- [ ] **MCAT-03**: ProductForm ermöglicht Multi-Select von Kategorien beim Anlegen/Bearbeiten
- [ ] **MCAT-04**: Kategorie-Filter im POS zeigt ein Produkt an, wenn mindestens eine seiner Kategorien matched
- [ ] **MCAT-05**: Inventur-Export und -Report zeigt weiterhin korrekte Kategorie-Information (erste Kategorie oder Komma-Liste)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Join-Tabelle product_categories | PostgreSQL text[] reicht, einfacher |
| Hierarchische Kategorien (Parent/Child) | Nicht nötig für 106 Produkte |
| Kategorie-Icons | UI-Polish, später |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MCAT-01 | Phase 41 | Pending |
| MCAT-02 | Phase 41 | Pending |
| MCAT-03 | Phase 41 | Pending |
| MCAT-04 | Phase 41 | Pending |
| MCAT-05 | Phase 41 | Pending |

**Coverage:**
- v13.0 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-04-10*
