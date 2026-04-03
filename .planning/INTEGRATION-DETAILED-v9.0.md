# Detailed Integration Analysis v9.0

Generated: 2026-04-03T15:30:00Z

## File Cross-References

### Phase 30 (Admin-Verwaltung)

**Backend (30-01):**
- `/server/src/routes/products.ts` — DELETE endpoint
- `/server/migrations/0006_add_article_number_unique.sql` — Unique constraint
- `/server/src/db/schema.ts` — articles_index definition

**Frontend (30-02):**
- `/client/src/features/admin/AdminScreen.tsx` — Tab navigation (L14-27, 125-140)
- `/client/src/features/admin/products/ProductList.tsx` — Delete button & dialog (L241-289)
- `/client/src/features/admin/reports/InventurTab.tsx` — Inventory tab & exports
- `/client/src/hooks/api/useProducts.ts` — useDeleteProduct hook (L89-106)
- `/client/src/features/admin/products/StockAdjustModal.tsx` — "Bestand anpassen" label

**Connection Points:**
1. ProductList imports useDeleteProduct from useProducts.ts
   - File: `/client/src/features/admin/products/ProductList.tsx:5`
   - Used: L22, L56
   
2. useDeleteProduct sends DELETE request to /api/products/:id
   - File: `/client/src/hooks/api/useProducts.ts:93`
   - Target: `/api/products/{productId}`
   
3. Server endpoint implements DELETE with 409 handling
   - File: `/server/src/routes/products.ts:211`
   - Logic: Ownership check (403), Not-found (404), Sales history check (409), Cascade delete
   
4. AdminScreen imports getStoredSession for session check
   - File: `/client/src/features/admin/AdminScreen.tsx:12,40`
   - Session validation before rendering

---

### Phase 31 (Tagesübersicht-UX)

**File:**
- `/client/src/features/admin/reports/DailyReport.tsx`

**Changes:**
1. Spendenmarkierung (Line 230-234):
   ```typescript
   className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
     sale.cancelledAt
       ? 'bg-red-50 hover:bg-red-100 active:bg-red-100 opacity-60'
       : sale.donationCents > 0
       ? 'bg-green-50 hover:bg-green-100 active:bg-green-100'
       : 'hover:bg-sky-50 active:bg-sky-100'
   }`}
   ```
   
2. Spendenbetrag Bold (Line 254-256):
   ```typescript
   <td className={`px-4 py-3 text-right font-medium ${
     sale.cancelledAt
       ? 'text-red-300'
       : sale.donationCents > 0
       ? 'text-green-700 font-bold'      // Bold für Spenden
       : 'text-green-600'
   }`}>
   ```

3. Datepicker Active State (Line 155-169):
   ```typescript
   <input
     type="date"
     className={`min-h-[44px] rounded-lg px-3 text-sm focus:outline-none transition-colors ${
       rangeMode === 'custom'
         ? 'bg-sky-500 text-white border border-sky-500 [color-scheme:dark]'
         : 'border border-slate-200 focus:border-sky-400'
     }`}
   />
   ```

**Data Flow:**
1. DailyReport.tsx L47-72: useQuery fetches /api/sales
2. Data maps snake_case: `donation_cents` → `donationCents` (L64)
3. Table renders with conditional className (L232, L254)

---

### Phase 32 (Auto-Logout)

**Files:**
- `/client/src/features/auth/serverAuth.ts` — CustomEvent dispatch
- `/client/src/features/auth/useAuth.ts` — Event listener

**Connection Chain:**

1. **authFetch dispatch (serverAuth.ts L71-84):**
   ```typescript
   export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
     const headers = await getAuthHeaders();
     if (!options?.body) {
       delete headers['Content-Type'];
     }
     const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
     if (res.status === 401) {
       localStorage.removeItem('session');
       window.dispatchEvent(new CustomEvent('auth:logout'));  // ← DISPATCH
       return res;
     }
     return res;
   }
   ```

2. **useAuth listener (useAuth.ts L42-49):**
   ```typescript
   useEffect(() => {
     const handleAuthLogout = () => {
       setShopId('');
       setState('locked');
     };
     window.addEventListener('auth:logout', handleAuthLogout);  // ← LISTEN
     return () => window.removeEventListener('auth:logout', handleAuthLogout);
   }, []);
   ```

3. **App.tsx State Render (App.tsx L66-67):**
   ```typescript
   if (state === 'locked') {
     return <PinScreen mode="unlock" onSetup={setup} onUnlock={unlock} />;
   }
   ```

**Call Sites (where authFetch returns 401 → dispatch):**
- `/client/src/features/admin/reports/InventurTab.tsx:53` — GET /api/reports/inventory
- `/client/src/features/admin/reports/DailyReport.tsx:51` — GET /api/sales
- `/client/src/features/admin/reports/InventurTab.tsx:63` — GET /api/reports/inventory-csv
- `/client/src/features/admin/products/ProductList.tsx:17` — useProducts hook
- `/client/src/hooks/api/useProducts.ts:56` — DELETE /api/products/:id

---

## API Route Protection

All protected routes require Bearer token validation (index.ts L45-65):

```typescript
fastify.addHook('preHandler', async (request, reply) => {
  const url = request.url;
  // Öffentliche Endpoints: Auth (Login) + Health
  if (url.startsWith('/api/auth/') || url.startsWith('/api/health') || url.startsWith('/api/ws')) {
    return;
  }

  const authHeader = request.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Authentifizierung erforderlich' });
  }

  const token = authHeader.slice(7); // "Bearer " entfernen
  const session = validateSession(token);
  if (!session) {
    return reply.status(401).send({ error: 'Ungültiger oder abgelaufener Token' });
  }

  (request as any).session = session;
});
```

**Routes in Phase Scope:**
- DELETE /api/products/:id [products.ts L211]
- GET /api/reports/inventory [reports.ts L155]
- GET /api/reports/inventory-csv [reports.ts L546]
- GET /api/reports/inventory-pdf [reports.ts L737]
- GET /api/sales [sales.ts — pre-existing]

All return 401 on invalid/expired token → authFetch dispatch → useAuth handler

---

## Type/Schema Consistency

### Sale Type (Phase 27 → Phase 31)

**Definition (Phase 27):**
```typescript
interface Sale {
  id: string;
  shopId: string;
  items: Array<...>;
  totalCents: number;
  paidCents: number;
  changeCents: number;
  donationCents: number;         // ← USED IN PHASE 31
  type?: 'sale' | 'withdrawal';  // ← USED IN PHASE 31
  ...
}
```

**Usage in Phase 31 (DailyReport.tsx):**
- L64: `donationCents: Number(s.donation_cents ?? s.donationCents ?? 0)`
- L76: `regularSales.filter(s => s.type !== 'withdrawal')`
- L232-234: `sale.donationCents > 0` (conditional className)
- L241-245: `sale.type === 'withdrawal'` (type label)

**Mapping:** Server returns snake_case (`donation_cents`, `type`), mapped to camelCase (L57-70)

---

## 401 Response Handling Across Phases

| Phase | Component | API Call | Fallback | 401 Behavior |
|-------|-----------|----------|----------|--------------|
| 30 | ProductList | DELETE /api/products/:id | useDeleteProduct mutation | dispatch auth:logout |
| 30 | InventurTab | GET /api/reports/inventory | useQuery | dispatch auth:logout |
| 31 | DailyReport | GET /api/sales | useQuery | dispatch auth:logout |
| 31 | DailyReport | GET /api/reports/sales-csv | onClick handler | dispatch auth:logout |

All use authFetch wrapper → consistent 401 handling

---

## State Transitions

### Login Flow (Pre-Phase-32)
```
checking → unlocked (valid session)
                  ↓ (use app)
                  ↓ (make API request)
                  ↓ (401 from server)
                  ↓ (CustomEvent dispatch)
                  locked (state change → re-render)
                  ↓ (show PinScreen)
```

### Storage Consistency
```
1. serverLogin() [Phase 32 dependency]:
   POST /api/auth/pin → localStorage.setItem('session', JSON.stringify(session))

2. useAuth() on mount:
   getStoredSession() → if valid: setState('unlocked')

3. On 401:
   authFetch → localStorage.removeItem('session')
   authFetch → window.dispatchEvent(CustomEvent('auth:logout'))
   useAuth listener → setShopId('') + setState('locked')
   
   Storage now empty ✓
   State now 'locked' ✓
   App shows PinScreen ✓
```

---

## Summary: No Breaking Integrations Found

| Aspect | Status | Notes |
|--------|--------|-------|
| Imports/Exports | ✓ | All resolved, no circular deps |
| API Calls | ✓ | All endpoints exist & callable |
| Data Types | ✓ | Snake/camelCase mapping correct |
| Auth Guard | ✓ | Consistent 401 handling |
| State Mgmt | ✓ | Clean transitions, no leaks |
| E2E Flows | ✓ | All tested scenarios pass |

**v9.0 Integration Status: READY FOR PRODUCTION** ✓
