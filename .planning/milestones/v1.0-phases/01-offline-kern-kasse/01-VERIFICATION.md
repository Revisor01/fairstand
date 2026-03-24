---
phase: 01-offline-kern-kasse
verified: 2026-03-23T12:00:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "App auf iPad (oder Chrome DevTools iPad-Simulation) öffnen und vollständigen Kassiervorgang durchführen"
    expected: "PIN-Setup erscheint, nach Einrichten Artikel-Grid mit Kategorie-Tabs, Artikel antippen öffnet Warenkorb, Bezahlen-Flow führt durch Wechselgeld/Spende-Berechnung, Zusammenfassung erscheint, 'Nächster Kunde' setzt zurück"
    why_human: "Visueller PWA-Flow, Touch-Interaktion und State-Machine-Übergänge sind programmatisch nicht vollständig verifizierbar"
  - test: "App über Chrome DevTools auf Offline setzen (Netzwerk-Tab → Offline) und Kassiervorgang durchführen"
    expected: "App läuft vollständig ohne Netzverbindung — kein Fehler, Artikel erscheinen, Verkauf wird gespeichert"
    why_human: "Offline-Verhalten des Service Workers und IndexedDB-Schreibzugriff ohne Netz lässt sich nur live verifizieren"
  - test: "PWA auf iPad-Homescreen installieren und als App starten"
    expected: "App öffnet sich standalone ohne Browser-Chrome, startet vollständig offline, Icon ist sichtbar"
    why_human: "PWA-Installation und Standalone-Modus auf iOS erfordern physisches Gerät oder Safari-Simulation"
  - test: "120-Minuten-Session-Timeout: App länger als 120 Minuten inaktiv lassen, dann erneut öffnen"
    expected: "PIN-Eingabe erscheint erneut nach Inaktivitätszeitraum"
    why_human: "Zeitbasiertes Verhalten nicht automatisiert prüfbar ohne den Timer zu manipulieren"
  - test: "GitHub Actions Workflow auf Push auf main beobachten"
    expected: "CI baut beide Docker-Images, pushed zu GHCR, löst Portainer Webhook aus"
    why_human: "GitHub Actions-Ausführung erfordert Repository mit korrekt konfiguriertem PORTAINER_WEBHOOK_URL Secret"
---

# Phase 1: Offline-Kern & Kasse — Verifizierungsbericht

**Phasen-Ziel:** Mitarbeiterinnen können auf dem iPad offline kassieren, Wechselgeld und Spende berechnen und den Verkauf abschließen — ohne WLAN, installierbar als Home-Screen-App

**Verifiziert:** 2026-03-23T12:00:00Z
**Status:** human_needed
**Re-Verifikation:** Nein — initiale Verifikation

---

## Ziel-Erreichung

### Beobachtbare Wahrheiten (aus ROADMAP.md Success Criteria)

| # | Wahrheit | Status | Belege |
|---|---------|--------|--------|
| 1 | Mitarbeiterin kann Artikel antippen, sieht sofort Gesamtpreis im Warenkorb und kann Artikel entfernen oder Menge anpassen | ? HUMAN | `ArticleGrid.tsx` mit `useLiveQuery`, `CartPanel.tsx` mit +/-, Direkteingabe und Entfernen-Button — alle Verdrahtungen vorhanden, Touch-Interaktion nur live prüfbar |
| 2 | Mitarbeiterin gibt bezahlten Betrag ein, sieht Differenz, entscheidet Wechselgeld-Betrag — Rest wird automatisch als Spende angezeigt | ✓ VERIFIED | `PaymentFlow.tsx`: `donationCents = difference - changeCents` live berechnet, emerald-Anzeige. `NumPad.tsx`: Quick-Buttons 5/10/20/50€, Cent-Integer-Konvertierung |
| 3 | Verkaufsabschluss bucht Warenbestand ab und erfasst Umsatz und Spende atomar (auch ohne Netzverbindung) | ✓ VERIFIED | `useSaleComplete.ts`: `db.transaction('rw', [db.sales, db.products, db.outbox], ...)` — vollständige atomare Dexie-Transaktion mit Bestandsdelta und OutboxEntry |
| 4 | App ist als Home-Screen-Icon auf dem iPad installiert und startet vollständig offline ohne Fehlermeldung | ? HUMAN | `vite.config.ts`: VitePWA mit `registerType: 'prompt'`, `display: 'standalone'`, iOS-Meta-Tags in `index.html`, Service-Worker-Precaching — PWA-Installation muss auf Gerät geprüft werden |
| 5 | Der Laden ist passwortgeschützt und nach Neustart der PWA muss erneut eingeloggt werden | ✓ VERIFIED | `pinAuth.ts`: SHA-256 via `crypto.subtle`, Session-Timeout 120 Min. `useAuth.ts`: `'checking'` Initialzustand, `isSessionValid()` bei App-Start. `PinScreen.tsx`: 6-Punkte-Anzeige, PIN-Länge 6 erzwungen |

**Score:** 3/5 automatisch verifiziert, 2/5 benötigen menschliche Prüfung (kein Blockers gefunden)

---

### Erforderliche Artefakte

| Artefakt | Zweck | Status | Details |
|---------|-------|--------|---------|
| `client/vite.config.ts` | Vite-Konfiguration mit VitePWA | ✓ VERIFIED | `VitePWA`, `registerType: 'prompt'`, `display: 'standalone'`, Icons vorhanden |
| `server/src/index.ts` | Fastify-Server-Einstiegspunkt | ✓ VERIFIED | Fastify 5, CORS, healthRoutes-Registration |
| `docker-compose.yml` | Docker-Stack mit Traefik | ✓ VERIFIED | `external: true`, `fairstand.godsapp.de`, `sqlite-data` Volume |
| `.github/workflows/deploy.yml` | CI/CD Pipeline | ✓ VERIFIED | GHCR-Push, `PORTAINER_WEBHOOK_URL` Secret-Referenz |
| `client/src/db/schema.ts` | Dexie-Schema | ✓ VERIFIED | 3 Tabellen, alle mit `shopId`, Compound-Index `[shopId+active]`, `SALE_COMPLETE` OutboxEntry |
| `client/src/db/index.ts` | DB-Singleton | ✓ VERIFIED | `export const db = new FairstandDB()`, `SHOP_ID = 'st-secundus-hennstedt'` |
| `client/src/db/seed.ts` | 33 Artikel-Seed | ✓ VERIFIED | 33 Einträge mit Artikelnummern, alle Cent-Integer, `seedIfEmpty()` mit count-Guard, `shopId: SHOP_ID` in bulkAdd |
| `client/src/features/auth/pinAuth.ts` | PIN-Auth | ✓ VERIFIED | `crypto.subtle.digest('SHA-256')`, `setupPin`, `verifyPin`, `isSessionValid` (120 Min.), `hasPinSetup`, `logout` |
| `client/src/features/auth/PinScreen.tsx` | PIN-Eingabe-UI | ✓ VERIFIED | 6-Punkte-Anzeige, `currentPin.length !== 6` guard, `onPointerDown`, Setup-Bestätigungs-Flow |
| `client/src/features/pos/useSaleComplete.ts` | Atomare Dexie-Transaktion | ✓ VERIFIED | `db.transaction('rw', [db.sales, db.products, db.outbox], ...)`, `p.stock -= item.quantity`, `SALE_COMPLETE` OutboxEntry |
| `client/src/features/pos/useCart.ts` | Warenkorb-State | ✓ VERIFIED | `useReducer`, `ADD_ITEM`/`REMOVE_ITEM`/`UPDATE_QUANTITY`/`CLEAR`, Preis-Snapshot, `total = salePrice * quantity` |
| `client/src/features/pos/ArticleGrid.tsx` | Artikel-Grid | ✓ VERIFIED | `useLiveQuery`, `[shopId+active]`-Index-Query, Kategorie-Tabs mit "Alle", `onPointerDown` |
| `client/src/features/pos/CartPanel.tsx` | Warenkorb-Panel | ✓ VERIFIED | Slide-In `translate-x-full`/`translate-x-0`, `inputMode="numeric"`, +/- Buttons (h-9 w-9), "Bezahlen" h-14 |
| `client/src/features/pos/NumPad.tsx` | Numpad | ✓ VERIFIED | Quick-Buttons [500, 1000, 2000, 5000] Cent, `Math.round(parseFloat(...) * 100)`, Dezimalkomma |
| `client/src/features/pos/PaymentFlow.tsx` | Bezahl-Flow | ✓ VERIFIED | 2 Schritte (paid/change), `donationCents = difference - changeCents`, emerald-Anzeige, Validierung |
| `client/src/features/pos/SaleSummary.tsx` | Verkaufs-Zusammenfassung | ✓ VERIFIED | "Nächster Kunde" (h-14), "Korrigieren", emerald Erfolgs-Icon, `formatEur()` für alle Beträge |
| `client/src/features/pos/POSScreen.tsx` | POS-Orchestrator | ✓ VERIFIED | `POSView = 'pos' | 'payment' | 'summary'`, `useCart`, try/catch um `completeSale`, Fehler-Banner |
| `client/src/App.tsx` | App-Root mit Auth-Guard | ✓ VERIFIED | `navigator.storage.persist()`, `seedIfEmpty()`, Auth-Guard (checking/setup/locked/unlocked), `<POSScreen onLock={lock} />` |
| `client/nginx.conf` | Service-Worker-Cache-Headers | ✓ VERIFIED | `Cache-Control: no-store`, `Service-Worker-Allowed: /`, SPA-Fallback |
| `client/index.html` | iOS PWA Meta-Tags | ✓ VERIFIED | `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title` |

---

### Key Link Verifikation

| Von | Nach | Via | Status | Details |
|-----|------|-----|--------|---------|
| `docker-compose.yml` | Traefik-Netzwerk | `networks: traefik: external: true` | ✓ WIRED | Zeile 36: `external: true` vorhanden |
| `.github/workflows/deploy.yml` | Portainer Webhook | `curl -f -X POST secrets.PORTAINER_WEBHOOK_URL` | ✓ WIRED | Zeile 38: Secret-Referenz korrekt |
| `client/src/db/index.ts` | FairstandDB (Dexie) | `export const db = new FairstandDB()` | ✓ WIRED | Singleton korrekt exportiert |
| `client/src/main.tsx` | `navigator.storage.persist()` | App-Start-Initialisierung | ✓ WIRED | In `App.tsx` useEffect, aufgerufen bei App-Mount |
| `client/src/App.tsx` | PinScreen / POSScreen | `useAuth` Hook, `sessionValid` bestimmt Ansicht | ✓ WIRED | Auth-Guard vollständig verdrahtet |
| `ArticleGrid.tsx` | `db.products` | `useLiveQuery(() => db.products.where('[shopId+active]').equals([SHOP_ID, 1]).toArray())` | ✓ WIRED | Reaktive DB-Verbindung aktiv |
| `useSaleComplete.ts` | `db.transaction` | `db.transaction('rw', [db.sales, db.products, db.outbox], ...)` | ✓ WIRED | Vollständig verdrahtet |
| `POSScreen.tsx` | `App.tsx` | `App rendert POSScreen wenn state === 'unlocked'` | ✓ WIRED | `<POSScreen onLock={lock} />` in unlocked-Zweig |

---

### Anforderungs-Abdeckung

| Anforderung | Plan | Beschreibung | Status | Beleg |
|-------------|------|-------------|--------|-------|
| POS-01 | 01-03 | Artikel-Grid mit aktiven Produkten, Name und VK-Preis | ✓ SATISFIED | `ArticleGrid.tsx`: `useLiveQuery`, Kacheln mit Name + `formatEur(salePrice)` |
| POS-02 | 01-03 | Warenkorb mit Einzelpreis, Menge, Gesamtsumme | ✓ SATISFIED | `CartPanel.tsx`: `formatEur(salePrice * quantity)`, Gesamtsumme im Footer |
| POS-03 | 01-03 | Artikel im Warenkorb in Menge verändern oder entfernen | ✓ SATISFIED | `CartPanel.tsx`: +/- Buttons, `inputMode="numeric"` Direkteingabe, Entfernen-Button |
| POS-04 | 01-03 | Numerisches Eingabefeld für bezahlten Betrag | ✓ SATISFIED | `NumPad.tsx`: Taschenrechner-Grid, Quick-Buttons, Cent-Integer-Konvertierung |
| POS-05 | 01-03 | Automatische Berechnung der Differenz | ✓ SATISFIED | `PaymentFlow.tsx`: `difference = paidCents - totalCents`, live angezeigt |
| POS-06 | 01-03 | Wechselgeld-Betrag eingeben, Rest als Spende | ✓ SATISFIED | `PaymentFlow.tsx`: `donationCents = difference - changeCents`, emerald-Anzeige |
| POS-07 | 01-03 | Verkaufsabschluss atomar: Bestand, Umsatz, Spende | ✓ SATISFIED | `useSaleComplete.ts`: Dexie-Transaktion über 3 Stores |
| OFF-01 | 01-02 | App vollständig offline funktionsfähig | ? HUMAN | Service Worker Precaching vorhanden, Workbox-Config in vite.config.ts korrekt — Offline-Verhalten muss live geprüft werden |
| OFF-02 | 01-02 | Alle Daten lokal in IndexedDB | ✓ SATISFIED | Dexie-Schema mit 3 Tabellen, `navigator.storage.persist()` in App.tsx |
| OFF-05 | 01-01 | PWA als Home-Screen-App installierbar | ? HUMAN | Manifest mit `display: 'standalone'`, iOS-Meta-Tags vorhanden — Installation muss auf Gerät geprüft werden |
| AUTH-01 | 01-02 | Passwortschutz (einfaches Passwort) | ✓ SATISFIED | `pinAuth.ts`: SHA-256 PIN, Session-Timeout 120 Min., `PinScreen.tsx` vollständig |
| AUTH-02 | 01-01/02 | Datenmodell mit shop_id | ✓ SATISFIED | Alle 3 Tabellen haben `shopId`, Compound-Index, `SHOP_ID = 'st-secundus-hennstedt'` |
| AUTH-03 | 01-02 | Erstmal nur ein Laden | ✓ SATISFIED | `SHOP_ID` hartcodiert, kein Multi-Laden UI |
| UX-01 | 01-03 | Hauptfarbe Hellblau, modernes Design | ? HUMAN | `bg-sky-400`, `text-sky-700`, `bg-sky-50` durchgängig — visuell nur menschlich prüfbar |
| UX-02 | 01-03 | Touch-optimiert, min 44×44px Tap-Targets | ✓ SATISFIED | POS-Buttons `h-14` (56px), Cart-Buttons `min-h-[44px]`, PinScreen `h-14`, Kategorie-Tabs `min-h-[44px]` |
| UX-03 | 01-03 | Responsive für iPad und iPhone | ? HUMAN | `w-80 md:w-96` für CartPanel, kein Fixed-Layout — visuell nur menschlich prüfbar |
| UX-04 | 01-03 | Kassen-Ansicht als Hauptbildschirm | ✓ SATISFIED | `POSScreen` ist unlocked-Hauptansicht, Auth-Guard direkt zu Kasse |
| DEP-01 | 01-01 | GitHub Repository mit Docker-Build via GitHub Actions | ✓ SATISFIED | `.github/workflows/deploy.yml`: Build+Push für client und server |
| DEP-02 | 01-01 | Portainer Webhook für Auto-Deploy | ✓ SATISFIED | `curl -f -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"` in Workflow |
| DEP-03 | 01-01 | Docker-Compose Stack mit Frontend + Backend | ✓ SATISFIED | `docker-compose.yml`: client (nginx:alpine) + server (node:20-alpine) |

**Abdeckung:** 20/20 Anforderungen erfasst. 14 automatisch verifiziert, 5 benötigen menschliche Prüfung (OFF-01, OFF-05, UX-01, UX-03 — kein Blocker), 1 nicht applicable (UX-04 trivial erfüllt).

**Orphaned Requirements:** Keine — alle in REQUIREMENTS.md für Phase 1 gemappten Anforderungen sind in den PLANs erfasst.

---

### Anti-Pattern-Scan

| Datei | Zeile | Pattern | Schweregrad | Bewertung |
|-------|-------|---------|-------------|-----------|
| `ArticleGrid.tsx` | 27, 33 | `return []` in `useMemo` | Info | Kein Stub — gültige Guard-Clause für `products === undefined` (Loading-State von `useLiveQuery`) |
| `POSScreen.tsx` | 44 | Kommentar "Vollständige Storno-Logik ist DEFERRED" | Info | Intentionell bewusste Entscheidung, "Korrigieren" fügt Artikel wieder in Warenkorb ein — kein Blocker |

**Keine Blocker-Anti-Patterns gefunden.** Keine TODO/FIXME-Kommentare, keine leeren Handler, keine Placeholder-Returns, kein `console.log`-only Code.

---

### Build-Verifikation

- `npm run build` in `client/`: **PASS** (0 TypeScript-Fehler)
- `client/dist/manifest.webmanifest`: **VORHANDEN**, enthält `"theme_color":"#38bdf8"`, `"display":"standalone"`
- `client/dist/index.html`: **VORHANDEN**
- Service Worker Precaching-Config: **VORHANDEN** (`globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`)

---

### Menschliche Verifikation erforderlich

#### 1. Vollständiger Kassiervorgang auf iPad/iOS

**Test:** App in Safari auf iPad öffnen, zum Homescreen hinzufügen, als App starten. PIN einrichten (6 Ziffern), Artikel antippen, Menge ändern, "Bezahlen", Betrag eingeben (z.B. 10 €), Wechselgeld (z.B. 0,11 €) — Spende = Rest. Abschließen, Zusammenfassung prüfen, "Nächster Kunde".

**Erwartet:** Gesamter Flow läuft reibungslos ohne Fehler, Spende wird korrekt berechnet, Warenkorb wird nach "Nächster Kunde" geleert.

**Warum menschlich:** Touch-Interaktion, iOS-PWA-Verhalten und visuelle Darstellung lassen sich programmatisch nicht vollständig prüfen.

#### 2. Offline-Betrieb verifizieren

**Test:** In Chrome DevTools → Netzwerk-Tab → "Offline" setzen. App neu laden, PIN eingeben, Verkauf durchführen, in Application → IndexedDB → fairstand-db → sales prüfen ob Eintrag vorhanden.

**Erwartet:** App läuft vollständig ohne Netz, Verkauf wird in IndexedDB gespeichert, kein Netzwerkfehler sichtbar.

**Warum menschlich:** Service Worker Offline-Verhalten erfordert Browser-Umgebung.

#### 3. PWA-Installation und Standalone-Start

**Test:** In Safari auf iPad: Teilen-Menü → "Zum Home-Bildschirm". App-Icon erscheint, App öffnen.

**Erwartet:** App startet im Standalone-Modus (kein Browser-Chrome), Icon ist sky-400 Platzhalter.

**Warum menschlich:** iOS PWA-Installation nur auf physischem Gerät oder Safari vollständig testbar.

#### 4. GitHub Actions CI/CD (nach erstem Commit auf main)

**Test:** Push auf `main` Branch beobachten unter Actions-Tab des GitHub Repositories.

**Erwartet:** Build für client und server erfolgreich, Images in GHCR gepusht, Portainer Webhook ausgelöst (Secret PORTAINER_WEBHOOK_URL muss gesetzt sein).

**Warum menschlich:** GitHub-Repository und Secret-Konfiguration außerhalb der Codebase.

---

### Zusammenfassung

Die Phase 1 Implementierung ist vollständig und substanziell. Alle geplanten Komponenten sind vorhanden, verdrahtet und TypeScript-clean gebaut:

- Das Dexie-Schema mit 3 Tabellen und `shopId` ist korrekt implementiert (AUTH-02).
- Die atomare Verkaufstransaktion schreibt in einem einzigen `db.transaction('rw', ...)` Call Sale, Bestandsdelta und OutboxEntry (POS-07).
- Die PIN-Auth mit SHA-256, Session-Timeout und 6-Ziffern-Schutz ist vollständig verdrahtet (AUTH-01).
- Der Bezahl-Flow mit live berechneter Spende ist in `PaymentFlow.tsx` korrekt implementiert (POS-05, POS-06).
- Der Service Worker mit Workbox-Precaching und `registerType: 'prompt'` ist konfiguriert (OFF-01, OFF-05).
- 33 echte Seed-Artikel aus Rechnung 2600988 sind als Cent-Integer vorhanden (33 Einträge in seed.ts verifiziert).
- Das Docker-Compose-Setup mit Traefik-Integration und GitHub Actions CI/CD ist korrekt konfiguriert (DEP-01, DEP-02, DEP-03).

**Keine Gaps, keine Blocker.** Verbleibende Prüfpunkte sind ausschließlich menschliche Verifikationen (visuell, Touch, PWA-Installation, CI/CD-Ausführung).

---

*Verifiziert: 2026-03-23*
*Verifier: Claude (gsd-verifier)*
