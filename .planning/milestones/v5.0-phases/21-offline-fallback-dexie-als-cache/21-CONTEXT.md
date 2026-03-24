# Phase 21: Offline-Fallback & Dexie als Cache - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Sicherstellen dass die Kasse (POS) nahtlos offline funktioniert. Dexie-Cache wird beim App-Start befüllt (Phase 20 write-through ist schon da). Online/Offline-Wechsel wird automatisch erkannt. Outbox-Flush bei Reconnect. Keine Fehlermeldungen beim Wechsel.

</domain>

<decisions>
## Implementation Decisions

### Was schon funktioniert (aus Phase 19+20)
- TQ offlineFirst in ArticleGrid — zeigt gecachte Daten offline
- Dexie Write-Through in useProducts/useCategories — Cache wird bei jedem Fetch aktualisiert
- Outbox für Offline-Verkäufe — completeSale/completeWithdrawal schreiben in Outbox wenn offline
- flushOutbox() existiert noch in engine.ts

### Was noch fehlt (OFFL-01, OFFL-02, OFFL-03)
- OFFL-01: Verifizieren dass POS komplett offline funktioniert — Produkte aus Dexie-Cache laden wenn TQ-Cache kalt ist (App-Neustart offline)
- OFFL-02: flushOutbox() bei Reconnect automatisch triggern — online-Event-Listener
- OFFL-03: Online/Offline-Wechsel UI — kein Fehler, kein Flicker, klare Anzeige

### Dexie als Cold-Start-Fallback
- Problem: TQ-Cache ist in-memory — nach App-Neustart im Offline-Modus leer
- Lösung: ArticleGrid queryFn prüft erst Server (fetch), bei Netzwerkfehler liest es aus Dexie
- useProducts queryFn in hooks/api/useProducts.ts braucht denselben Fallback
- Pattern: `try { fetch() } catch { return db.products.where('shopId').equals(shopId).toArray() }`

### Reconnect-Flush
- flushOutbox() bei `online` Event und `visibilitychange` (existierende Trigger aus sync/triggers.ts)
- Prüfen ob triggers.ts noch korrekt importiert und aktiv ist nach Phase 20 Cleanup

### Online/Offline UI-Feedback
- Kleine Anzeige im POS-Header wenn offline (z.B. WifiOff Icon + "Offline")
- Verschwindet automatisch bei Reconnect
- Keine Fehlermeldungen — nur informativer Hinweis

### Claude's Discretion
- Genaue UI-Position und Styling des Offline-Indicators
- Ob triggers.ts refactored oder erweitert wird
- Wie der Dexie-Fallback in den queryFn integriert wird (inline vs. Hilfsfunktion)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/sync/engine.ts` — flushOutbox() ist noch da
- `client/src/sync/triggers.ts` — online/visibilitychange Listener (prüfen ob noch aktiv)
- `client/src/hooks/api/useProducts.ts` — queryFn mit Dexie write-through
- `client/src/hooks/api/useCategories.ts` — queryFn mit Dexie write-through
- `client/src/features/pos/ArticleGrid.tsx` — TQ offlineFirst
- `client/src/db/index.ts` — Dexie DB mit products/categories Tabellen

### Integration Points
- App.tsx oder UnlockedApp — triggers.ts Import prüfen
- POSScreen.tsx — Offline-Indicator hinzufügen
- useProducts/useCategories queryFn — Dexie-Fallback bei Netzwerkfehler

</code_context>

<specifics>
## Specific Ideas

Phase 21 ist primär Validierung — das meiste funktioniert schon durch Phase 19+20. Der Fokus liegt auf:
1. Cold-Start offline (Dexie-Fallback wenn TQ-Cache leer)
2. Reconnect-Flush (Outbox automatisch leeren)
3. Saubere UI (kein Fehler beim Wechsel)

</specifics>

<deferred>
## Deferred Ideas

None — this is the last phase of v5.0.

</deferred>
