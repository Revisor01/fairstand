# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- React components: `PascalCase.tsx` (e.g., `ArticleCard.tsx`, `POSScreen.tsx`)
- TypeScript utilities/hooks: `camelCase.ts` (e.g., `useCart.ts`, `pdfParser.ts`)
- Test files: `camelCase.test.ts` or `PascalCase.test.tsx` (e.g., `pdfParser.test.ts`, `ArticleCard.test.tsx`)
- Server routes: `camelCase.ts` (e.g., `products.ts`, `sync.ts`)

**Functions:**
- React components (JSX): `PascalCase` (e.g., `ArticleCard`, `POSScreen`, `UnlockedApp`)
- React hooks: `useXxx` pattern (e.g., `useCart`, `useAuth`, `useLowStockCount`)
- Utility functions: `camelCase` (e.g., `shouldTriggerTap`, `checkStockBeforeAdd`, `completeSale`)
- Server route handlers: inline in route files (fastify pattern)
- Internal helpers: `camelCase` with descriptive purpose (e.g., `parseEuroCents`, `extractEvp`, `groupByRows`)

**Variables:**
- Constants: `SCREAMING_SNAKE_CASE` for global/module constants (e.g., `IMAGES_DIR`, `SHOP_ID`, `MIME_TO_EXT`)
- Local variables: `camelCase` (e.g., `startPos`, `quantity`, `designationText`)
- React state: `camelCase` from useState (e.g., `activeView`, `isCartOpen`, `error`)
- Exported module data: `camelCase` (e.g., `db`, `products`, `sales`)

**Types/Interfaces:**
- React component props: `PascalCase` + `Props` suffix (e.g., `ArticleCardProps`, `POSScreenProps`)
- Type unions: `PascalCase` descriptive (e.g., `CartAction`, `AddItemResult`, `POSView`)
- API schemas: `PascalCase` + `Schema` suffix for Zod validators (e.g., `ProductSchema`, `SaleSchema`)
- Database types: Exported from `db/index.js` as `Product`, `Sale`, `CartItem`, `PersistedCartItem`
- Interfaces: `PascalCase` (e.g., `CartState`, `CartItem`, `PdfTextItem`)

## Code Style

**Formatting:**
- No linting or formatting tools configured (no `.eslintrc`, `.prettierrc`)
- Manual formatting follows React/TypeScript conventions
- Indentation: 2 spaces (observed in all files)
- Line breaks: natural, functions around 80-150 lines typical

**Linting:**
- TypeScript strict mode enabled on both client and server (`"strict": true`)
- Client tsconfig enforces: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- No ESLint/Prettier configured — code hygiene relies on manual review

**Comments:**
- JSDoc comments for exported public functions:
  ```typescript
  /**
   * Prüft ob ein Produkt in den Warenkorb gelegt werden kann.
   * Exportiert für Unit-Tests.
   */
  export function checkStockBeforeAdd(product: Product, cartItems: CartItem[]): AddItemResult
  ```
- Inline comments for algorithm explanation (e.g., in `pdfParser.ts`, complex coordinate logic)
- German comments predominant (matching codebase audience — Mitarbeiterinnen in Hennstedt)
- Comments explain "why", not "what" (the code itself is clear)

## Import Organization

**Order:**
1. External npm packages (React, Fastify, Drizzle, etc.)
2. Local absolute imports (via `./`, `../`)
3. Type imports for TypeScript interfaces

**Pattern in client:**
```typescript
import { useState, useEffect } from 'react';
import { ShoppingCart, Settings, Lock, RefreshCw } from 'lucide-react';
import type { Sale } from '../../db/index.js';
import { ArticleGrid } from './ArticleGrid.js';
import { CartPanel } from './CartPanel.js';
import { useCart } from './useCart.js';
```

**Pattern in server:**
```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products } from '../db/schema.js';
```

**Path Aliases:**
- No path aliases configured (`@/` patterns not used)
- Relative imports only (`./ ../`) — encourages understanding of file structure

## Error Handling

**Pattern: Reply-based (Server):**
Server routes use Fastify `reply` object for error responses:
```typescript
// Invalid request
if (!result.success) return reply.status(400).send({ error: result.error.flatten() });

// Async operation error
try {
  // operation
} catch (err) {
  fastify.log.error(err, 'Context');
  return reply.status(500).send({ error: 'Readable message' });
}

// Not found
if (!shop) return reply.status(401).send({ error: 'Falscher PIN' });
```

**Pattern: Try-catch (Client):**
React components use try-catch for async state updates:
```typescript
async function handlePaymentComplete(paidCents: number, changeCents: number) {
  try {
    setError(null);
    const sale = await completeSale(cart.items, paidCents, changeCents);
    setLastSale(sale);
    setView('summary');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
  }
}
```

**Pattern: Custom Result Types:**
Exported utility functions return structured result types rather than throw:
```typescript
export type AddItemResult = { added: true } | { added: false; reason: 'out_of_stock' };

export function checkStockBeforeAdd(product: Product, cartItems: CartItem[]): AddItemResult {
  const inCart = existing ? existing.quantity : 0;
  if (product.stock <= 0 || inCart >= product.stock) {
    return { added: false, reason: 'out_of_stock' };
  }
  return { added: true };
}
```

**Validation:**
- Zod schemas used for request/response validation (both client and server)
- `safeParse()` always used, never `parse()` (prevents throwing)
- Schema errors returned with `.flatten()` for structured feedback

## Logging

**Framework:** No external logging library — uses native tools:
- Server: `fastify.log.info()`, `fastify.log.error()`, `fastify.log.warn()`
- Client: `console.warn()` for warnings/errors only (no info logs in production)

**Patterns:**
- Server logs include context: `fastify.log.error(err, 'PDF-Parsing fehlgeschlagen')`
- Client console.warn only for degraded states: `console.warn('[Fairstand] Storage-Persistenz abgelehnt')`
- No logging of sensitive data (PINs, tokens, etc.)

## React Hooks Design

**Custom Hooks Pattern:**
- Hooks handle side-effects and local state management
- Exported as `use*` (e.g., `useCart`, `useAuth`, `useSyncStatus`)
- Return object with methods + state (not tuple pattern):
  ```typescript
  export function useCart() {
    const [state, dispatch] = useReducer(cartReducer, initialState);
    const total = state.items.reduce(...);

    return {
      items: state.items,
      total,
      addItem: (product) => dispatch({ type: 'ADD_ITEM', product }),
      removeItem: (productId) => dispatch({ type: 'REMOVE_ITEM', productId }),
      clear: () => dispatch({ type: 'CLEAR' }),
    };
  }
  ```

**Pure Functions for Testing:**
- Logic extracted as pure functions (not in hooks) when testable:
  ```typescript
  // Pure function — exported for tests
  export function shouldTriggerTap(start, end, stock): boolean {
    return dx < 8 && dy < 8 && stock > 0;
  }

  // Hook uses it
  export function ArticleCard({ product, onAddToCart }) {
    const startPos = useRef(null);
    // ... uses shouldTriggerTap in event handlers
  }
  ```

## TypeScript Patterns

**Strict Mode:**
- All files compiled with `strict: true`
- No `any` types without explicit reason
- Type imports: `import type { Product } from '../../db/index.js'`

**Type Inference:**
- Let TypeScript infer types where obvious (useState doesn't need generic)
- Explicit types for function signatures and complex objects:
  ```typescript
  interface CartState { items: CartItem[]; }
  function cartReducer(state: CartState, action: CartAction): CartState
  ```

**Const Assertions:**
- Used for literal type narrowing: `as const` in constants
- Not heavily used, prefer explicit types

## Database/ORM Patterns

**Drizzle ORM (Server):**
- Schema-first: define tables in `db/schema.ts`
- Queries use: `db.select().from(table).where(...).get()` or `.all()`
- Bulk operations: `db.insert(...).values(...).onConflictDoUpdate(...).run()`
- No type assertions beyond Drizzle's inference

**Dexie.js (Client):**
- Exported as singleton `db` instance with tables
- No explicit types needed — Dexie infers from schema
- Queries: `await db.table.add()`, `db.table.where(...).toArray()`

## Service/Utility Function Patterns

**PDF Parser (`pdfParser.ts`):**
- Pure functions broken down hierarchically: `groupByRows()` → `isInvoiceRow()` → `parseInvoiceRowFromItems()`
- Helper functions for parsing subtasks: `parseEuroCents()`, `parseMwSt()`, `extractEvp()`
- Coordinate-based layout recognition (PDF text positioning) with tolerance parameters

**Mail Service (`mailer.ts`):**
- Checked at startup: `isMailConfigured()` returns boolean based on env vars
- Single export: `sendReport(recipient, subject, html)`

**Report Template (`reportTemplate.ts`):**
- Separate builders for different report types: `buildMonthlyReportHtml()`, `buildYearlyReportHtml()`
- Pure functions — no side effects

## Multi-Tenancy Pattern

**Row-Level Isolation:**
All tables include `shopId` column (foreign key to `shops` table):
```typescript
// Server routes always filter by shopId
const rows = db.select().from(products).where(eq(products.shopId, shopId)).all();

// Client stores current shopId in IndexedDB (idb-keyval)
const shopId = await get('currentShopId');
```

**Client State:**
- `useAuth()` hook stores and provides `shopId`
- All Dexie queries filtered by shopId via `getShopId()` helper

## Component Patterns

**Button/Card Components:**
- Use `className` with Tailwind (no CSS modules or styled-components)
- Large tap targets for touch devices: `.h-16`, `.w-full`, padding-friendly
- Conditional styling via template literals:
  ```typescript
  const cardClassName = [
    'bg-white shadow-sm rounded-xl',
    isOutOfStock ? 'opacity-50 border-l-4 border-rose-400' : 'active:bg-sky-50',
  ].join(' ');
  ```

**Event Handling:**
- Pointer events used for touch: `onPointerDown`, `onPointerUp`, `onPointerCancel` (not click)
- iOS compatibility: `onPointerCancel` clears state to prevent ghost-taps

## Reducer Pattern

**CartReducer Example:**
```typescript
type CartAction =
  | { type: 'ADD_ITEM'; product: Product }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': return { items: [...state.items, newItem] };
    case 'REMOVE_ITEM': return { items: state.items.filter(...) };
    // ... etc
  }
}
```

**Patterns:**
- Exhaustive: `switch` covers all cases + `default: return state` for safety
- Immutable: always returns new object/array, never mutates state
- Simple state updates return new object: `{ items: [...] }`

## API Response Patterns

**Server → Client:**
```typescript
// Success
{ ok: true, [data]: value }
{ [data]: value }  // Used when data is obvious (e.g., product list)

// Error
{ error: string }
{ error: string, detail: string }  // For rich error info

// Validation error (from Zod)
{ error: { fieldErrors: {...}, formErrors: [...] } }
```

**Client → Server Sync:**
Outbox pattern — client enqueues operations locally:
```typescript
{
  operation: 'SALE_COMPLETE' | 'STOCK_ADJUST' | 'SALE_CANCEL' | 'ITEM_RETURN',
  payload: {...},
  shopId: string,
  createdAt: number
}
```

---

*Conventions analysis: 2026-03-24*
