# Project Research Summary

**Project:** Fairstand — Offline-First PWA Kassensystem (v1–v8 Roadmap)
**Domain:** POS (Point-of-Sale) — Progressive Web App, Offline-First, Fairtrade-Kirchenstand
**Researched:** 2026-03-23 (v1 core), 2026-04-01 (v8 expansion)
**Confidence:** HIGH (core architecture), MEDIUM (regulatory details, PDF parsing)

---

## Executive Summary

Fairstand ist ein spezialisiertes Kassensystem für einen ehrenamtlich betriebenen Fairtrade-Stand in einer Kirchengemeinde. Der entscheidende Constraint ist **vollständige Offline-Funktionalität**: Die Kirche hat kein WLAN, alle Verkaufsvorgänge müssen ohne Netzverbindung ablaufen. Experten bauen solche Systeme als Progressive Web App mit einer **Offline-First-Architektur**: IndexedDB (via Dexie.js) als lokale Wahrheitsquelle, Service Worker für App-Shell-Caching, und ein Outbox-Pattern für verzögertes Sync zum Server. Die PWA-Strategie ist der einzig sinnvolle Ansatz — sie vermeidet App-Store-Abhängigkeiten (100€/Jahr Apple Developer Account) und funktioniert sofort auf iPad und iPhone.

Der empfohlene Stack ist **React 19 + TypeScript + Vite + Dexie.js** für das Frontend, **Fastify + SQLite (v1-4) oder PostgreSQL (v5+) + Drizzle ORM** für das Backend. **Dexie.js ist zwingend** (nicht raw IndexedDB) wegen Safari-spezifischer Transaktionsfehler, die auf dem primären Zielgerät (iPad) zu stummem Datenverlust führen. Das Backend übernimmt zwei kritische Aufgaben: serverseitiges PDF-Parsing von Süd-Nord-Kontor-Rechnungen mit pdfjs-dist (koordinatenbasiert) und Nodemailer-gestützten E-Mail-Versand für Spendenberichte.

Das größte Risiko liegt in den **iOS/Safari-Limitierungen**: Background Sync API wird nicht unterstützt, IndexedDB-Transaktionen schließen bei `async/await` stillschweigend, und der Speicher zwischen Safari-Browser und installierter Home-Screen-PWA ist komplett getrennt. Diese Pitfalls müssen von **Phase 1 an architektonisch adressiert** sein — nachträgliche Korrektionen sind teuer oder unmöglich. Der zweite kritische Punkt ist das Datenmodell für Lagerbestände: Bestandsänderungen müssen als **Deltas (Events)** synchronisiert werden, nie als Absolutwerte. Das verhindert Inkonsistenzen bei Multi-Device-Offline-Betrieb.

---

## Key Findings

### Recommended Stack

**Frontend (v1–v7):** React 19 + TypeScript 5 + Vite 6 + vite-plugin-pwa 1.2 für PWA-Infrastruktur. **Dexie.js 4.x ist nicht optional** — es ist der einzige vertretbare IndexedDB-Wrapper für Safari/iOS. TanStack Query 5 mit `networkMode: 'offlineFirst'` steuert den Server-State, **Workbox 7.4** (automatisch via vite-plugin-pwa) für Service-Worker-Caching. Tailwind CSS 4 liefert das touch-optimierte UI schnell.

**Backend (v1–v4, Offline-First):** Fastify 5 + **SQLite via better-sqlite3 + Drizzle ORM**. Nodemailer für E-Mail, pdfjs-dist 5.x für koordinatenbasiertes PDF-Parsing (serverseitig, nicht im Browser).

**Backend (v5+, Online-Only):** Fastify 5 + **PostgreSQL 16 + Drizzle ORM** (Migration bei v5.0, Skalierbarkeit für Reporting + WebSocket).

**v8.0 Reporting-Erweiterungen:** `@react-pdf/renderer 4.3.2` (1.43M weekly downloads, Memory-optimiert), `fast-csv 5.x` (3.4M downloads, Stream-basiert für große Exports), `papaparse 5.4.1` (optional, Browser CSV-Import).

**Core technologies (Kern, unveränderlich):**
- React 19 + TypeScript 5: UI und Typsicherheit an allen Datengrenzen
- Dexie.js 4.3: IndexedDB-Wrapper mit Safari-Kompatibilität — **ohne Alternative akzeptabel**
- vite-plugin-pwa 1.2 + Workbox 7.4: PWA-Manifest, Service Worker, Precaching
- Fastify 5.7: Backend-API, TypeScript-nativ, schema-basiert
- Drizzle ORM: Typsicheres SQL, Migrations via drizzle-kit
- Nodemailer 8: E-Mail-Versand via SMTP im Docker-Container

**Nicht empfohlen (explizite Ablehnung):**
- Express.js: 5× langsamer als Fastify, mangelnder TypeScript-Support
- Prisma ORM: Zu schwer, generiert Binaries, erhöht Docker-Image-Größe
- localStorage statt IndexedDB: 5 MB Limit, synchron blockend, keine Transaktionen
- Raw IndexedDB ohne Dexie: Führt zu nicht debuggbaren Safari-Transaktionsfehlern

### Expected Features

**Must have (Tabelle Stakes, v1 Launch):**
- Artikel-Grid mit Touch-optimierten Tap-Targets (≥48×48px) — Kernworkflow, ohne Produktauswahl keine Kasse
- Warenkorb mit Live-Gesamtpreis — immer sichtbar, laufende Summe
- Bezahlt-Betrag-Eingabe + Wechselgeld-Anzeige — ersetzt Kopfrechnen für Ehrenamtliche
- Spenden-Workflow — unterscheidet Wechselgeld von Spende (kirchenspezifisch, Differentiator)
- Offline-Betrieb via IndexedDB + Service Worker — ohne WLAN ist die App nutzlos
- Produktverwaltung (CRUD) — Sortiment saisonal pflegbar
- Bestandsabzug bei Verkauf — transaktional atomar
- PWA Home-Screen-Installation mit korrektem Onboarding

**Should have (v1.x, nach erstem echtem Einsatz):**
- Rechnungsimport (PDF-Parsing) — eliminiert manuellen Artikelpflegeaufwand für 30–50 Artikel
- Tagesübersicht / Abschluss — Kassenabschluss nach Gottesdienst
- Spendenberichte (monatlich/jährlich) mit automatischem Mail-Versand
- Mindestbestand-Warnung mit konfigurierbarem Schwellwert

**Future (v2+, andere Gemeinden, erweiterte Features):**
- Multi-Laden-UI (Datenmodell vorbereitet, UI erst wenn andere Gemeinden Interesse zeigen)
- Herkunftsland / Artikeldetails im Verkaufsflow
- CSV/PDF-Exportfunktionen (als **v8.0-Erweiterung** für bestehende Online-Instanzen)

**Bewusste Anti-Features (absichtlich nicht bauen):**
- **Kein Bon-Druck**: Vermeidet TSE-Pflicht (KassenSichV), Druckeranbindung kompliziert Offline-Setup
- **Keine EC-Kartenzahlung**: Zahlungsterminal-Integration erfordert Hardware/WLAN/Kosten, Laufkundschaft zahlt bar
- **Kein Barcode-Scanner**: Grid-Antippen ist für 30–50 Artikel schneller, Bluetooth-Scanner kompliziert Setup
- **Keine Kundenverwaltung**: Laufkundschaft vor der Kirche, keine Stammkunden-Beziehung
- **Kein DATEV-Export**: Für kleine Kirchengemeinde unverhältnismäßig komplex
- **Keine komplexe Rechteverwaltung**: Kleine Gruppe, einfacher Passwortschutz pro Laden reicht

**Regulatorik — KassenSichV / TSE:**
Ein Kirchenstand als **offene Ladenkasse** (kein elektronischer Bon) ist **ausgenommen** von der KassenSichV-TSE-Pflicht. Diese Bewertung basiert auf VIBSS und Gesetze-im-Internet-Quellen, hat aber nur **MEDIUM Confidence** — Empfehlung: Finanzamt-Bestätigung einholen.

### Architecture Approach

**v1–v4 (Offline-First PWA):**
Die Architektur folgt dem Offline-First-Prinzip: Das Frontend operiert **ausschließlich gegen lokale IndexedDB-Daten** (Dexie.js). Alle Mutationen (Verkauf, Bestand, Produkt-CRUD) werden atomar in einen **Outbox-Store** geschrieben. Ein Sync-Engine-Modul erkennt Online-Status und flusht die Outbox per POST an die Backend-Sync-API. Der Service Worker cached die App-Shell vollständig. **Auf iOS muss Sync über `online`- und `visibilitychange`-Events ausgelöst werden** — Background Sync API ist nicht verfügbar.

**Major Components (v1–v4):**
1. **React UI Layer** (features/pos, features/inventory, features/invoice, features/reports) — operiert nur gegen lokale Daten
2. **Dexie.js / IndexedDB** (db/schema.ts, db/sync-queue.ts) — lokale Wahrheitsquelle, Outbox-Store mit shop_id-Isolation
3. **Sync Engine** (sync/sync-engine.ts) — Online-Erkennung, Outbox-Flush, Retry-Logik, Delta-Event-Batching
4. **Service Worker** (Workbox) — App-Shell-Caching, Update-Detection mit explizitem `skipWaiting()` auf Nutzer-Bestätigung
5. **Fastify Backend** — Sync-API (POST `/api/sync`), PDF-Pipeline (POST `/api/import/pdf`), Report-APIs, Nodemailer-Cron
6. **SQLite + Drizzle** — serverseitige Wahrheitsquelle mit shop_id-Mandantentrennung, Row-Level-Security

**v5+ (Online-Only mit WebSocket):**
Beim Übergang zu v5.0 (Online-Only) migriert das System von SQLite zu PostgreSQL, führt WebSocket-Live-Updates (`/api/ws`) ein, und entfernt Offline-Logik (Dexie, Sync-Engine, Service-Worker). Alle Daten kommen vom Server via TanStack Query, kein lokaler IndexedDB-Cache.

**v8.0 (Reporting-Erweiterung):**
Fügt `product_price_history` + `stock_transactions` Tabellen hinzu (Drizzle-Migration), neue Report-APIs (`/api/reports/inventory?month=...`), CSV-Streaming via `fast-csv`, PDF-Report-Komponenten via `@react-pdf/renderer`. Keine Architektur-Änderung, nur Datenbank-Schema + API-Erweiterung.

**Kritische Pattern (alle Versionen):**
- **Outbox Pattern**: Jede Mutation zuerst in Queue schreiben, dann lokal anwenden (v1–v4 offline, v5+ für Offline-Tolerance)
- **Delta-Sync für Lagerbestände**: Niemals Absolutwerte (`stock: 5`) syncen, immer Events (`sold: 1, timestamp: ...`). Verhindert Last-Write-Wins-Konflikt.
- **Shop-Isolation**: `shop_id` in allen Tabellen, Session-Auth erzwingt `WHERE shop_id = :shopId`
- **JSONB Sale Items**: Sale-Items speichern Produktsnapshot (EK, VK, Name) zum Sync-Zeitpunkt — historisch korrekt

### Critical Pitfalls

1. **Safari IndexedDB-Transaktionen schließen bei `async/await` stillschweigend** — Dexie.js von Tag 1 verwenden (nie raw IndexedDB). Stummem Datenverlust auf iPad vorbeugen. **Prevention:** Dexie.js-Only, automatisierte Tests auf physischem iPad.

2. **Background Sync API auf iOS nicht verfügbar** — Sync über `online`- und `visibilitychange`-Events implementieren, nicht über ServiceWorker SyncManager. Alle iOS-Annahmen aus Chrome-Tests sind ungültig. **Prevention:** `visibilitychange` Event-Listener von Phase 1 an, Flugzeug-Modus-Tests auf iPad.

3. **Safari Browser und Home-Screen-PWA haben **getrennten** Storage** — Onboarding muss zwingend mit "Erst zu Home-Bildschirm hinzufügen" beginnen. Prominente Install-Aufforderung in Safari-Browser-Ansicht. **Prevention:** Installationsbanner sperrt Daten-Entry bis Home-Screen, klare Anleitung.

4. **Lagerbestand als Absolutwert synchronisiert → Phantom-Inventory** — Wenn zwei Geräte offline sind und beide den letzten Artikel verkaufen, "Last-Write-Wins" ergibt falschen Bestand. **Prevention:** Bestandsänderungen als Delta-Events modellieren (`sold: 1, timestamp`, Server leitet Absolutwert ab). Betrifft Datenmodell ab Phase 1.

5. **PDF-Spaltenversatz durch koordinatenblinde Parser** — pdfjs-dist mit X/Y-Koordinaten-Extraktion verwenden (nicht pdf-parse). **Obligatorischer Review-Schritt** vor jedem Import — kein blindes Auto-Import. **Prevention:** Immer Parsed-Result in Tabelle zeigen, Nutzer kann korrigieren vor Freigabe.

6. **Virtuelle Tastatur überdeckt Eingabefelder auf iPad** — `window.visualViewport.addEventListener('resize')` für Keyboard-Detection, `inputmode="decimal"` für Betrag-Inputs. **Prevention:** Sticky Bottom-Section für Input + Wechselgeld-Anzeige, früh auf physischem iPad testen (nicht nur Simulator).

7. **Stale Service Worker blockiert App-Updates** — Workbox-Window-Integration mit explizitem Update-Banner und `skipWaiting()` auf User-Bestätigung. **Prevention:** Update-Prompt zeigt neue Version, User klickt "Neu laden", old SW wird abgelöst.

---

## Implications for Roadmap

### Suggested Phase Structure (v1 → v8 Progression)

#### **Phase 1: Offline-Kern + Kassen-UI**

**Rationale:** Offline-Betrieb ist kein Add-on — er muss als Fundament stehen, bevor Features gebaut werden. iOS/Safari-Pitfalls müssen von Anfang an adressiert sein, da nachträgliche Korrektionen (Dexie-Migration, Delta-Datenmodell) teuer sind. Gleichzeitig ist der Kassen-Flow der Kern-Value: Produkte antippen, Warenkorb, Wechselgeld, Spende.

**Delivers:**
- Vollständig offline-fähige Kassen-App auf iPad installierbar
- Mitarbeiterinnen können beim Gottesdienst kassieren ohne Netzwerk
- React-UI mit Touch-optimiertem Artikel-Grid + Warenkorb
- Spenden-Workflow (Wechselgeld vs. Spende unterschieden)

**Addresses:**
- Artikel-Grid, Warenkorb, Wechselgeld, Spenden-Workflow (v1 Must-Haves)
- PWA-Installation mit korrektem Onboarding (Home Screen zuerst)
- Dexie.js-Schema mit shop_id, Delta-Event-Outbox-Store
- `navigator.storage.persist()` beim ersten Start
- `visibilitychange`/`online`-basierter Sync-Trigger (kein Background Sync)
- Service Worker mit App-Shell-Caching + Update-Detection

**Avoids:**
- Safari-Transaktionsfehler (Dexie von Tag 1)
- Storage-Eviction bei Low-Battery (persist() erzwungen)
- Storage-Split (Onboarding-Warnung)
- Tastatur-UX-Fehler (visualViewport)

**Research Flags:** Keiner — Offline-Architektur ist gut dokumentiert, Dexie/Workbox sind etabliert.

---

#### **Phase 2: Backend + Sync**

**Rationale:** Ohne Backend gibt es keinen Datenschutz und kein Backup. Sobald der Kassen-Flow lokal funktioniert, muss die Outbox zum Server gespielt werden — damit sind Verkaufsdaten nicht vom iPad-Speicher abhängig.

**Delivers:**
- Fastify-Backend mit SQLite + Drizzle ORM
- Sync-API für Outbox-Flush (POST `/api/sync`)
- Daten persistent serverseitig gespeichert
- Bestandsabzug funktioniert transaktional (Delta-Events)

**Addresses:**
- Bestandsabzug (atomar, Delta-Events zu Server)
- Produktverwaltung-CRUD (lokal in Dexie + server-synchronisiert)
- Conflict-Resolution (Last-Write-Wins via Timestamp für einfache Konflikt-Szenarien)
- Docker-Deployment auf server.godsapp.de via Traefik

**Uses:** Fastify 5, SQLite + better-sqlite3, Drizzle ORM, Workbox Background Sync (Fallback-Queue für Android/Chrome, wird auf iOS ignoriert)

**Avoids:** Absolutwert-Sync statt Delta-Sync (Inventory Conflict Pitfall)

**Research Flags:** Keiner — SQLite + Drizzle + Fastify sind bewährte Patterns.

---

#### **Phase 3: Warenwirtschaft + Berichte + Mail**

**Rationale:** Nach dem ersten echten Einsatz entstehen konkrete Anforderungen an Tagesabschluss, Berichtswesen und Spendennachweise. Diese Features setzen funktionierenden Sync (Phase 2) voraus.

**Delivers:**
- Tagesübersicht / Abschluss (aggregierte Verkaufs-/Spenden-Daten)
- Spendenberichte (monatlich/jährlich)
- Automatischer Mail-Versand via Nodemailer + Cron-Job
- Mindestbestand-Warnung (konfigurierbar pro Artikel)

**Addresses:**
- Tagesübersicht / Abschluss nach Gottesdienst
- Spendenbericht-Aggregation (SQL GROUP BY monat, jahr)
- Nodemailer-Cron-Job für automatischen Versand
- UI für Mindestbestand-Konfiguration

**Avoids:** Client-seitiges `mailto:` (unzuverlässig auf iPad) — immer serverseitiger Versand

**Research Flags:** Keiner — Nodemailer + Cron sind Industry-Standard.

---

#### **Phase 4: Rechnungsimport (PDF-Parsing)**

**Rationale:** Der PDF-Import ist das komplexeste Feature mit höchstem Fehlerrisiko (Spaltenversatz, koordinatenbasiertes Parsing). Er ist wertvoll aber nicht blockernd — manuelles Anlegen von Artikeln reicht für den Start. Separater Phase erlaubt isoliertes Testen mit echten Süd-Nord-Kontor-Rechnungen.

**Delivers:**
- PDF-Upload von Süd-Nord-Kontor-Rechnungen
- Koordinatenbasiertes Parsing (pdfjs-dist)
- Review-Tabelle (Nutzer kann fehlerhafte Werte korrigieren)
- Freigabe-Workflow mit Bestandszugang

**Addresses:**
- Rechnungsimport (serverseitig, POST `/api/import/pdf`)
- EK/VK-Preisverwaltung aus Rechnung
- Obligatorischer Review/Edit-Schritt vor Import-Commit

**Avoids:**
- Koordinatenblinder Parser (kein pdf-parse)
- Client-seitiges Parsing (CPU-Last auf iPad)
- Blindes Auto-Import ohne Review

**Research Flags:** 
- **Süd-Nord-Kontor PDF-Format**: snk-mapper.ts muss gegen echte Rechnungs-PDFs entwickelt werden. Spaltenlayout, Zeilenumbrüche bei langen Artikelbezeichnungen, Multi-Page-Rechnungen sind unbekannte Variablen.
- **pdfjs-dist Canvas-Dependency auf Node.js**: Bei koordinatenbasiertem Parsing auf dem Server muss geprüft werden, ob `canvas`-Package als native Dependency nötig ist (erhöht Docker-Image-Größe).

---

#### **Phase 5: Multi-Laden (Optional, nur wenn Bedarf)**

**Rationale:** Datenmodell ist ab Phase 1 mit `shop_id` vorbereitet. Wenn andere Gemeinden Interesse zeigen, kann UI-Layer folgen ohne Datenschicht-Änderung.

**Delivers:**
- Shop-Verwaltung UI (nur für Master-Admin)
- Shop-Isolation auf allen Ebenen validiert
- Multi-Laden-Datenfluss getestet

**Avoids:** Overengineering wenn kein Bedarf vorhanden ist.

**Research Flags:** Gering, Daten-Isolation ist seit Phase 1 vorhanden.

---

#### **Phase 5.5 (Optional): Migration zu PostgreSQL (Online-Only)**

**Rationale:** Wenn Offline-Betrieb nicht mehr notwendig ist oder Skalierbarkeit für Reporting gefordert wird, kann System zu PostgreSQL migrieren und Offline-Logik (Dexie, Sync-Engine, Service-Worker) entfernen. Dies ist eine **separate Architektur-Entscheidung**, nicht Teil des ursprünglichen v1-Plans.

**Delivers:**
- PostgreSQL Backend mit besserer Reporting-Performance
- WebSocket-Live-Updates (`/api/ws`)
- Vereinfachte Frontend (TanStack Query ohne Offline-Logik)

**Research Flags:** Ja, Migrationsplan muss separate Research durchlaufen (DB-Schema-Mapping, Data-Migration-Skripte).

---

#### **Phase 6+ (v8.0-Erweiterung): Inventur, Preis-History, CSV/PDF-Exporte**

Diese Phase ist **optional und unabhängig vom v1–v4-Pfad**. Sie wird implementiert, wenn:
1. System stabil läuft (Phase 1–4 abgeschlossen)
2. Kirchenkreis konkrete Anforderungen für Inventur-Reports formuliert
3. Ressourcen verfügbar sind für Daten-Model-Erweiterung

**Delivers:**
- `product_price_history` + `stock_transactions` Tabellen
- Inventur-Übersicht (`GET /api/reports/inventory`)
- CSV-Export via `fast-csv` (Streaming, Memory-effizient)
- PDF-Reports via `@react-pdf/renderer`

**Suggested sub-phases:**
- **Phase 6a:** Database Schema + API Backend (Drizzle-Migration, `/api/reports/inventory`)
- **Phase 6b:** CSV/PDF Export Libraries + Frontend (streamen, download)
- **Phase 6c:** Price-History UI + Stock-Movement Logs (optional)

**Research Flags:** Gering, Libraries sind bewährt.

---

### Phase Ordering Rationale

1. **Phase 1 vor allem anderen**: Offline-Architektur ist nicht nachrüstbar. iOS-Pitfalls (Dexie, persist(), visualViewport) müssen im Fundament sitzen.
2. **Phase 2 vor Warenwirtschaft**: Sync-Backend ist Voraussetzung für alle Reports und Datenpersistenz außerhalb des iPads.
3. **Phase 3 vor Phase 4**: Berichte setzen Verkaufsdaten voraus; PDF-Import ist Enhancement für Produktverwaltung, keine Voraussetzung.
4. **Phase 4 isoliert**: PDF-Parsing-Komplexität verdient eigene Phase mit echten Rechnungs-PDFs als Testmaterial.
5. **Phase 5+ deferable**: Multi-Laden und v8.0-Reporting sind Optionen, nicht Blockers.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | **HIGH** | Core-Libraries verifiziert vs. npm, offizielle Docs. React 19, Fastify 5, Dexie 4.3, vite-plugin-pwa 1.2 — alle aktuell und produktiv. Drizzle ORM bewährt (v5.0+). PDF-Libraries: pdfjs-dist auf Node.js — Canvas-Dependency unklar (MEDIUM). |
| **Features** | **HIGH** | Kern-POS-Features klar (Artikel, Warenkorb, Wechselgeld). Regulatorik (KassenSichV-Ausnahme): MEDIUM — keine offizielle Bestätigung für diesen Spezialfall, aber plausibel. Multi-Laden: LOW (Bedarf unklar). |
| **Architecture** | **HIGH** | Outbox-Pattern, LWW-Konfliktauflösung, Delta-Sync gut dokumentiert. Datenflüsse vollständig modelliert. Offline-First + Online-Only Pfade klar separiert. v8.0 Reporting-Schema-Erweiterung ist Standard-Pattern. |
| **Pitfalls** | **HIGH** | iOS/Safari-Limitierungen durch mehrere unabhängige Quellen bestätigt (WebKit Bugtracker, MDN, Dexie-Docs, PWA-Blog-Posts 2026). Virtual Keyboard Pitfall durch Apple Developer Docs validiert. |

**Overall confidence: HIGH**

### Gaps to Address

- **Südkontor PDF-Format**: snk-mapper.ts muss gegen echte Rechnungs-PDFs entwickelt werden. Spaltenlayout, Zeilenumbrüche bei langen Artikelbezeichnungen unbekannt → **Phase 4 Research nötig**.

- **`navigator.storage.persist()` auf iOS 17+**: Verhalten auf Home-Screen-PWA auf physischem Gerät validieren — Dokumentation widersprüchlich. → **Phase 1 Physical Test nötig**.

- **pdfjs-dist Canvas-Dependency**: Bei koordinatenbasiertem Parsing auf Node.js muss geprüft werden, ob `canvas`-Native-Module nötig sind → **Phase 4 Build-Test nötig**.

- **KassenSichV-Lage**: Finanzamt-Anfrage empfohlen — als offene Ladenkasse eingestuft (kein Bon), aber nicht offiziell bestätigt. Risiko: niedrig, da bewusst kein Bon-Druck implementiert wird → **Before Launch Regulatory-Check**.

- **v5+ PostgreSQL-Migration**: Wenn Online-Only später entschieden wird, separate Migrations-Research erforderlich (DB-Schema-Mapping, Data-Migration-Skripte).

---

## Sources

### Primary (HIGH confidence)
- [MDN: Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation) — Service Worker, Background Sync, Storage Persistence
- [TanStack Query v5 Network Mode Docs](https://tanstack.com/query/v5/docs/react/guides/network-mode) — Offline-first Queries, networkMode setting
- [Dexie.js: IndexedDB on Safari](https://dexie.org/docs/IndexedDB-on-Safari) — Safari-Transaktionsfehler, automatisches Auto-Close
- [WebKit Blog: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/) — Storage-Eviction iOS, persistent storage
- [Fastify npm](https://www.npmjs.com/package/fastify) — Version 5.7.4+ verifiziert
- [Drizzle ORM Docs](https://orm.drizzle.team/) — Migrations, SQL-first approach
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) — Version 1.2.0+, Workbox integration
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) — v4.3.2+, 1.43M weekly downloads
- [fast-csv npm](https://www.npmjs.com/package/fast-csv) — v5.0+, 3.4M weekly downloads, streaming
- [Nodemailer npm](https://www.npmjs.com/package/nodemailer) — Version 8.0+, 13M+ weekly downloads
- [pdfjs-dist npm](https://www.npmjs.com/package/pdfjs-dist) — Version 5.5+, Mozilla PDF.js

### Secondary (MEDIUM confidence)
- [Build Offline-First PWA with React, Dexie.js & Workbox](https://www.wellally.tech/blog/build-offline-pwa-react-dexie-workbox) — Stack-Pattern bestätigt
- [PWA iOS Limitations and Safari Support 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — Comprehensive iOS pitfalls
- [Offline sync & conflict resolution patterns (Feb 2026)](https://www.sachith.co.uk/offline-sync-conflict-resolution-patterns-architecture-trade%E2%80%91offs-practical-guide-feb-19-2026/) — Sync Architecture, event sourcing
- [Express vs Fastify 2025 — Medium](https://medium.com/codetodeploy/express-or-fastify-in-2025-whats-the-right-node-js-framework-for-you-6ea247141a86) — Performance-Vergleich
- [unpdf vs pdf-parse vs pdfjs-dist 2026](https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026) — PDF-Library-Vergleich

### Tertiary (LOW/MEDIUM confidence)
- [VIBSS — Einsatz von Registrierkassen im Verein](https://www.vibss.de/vereinsmanagement/steuern/besondere-steuerthemen-1/einsatz-von-registrierkassen) — KassenSichV-Einschätzung (nicht official)
- [Gesetze im Internet: KassenSichV](https://www.gesetze-im-internet.de/kassensichv/BJNR351500017.html) — Gesetzestext, Auslegung nötig

---

**Research completed: 2026-04-01**
**Synthesized from:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Ready for roadmap: yes**
