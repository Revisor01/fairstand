# Phase 24: Master-Shop Administration - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Master-Shop (St. Secundus) bekommt is_master-Flag und kann andere Shops anlegen, PIN vergeben und deaktivieren. Neuer "Shops"-Tab im Admin nur für Master sichtbar. Deaktivierte Shops können sich nicht einloggen.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — CRUD/infrastructure phase.

Key details from codebase scout:
- shops-Tabelle braucht: is_master (boolean, default false), active (boolean, default true)
- Drizzle-Migration nötig für neue Spalten
- seed.ts: St. Secundus bekommt is_master: true
- Neue Server-Route: /api/shops (GET list, POST create, PUT update, DELETE/deactivate) — nur für Master
- Master-Check: Session-shopId nachschlagen, is_master prüfen
- Auth-Route: Deaktivierte Shops (active: false) werden beim Login abgelehnt
- AdminScreen.tsx: Neuer "Shops"-Tab mit Store-Icon, nur sichtbar wenn is_master
- ShopsManager.tsx: Liste aller Shops, Anlegen-Form (Name + PIN), Deaktivieren-Button
- Session-Response erweitern: isMaster-Flag mitgeben damit Client den Tab zeigen kann

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- AdminScreen.tsx hat bereits Tab-System mit Icons (Package, BarChart3, Upload, Tags, Settings)
- Auth-Route hat PIN-Hashing und Rate-Limiting
- Session-Store (lib/sessions.ts) hat token → shopId Mapping
- Settings-Route zeigt Pattern für shopId-isolierte CRUD

### Established Patterns
- Alle Routes nutzen request.session.shopId für Isolation
- TanStack Query für Client-seitige Daten
- WebSocket broadcast() für Live-Updates
- Drizzle ORM für Schema + Migrations

### Integration Points
- server/src/db/schema.ts — shops-Tabelle erweitern
- server/src/routes/auth.ts — active-Check beim Login, isMaster in Response
- server/src/index.ts — neue shops-Route registrieren
- client/src/features/admin/AdminScreen.tsx — neuer Tab
- client/src/features/auth/useAuth.ts — isMaster in Session speichern

</code_context>

<specifics>
## Specific Ideas

No specific requirements — CRUD/infrastructure phase

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
