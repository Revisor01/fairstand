# Feature Research

**Domain:** Offline-First POS PWA — Ehrenamtlicher Fairtrade-Kirchenstand
**Researched:** 2026-03-23
**Confidence:** HIGH (Kern-POS-Features), MEDIUM (Regulatorik), LOW (Multi-Store-Spezifika)

---

## Feature Landscape

### Table Stakes (Nutzer setzen diese voraus)

Features, die jedes funktionierende Kassensystem haben muss. Fehlen sie, wirkt das System unfertig oder unbrauchbar.

| Feature | Warum erwartet | Complexity | Notizen |
|---------|---------------|------------|---------|
| Artikel-Grid / Produktauswahl | Kernfunktion jeder Kasse — Artikel antippen statt eingeben | LOW | Touch-optimiert, min. 9-12mm Tap-Target; 30-50 Artikel |
| Warenkorb mit Gesamtpreis | Nutzer muss jederzeit sehen, was die Bestellung kostet | LOW | Live-Summe, Artikel hinzufügen/entfernen |
| Bezahlt-Betrag eingeben | Standardworkflow: Betrag entgegennehmen, Wechselgeld berechnen | LOW | Numerik-Pad, große Eingabefelder |
| Wechselgeld-Anzeige | Ehrenamtliche müssen nicht kopfrechnen — System zeigt Rückgeld | LOW | Differenz aus bezahlt - Gesamtpreis |
| Offline-Betrieb | Kirchenschiff hat kein WLAN — ohne Offline ist die App nutzlos | HIGH | Service Worker + IndexedDB; Kern-Constraint des Projekts |
| Lokale Datenpersistenz | Verkaufsdaten dürfen nicht verloren gehen wenn App neu gestartet | MEDIUM | IndexedDB als primärer Store |
| Produktverwaltung (CRUD) | Sortiment ändert sich saisonal — neue Artikel anlegen, ändern, löschen | LOW | Admin-Bereich, nicht im Kassen-Flow |
| Bestandsabzug bei Verkauf | Lagerbestand muss automatisch sinken — sonst keine Warenwirtschaft | MEDIUM | Transaktional: Verkauf + Bestandsbuchung atomar |
| Tagesübersicht / Abschluss | Nach dem Gottesdienst: Was wurde verkauft, was eingenommen? | MEDIUM | Aggregation pro Tag |

---

### Differentiators (Wettbewerbsvorteile)

Features, die dieses System von generischen POS-Apps unterscheiden und auf den spezifischen Anwendungsfall zugeschnitten sind.

| Feature | Value Proposition | Complexity | Notizen |
|---------|-------------------|------------|---------|
| Spenden-Workflow | Überzahlung wird aktiv als Spende erfasst — einzigartig für kirchlichen Kontext | MEDIUM | Mitarbeiterin gibt Wechselgeld-Betrag ein, Rest = Spende; differenzierter als simples "Aufrunden" |
| Rechnungsimport (PDF-Parsing) | Süd-Nord-Kontor Rechnungen direkt importieren statt manuell eintippen | HIGH | Serverseitig PDF-Parser; spart bei ca. 30-50 Artikeln erhebliche Pflegezeit |
| EK/VK-Preisverwaltung | Marge pro Artikel sichtbar — wichtig für gemeinnützige Transparenz | LOW | EK aus Rechnung, VK (EVP) aus Rechnung oder manuell |
| Spendenberichte | Kirchengemeinde braucht Nachweise für Spendenbescheinigungen | MEDIUM | Aggregation pro Monat/Jahr, E-Mail-Versand |
| Mindestbestand-Warnung | Vor dem Gottesdienst wissen, was nachbestellt werden muss | LOW | Konfigurierbarer Schwellwert pro Artikel |
| Herkunftsland / Artikelinfo | Fairtrade-Kontext: Woher kommt das Produkt? | LOW | Zusatzfeld, kein Pflichtfeld für Kernworkflow |
| Multi-Laden-Architektur (vorbereitet) | Andere Gemeinden könnten dasselbe System nutzen | MEDIUM | Datenmodell-Vorbereitung, kein UI nötig in v1 |
| Automatischer Mail-Versand | Berichte gehen automatisch an Verantwortliche — kein manuelles Exportieren | MEDIUM | Cron-Job serverseitig, konfigurierbare E-Mail-Adresse |

---

### Anti-Features (Bewusst nicht bauen)

Features, die verlockend klingen, aber im Kontext Probleme erzeugen oder außer Verhältnis zum Aufwand stehen.

| Feature | Warum gewünscht | Warum problematisch | Alternative |
|---------|-----------------|---------------------|-------------|
| Bon-Druck / Kassenbons | "Echte Kasse druckt Bons" | Druckeranbindung (Bluetooth/WLAN) kompliziert Offline-Setup erheblich; KassenSichV-TSE-Pflicht für elektronische Kassen mit Bon-Pflicht entfällt bei offener Ladenkasse | Kasse als "offene Ladenkasse" betreiben — kein elektronischer Bon, nur internes Kassenbuch |
| EC-Karte / Kartenzahlung | Kunden zahlen oft mit Karte | Zahlungsterminal-Integration (SumUp, iZettle) erfordert Hardware, WLAN, laufende Kosten; Laufkundschaft vor der Kirche zahlt bar | Bewusst nur Barzahlung, explizit Out of Scope |
| Barcode-Scanner | "Professionelle Kassen scannen Barcodes" | Für 30-50 Artikel ist Grid-Antippen schneller als Scanner; Bluetooth-Scanner kompliziert Hardware-Setup | Artikel-Grid mit Produktbildern/Namen |
| Kundenverwaltung / Treuekarten | Stammkunden binden | Laufkundschaft vor der Kirche — keine Stammkunden-Beziehung; Datenschutz-Aufwand unverhältnismäßig | Kein Kundensystem |
| Buchhalterischer Export (DATEV, SKR03) | "Sauber in die Buchhaltung" | Für eine Kirchengemeinde mit kleinem Stand nicht verhältnismäßig; erhöht Komplexität enorm | Interne Berichte per Mail, Steuerberatung manuell |
| Automatische Nachbestellung | "Nie ausverkauft sein" | Süd-Nord-Kontor benötigt manuelle Bestellung; Automatismus würde Freigabeprozess erfordern | Mindestbestand-Warnung → manuelle Bestellung |
| Mehrsprachigkeit | "International nutzbar" | Einzige Nutzergruppe sind deutschsprachige Ehrenamtliche in Hennstedt | Deutsch only |
| Komplexe Rechteverwaltung (Rollen/Permissions) | "Sicherheit" | Kleine Gruppe, kein Tech-Hintergrund; Passwortschutz pro Laden reicht | Einfacher Passwortschutz pro Laden |
| Native App (App Store) | "Echter App-Store-Look" | Apple Developer Account kostet 100€/Jahr; PWA ist ausreichend und sofort auf allen Geräten | PWA mit Home-Screen-Installation |
| TSE (Technische Sicherheitseinrichtung) | KassenSichV-Compliance | Gilt nur für elektronische Registrierkassen mit Bon-Pflicht; Kirchenstand als "offene Ladenkasse" ist ausgenommen; TSE-Integration wäre massiver Mehraufwand | Als offene Ladenkasse betreiben: täglicher Kassenbericht reicht |

---

## Feature Dependencies

```
[Warenkorb]
    └──requires──> [Artikel-Grid / Produktauswahl]
                       └──requires──> [Produktverwaltung (CRUD)]

[Wechselgeld-Anzeige]
    └──requires──> [Warenkorb]
    └──requires──> [Bezahlt-Betrag eingeben]

[Spenden-Workflow]
    └──requires──> [Wechselgeld-Anzeige]

[Bestandsabzug bei Verkauf]
    └──requires──> [Produktverwaltung (CRUD)]
    └──requires──> [Warenkorb]

[Mindestbestand-Warnung]
    └──requires──> [Bestandsabzug bei Verkauf]

[Rechnungsimport (PDF-Parsing)]
    └──enhances──> [Produktverwaltung (CRUD)]   (Artikel per Import anlegen)
    └──enhances──> [Bestandsabzug bei Verkauf]  (Zugang bei Einkauf buchen)

[Spendenberichte]
    └──requires──> [Spenden-Workflow]

[Tagesübersicht / Abschluss]
    └──requires──> [Bestandsabzug bei Verkauf]

[Automatischer Mail-Versand]
    └──requires──> [Spendenberichte]

[Offline-Betrieb]
    └──requires──> [Lokale Datenpersistenz]
    └──enables──>  alle anderen Features ohne WLAN

[Automatische Sync]
    └──requires──> [Offline-Betrieb]
    └──requires──> [Lokale Datenpersistenz]
```

### Dependency-Notizen

- **Rechnungsimport erfordert Produktverwaltung:** Der Import-Flow ist eine Erweiterung des CRUD — geparste Artikel landen im selben Produktdatenmodell.
- **Spenden-Workflow erfordert vollständigen Kassen-Flow:** Erst wenn Warenkorb + Bezahlt-Betrag funktionieren, macht die Spenden-Logik Sinn.
- **Offline-Betrieb ist kein Add-on:** Muss von Tag 1 in der Architektur verankert sein — nachträgliches Hinzufügen von IndexedDB + Service Worker führt zu Rewrites.
- **Bestandsabzug und Verkauf müssen atomar sein:** Entweder beides oder nichts — kein inkonsistenter Zustand (Verkauf gebucht, Bestand nicht abgezogen).

---

## MVP Definition

### Launch With (v1)

Minimum, damit Mitarbeiterinnen beim Gottesdienst damit kassieren können.

- [ ] Artikel-Grid — ohne Produktauswahl keine Kasse
- [ ] Warenkorb mit Gesamtpreis — Kernworkflow
- [ ] Bezahlt-Betrag eingeben + Wechselgeld-Anzeige — ersetzt Kopfrechnen
- [ ] Spenden-Workflow — differenziert Wechselgeld von Spende
- [ ] Bestandsabzug bei Verkauf — Inventar bleibt aktuell
- [ ] Produktverwaltung (CRUD) — Artikel anlegen und bearbeiten
- [ ] Offline-Betrieb (IndexedDB + Service Worker) — kein WLAN in der Kirche
- [ ] PWA-Installation als Home-Screen-App — fühlt sich wie native App an

### Add After Validation (v1.x)

Features, die nach dem ersten echten Einsatz folgen.

- [ ] Rechnungsimport (PDF-Parsing) — reduziert manuellen Pflegeaufwand stark, aber manuelles Anlegen reicht für den Start
- [ ] Tagesübersicht / Abschluss — nach erstem Verkaufstag entsteht Bedarf
- [ ] Spendenberichte (monatlich/jährlich) — erst wenn Daten vorhanden
- [ ] Mindestbestand-Warnung — wenn Sortiment stabil ist und Schwellwerte bekannt
- [ ] Automatischer Mail-Versand — nach Validierung der Berichtsstruktur

### Future Consideration (v2+)

Features für später oder andere Gemeinden.

- [ ] Multi-Laden-UI (nicht nur Datenmodell) — wenn andere Gemeinden Interesse zeigen
- [ ] Herkunftsland / Artikeldetails im Verkaufs-Flow — wenn Kunden nachfragen
- [ ] Exportfunktionen (CSV, PDF) — wenn Kirchenvorstand konkrete Anforderungen formuliert

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Artikel-Grid | HIGH | LOW | P1 |
| Warenkorb | HIGH | LOW | P1 |
| Wechselgeld-Berechnung | HIGH | LOW | P1 |
| Spenden-Workflow | HIGH | LOW | P1 |
| Offline-Betrieb | HIGH | HIGH | P1 |
| Produktverwaltung (CRUD) | HIGH | LOW | P1 |
| Bestandsabzug | HIGH | MEDIUM | P1 |
| PWA Installation | MEDIUM | LOW | P1 |
| Tagesübersicht | MEDIUM | MEDIUM | P2 |
| Mindestbestand-Warnung | MEDIUM | LOW | P2 |
| Spendenberichte | HIGH | MEDIUM | P2 |
| Rechnungsimport (PDF) | HIGH | HIGH | P2 |
| Automatischer Mail-Versand | MEDIUM | MEDIUM | P2 |
| Multi-Laden-Architektur (vorbereitet) | LOW | MEDIUM | P2 |
| Herkunftsland / Artikelinfo | LOW | LOW | P3 |
| Multi-Laden-UI | LOW | HIGH | P3 |

**Priority key:**
- P1: Muss für Launch vorhanden sein
- P2: Sollte bald folgen, nach erstem echten Einsatz
- P3: Gut zu haben, für spätere Version

---

## Regulatorische Einschätzung

**KassenSichV / TSE-Pflicht:**

Ein Kirchenstand, der vor und nach Gottesdiensten gelegentlich verkauft und keine Kassenbons druckt, kann als **offene Ladenkasse** betrieben werden. Die Kassensicherungsverordnung und damit die TSE-Pflicht gelten nur für elektronische Registrierkassen, die Kassenbons ausgeben.

**Konsequenz für das System:**
- Kein Bon-Druck implementieren (bewusste Entscheidung)
- Kein TSE-Modul erforderlich
- Internes Kassenbuch (täglicher Bericht) reicht als Nachweisdokument
- Empfehlung: Rechtliche Lage mit zuständigem Finanzamt klären, da dies Graubereich ist

**Confidence:** MEDIUM — Quellen deuten auf Ausnahme hin, aber keine offizielle Bestätigung für diesen spezifischen Fall. Kirchenstand mit Gelegenheitsverkauf ist gut begründet, aber nicht 100% abgesichert.

---

## Competitor Feature Analysis

| Feature | easyWLP (Weltladen-Software) | Square (generisch) | Unser Ansatz |
|---------|------------------------------|-------------------|--------------|
| Offline-Betrieb | Nein (PC-basiert, lokal) | Eingeschränkt | Vollständig offline (PWA) |
| Touch-Optimierung | Ja (Touchscreen-Variante) | Ja | Ja, primär iPad |
| Rechnungsimport | Nein (manuell) | Nein | Ja (PDF-Parser Süd-Nord-Kontor) |
| Spenden-Workflow | Nein | Nein | Ja (kirchenspezifisch) |
| Bon-Druck | Ja | Ja | Bewusst Nein |
| Barcode-Scanner | Ja | Ja | Bewusst Nein |
| DATEV-Export | Ja | Ja | Bewusst Nein |
| Kosten | Mietmodell (~500-1000€/Jahr) | Transaktionsgebühren | Self-hosted, einmalige Entwicklung |
| Deployment | Lokaler PC | Cloud | Docker auf eigenem Server |

---

## Sources

- [Relotec — Kassensystem für Weltläden](https://www.relotec-online.de/branchen/kassensystem-weltladen/)
- [Weltladen-Wiki — PC-Kassensysteme](https://www.weltladen.de/fuer-weltlaeden/wiki/375) (nicht mehr erreichbar, historische Info)
- [KassenSichV — Gesetze im Internet](https://www.gesetze-im-internet.de/kassensichv/BJNR351500017.html)
- [VIBSS — Einsatz von Registrierkassen im Verein](https://www.vibss.de/vereinsmanagement/steuern/besondere-steuerthemen-1/einsatz-von-registrierkassen)
- [Usability Geek — UX Barriers in POS Systems](https://usabilitygeek.com/user-experience-barriers-pos-systems/)
- [Dev.pro — Designing a POS System: 10 UX Tactics](https://dev.pro/insights/designing-a-pos-system-ten-user-experience-tactics-that-improve-usability/)
- [LogRocket — Offline-first frontend apps in 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [GTCSys — Data Synchronization in PWAs](https://gtcsys.com/comprehensive-faqs-guide-data-synchronization-in-pwas-offline-first-strategies-and-conflict-resolution/)
- [Zeffy — Free POS for Nonprofits](https://www.zeffy.com/blog/first-zero-fee-pos-for-nonprofits)

---

*Feature research for: Offline-First POS PWA — Fairtrade-Kirchenstand*
*Researched: 2026-03-23*
