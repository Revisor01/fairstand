---
phase: 11-produktbilder-pdf-parsing
plan: 02
subsystem: ui
tags: [react, fastify, dexie, multipart, image-upload, pwa]

# Dependency graph
requires:
  - phase: 11-01
    provides: imageUrl column in SQLite schema and server ProductSchema

provides:
  - POST /api/products/:id/image endpoint (multipart, MIME-Check, 5MB limit)
  - GET /api/images/:filename static serving from /app/data/images/
  - imageUrl in client Product interface (Dexie v5)
  - imageUrl in sync/engine.ts ServerProduct + download mapping
  - Bild-Upload-Button in ProductList mit Datei-Picker und Vorschau
  - Produktbild auf ArticleGrid-Kacheln (conditional rendering)

affects: [ProductList, ArticleGrid, sync/engine, Dexie schema]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multipart-Upload mit @fastify/multipart direkt via request.file() — kein erneutes register()"
    - "MIME-Check + ext-Mapping fuer sicheres Datei-Speichern"
    - "Dexie version increment fuer optionale Felder ohne .upgrade()-Handler"
    - "handleImageUpload fire-and-forget mit stillem Fail — kein Offline-Support fuer Bilder"

key-files:
  created: []
  modified:
    - server/src/routes/products.ts
    - client/src/db/schema.ts
    - client/src/sync/engine.ts
    - client/src/features/admin/products/ProductList.tsx
    - client/src/features/pos/ArticleGrid.tsx

key-decisions:
  - "IMAGES_DIR via env-Variable konfigurierbar (default /app/data/images) — Docker-Volume-Pfad austauschbar"
  - "Cache-Control: immutable fuer Bilder — Produktbild-URL aendert sich bei neuem Upload (gleiche productId.ext bleibt)"
  - "Path-Traversal-Schutz im GET /images/:filename Endpoint — filename darf kein / oder .. enthalten"
  - "Dexie v5 ohne .upgrade() Handler — imageUrl ist optional, bestehende Eintraege bleiben unveraendert"

patterns-established:
  - "Bild-Upload-Button als <label> mit sr-only <input type=file> — Touch-kompatibel, kein onPointerDown noetig"
  - "Thumbnail in Produktzeile: w-8 h-8 rounded-lg object-cover shrink-0"
  - "Kachel-Bild: -mx-4 -mt-4 overflow-hidden rounded-t-xl h-20 — bricht Kachel-Padding auf fuer full-bleed Bild"

requirements-completed: [IMG-01, IMG-02, IMG-03]

# Metrics
duration: 7min
completed: 2026-03-24
---

# Phase 11 Plan 02: Produktbilder Summary

**Vollstaendiger Bild-Workflow: Multipart-Upload-Endpoint in Fastify, Bild-Button mit Datei-Picker in Produktverwaltung, conditional Bildanzeige auf Artikelkacheln**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-24T11:48:63Z
- **Completed:** 2026-03-24T11:55:40Z
- **Tasks:** 2 von 2 (Checkpoint abwartet Verifikation)
- **Files modified:** 5

## Accomplishments
- Backend: POST /api/products/:id/image speichert Bild unter /app/data/images/{productId}.{ext}, aktualisiert imageUrl in SQLite
- Backend: GET /api/images/:filename serviert Bilder mit korrektem Content-Type, Cache-Control: immutable, Path-Traversal-Schutz
- Client: imageUrl im Product-Interface, Dexie v5, sync/engine mappt image_url -> imageUrl
- ProductList: "Bild"-Button als label/input-Konstruktion, Vorschau-Thumbnail nach Upload
- ArticleGrid: Produktbild als full-bleed oben in der Kachel, ohne Bild unveraendert

## Task Commits

1. **Task 1: Backend Image-Upload + Serving** - `ca87b9b` (feat)
2. **Task 2: Client Schema + Sync + UI** - `12ddd4d` (feat)

## Files Created/Modified
- `server/src/routes/products.ts` - POST /products/:id/image und GET /images/:filename hinzugefuegt
- `client/src/db/schema.ts` - imageUrl?: string im Product-Interface, Dexie version 5
- `client/src/sync/engine.ts` - ServerProduct.image_url, mapped zu imageUrl im Download
- `client/src/features/admin/products/ProductList.tsx` - handleImageUpload, Bild-Button, Thumbnail
- `client/src/features/pos/ArticleGrid.tsx` - conditional image rendering auf Kacheln

## Decisions Made
- IMAGES_DIR als env-Variable (default /app/data/images) — Docker-Volume-Pfad austauschbar ohne Rebuild
- Cache-Control: immutable fuer Bilder — URL aendert sich bei neuem Upload nicht (productId.ext), aber das ist acceptable fuer diese Nutzungsfrequenz
- Path-Traversal-Schutz im GET-Endpoint (filename-Check auf / und ..)
- Dexie v5 ohne Upgrade-Handler — optionale Felder erfordern kein Schema-Migration in IndexedDB

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Bild-Workflow vollstaendig implementiert (Upload → Speicherung → Anzeige)
- Bilder persistieren in Docker-Volume /app/data/images — bei neuem Deploy bleiben Bilder erhalten
- Ausstehend: manuelle Verifikation (Checkpoint) — Upload testen, Kacheln pruefen

## Self-Check: PASSED

All files found. All commits verified (ca87b9b, 12ddd4d).

---
*Phase: 11-produktbilder-pdf-parsing*
*Completed: 2026-03-24*
