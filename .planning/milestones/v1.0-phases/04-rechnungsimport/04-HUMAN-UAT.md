---
status: partial
phase: 04-rechnungsimport
source: [04-VERIFICATION.md]
started: 2026-03-23T12:00:00Z
updated: 2026-03-23T12:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. PDF-Parsing mit echter Süd-Nord-Kontor Rechnung
expected: Koordinatenbasiertes Parsing erkennt alle Positionen korrekt (Menge, ArtikelNr, Bezeichnung, EK-Preis, EVP, MwSt)
result: [pending]

### 2. Kompletter Import-Flow auf iPad
expected: Touch-Verhalten funktioniert, Tabellen-Scrolling, visuelle Farbcodierung (grün=bekannt, orange=neu) korrekt
result: [pending]

### 3. Offline-Verhalten der Upload-Zone
expected: navigator.onLine-Prüfung deaktiviert Upload bei Offline, klare Meldung angezeigt
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
