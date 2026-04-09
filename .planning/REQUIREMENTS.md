# Requirements: Fairstand Kassensystem

**Defined:** 2026-04-09
**Core Value:** Mitarbeiterinnen können vor Ort Artikel antippen, den Gesamtpreis sehen, den bezahlten Betrag eingeben und sofort wissen, wie viel Wechselgeld rausgeht und wie viel als Spende verbucht wird.

## v12.0 Requirements

Requirements für Milestone v12.0 — Live-Suche.

### Live-Suche

- [ ] **SUCH-01**: Im POS-Dashboard gibt es ein Suchfeld über dem Artikelgrid
- [ ] **SUCH-02**: Das Artikelgrid wird live während der Eingabe gefiltert (kein Submit nötig)
- [ ] **SUCH-03**: Die Suche findet Artikel über Artikelnummer (auch Teilmatch)
- [ ] **SUCH-04**: Die Suche findet Artikel über Produktname (auch Teilmatch)
- [ ] **SUCH-05**: Die Suche findet Artikel über Kategorie

## Future Requirements

None

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-seitige Suche | Produktliste bereits client-seitig geladen via TanStack Query |
| Fuzzy Search / Tippfehler-Toleranz | Overkill für ~106 Produkte, exakter Teilmatch reicht |
| Suchhistorie | Nicht nötig für POS-Kontext |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SUCH-01 | — | Pending |
| SUCH-02 | — | Pending |
| SUCH-03 | — | Pending |
| SUCH-04 | — | Pending |
| SUCH-05 | — | Pending |

**Coverage:**
- v12.0 requirements: 5 total
- Mapped to phases: 0
- Unmapped: 5

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-09 after initial definition*
