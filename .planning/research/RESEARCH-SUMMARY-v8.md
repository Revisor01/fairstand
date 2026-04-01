# Research Summary: v8.0 Inventur, Preis-History & Rechnungsexport

**Projekt:** Fairstand Kassensystem  
**Milestone:** v8.0 (Nachverfolgbarkeit + Audit Trail + Export)  
**Recherchiert:** 2026-04-01  
**Gesamt-Confidence:** HIGH (Table Stakes sind POS-Standard); MEDIUM (Implementation auf Online-Only Architektur)

---

## Executive Summary

v8.0 erweitert das bestehende Online-Only Kassensystem um drei kritische Funktionen für Jahresabschluss und Audit-Trail:

1. **Inventur-Übersicht:** Artikel-für-Artikel Bestandswert (Menge × EK-Preis-zum-Verkaufszeitpunkt) zur Bilanz. Berechnung aus Sales-Snapshots, nicht aktuellen Preisen → korrekte Gewinn-Darstellung.

2. **Preis-History-Audit-Log:** Jede EK/VK-Änderung wird mit Timestamp + Grund geloggt. Enables Rückverfolgbarkeit für Jahresabschluss + Finanzamt-Prüfung. Trigger-basiert → automatisch, kein manuelles Logging.

3. **Stock-Movement-Log:** Vollständiger Audit Trail jeder Bestandsänderung (Verkauf, Nachbestellung, Verderb). Basis für Inventur-Plausibilität: "Soll 10, Ist 8, fehlend: 2 waren Verderb" ist jetzt nachweisbar.

4. **Rechnungsexport:** CSV/PDF der Verkaufsdaten mit Snapshot-Preisen. Für Kirchenkreis-Berichtswesen und Buchhalter-Handover.

### Was macht diese Features "Table Stakes"

POS-Systeme in der Einzelhandelspraxis implementieren all vier als Standard, weil:

- **Jahresabschluss ohne Inventur-Übersicht** ist nicht glaubwürdig (Bilanzposition "Warenbestand" lässt sich nicht nachweisen)
- **Preis-Änderungen ohne Audit-Log** sind verdächtig (Finanzamt: "Wann und warum wurde EK erhöht?")
- **Bestandsdiskrepanzen ohne Movement-Log** sind nicht auflösbar ("Wo sind die 2 fehlenden Stück?")
- **Keine Export-Möglichkeit** für externe Stakeholder (Kirchenkreis, Buchhalter) behindert Integration

---

## Key Findings

### 1. Inventur-Report: Berechnung ist kritisch

**Standard-Praxis:** Snapshot-Preise speichern, nicht Aktualpreise nachträglich auslesen.

Grund: Jahresabschluss muss Gewinn zeigen, der zum Verkaufszeitpunkt galt, nicht zum Abfragedatum.

**Beispiel:**
- Artikel: "Bio-Kaffee 250g"
- EK ursprünglich 2€, später auf 3€ erhöht
- Im Januar 87 Stück zu 2€ EK verkauft
- Ohne Snapshot: Query zieht aktuellen EK (3€) → falsch berechnet
- Mit Snapshot: Query nutzt gespeicherten EK pro Sale → korrekt

**Fairstand-Situation:** sales-Tabelle hat bereits `ek_snapshot_cents` + `vk_snapshot_cents`. Inventur-Report kann sofort gebaut werden.

### 2. Preis-History-Tabelle: Trigger-basiert ist Standard

**Industry-Pattern:** Separate `price_history`-Tabelle + PostgreSQL Trigger auf `products.UPDATE`. Automatisch geloggt, keine App-Code-Fehler möglich.

**Schema:**
```sql
price_history (
  id, product_id, shop_id,
  old_ek_cents, new_ek_cents, old_vk_cents, new_vk_cents,
  changed_at TIMESTAMP,
  changed_by_user TEXT,
  reason TEXT
)
```

**Fairstand-Integration:** Neuer Trigger beim PATCH /products/:id. Braucht 1 Tag Schema + Tests.

### 3. Stock-Movement-Log: Requires Refactoring, Not Rewrite

**Kritisch:** Nicht alle Bestandsänderungen gehen durch Sales-Tabelle.

Rechnungsimport: "Rechnung PDF hat 12 Kaffee" → aktuell direkt `UPDATE products SET stock = stock + 12`

**Besser:** `INSERT INTO stock_movements + UPDATE products` via Trigger (wie Sales)

**Aufwand:** 2 Tage (DDL + bestehende Rechnungsimport-Logik refactoren + Rückwärts-Migration)

**Risiko-Mitigation:** Vor Trigger-Aktivierung: `INSERT INTO stock_movements SELECT ... FROM sales` (alle bisherigen Sales rekonstruieren)

### 4. Rechnungsexport: CSV einfach, PDF hat Pitfalls

**CSV:** 1 Tag. Standard `csv-stringify` NPM + UTF-8 BOM für Umlaute.

**PDF:** 2 Tage. Zwei Optionen:
- **html-pdf-node** (einfacher): HTML-Template → Chromium → PDF. Braucht große Node-Module, aber weniger Layout-Code.
- **pdfkit** (leichter): Reiner Node.js, aber manuelle Text/Table-Rendering mühsam.

→ **Empfehlung:** html-pdf-node für Kassenquittung (einmalige Decision).

### 5. Zyklische Inventur (ABC-Klassifizierung): Später

**Gehört zu v8.0 roadmap, nicht aber MVP.**

Pattern: "A-Artikel" (Top-20%-Umsatz) monatlich zählen, "B" quartalsweise, "C" halbjährlich.

Erfordert User-Feedback zur ABC-Schwellwert-Definition → Phase 5 oder v8.1.

---

## Roadmap-Implikationen

### Phasierung für v8.0

**Phase 1 (1 Tag):** PriceHistory-Tabelle DDL + Trigger
- Drizzle ORM Tabellendefinition
- PostgreSQL Trigger für products.UPDATE
- DB-Migration
- Unit-Test: PATCH /products/:id → price_history-Eintrag

**Phase 2 (2 Tage):** StockMovement-Tabelle + Refactoring
- stock_movements DDL
- Trigger für sales.INSERT (SALE) + stock_additions.INSERT (ADDITION)
- Rechnungsimport-Logik: von direktem UPDATE zu INSERT INTO stock_additions
- Rückwärts-Migration: Alle bestehenden Sales in stock_movements eintragen

**Phase 3 (2–3 Tage):** Inventur-Report Dashboard
- SQL-Query mit GROUP BY auf products/sales/price_history
- Neue Dashboard-Seite "Inventur" mit Tabelle
- TanStack Query Hook + WebSocket-Updates bei Bestandsänderung
- Export-Button (CSV + PDF)

**Phase 4 (1–2 Tage):** Rechnungsexport Implementation
- CSV-Generator (Tagesabschluss + Monatsexport)
- PDF-Generator (Kassenquittung)
- UI-Buttons im Tagesreport

**Phase 5 (Optional, v8.1):** Zyklische Inventur UI
- ABC-Klassifizierung-SQL
- Dashboard-Seite "Inventur-Planung" mit Checkliste
- Requires User-Feedback zu Schwellwerten

**Total für MVP (Phases 1–4):** ca. 6–8 Tage (1 bis 2 Wochen Entwicklung)

### Warum diese Reihenfolge

1. **PriceHistory vor Inventur:** Inventory-Report braucht historische EK-Preise. Trigger muss laufen, bevor Reports gebaut werden.
2. **StockMovement vor Report:** Bestandsverlauf muss komplett sein (Sale + Addition + Adjustment). Refactoring zuerst, dann Reporting.
3. **Report vor Export:** Report-Logik ist stabil, Export nutzt Report-Daten.
4. **Zyklische Inventur später:** Nice-to-have, erfordert Nutzer-Feedback zu Schwellwerten.

---

## Technische Anforderungen (keine Breaking Changes)

### Bereits vorhanden
- ✓ Sales-Tabelle mit `ek_snapshot_cents`, `vk_snapshot_cents`
- ✓ PostgreSQL mit Drizzle ORM
- ✓ TanStack Query für Report-Caching
- ✓ WebSocket für Live-Updates
- ✓ Admin-Bereich zum Ändern von Produktpreisen

### Neu hinzufügen
- `price_history` Tabelle + Trigger
- `stock_movements` Tabelle + Trigger
- Rechnungsimport-Refactoring (besser: via stock_additions)
- CSV-Export-Utility
- PDF-Generator (html-pdf-node als neue Dependency)
- Inventur-Report-Dashboard-Seite

### Keine Breaking Changes
- Bestehende sales/products/shops-Strukturen bleiben unverändert
- Snapshot-Preise schon gespeichert (nichts Neues)
- Offline-Modus irrelevant (Online-Only sowieso)

---

## Confidence Assessment

| Bereich | Level | Begründung |
|---------|-------|-----------|
| **Table Stakes** | HIGH | Alle vier Features sind POS-Industrie-Standard, mehrfach dokumentiert. |
| **Inventur-Berechnung** | HIGH | Snapshot-Pattern ist Best Practice, Fairstand hat bereits Snapshots. |
| **Preis-History-Trigger** | HIGH | PostgreSQL Trigger sind etabliert, Pattern ist standardisiert. |
| **Stock-Movement-Refactoring** | MEDIUM | Rechnungsimport-Logik könnte komplexer sein als erwartet. Erfordert sorgfältige Rückwärts-Migration. |
| **CSV-Export** | HIGH | Standard-Format, unkompliziert. |
| **PDF-Export** | MEDIUM | PDF-Generierung kann fragil sein (Font-Rendering, Seitenumbruch). html-pdf-node einfacher, aber externe Abhängigkeit. |
| **ABC-Klassifizierung (Phase 5)** | LOW | Erfordert Nutzer-Feedback zu Schwellwerten. |

---

## Open Questions für Phase-Start

1. **Governance für Preis-Änderungen:** Darf jeder Admin ändern, oder Freigabe-Workflow?
   - Beantwortet via: Gespräch mit Swantje vor Phase 1.

2. **ABC-Schwellwerte:** Welche % für "A"-Artikel, wann sollte gezählt werden?
   - Beantwortet via: User-Testing in Phase 5 oder v8.1.

3. **Rechnungsexport-Frequenz:** Täglich, Wöchentlich, Monatlich, oder nur Ad-hoc?
   - MVP: Ad-hoc. Erweitern basierend auf Feedback.

4. **PDF-Generator: html-pdf-node oder pdfkit?**
   - Decision vor Phase 4. Recommendation: html-pdf-node (einfacher für HTML-Template).

5. **Audit-Trail: Wer hat Preis geändert (Session-User) oder festes Admin-Konto?**
   - Fairstand hat Session-Auth (PIN). Can log session-user via `current_user` Session-Variable.

---

## Phase Ordering Rationale

**Warum nicht parallel?**

- Phase 2 refactored Rechnungsimport-Logik → muss vor Phase 3 (Reports) sauber sein.
- Phase 3 nutzt Daten aus Phase 1 + 2 → kann nicht starten bevor beide fertig.
- Phase 4 baut auf Phase 3 auf → kann parallel mit Phase 3 starten, aber Phase 3 muss größtenteils fertig sein.

**Estimated Duration:**
- Week 1: Phases 1 + 2 (3–4 days setup, 1–2 days testing)
- Week 2: Phase 3 (2–3 days) + Phase 4 (1–2 days)
- Optional Week 3: Phase 5 (user feedback cycle)

---

## What Could Go Wrong (Risk Mitigation)

| Risiko | Eintrittswahrscheinlichkeit | Mitigation |
|--------|----------------------------|-----------|
| Trigger-Fehler → NULL-Values in price_history | NIEDRIG | Unit-Test jeden Trigger mit Test-UPDATE. |
| Stock-Movement-Migration: Duplikate | MITTEL | Dry-run mit Backup vor echtem Migration. |
| PDF-Rendering: Umlaute/Fonts | MITTEL | html-pdf-node hat gute Font-Unterstützung. Test mit realen Daten. |
| Performance: Inventory-Report über 1000+ Sales | MITTEL | Index auf `sales(product_id, cancelled_at, date)`. Pagination falls nötig. |
| Rechnungsimport bricht durch Refactoring | MITTEL | Feature-Flag: neuer Code parallel mit alt-Code testen vor Cutover. |

---

## Success Criteria für v8.0

- [ ] Inventur-Report zeigt alle Artikel mit Bestand, Verkaufsmenge, EK-Kosten (aus Snapshots), Gewinn
- [ ] Preis-History-Tabelle hat Trigger und dokumentiert jede EK/VK-Änderung
- [ ] Stock-Movement-Log dokumentiert alle Bestandsänderungen (SALE, ADDITION, ADJUSTMENT)
- [ ] CSV/PDF-Export funktioniert mit UTF-8 + Umlauten
- [ ] Rückwärts-Migration: Alle bestehenden Sales sind in stock_movements eingetragen
- [ ] Keine Breaking Changes für bestehende Funktionalität
- [ ] Reports aktualisieren live via WebSocket bei Bestandsänderung

---

## Downstream Consumer Expectations

Die Kirche (Swantje + Mitarbeiterinnen) erwartet:

1. **Jahresabschluss ohne manuellen Datenkombinations-Aufwand:** Report-Button drücken → Bestandswert für Bilanz.
2. **Nachverfolgbarkeit für Finanzamt:** "Wir können zeigen, wann welche Preise waren."
3. **Beleg-Kette für Kirchenkreis:** "Hier sind alle Verkäufe April 2026 als CSV."
4. **Keine Komplexität:** Zyklische Inventur Optional, wenn sie Mehrwert sieht.

---

## Sources

- [nventory.io: Inventory Reconciliation](https://nventory.io/us/solutions/inventory-reconciliation-control)
- [Deal POS: Inventory Movement Tracking](https://support.dealpos.com/en/articles/4773910-tracking-product-inventory-movements-using-the-inventory-log-stock-card)
- [Lightspeed: Inventory Reconciliation Guide](https://www.lightspeedhq.com/blog/inventory-reconciliation/)
- [Red-Gate: Price History Database Design](https://www.red-gate.com/blog/price-history-database-model/)
- [Shopify: Cycle Count Best Practices](https://www.shopify.com/retail/cycle-count)
- [POSNation: Inventory Management Best Practices](https://www.posnation.com/blog/inventory-management-best-practices)

---

*Research für: Fairstand Kassensystem v8.0 Milestone*  
*Research-Modus: Ecosystem (Features in POS-Industrie-Praxis)*  
*Confidence: HIGH (Table Stakes), MEDIUM (Implementation Details)*  
*Recherchiert: 2026-04-01*
