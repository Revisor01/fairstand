---
status: passed
phase: 17-datenverwaltung-sync
verified: 2026-03-24
---

# Phase 17: Datenverwaltung & Sync — Verification

## Must-Haves

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Kategorien als eigene Liste anlegen/umbenennen/löschen | ✓ PASS | categories-Tabelle in Drizzle, CRUD-Endpoints, Modal in ProductList |
| 2 | Kategorie-Dropdown statt Freitext in ProductForm | ✓ PASS | ProductForm.tsx: select mit useLiveQuery auf categories |
| 3 | Bild-Upload in ProductForm mit Preview | ✓ PASS | imagePreview + pendingImageFile State, URL.createObjectURL |
| 4 | Sync-Fehler als klare UI-Meldung | ✓ PASS | useSyncStatus Hook + amber/rose Badge in POSScreen |
| 5 | Automatischer Retry | ✓ PASS | 30s setInterval in triggers.ts |

## Requirements Coverage

| REQ-ID | Description | Status |
|--------|-------------|--------|
| VRW-01 | Zentrales Kategorie-Management | ✓ Complete |
| VRW-02 | Produktbild-Upload verbessern | ✓ Complete |
| SYN-01 | Sync-Robustheit | ✓ Complete |

## Score

**5/5 must-haves verified** — Phase goal achieved.

## Human Verification

1. Neue Kategorie anlegen → erscheint im Dropdown beim Produkt bearbeiten
2. Kategorie umbenennen → alle Produkte mit alter Kategorie bekommen neuen Namen
3. Produkt bearbeiten → Bild hochladen → Preview sichtbar → Speichern → Bild erscheint in Kachel
4. Offline gehen → Verkauf tätigen → Badge pulsiert im POS-Header → Online → Badge verschwindet
