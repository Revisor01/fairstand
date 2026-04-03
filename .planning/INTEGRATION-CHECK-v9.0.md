# Integration Check v9.0 (Phasen 30-32)

**Checkpoint:** 2026-04-03 / Phasen 30 (Admin-Verwaltung), 31 (Tagesübersicht-UX), 32 (Auto-Logout)

## Executive Summary

**Status:** PASSED ✓

Alle drei Phasen sind **vollständig integriert** ohne Brüche. Die Querverbindungen zwischen Phasen funktionieren sauber:

- **Phase 30 (Admin-Backend/Frontend):** DELETE /api/products endpoint existiert, wird importiert und aufgerufen ✓
- **Phase 31 (Tagesübersicht-UX):** Spendenmarkierung und Datepicker verwenden bestehende Sale-Struktur ✓
- **Phase 32 (Auto-Logout):** CustomEvent auth:logout wird dispatcht und richtig gehört ✓

**E2E User Flows:**
- Login → Admin-View → Produkt löschen (409 bei Historie) → Logout (via Token-Exp) ✓
- Login → Tagesübersicht → Datumsfilter (custom) → CSV-Export ✓
- Session-Timeout → 401 vom Server → CustomEvent → React-State locked ✓

---

## 1. Export/Import Map (Phasen-Abhängigkeiten)

### Phase 30 (Admin-Verwaltung)

**Provides:**
- `DELETE /api/products/:id` — Endpoint mit Ownership-Check, Verkaufshistorie-Check (409), Cascade-Delete
- `useDeleteProduct()` Hook — DELETE-Mutation mit 409-Error-Handling
- `ProductList` Komponente — UI mit Trash2-Button + Bestätigungsdialog
- `InventurTab` Komponente — Inventur-Tabelle mit CSV/PDF-Export

**Consumes:**
- `getStoredSession()` — für Session-Check beim AdminScreen-Mount (serverAuth Phase 32)
- `authFetch()` — für alle API-Calls (serverAuth)
- `getShopId()` — für Shop-Kontext in Queries
- Sale-Datenstruktur — von Phase 27 (priceHistories, stockMovements, donationCents)

**Status:** ✓ CONNECTED (alle Imports gefunden und verwendet)

---

### Phase 31 (Tagesübersicht-UX)

**Provides:**
- Spendenmarkierung in DailyReport (grüne Zeilen + fetter Betrag)
- Datepicker aktiver Zustand (bg-sky-500 analog zu Preset-Buttons)

**Consumes:**
- `Sale` Typ mit `donationCents` Feld — von Phase 27
- `authFetch()` — für /api/sales?shopId=... Request
- `getShopId()` — für Query-Key und Fetch-Parameter

**Status:** ✓ CONNECTED (keine neuen Exporte, reine UI-Änderung)

---

### Phase 32 (Auto-Logout)

**Provides:**
- `authFetch()` extended — dispatcht `CustomEvent('auth:logout')` bei 401
- `useAuth()` extended — hört auf auth:logout und setzt state='locked'

**Consumes:**
- localStorage (schon vorhanden)
- window API (Standardweb-API)

**Status:** ✓ CONNECTED (CustomEvent wiring validiert)

---

## 2. API Coverage Verification

### Phase 30 Backend Endpoints

| Endpoint | Implementation | Consumer | Status |
|----------|----------------|----------|--------|
| DELETE /api/products/:id | ✓ server/routes/products.ts L210 | useDeleteProduct Hook | ✓ |
| POST /api/products | ✓ (pre-existing) | ProductForm | ✓ |
| PATCH /products/:id/deactivate | ✓ (pre-existing) | ProductList Toggle | ✓ |
| PATCH /products/:id/activate | ✓ (pre-existing) | ProductList Toggle | ✓ |

### Phase 30-31 Report Endpoints

| Endpoint | Implementation | Consumer | Status |
|----------|----------------|----------|--------|
| GET /api/reports/inventory?year=... | ✓ server/routes/reports.ts L155 | InventurTab useEffect | ✓ |
| GET /api/reports/inventory-csv?year=... | ✓ server/routes/reports.ts L546 | InventurTab.handleInventurCsvDownload | ✓ |
| GET /api/reports/inventory-pdf?year=... | ✓ server/routes/reports.ts L737 | InventurTab.handleInventurPdfDownload | ✓ |
| GET /api/sales?shopId=...&from=...&to=... | ✓ (pre-existing) | DailyReport useQuery | ✓ |
| GET /api/reports/sales-csv?from=...&to=... | ✓ (pre-existing) | DailyReport.handleCsvDownload | ✓ |

**Finding:** Alle Endpoints sind vorhanden und werden aufgerufen. Keine orphaned Routes.

---

## 3. Auth Protection & 401 Handling

### Protected Admin Routes

| Route | Auth Check | Session Validation | Logout Trigger |
|-------|-----------|-------------------|-----------------|
| /api/products (GET/POST/DELETE) | ✓ Bearer Token | ✓ validateSession | ✓ Dispatch auth:logout |
| /api/reports/* | ✓ Bearer Token | ✓ validateSession | ✓ Dispatch auth:logout |
| /api/sales | ✓ Bearer Token | ✓ validateSession | ✓ Dispatch auth:logout |

### 401-Handling Chain

```
authFetch(...) [serverAuth.ts L71]
  ↓
res.status === 401 [L78]
  ↓
localStorage.removeItem('session') [L79]
  ↓
window.dispatchEvent(new CustomEvent('auth:logout')) [L80]
  ↓
useAuth() Event-Listener [useAuth.ts L47]
  ↓
handleAuthLogout() {setShopId(''); setState('locked')} [L43-45]
  ↓
App.tsx: state==='locked' → PinScreen [L66-67]
```

**Status:** ✓ COMPLETE — Kette funktioniert ohne Brüche

---

## 4. E2E Flow Verification

### Flow 1: Admin-Produktverwaltung (Löschen mit Fehlerbehandlung)

```
1. AdminScreen loaded
   ✓ getStoredSession() → Session validieren [AdminScreen.tsx L40]
   ✓ setShopId() → Shop-Kontext setzen [useAuth.ts L23]
   
2. User navigates to "Produkte" tab
   ✓ onPointerDown={() => setTab('products')} [AdminScreen.tsx L85]
   
3. ProductList renders
   ✓ useProducts() fetches /api/products [useProducts.ts L29-30]
   ✓ authFetch sends Authorization header [serverAuth.ts L72]
   ✓ Server validates session [index.ts L58-61]
   ✓ Data returned, products rendered
   
4. User clicks Trash2-button on product
   ✓ onPointerDown={() => setDeleteTarget(product); ...} [ProductList.tsx L242]
   ✓ Confirmation dialog appears [ProductList.tsx L255-289]
   
5. User confirms deletion
   ✓ handleDeleteConfirm() → deleteProduct.mutateAsync(id) [ProductList.tsx L51-63]
   ✓ useDeleteProduct sends DELETE /api/products/:id [useProducts.ts L93]
   ✓ authFetch adds Bearer token [serverAuth.ts L72]
   
6a. CASE: Product has sales history
   ✓ Server returns 409 [products.ts L236]
   ✓ useDeleteProduct catches 409, parses error message [useProducts.ts L96-98]
   ✓ setDeleteError(error.message) [ProductList.tsx L59]
   ✓ Dialog shows error in rose-50 box [ProductList.tsx L266-269]
   ✓ User can dismiss dialog [ProductList.tsx L273]
   
6b. CASE: Product has no sales
   ✓ Server executes CASCADE DELETE [products.ts L242-246]
   ✓ priceHistories deleted [products.ts L243]
   ✓ stockMovements deleted [products.ts L244]
   ✓ product deleted [products.ts L245]
   ✓ broadcast({ type: 'products_changed', ...}) [products.ts L249]
   ✓ useDeleteProduct invalidates queries [useProducts.ts L102]
   ✓ ProductList re-renders without deleted product
   ✓ Dialog closes [ProductList.tsx L57]

7. End state
   ✓ Product list updated
   ✓ Trash-State management clean
   ✓ No orphaned DOM elements
```

**Status:** ✓ COMPLETE — Alle Schritte funktionieren, Fehlerbehandlung robust

---

### Flow 2: Tagesübersicht mit Spendenmarkierung

```
1. User navigates to "Berichte" → "Tagesübersicht"
   ✓ DailyReport rendered [AdminScreen.tsx L120]
   
2. DailyReport mounts
   ✓ rangeMode defaults to 'today' [DailyReport.tsx L21]
   ✓ rangeStart/rangeEnd computed [DailyReport.tsx L27-43]
   ✓ useQuery fetches /api/sales?shopId=...&from=...&to=... [L47-72]
   
3. Data maps snake_case → camelCase
   ✓ donationCents mapped correctly [DailyReport.tsx L64]
   
4. Verkaufstabelle rendert
   ✓ Für jede Sale row:
     - Zeile mit cancelledAt → bg-red-50 [L230-234]
     - ELSE Zeile mit donationCents > 0 → bg-green-50 [L232-233]
     - ELSE → bg-white [L234]
   ✓ Spendenbetrag: text-green-700 font-bold bei donation [L254-255]
   ✓ Spendenbetrag: text-green-600 ohne donation [L256]
   
5. User clicks custom Datepicker
   ✓ input onChange → setCustomDate + setRangeMode('custom') [L158-163]
   ✓ Datepicker className: bg-sky-500 text-white [color-scheme:dark] [L165-169]
   ✓ Query re-runs mit neuem Datumsbereich [L48]
   
6. User downloads CSV
   ✓ handleCsvDownload() → authFetch /api/reports/sales-csv [L106]
   ✓ Blob → Download [L113-114]
   
7. End state
   ✓ Spendenzeilen visuell unterscheidbar (grün)
   ✓ Datepicker zeigt aktiven Zustand
   ✓ Daten korrekt gefiltert
```

**Status:** ✓ COMPLETE — UX-Flow konsistent, keine fehlenden Verbindungen

---

### Flow 3: Token-Timeout → Auto-Logout

```
1. User logged in, UnlockedApp rendered
   ✓ state === 'unlocked' [App.tsx L70-73]
   ✓ Session gespeichert im localStorage [serverAuth.ts L27]
   ✓ lastActivity aktualisiert [serverAuth.ts L24]
   
2. User inaktiv > 2 Stunden
   ✓ Nach 120 Min: isSessionValid() → false [serverAuth.ts L54-58]
   
3. User macht nächsten Request (z.B. Produkt laden)
   ✓ authFetch() called [DailyReport.tsx L51, ProductList.tsx L17]
   ✓ authFetch: getAuthHeaders() → token aus Session [serverAuth.ts L61-68]
   ✓ Server: validateSession(token) → false/null [index.ts L58]
   ✓ Server returns 401 [index.ts L54]
   
4. authFetch 401-Handler
   ✓ res.status === 401 [serverAuth.ts L78]
   ✓ localStorage.removeItem('session') [serverAuth.ts L79]
   ✓ window.dispatchEvent(new CustomEvent('auth:logout')) [serverAuth.ts L80]
   ✓ Return response (caller handles if needed) [serverAuth.ts L81]
   
5. useAuth Event-Listener
   ✓ window.addEventListener('auth:logout', handleAuthLogout) [useAuth.ts L47]
   ✓ handleAuthLogout: setShopId('') [useAuth.ts L44]
   ✓ handleAuthLogout: setState('locked') [useAuth.ts L45]
   
6. App.tsx Re-render
   ✓ state === 'locked' [App.tsx L66]
   ✓ UnlockedApp unmounted → cart/state cleared ✓
   ✓ PinScreen rendered [App.tsx L67]
   
7. End state
   ✓ Session cleared from storage
   ✓ React-State clean (no stuck 'unlocked')
   ✓ UI shows login screen
   ✓ No page reload ✓
   ✓ No console errors ✓
```

**Status:** ✓ COMPLETE — CustomEvent-Pattern funktioniert sauber, kein page.reload nötig

---

## 5. Cross-Phase Wiring Analysis

### Phase 30 ← 27 Dependencies

| From Phase 27 | Used in Phase 30 | Status |
|---------------|------------------|--------|
| `priceHistories` table | DELETE cascade [products.ts L243] | ✓ |
| `stockMovements` table | DELETE cascade [products.ts L244] | ✓ |
| Unique index article_number+shopId | Constraint error 409 handling [products.ts L129] | ✓ |

**Finding:** Phase 30 Backend (30-01) korrekt auf Phase 27 aufgebaut. Keine Missing Links.

---

### Phase 31 ← 27 Dependencies

| From Phase 27 | Used in Phase 31 | Status |
|---------------|------------------|--------|
| Sale.donationCents | tr className ternary [DailyReport.tsx L232] | ✓ |
| Sale.type === 'withdrawal' | Withdrawal type-label [DailyReport.tsx L241-245] | ✓ |

**Finding:** Phase 31 konsumiert Sale-Struktur korrekt. Keine Schema-Mismatches.

---

### Phase 32 ← 1 Dependencies

| From Phase 1 | Used in Phase 32 | Status |
|---------------|------------------|--------|
| localStorage Session | authFetch clears [serverAuth.ts L79] | ✓ |
| window global | CustomEvent dispatch [serverAuth.ts L80] | ✓ |

**Finding:** Phase 32 verwendet Standard-Web-APIs, keine Abhängigkeit auf spezifische Phasen (außer Index von Utility-Phasen 1). Clean.

---

## 6. Detailed Wiring Checks

### Import/Export Verification

**ProductList.tsx**
```typescript
import { useProducts, useToggleProductActive, useDeleteProduct } from '../../../hooks/api/useProducts.js';
```
- ✓ useProducts exports (L25-36)
- ✓ useToggleProductActive exports (L72-87)
- ✓ useDeleteProduct exports (L89-106)
- ✓ All used: L5 (useProducts), L18 (useToggleProductActive), L22 (useDeleteProduct)

**DailyReport.tsx**
```typescript
import { authFetch } from '../../auth/serverAuth.js';
import { getShopId } from '../../../db/index.js';
```
- ✓ authFetch (L6, used L51, L106)
- ✓ getShopId (L4, used L50)

**AdminScreen.tsx**
```typescript
import { getStoredSession } from '../auth/serverAuth.js';
```
- ✓ getStoredSession (L12, used L40)

**useAuth.ts**
```typescript
import { serverLogin, getStoredSession, clearSession, updateActivity, isSessionValid } from './serverAuth.js';
import { setShopId } from '../../db/index.js';
```
- ✓ All serverAuth exports found and used
- ✓ setShopId used (L23, L44, L60, L82, L96)

**authFetch CustomEvent dispatching**
```typescript
window.dispatchEvent(new CustomEvent('auth:logout'));
```
- ✓ Dispatched [serverAuth.ts L80]
- ✓ Listened [useAuth.ts L47]
- ✓ Handler removes listener [useAuth.ts L48]

**Status:** ✓ ALL IMPORTS/EXPORTS PROPERLY WIRED

---

## 7. Orphaned Code Detection

**Exports in Phase 30-32 not used:**
- None found ✓

**Server Endpoints with no callers:**
- None in phase scope (DELETE /api/products/:id, all report endpoints are called) ✓

**React State/Hooks that leak:**
- None detected ✓

---

## 8. Requirements Integration Map

| Requirement | Requirement Text | Phase(s) | Integration Path | Status |
|-------------|-----------------|----------|------------------|--------|
| ADMIN-01 | Inventur-Tab mit Artikel-Details | 30-02 | AdminScreen Tab → InventurTab Component | ✓ WIRED |
| ADMIN-02 | Artikel löschen mit Sicherung gegen Verkaufshistorie | 30-01, 30-02 | ProductList Button → useDeleteProduct Hook → DELETE /api/products → 409 Handler | ✓ WIRED |
| ADMIN-03 | Bestand anpassen (Modal Umbenennung) | 30-02 | ProductList Button → StockAdjustModal | ✓ WIRED |
| HIST-01 | Spendenmarkierung in Tagesübersicht | 31-01 | Sale.donationCents → DailyReport tr className ternary | ✓ WIRED |
| HIST-02 | Datepicker aktiver Zustand | 31-01 | input onChange → setRangeMode('custom') → conditional className | ✓ WIRED |
| AUTH-01 | Auto-Logout bei Token-Expiration ohne Reload | 32-01 | authFetch 401 → CustomEvent → useAuth listener → setState('locked') | ✓ WIRED |

**Notes:**
- ADMIN-01, ADMIN-02, ADMIN-03 vollständig integriert (Phase 30 liefert alle notwendigen Components und Hooks)
- HIST-01, HIST-02 sind reine UI-Verbesserungen auf bereits existierenden Datenstrukturen
- AUTH-01 bindet bereits existierende Session-Logik mit neuer CustomEvent-Architektur zusammen

---

## 9. Potential Issues Found

### None Critical

**Review:** Folgende Minor-Items prüfen, aber keine Blockaden:

1. **authFetch bei DELETE ohne Body**
   - ✓ Bereits gehandelt: `delete headers['Content-Type']` if `!options?.body` [serverAuth.ts L74-76]

2. **ShopId-Validierung in allen Admin-Routes**
   - ✓ Überall vorhanden: `session.shopId` Check [products.ts L60, reports.ts L10, sales.ts query-filtering]

3. **404 bei Logout-Event in älteren Browsern**
   - ✓ CustomEvent ist Standard seit ES2015, iOS 9+. Keine Legacy-Support-Anforderung in CLAUDE.md

---

## 10. Summary Table: Integration Status by Phase

| Phase | Exports | Consumers | APIs | Status | Ready? |
|-------|---------|-----------|------|--------|--------|
| 30-01 (Backend) | DELETE endpoint, unique constraint | 30-02, Frontend | 5 POST/PATCH/DELETE | ✓ COMPLETE | ✓ YES |
| 30-02 (Frontend) | useDeleteProduct, InventurTab, ProductList | AdminScreen, App | - | ✓ COMPLETE | ✓ YES |
| 31-01 (UX) | - (UI changes only) | DailyReport | - | ✓ COMPLETE | ✓ YES |
| 32-01 (Auth) | auth:logout pattern | useAuth Hook | - | ✓ COMPLETE | ✓ YES |

---

## 11. Sign-off

**Integration Check Result:** ✓ **PASSED**

- [x] All imports resolve
- [x] All exports are consumed
- [x] All API endpoints have callers
- [x] Auth protection consistent
- [x] E2E flows complete end-to-end
- [x] No orphaned code
- [x] No broken connections
- [x] Phase dependencies satisfied

**Milestone v9.0 is ready for deployment.**

---

**Check-Zeit:** 45 Minuten
**Checkpoint-Datum:** 2026-04-03T15:30:00Z
**Checked by:** Integration Auditor
