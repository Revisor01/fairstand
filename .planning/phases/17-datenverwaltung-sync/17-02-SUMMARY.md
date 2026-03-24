---
phase: 17-datenverwaltung-sync
plan: "02"
subsystem: ui
tags: [react, dexie, pwa, sync, image-upload, file-input]

# Dependency graph
requires:
  - phase: 17-datenverwaltung-sync-01
    provides: ProductForm mit Kategorie-Dropdown (Plan 01 Voraussetzung)
provides:
  - Bild-Upload direkt in ProductForm mit URL.createObjectURL-Vorschau
  - useSyncStatus-Hook mit SyncStatus-Typ (synced|pending|failed)
  - resetFailedEntries() um Outbox-Einträge mit attempts >= 5 zurückzusetzen
  - 30s-Retry-Interval in triggers.ts
  - Sync-Status-Badge im POS-Header
affects: [pos, sync, admin-products]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - URL.createObjectURL für sofortige Datei-Vorschau ohne Upload
    - useLiveQuery für reaktiven Outbox-Status (Dexie-Reaktivität)
    - Sync-Badge als inline-Button statt separatem Toast-System

key-files:
  created:
    - client/src/sync/useSyncStatus.ts
  modified:
    - client/src/features/admin/products/ProductForm.tsx
    - client/src/features/admin/products/ProductList.tsx
    - client/src/sync/triggers.ts
    - client/src/features/pos/POSScreen.tsx

key-decisions:
  - "URL.createObjectURL statt Server-Upload für Preview: sofortige Vorschau ohne Netzwerkroundtrip, pendingImageFile wird erst beim Speichern hochgeladen"
  - "Server-POST beim neuen Produkt awaited wenn Bild vorhanden: Produkt muss auf Server existieren bevor /image POST möglich ist"
  - "Sync-Badge statt Toast im POS-Header: persistentes Feedback sichtbar solange Outbox Einträge hat, kein Timeout-Management nötig"
  - "resetFailedEntries() setzt attempts auf 0 statt Löschen: nächster flushOutbox-Trigger greift sie erneut auf"

patterns-established:
  - "Bild-Upload-Muster: pendingImageFile State + URL.createObjectURL Preview + Upload erst bei handleSave"
  - "Sync-Status via useLiveQuery auf outbox-Tabelle: Dexie-Reaktivität propagiert Badge-Updates automatisch"

requirements-completed: [VRW-02, SYN-01]

# Metrics
duration: 3min
completed: "2026-03-24"
---

# Phase 17 Plan 02: Bildupload + Sync-Status Summary

**Bild-Upload mit URL.createObjectURL-Vorschau in ProductForm integriert, Bild-Button aus ProductList entfernt, useSyncStatus-Hook + 30s-Retry + pulsierender Sync-Badge im POS-Header**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-24T15:12:33Z
- **Completed:** 2026-03-24T15:14:44Z
- **Tasks:** 2
- **Files modified:** 5 (4 geändert, 1 neu erstellt)

## Accomplishments

- Produktbild direkt im Bearbeitungs-/Anlege-Formular auswählbar mit sofortiger Vorschau via URL.createObjectURL
- Separater "Bild"-Button in ProductList vollständig entfernt — weniger Schritte für Mitarbeiterinnen
- useSyncStatus-Hook liefert reaktiven Sync-Status aus Dexie Outbox (synced/pending/failed)
- POS-Header zeigt pulsierenden amber/rose Badge solange Outbox Einträge vorhanden, Antippen setzt failed Einträge zurück
- Periodischer 30s-Retry in triggers.ts stellt sicher dass Verkäufe auch ohne online/visibilitychange Event übertragen werden

## Task Commits

1. **Task 1: Bildupload mit Preview in ProductForm + Bild-Button aus ProductList entfernt** - `deea203` (feat)
2. **Task 2: useSyncStatus-Hook + 30s-Retry + Sync-Badge in POSScreen** - `7b2b716` (feat)

## Files Created/Modified

- `client/src/sync/useSyncStatus.ts` - Neu: Hook useSyncStatus() + resetFailedEntries() Funktion
- `client/src/features/admin/products/ProductForm.tsx` - imagePreview + pendingImageFile State, Upload-Bereich, handleSave-Logik
- `client/src/features/admin/products/ProductList.tsx` - handleImageUpload Funktion + Bild-Label/Input entfernt
- `client/src/sync/triggers.ts` - setInterval 30s Retry-Trigger
- `client/src/features/pos/POSScreen.tsx` - useSyncStatus Hook + Sync-Badge im Header

## Decisions Made

- **URL.createObjectURL für Preview:** Sofortige Vorschau ohne Netzwerk-Roundtrip. pendingImageFile wird erst beim Speichern an den Server gesendet.
- **Server-POST awaited wenn Bild vorhanden:** Bei neuem Produkt muss die Server-Ressource existieren bevor POST /api/products/:id/image möglich ist. Ohne Bild bleibt fire-and-forget.
- **Sync-Badge statt Toast:** Persistentes visuelles Feedback im Header, kein setTimeout-Management. Sichtbar solange Outbox nicht leer ist.
- **resetFailedEntries setzt attempts auf 0:** Einträge werden nicht gelöscht sondern für den nächsten flushOutbox-Aufruf wieder freigegeben.

## Deviations from Plan

Keine — Plan exakt wie beschrieben ausgeführt.

## Issues Encountered

Keine.

## User Setup Required

Keine — keine externen Services konfiguriert.

## Next Phase Readiness

- Phase 17 vollständig abgeschlossen (beide Pläne)
- Milestone v4.0 Datenqualität & Stabilität ist complete
- Mitarbeiterinnen können Produktbilder direkt beim Anlegen/Bearbeiten hochladen
- Sync-Probleme werden im POS-Header sichtbar und können mit einem Antippen wiederholt werden

---
*Phase: 17-datenverwaltung-sync*
*Completed: 2026-03-24*
