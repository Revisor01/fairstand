# Project Research Summary

**Project:** Fairstand — Offline-First PWA Kassensystem
**Domain:** PWA Point-of-Sale, Offline-First, Fairtrade-Kirchenstand
**Researched:** 2026-03-23
**Confidence:** HIGH

## Executive Summary

Fairstand ist ein spezialisiertes Kassensystem für einen ehrenamtlich betriebenen Fairtrade-Stand in einer Kirchengemeinde. Der entscheidende Constraint ist vollständige Offline-Funktionalität: Die Kirche hat kein WLAN, alle Verkaufsvorgänge müssen ohne Netzverbindung ablaufen. Experten bauen solche Systeme als Progressive Web App mit einer Offline-First-Architektur: IndexedDB als lokale Wahrheitsquelle, Service Worker für App-Shell-Caching und ein Outbox-Pattern für verzögertes Sync zum Server. Die PWA-Strategie ist der einzig sinnvolle Ansatz — sie vermeidet App-Store-Abhängigkeiten (100€/Jahr Apple Developer Account) und funktioniert sofort auf iPad und iPhone.

Der empfohlene Stack ist React 19 + TypeScript + Vite + Dexie.js für das Frontend, Fastify + SQLite + Drizzle ORM für das Backend. Dexie.js ist zwingend (nicht raw IndexedDB) wegen Safari-spezifischer Transaktionsfehler, die auf dem primären Zielgerät (iPad) zu stummem Datenverlust führen. Das Backend übernimmt zwei kritische Aufgaben: serverseitiges PDF-Parsing von Süd-Nord-Kontor-Rechnungen mit pdfjs-dist (koordinatenbasiert) und Nodemailer-gestützten E-Mail-Versand für Spendenberichte. SQLite in einem Docker-Volume reicht für single-instance Deployment ohne Infrastruktur-Overhead.

Das größte Risiko liegt in den iOS/Safari-Limitierungen: Background Sync API wird nicht unterstützt, Transaktionen schließen bei async/await stillschweigend, und der Speicher zwischen Safari-Browser und installierter Home-Screen-PWA ist komplett getrennt. Diese Pitfalls müssen von Phase 1 an architektonisch adressiert sein — nachträgliche Korrekturen sind teuer oder unmöglich. Der zweite kritische Punkt ist das Datenmodell für Lagerbestände: Bestandsänderungen müssen als Deltas (Events) synchronisiert werden, nie als Absolutwerte. Das verhindert Inkonsistenzen bei Multi-Device-Offline-Betrieb.

## Key Findings

### Recommended Stack

Das Frontend baut auf React 19 + TypeScript + Vite 6 mit vite-plugin-pwa für die PWA-Infrastruktur. Dexie.js 4.x ist der einzige vertretbare IndexedDB-Wrapper für Safari/iOS — raw IndexedDB führt zu nicht debuggbaren Transaktionsfehlern. TanStack Query 5 mit `networkMode: 'offlineFirst'` steuert den Server-State, Tailwind CSS 4 liefert das touch-optimierte UI schnell.

Das Backend läuft auf Fastify 5 (5× schneller als Express, TypeScript-nativ) mit SQLite via better-sqlite3 und Drizzle ORM. Nodemailer für E-Mail, pdfjs-dist 5.x für koordinatenbasiertes PDF-Parsing. Prisma und Express sind explizit nicht empfohlen.

**Core technologies:**
- React 19 + TypeScript 5: UI und Typsicherheit an allen Datengrenzen
- Dexie.js 4.3: IndexedDB-Wrapper mit Safari-Kompatibilität — ohne Alternative
- vite-plugin-pwa 1.2 + Workbox 7.4: PWA-Manifest, Service Worker, Precaching
- Fastify 5.7: Backend-API, TypeScript-nativ, schema-basiert
- SQLite + better-sqlite3 + Drizzle ORM: Serverseitige DB ohne Infrastruktur-Aufwand
- pdfjs-dist 5.x: Koordinatenbasiertes PDF-Parsing (serverseitig)
- Nodemailer 8: E-Mail-Versand via SMTP im Docker-Container

### Expected Features

**Must have (table stakes — v1 Launch):**
- Artikel-Grid mit Touch-optimierten Tap-Targets — Kernworkflow
- Warenkorb mit Live-Gesamtpreis — immer sichtbar
- Bezahlt-Betrag-Eingabe + Wechselgeld-Anzeige — ersetzt Kopfrechnen
- Spenden-Workflow — unterscheidet Wechselgeld von Spende (kirchenspezifisch)
- Offline-Betrieb via IndexedDB + Service Worker — ohne WLAN nutzlos
- Produktverwaltung (CRUD) — Sortiment saisonal pflegbar
- Bestandsabzug bei Verkauf — transaktional atomar
- PWA Home-Screen-Installation

**Should have (v1.x — nach erstem Einsatz):**
- Rechnungsimport (PDF-Parsing) — eliminiert manuellen Artikelpflegeaufwand
- Tagesübersicht / Abschluss — Kassenabschluss nach Gottesdienst
- Spendenberichte (monatlich/jährlich) mit automatischem Mail-Versand
- Mindestbestand-Warnung

**Defer (v2+):**
- Multi-Laden-UI (Datenmodell vorbereiten, UI erst wenn andere Gemeinden Interesse zeigen)
- Herkunftsland / Artikeldetails im Verkaufsflow
- CSV/PDF-Exportfunktionen

**Bewusste Anti-Features:** Kein Bon-Druck (vermeidet TSE-Pflicht), keine EC-Karten-Zahlung, kein Barcode-Scanner, kein DATEV-Export, keine komplexe Rechteverwaltung.

**Regulatorik:** Als offene Ladenkasse (kein elektronischer Bon) entfällt die KassenSichV-TSE-Pflicht. Empfehlung: Finanzamt-Bestätigung einholen (MEDIUM confidence, Graubereich).

### Architecture Approach

Die Architektur folgt dem Offline-First-Prinzip: Das Frontend operiert ausschließlich gegen lokale IndexedDB-Daten (Dexie.js). Alle Mutationen (Verkauf, Bestand) werden atomar in einen Outbox-Store geschrieben. Ein Sync-Engine-Modul erkennt Online-Status und flusht die Outbox per POST an die Backend-Sync-API. Der Service Worker cached die App-Shell vollständig. Auf iOS muss Sync über `online`- und `visibilitychange`-Events ausgelöst werden — Background Sync API ist nicht verfügbar.

**Major components:**
1. React UI Layer (features/pos, features/inventory, features/invoice, features/reports) — operiert nur gegen lokale Daten
2. Dexie.js / IndexedDB (db/schema.ts, db/sync-queue.ts) — lokale Wahrheitsquelle, Outbox-Store
3. Sync Engine (sync/sync-engine.ts) — Online-Erkennung, Outbox-Flush, Retry-Logik
4. Service Worker (Workbox) — App-Shell-Caching, Update-Detection
5. Fastify Backend — Sync-API, PDF-Pipeline, Report/Mail-API
6. SQLite + Drizzle — serverseitige Wahrheitsquelle mit shop_id-Mandantentrennung

**Kritische Pattern:**
- Outbox Pattern: Jede Mutation zuerst in IndexedDB-Queue, dann lokal anwenden
- Delta-Sync für Lagerbestände: Niemals Absolutwerte syncen, immer Events
- Last-Write-Wins via Timestamp: Einfach und ausreichend für single-device-Nutzung
- PDF-Parsing serverseitig: CPU-intensiv, koordinatenbasiert, nicht im Browser

### Critical Pitfalls

1. **Safari IndexedDB-Transaktionen schließen bei async/await stillschweigend** — Dexie.js von Tag 1 verwenden, nie raw IndexedDB. Stummem Datenverlust auf iPad vorbeugen.

2. **Background Sync API auf iOS nicht verfügbar** — Sync über `online`- und `visibilitychange`-Events implementieren, nicht über ServiceWorker SyncManager. Alle iOS-Annahmen aus Chrome-Tests sind ungültig.

3. **Safari Browser und Home-Screen-PWA haben getrennten Speicher** — Onboarding muss zwingend mit "Erst zu Home-Bildschirm hinzufügen" beginnen. Prominente Install-Aufforderung in Safari-Browser-Ansicht.

4. **Lagerbestand als Absolutwert synchronisiert führt zu Phantom-Inventory** — Bestandsänderungen als Delta-Events modellieren (`sold: 1`), Server leitet Absolutwert ab. Betrifft das Datenmodell ab Phase 1.

5. **PDF-Spaltenversatz durch koordinatenblinde Parser** — pdfjs-dist mit X/Y-Koordinaten-Extraktion verwenden. Obligatorischer Review-Schritt vor jedem Import — kein blindes Auto-Import.

6. **Virtuelle Tastatur überdeckt Eingabefelder auf iPad** — `window.visualViewport.addEventListener('resize')` für Keyboard-Detection, `inputmode="decimal"` für Betrag-Inputs. Früh auf physischem iPad testen.

7. **Stale Service Worker blockiert App-Updates** — Workbox-Window-Integrations mit explizitem Update-Banner und `skipWaiting()` auf User-Bestätigung implementieren.

## Implications for Roadmap

### Phase 1: Offline-Kern + Kassen-UI

**Rationale:** Offline-Betrieb ist kein Add-on — er muss als Fundament stehen, bevor irgendein Feature gebaut wird. iOS/Safari-Pitfalls müssen von Anfang an adressiert sein, da nachträgliche Korrekturen (Dexie-Migration, Delta-Datenmodell) teuer sind. Gleichzeitig ist der Kassen-Flow der Kern-Value: Produkte antippen, Warenkorb, Wechselgeld, Spende.

**Delivers:** Vollständig offline-fähige Kassen-App auf iPad installierbar. Mitarbeiterinnen können beim Gottesdienst kassieren.

**Addresses:**
- Artikel-Grid, Warenkorb, Wechselgeld, Spenden-Workflow
- PWA-Installation mit korrektem Onboarding (Home Screen zuerst)
- Dexie-Schema mit shop_id, Outbox-Store (Delta-Events)
- `navigator.storage.persist()` beim ersten Start
- `visibilitychange`/`online`-basierter Sync-Trigger (kein Background Sync)
- Service Worker mit App-Shell-Caching + Update-Detection

**Avoids:** Safari-Transaktionsfehler (Dexie), Storage-Eviction (persist()), Storage-Split (Onboarding), Tastatur-UX (visualViewport)

---

### Phase 2: Backend + Sync

**Rationale:** Ohne Backend gibt es keinen Datenschutz und kein Backup. Sobald der Kassen-Flow lokal funktioniert, muss die Outbox zum Server gespielt werden — damit sind Verkaufsdaten nicht vom iPad-Speicher abhängig.

**Delivers:** Fastify-Backend mit SQLite, Sync-API, Outbox-Flush, Daten persistent serverseitig gespeichert.

**Addresses:**
- Bestandsabzug (atomar, Delta-Events zu Server)
- Produktverwaltung-CRUD (lokal + server-synchronisiert)
- Conflict-Resolution (Last-Write-Wins via Timestamp)
- Docker-Deployment auf server.godsapp.de

**Uses:** Fastify 5, SQLite + Drizzle ORM, Workbox Background Sync (Fallback-Queue für Android/Chrome)

**Avoids:** Delta-Sync statt Absolutwert-Sync (Inventory Conflict Pitfall)

---

### Phase 3: Warenwirtschaft + Berichte

**Rationale:** Nach dem ersten echten Einsatz entstehen konkrete Anforderungen an Tagesabschluss, Berichtswesen und Spendennachweise. Diese Features setzen funktionierenden Sync voraus.

**Delivers:** Tagesübersicht, Spendenberichte (monatlich/jährlich), automatischer Mail-Versand, Mindestbestand-Warnung.

**Addresses:**
- Tagesübersicht / Abschluss nach Gottesdienst
- Spendenbericht-Aggregation
- Nodemailer-Cron-Job für automatischen Versand
- Mindestbestand-Warnung mit konfigurierbarem Schwellwert

**Avoids:** Client-seitiges `mailto:` (unzuverlässig auf iPad) — immer serverseitiger Versand

---

### Phase 4: Rechnungsimport

**Rationale:** Der PDF-Import ist das komplexeste Feature mit dem höchsten Fehlerrisiko (Spaltenversatz, koordinatenbasiertes Parsing). Er ist wertvoll aber nicht blockernd — manuelles Anlegen von Artikeln reicht für den Start. Separater Phase erlaubt isoliertes Testen mit echten Süd-Nord-Kontor-Rechnungen.

**Delivers:** PDF-Upload von Süd-Nord-Kontor-Rechnungen, koordinatenbasiertes Parsing, Review-Tabelle, Freigabe-Workflow, automatischer Bestandszugang.

**Addresses:**
- Rechnungsimport (serverseitig, pdfjs-dist)
- EK/VK-Preisverwaltung aus Rechnung
- Obligatorischer Review/Edit-Schritt vor Import-Commit

**Avoids:** Koordinatenblinder Parser (kein pdf-parse), Client-seitiges Parsing (CPU-Last auf iPad)

---

### Phase Ordering Rationale

- Phase 1 vor allem anderen: Offline-Architektur ist nicht nachrüstbar. iOS-Pitfalls (Dexie, persist(), visualViewport) müssen im Fundament sitzen.
- Phase 2 vor Warenwirtschaft: Sync-Backend ist Voraussetzung für alle Reports und Datenpersistenz außerhalb des iPads.
- Phase 3 vor Phase 4: Berichte setzen Verkaufsdaten voraus; PDF-Import ist Enhancement für Produktverwaltung, keine Voraussetzung.
- Phase 4 isoliert: PDF-Parsing-Komplexität verdient eigene Phase mit echten Rechnungs-PDFs als Testmaterial.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Rechnungsimport):** Süd-Nord-Kontor PDF-Struktur unbekannt — koordinatenbasiertes Parsing muss mit echter Rechnung validiert werden, bevor snk-mapper.ts implementiert wird
- **Phase 1 (iOS Storage-Persist):** iOS 17+ Verhalten von `navigator.storage.persist()` auf Home-Screen-PWAs sollte auf physischem Gerät verifiziert werden

Phases with standard patterns (skip research-phase):
- **Phase 2 (Fastify + SQLite):** Gut dokumentierter Stack, Drizzle-Migrations-Pattern etabliert
- **Phase 3 (Nodemailer + Cron):** Industry-Standard, keine offenen Fragen

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core-Libraries verifiziert (npm versions, offizielle Docs). PDF-Parsing MEDIUM (pdfjs-dist auf Node.js Canvas-Dependency unklar) |
| Features | HIGH | Kern-POS-Features klar. Regulatorik (KassenSichV-Ausnahme) MEDIUM — keine offizielle Bestätigung für diesen Spezialfall |
| Architecture | HIGH | Outbox-Pattern, LWW-Konfliktauflösung, Delta-Sync gut dokumentiert. Datenflüsse vollständig modelliert |
| Pitfalls | HIGH | iOS/Safari-Limitierungen durch mehrere unabhängige Quellen bestätigt (WebKit Bugtracker, MDN, Dexie-Docs) |

**Overall confidence:** HIGH

### Gaps to Address

- **KassenSichV-Lage:** Finanzamt-Anfrage empfohlen — als offene Ladenkasse eingestuft (kein Bon), aber nicht offiziell bestätigt. Risiko: niedrig, da bewusst kein Bon-Druck implementiert wird.
- **Süd-Nord-Kontor PDF-Format:** snk-mapper.ts muss gegen echte Rechnungs-PDFs entwickelt werden. Spaltenlayout, Zeilenumbrüche bei langen Artikelbezeichnungen, Multi-Page-Rechnungen sind unbekannte Variablen.
- **pdfjs-dist Canvas-Dependency auf Node.js:** Bei koordinatenbasiertem Parsing auf dem Server muss geprüft werden, ob canvas-Package als native Dependency nötig ist (erhöht Docker-Image-Größe erheblich).
- **`navigator.storage.persist()` auf iOS 17+:** Verhalten auf Home-Screen-PWA auf physischem Gerät validieren — Dokumentation ist widersprüchlich.

## Sources

### Primary (HIGH confidence)
- [MDN: Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — Service Worker, Background Sync
- [TanStack Query v5 Network Mode Docs](https://tanstack.com/query/v5/docs/react/guides/network-mode) — Offline-first Queries
- [Dexie.js: IndexedDB on Safari](https://dexie.org/docs/IndexedDB-on-Safari) — Safari-Transaktionsfehler
- [WebKit Blog: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/) — Storage-Eviction iOS
- [Fastify npm](https://www.npmjs.com/package/fastify) — Version 5.7.4 verifiziert
- [Nodemailer npm](https://www.npmjs.com/package/nodemailer) — Version 8.0.3 verifiziert
- [Offline sync & conflict resolution patterns (Feb 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/) — Sync-Architektur

### Secondary (MEDIUM confidence)
- [Build Offline-First PWA with React, Dexie.js & Workbox](https://www.wellally.tech/blog/build-offline-pwa-react-dexie-workbox) — Stack-Pattern bestätigt
- [unpdf vs pdf-parse vs pdfjs-dist 2026](https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026) — PDF-Library-Vergleich
- [7 PDF Parsing Libraries für Node.js](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) — Ecosystem-Überblick
- [Express vs Fastify 2025](https://medium.com/codetodeploy/express-or-fastify-in-2025-whats-the-right-node-js-framework-for-you-6ea247141a86) — Performance-Vergleich
- [PWA iOS Limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS-Pitfalls
- [VIBSS: Einsatz von Registrierkassen im Verein](https://www.vibss.de/vereinsmanagement/steuern/besondere-steuerthemen-1/einsatz-von-registrierkassen) — KassenSichV-Einschätzung

### Tertiary (LOW confidence)
- [Weltladen-Wiki Kassensysteme](https://www.weltladen.de/fuer-weltlaeden/wiki/375) — historische Competitive-Info, nicht mehr erreichbar

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
