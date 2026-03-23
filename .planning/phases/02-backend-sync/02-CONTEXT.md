# Phase 2: Backend & Sync - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Fastify-Backend mit SQLite/Drizzle, REST-API für Sync, Outbox-Flush-Engine im Client. Daten die offline auf dem iPad entstehen, werden beim nächsten Online-Kontakt automatisch mit dem Server synchronisiert. Delta-basierte Bestandsänderungen, Last-Write-Wins Konfliktauflösung.

</domain>

<decisions>
## Implementation Decisions

### Sync-Strategie
- Outbox-Pattern: Jede Mutation wird als Event in die Outbox-Tabelle geschrieben, beim Sync an den Server geflusht
- Delta-Events für Bestandsänderungen (nicht Absolutwerte) — verhindert Konflikte bei mehreren Geräten
- Last-Write-Wins via Timestamp für alle anderen Entitäten
- Sync-Trigger: `online`-Event + `visibilitychange` (kein Background Sync — funktioniert auf iOS nicht)

### Backend-Architektur
- Fastify 5.x mit SQLite + Drizzle ORM (kein separater DB-Container)
- REST-API Endpunkte für: Sync (POST /api/sync), Produkte, Verkäufe
- SQLite-Datei im Docker-Volume persistiert
- Server-Schema spiegelt Dexie-Schema (products, sales, outbox_events)

### Claude's Discretion
- Drizzle-Schema-Design und Migrationsstrategie
- API-Route-Struktur und Error-Handling
- Sync-Batch-Größe und Retry-Logik
- CORS-Konfiguration für die PWA-Domain

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `client/src/db/schema.ts` — Dexie-Schema mit Product, Sale, OutboxEntry Interfaces
- `client/src/db/index.ts` — DB-Singleton, SHOP_ID Konstante
- `server/src/index.ts` — Fastify-Grundgerüst mit CORS und Health-Endpoint
- `server/drizzle.config.ts` — Drizzle-Config (noch Platzhalter)

### Established Patterns
- Cent-Integer für alle Geldbeträge
- shopId auf allen Entitäten für Multi-Laden-Vorbereitung
- OutboxEntry-Typ bereits definiert: { id, shopId, type, payload, createdAt, syncedAt }

### Integration Points
- Outbox-Tabelle in Dexie bereits angelegt — Server muss Events empfangen und verarbeiten
- `useSaleComplete.ts` schreibt bereits OutboxEntry bei jedem Verkauf
- Docker-Compose hat Server-Service mit SQLite-Volume
- Traefik-Labels für fairstand.godsapp.de bereits konfiguriert

</code_context>

<specifics>
## Specific Ideas

- Server-Schema soll das Dexie-Schema spiegeln, damit Sync einfach bleibt
- Outbox-Events haben einen `type` (sale_created, product_updated) und `payload` (JSON)
- Nach erfolgreichem Sync: `syncedAt` Timestamp auf dem Client setzen

</specifics>

<deferred>
## Deferred Ideas

- Bidirektionaler Sync (Server → Client) — erstmal nur Client → Server
- WebSocket für Echtzeit-Sync — unnötig, periodischer Flush reicht
- Multi-Device-Sync mit Conflict-UI — LWW reicht für den Use Case

</deferred>
