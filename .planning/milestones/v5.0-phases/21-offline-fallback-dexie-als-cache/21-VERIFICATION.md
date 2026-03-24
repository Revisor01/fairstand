---
phase: 21-offline-fallback-dexie-als-cache
verified: 2026-03-24T21:35:00Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: "Nach Outbox-Flush wird der TQ-Produkt-Cache automatisch neu befüllt"
    status: partial
    reason: "engine.ts hat QueryClient-Invalidation implementiert, aber registerSyncTriggers wird in main.tsx ohne QueryClient aufgerufen — die Invalidation funktioniert daher nicht. Das Plan sah vor, dass registerSyncTriggers auch aus einer React-Komponente (z.B. UnlockedApp) mit queryClient aufgerufen wird, aber das ist nicht implementiert."
    artifacts:
      - path: "client/src/main.tsx"
        issue: "registerSyncTriggers() wird ohne Argument aufgerufen (Zeile 9), queryClient kann nicht übergeben werden"
      - path: "client/src/sync/triggers.ts"
        issue: "registerSyncTriggers akzeptiert optionalen queryClient, aber es gibt keinen Aufrufer, der ihn übergibt"
    missing:
      - "registerSyncTriggers muss auch aus UnlockedApp oder App.tsx aufgerufen werden und dabei den useQueryClient()-Wert übergeben"
      - "Oder: registerSyncTriggers sollte den QueryClient via Prop/Context erhalten statt optional"
---

# Phase 21: Offline-Fallback & Dexie als Cache — Verifikationsbericht

**Phase Ziel:** Die Kasse funktioniert nahtlos offline und online — beim Verlassen des WLANs schaltet sie automatisch auf Dexie-Cache um, beim Reconnect flusht sie die Outbox und holt sich den aktuellen Stand

**Verifiziert:** 2026-03-24
**Status:** Lücken gefunden
**Score:** 5/6 Wahrheiten verifiziert

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POS lädt Produkte nach App-Neustart im Offline-Modus aus Dexie-Cache | ✓ VERIFIED | ArticleGrid.tsx Zeile 45-48: `db.products.where('shopId').equals(shopId).filter(p => p.active).toArray()` im catch-Block |
| 2 | Leerer TQ-Cache + Netzwerkfehler führt zu Dexie-Fallback, nicht zu Fehler-State | ✓ VERIFIED | useProducts.ts Zeile 45-50: try/catch mit Dexie-Fallback in queryFn, wirft nur wenn Cache leer |
| 3 | Write-Through befüllt Dexie bei jedem erfolgreichen Online-Fetch | ✓ VERIFIED | useProducts.ts Zeile 39-42 + useCategories.ts Zeile 26-29: `db.transaction` mit bulkDelete/bulkPut nach erfolgreichem Fetch |
| 4 | Nach Outbox-Flush wird der TQ-Produkt-Cache automatisch neu befüllt | ✗ PARTIAL | engine.ts Zeile 62: `queryClient.invalidateQueries({ queryKey: ['products', shopId] })` ist implementiert, aber registerSyncTriggers wird in main.tsx ohne queryClient aufgerufen |
| 5 | POS-Header zeigt ein WifiOff-Icon wenn offline | ✓ VERIFIED | POSScreen.tsx Zeile 164-169: `{!isOnline && <WifiOff ... />}` mit WifiOff aus lucide-react |
| 6 | Offline-Indicator verschwindet automatisch bei Reconnect | ✓ VERIFIED | POSScreen.tsx Zeile 35-44: `useEffect` mit `online` Event-Listener, `setIsOnline(true)` bei Reconnect |

**Score:** 5/6 Wahrheiten verifiziert

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/src/features/pos/ArticleGrid.tsx` | queryFn mit try/catch Dexie-Fallback | ✓ VERIFIED | Zeile 20-52: try-Block Online-Fetch, catch-Block Dexie-Fallback mit Filter |
| `client/src/hooks/api/useProducts.ts` | queryFn mit Dexie-Fallback + Write-Through | ✓ VERIFIED | Zeile 29-50: try-Block mit Write-Through, catch-Block mit Dexie.where().toArray() |
| `client/src/hooks/api/useCategories.ts` | queryFn mit Dexie-Fallback + Write-Through | ✓ VERIFIED | Zeile 10-39: analog useProducts mit db.categories |
| `client/src/sync/engine.ts` | flushOutbox mit QueryClient-Invalidation nach bulkDelete | ✓ VERIFIED | Zeile 58-66: if (queryClient) → invalidateQueries nach erfolgreichem Flush |
| `client/src/features/pos/POSScreen.tsx` | WifiOff-Indicator mit isOnline-State + useEffect | ✓ VERIFIED | Zeile 29, 35-44, 164-169: useState + useEffect + conditional render |
| `client/src/sync/triggers.ts` | registerSyncTriggers mit optionalem QueryClient-Parameter | ✓ VERIFIED | Zeile 4: Signatur + Zeile 7,12,18,24: queryClient durchgereicht an flushOutbox() |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| ArticleGrid queryFn | db.products.where | catch block bei Netzwerkfehler | ✓ WIRED | Pattern `db.products.where('shopId').equals` gefunden in Zeile 45 |
| useProducts queryFn | db.products.where | catch block | ✓ WIRED | Pattern `db.products.where('shopId').equals` gefunden in Zeile 47 |
| useCategories queryFn | db.categories.where | catch block | ✓ WIRED | Pattern `db.categories.where('shopId').equals` gefunden in Zeile 34 |
| flushOutbox() nach Erfolg | queryClient.invalidateQueries | if (queryClient) Block | ⚠️ PARTIAL | queryClient wird akzeptiert (Zeile 62), aber registerSyncTriggers wird in main.tsx ohne queryClient aufgerufen (main.tsx:9) |
| registerSyncTriggers (main.tsx) | flushOutbox() | alle 4 Trigger-Pfade | ✓ WIRED | Zeile 7,12,18,24: flushOutbox(queryClient) mit optionalem Parameter |
| POSScreen isOnline | WifiOff-Render | {!isOnline && ...} | ✓ WIRED | Zeile 164: conditional render mit isOnline-State |
| window online/offline Events | setIsOnline | useEffect Listener | ✓ WIRED | Zeile 36-44: addEventListener + handleOnline/handleOffline |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| OFFL-01 | POS funktioniert vollständig offline mit TQ-Cache + Dexie-Fallback | ✓ SATISFIED | ArticleGrid queryFn try/catch mit Dexie-Fallback; Write-Through hält Cache aktuell |
| OFFL-02 | Verkäufe/Entnahmen offline in Outbox, bei Reconnect automatisch geflusht | ⚠️ PARTIAL | Outbox-Flush funktioniert (registerSyncTriggers triggert flushOutbox), aber Cache-Invalidation nach Flush funktioniert nicht weil registerSyncTriggers ohne queryClient aufgerufen wird |
| OFFL-03 | Online/Offline-Wechsel nahtlos erkannt, Datenquelle schaltet automatisch um | ⚠️ PARTIAL | WifiOff-Indicator funktioniert (Zeile 164), aber nahtlose Datenquelle-Umschaltung ist eingeschränkt: Ohne Post-Flush-Invalidation wird gecachter Wert weiterhin verwendet statt neu vom Server geladen |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| client/src/main.tsx | 9 | `registerSyncTriggers()` without queryClient argument | ⚠️ Warning | Post-Flush-Invalidation in engine.ts wird nie ausgelöst, da queryClient nur bei Bedarf übergeben wird |
| client/src/sync/engine.ts | 59 | `if (queryClient)` guard ohne Fallback | ℹ️ Info | Kein Fehler, aber stille Degradation: Wenn queryClient nicht vorhanden, wird auch nicht invalidiert |

### Gaps Summary

**Kritische Lücke: QueryClient-Übergabe an registerSyncTriggers**

Das Plan 21-02 sah vor:
- engine.ts: flushOutbox erhält optionalen QueryClient-Parameter ✓ implementiert
- triggers.ts: registerSyncTriggers leitet queryClient weiter ✓ implementiert
- **App.tsx oder UnlockedApp: registerSyncTriggers wird AUCH mit useQueryClient() aufgerufen** ✗ NICHT implementiert

Aktuell:
- main.tsx (Zeile 9): `registerSyncTriggers()` ohne Argument
- Keine zweite Registrierung in einer React-Komponente mit QueryClient

Konsequenz:
- OFFL-02: Outbox-Flush funktioniert, aber Cache wird nach Flush nicht invalidiert
- OFFL-03: Offline-Indicator funktioniert, aber nahtlose Datenquelle-Umschaltung ist nicht optimal (alte TQ-Cache-Daten werden weiterverwendet bis staleTime abläuft)

**Workaround-Analyse:**
- useWebSocket in UnlockedApp hat QueryClient und invalidiert auch Caches — das kann den Fehler teilweise kompensieren
- WebSocket-Broadcast bei Server-Änderungen und staleTime (30s) können dazu führen, dass Daten aktualisiert werden
- ABER: Das ist nicht garantiert und hängt von Netzwerk/Timing ab

**Empfehlung zur Behebung:**
1. In UnlockedApp oder App.tsx: useEffect mit `useQueryClient()` + `registerSyncTriggers(queryClient)` aufrufen
2. Oder: Löschr registerSyncTriggers aus main.tsx und registriere nur aus UnlockedApp

---

## Detailed Findings

### Plan 21-01: Dexie Cold-Start-Fallback
**Status: PASSED**

- ✓ ArticleGrid.tsx: queryFn mit try/catch Dexie-Fallback (Zeile 20-52)
- ✓ useProducts.ts: queryFn mit Write-Through und Dexie-Fallback (Zeile 29-50)
- ✓ useCategories.ts: queryFn mit Write-Through und Dexie-Fallback (Zeile 10-39)
- ✓ Alle drei Fallbacks verwenden `.where('shopId').equals(shopId)` für korrekte Isolation
- ✓ ArticleGrid filtert auch im Fallback nur `.filter(p => p.active)`
- ✓ TypeScript-Build erfolgreich

### Plan 21-02: TQ-Cache-Invalidation + WifiOff-Indicator
**Status: PARTIAL**

#### Task 1: QueryClient-Invalidation nach Outbox-Flush
- ✓ engine.ts: flushOutbox erhält optionalen QueryClient-Parameter (Zeile 8)
- ✓ engine.ts: invalidateQueries wird nach erfolgreichem Flush aufgerufen (Zeile 62)
- ✓ triggers.ts: registerSyncTriggers leitet QueryClient an alle flushOutbox-Aufrufe weiter (Zeile 7,12,18,24)
- ✗ **main.tsx: registerSyncTriggers wird ohne queryClient aufgerufen** (Zeile 9)
- ✗ **App.tsx/UnlockedApp: registerSyncTriggers wird nicht mit useQueryClient() aufgerufen**

#### Task 2: Offline-Indicator im POS-Header
- ✓ POSScreen.tsx: WifiOff aus lucide-react importiert (Zeile 2)
- ✓ POSScreen.tsx: isOnline-State mit navigator.onLine initialisiert (Zeile 29)
- ✓ POSScreen.tsx: useEffect mit online/offline Event-Listener (Zeile 35-44)
- ✓ POSScreen.tsx: WifiOff-Badge im Header unter Shop-Namen (Zeile 164-169)
- ✓ Badge verschwindet automatisch bei Reconnect (via setIsOnline(true))

### Build & TypeScript
- ✓ `npm run build --prefix client` erfolgreich (2.20s)
- ✓ PWA v1.2.0 generiert korrekt
- ✓ Keine TypeScript-Fehler

### Commits
- ✓ bbf4e0f: feat(21-01): Dexie-Fallback in useProducts und useCategories
- ✓ 28f6c0c: feat(21-01): Dexie-Fallback in ArticleGrid (POS Cold-Start offline)
- ✓ f33f184: feat(21-02): QueryClient-Invalidation nach Outbox-Flush
- ✓ aeb8f6b: feat(21-02): Offline-Indicator im POS-Header

---

## Human Verification Recommended

### 1. Cold-Start Offline Scenario

**Test:**
1. App starten mit Flugzeugmodus aktiviert (nachdem mindestens einmal online gestartet wurde)
2. PIN eingeben
3. ArticleGrid sollte alle Artikel zeigen (aus Dexie)

**Expected:**
- Alle Artikel aus dem letzten Online-Stand sind sichtbar
- Keine Fehlermeldung
- POS-Header zeigt WifiOff-Badge

**Why human:**
- Braucht echtes Gerät im Flugzeugmodus oder DevTools-Simulation
- Verifikation des Dexie-Fallback im echten Cold-Start-Szenario

### 2. Offline Verkauf + Reconnect Scenario

**Test:**
1. App online, Produkte laden
2. In den Flugzeugmodus wechseln
3. Zwei Verkäufe abschließen (sollen in Outbox gehen)
4. Flugzeugmodus deaktivieren / Reconnect
5. Server überprüfen: Beide Verkäufe sollten dort auftauchen

**Expected:**
- Beide Verkäufe werden nach Reconnect automatisch an Server gesendet
- Keine Benutzerinteraktion nötig
- WifiOff-Badge verschwindet automatisch

**Why human:**
- Erfordert echte Netzwerk-Simulation und Server-Überprüfung
- OFFL-02 kann nur manuell vollständig verifiziert werden

### 3. Nahtlose Online/Offline-Umschaltung (kritisch für OFFL-03)

**Test:**
1. App online, Produkte geladen
2. Ein neues Produkt auf Admin-Seite hinzufügen
3. Artikel-Grid sollte es (via WebSocket) sofort zeigen
4. In Flugzeugmodus wechseln
5. Artikel-Grid sollte weiterhin alle bisherigen Artikel zeigen
6. Flugzeugmodus deaktivieren
7. Neues Produkt sollte nun sichtbar werden (oder war schon sichtbar via WebSocket)

**Expected:**
- Kein "Fehler beim Laden" während Offline
- Beim Reconnect frische Daten ohne manuelles Neustart
- WifiOff-Badge erscheint/verschwindet automatisch

**Why human:**
- Braucht reales Netzwerk-Verhalten (nicht nur offline/online Event)
- WebSocket-Integration und Cache-Invalidation interagieren komplex

### 4. Cache Invalidation nach Flush (direkte Auswirkung der Lücke)

**Test:**
1. App online
2. Ein Produkt online hinzufügen, wird in Dexie gecacht
3. Online bleiben, aber WebSocket trennen (simulieren)
4. Verkauf offline
5. Reconnect
6. Überprüfen: Wird das neue Produkt aktualisiert von Server geladen oder noch gecacht?

**Expected:**
- Nach Flush sollte frische Produktliste vom Server geladen werden (ideal)
- Oder zumindest wenn staleTime abläuft

**Why human:**
- Direkter Test der QueryClient-Invalidation Lücke
- Kann durch WebSocket-Fallback überlagert werden (schwer zu isolieren)

---

_Verified: 2026-03-24T21:35:00Z_
_Verifier: Claude (gsd-verifier)_
