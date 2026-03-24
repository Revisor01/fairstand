# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**Runner:**
- Vitest 3.x (client) and 4.1.1 (server)
- Config: No explicit `vitest.config.ts` committed — uses defaults
- Workspace setup: `npm run test` in each workspace (`client`, `server`)

**Assertion Library:**
- Vitest's built-in `expect()` from `vitest` package
- No additional assertion libraries (Chai, etc.)

**Run Commands:**
```bash
npm run test              # Run all tests (in client or server workspace)
npm run test --watch     # Watch mode (if configured)
npm run build            # Type-check with TypeScript before testing
```

**Commands in package.json:**
- Client: `"test": "vitest"` (no watch mode configured by default)
- Server: `"test": "vitest"` (no watch mode configured by default)
- Both: `npm run build` runs TypeScript compiler first (`tsc`)

## Test File Organization

**Location:**
- Co-located with source: `feature.ts` and `feature.test.ts` in same directory
- Example: `pdfParser.ts` + `pdfParser.test.ts` in `server/src/lib/`
- Example: `ArticleCard.tsx` + `ArticleCard.test.tsx` in `client/src/features/pos/`

**Naming:**
- Pattern: `{name}.test.ts` for utilities, `{name}.test.tsx` for React components
- All test files discoverable via `**/*.test.ts{x}` glob

**Structure:**
```
server/src/
├── lib/
│   ├── pdfParser.ts
│   └── pdfParser.test.ts
client/src/
├── features/pos/
│   ├── ArticleCard.tsx
│   ├── ArticleCard.test.tsx
│   ├── useCart.ts
│   └── useCart.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('parseSuedNordKontorPdf — Format A (2600988, ohne Rabatt)', () => {
  it('parst die Rechnung ohne parseWarning', async () => {
    const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2600988.pdf'));
    const rows = await parseSuedNordKontorPdf(buffer);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.parseWarning, `Zeile ${row.lineNumber}: ${row.parseWarning}`).toBeUndefined();
    }
  });
});
```

**Patterns Observed:**

1. **Describe blocks:** Group tests by feature/format/behavior
   - Example: `describe('parseSuedNordKontorPdf — Format A (2600988, ohne Rabatt)')`
   - Suffix with context (invoice format, method signature, scenario)

2. **It statements:** One assertion focus per test (when possible)
   - Descriptive German text: `it('parst die Rechnung ohne parseWarning')`
   - Allow loops for batch validation (PDF invoice rows)

3. **Setup:** Per-test setup inline (no `beforeEach` currently used)
   ```typescript
   it('Test name', async () => {
     const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2600988.pdf'));
     const rows = await parseSuedNordKontorPdf(buffer);
     expect(rows.length).toBeGreaterThan(0);
   });
   ```

4. **Async tests:** Use `async/await` (not Promises)
   ```typescript
   it('parst die Rechnung', async () => {
     const rows = await parseSuedNordKontorPdf(buffer);
     expect(rows).toBeDefined();
   });
   ```

## Mocking

**Framework:**
- Vitest's built-in mocking via `vi.mock()` (not used in current tests)
- No external mocking library (jest, sinon)

**Current Approach:**
- **No mocks used** in existing tests
- Tests use real data (actual PDF files, real products, real calculations)
- Test fixtures created inline as helper functions

**Pattern for React Hook Testing:**
Extract pure function from hook, test function separately:
```typescript
// In useCart.ts
export function checkStockBeforeAdd(product: Product, cartItems: CartItem[]): AddItemResult {
  // Pure logic
}

// In useCart.test.ts
import { checkStockBeforeAdd } from './useCart.js';

function makeProduct(id: string, stock: number): Product {
  return { id, shopId: 'shop-1', stock, /* ... other required fields */ };
}

describe('checkStockBeforeAdd', () => {
  it('returns { added: true } when stock > 0', () => {
    const product = makeProduct('p1', 3);
    const result = checkStockBeforeAdd(product, []);
    expect(result).toEqual({ added: true });
  });
});
```

**What to Mock:**
- **File I/O:** Currently not mocked (tests use real `Rechnung 2600988.pdf` in git)
- **Network:** Not mocked (no API tests yet)
- **Timers:** Not mocked (no time-dependent tests)

**What NOT to Mock:**
- **Core logic functions:** Test real implementations (`pdfParser`, `checkStockBeforeAdd`)
- **Product/Sales data:** Use real fixtures or inline test data
- **Zod schemas:** Validate real payloads, not mock validation

## Fixtures and Factories

**Test Data Pattern:**
Factory functions create consistent test objects:
```typescript
// In pdfParser.test.ts
// Uses real PDF files from '../Süd-Nord-Kontor/' directory

// In ArticleCard.test.tsx
function makeProduct(stock: number, minStock = 0): Product {
  return {
    id: 'p1',
    shopId: 'shop-1',
    articleNumber: '001',
    name: 'Test Produkt',
    category: 'Kategorie',
    purchasePrice: 100,
    salePrice: 150,
    vatRate: 7,
    stock,
    minStock,
    active: true,
    updatedAt: Date.now(),
  };
}

// In useCart.test.ts
function makeCartItem(productId: string, quantity: number): CartItem {
  return {
    productId,
    articleNumber: '001',
    name: 'Test Produkt',
    salePrice: 150,
    quantity,
  };
}
```

**Location:**
- Factories defined at top of test file (after imports, before describes)
- Not extracted to shared `fixtures/` directory (kept co-located)

**Real PDF Files:**
- Test PDFs stored in `../../Süd-Nord-Kontor/` (parallel to `server/` directory)
- Referenced via `process.cwd()` relative paths
- Allows testing against real Süd-Nord-Kontor invoice formats (Format A and B)

## Coverage

**Requirements:**
- No coverage target enforced (no CI/CD coverage gate)
- `npm run test` runs all tests, no coverage report generated

**View Coverage:**
- Coverage command: Not configured
- Could enable via `vitest --coverage` if needed

## Test Types

**Unit Tests:**
- **Scope:** Pure functions with clear input/output
- **Approach:** Test logic isolation (no React, no async I/O beyond reading files)
- **Examples:**
  - `pdfParser.test.ts`: Tests PDF parsing functions against real invoices
  - `ArticleCard.test.tsx`: Tests `shouldTriggerTap()` pure function
  - `useCart.test.ts`: Tests `checkStockBeforeAdd()` pure function

**Integration Tests:**
- **Status:** Not yet implemented
- **Would cover:** Client ↔ Server sync, Dexie ↔ API interactions
- **Future approach:** Mock server with `msw` (Mock Service Worker) or Vitest server mocking

**E2E Tests:**
- **Framework:** Not used
- **Alternative:** Could use Playwright with PWA offline simulation (`context.setOffline(true)`)
- **Current approach:** Manual testing in browser for critical flows

## Common Patterns

### Async Testing

**Pattern: File I/O (async)**
```typescript
it('parst die Rechnung ohne parseWarning', async () => {
  const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2600988.pdf'));
  const rows = await parseSuedNordKontorPdf(buffer);

  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row.parseWarning).toBeUndefined();
  }
});
```

**Pattern: Loop Validation**
```typescript
it('hat gueltige Mengenwerte > 0 fuer alle Zeilen', async () => {
  const buffer = readFileSync(join(PDF_DIR, 'Rechnung 2600988.pdf'));
  const rows = await parseSuedNordKontorPdf(buffer);

  for (const row of rows) {
    expect(row.quantity, `Zeile ${row.lineNumber}: Menge ungueltig`).toBeGreaterThan(0);
  }
});
```

### Error Testing

**Pattern: Validation Errors**
```typescript
it('returns { added: false, reason: out_of_stock } when stock === 0', () => {
  const product = makeProduct('p1', 0);
  const result = checkStockBeforeAdd(product, []);
  expect(result).toEqual({ added: false, reason: 'out_of_stock' });
});
```

**Pattern: Boundary Testing**
```typescript
it('gibt false zurück wenn genau 8px Bewegung (an der Grenze, nicht unter)', () => {
  // Threshold ist strict < 8, also 8px soll NICHT triggern
  const result = shouldTriggerTap({ x: 0, y: 0 }, { x: 8, y: 0 }, 5);
  expect(result).toBe(false);
});
```

### React Component Testing

**Current Approach:**
- **No full component rendering** (no React Testing Library)
- **Exported pure functions only** — test logic, not UI rendering
- **Example:** `shouldTriggerTap()` exported from `ArticleCard.tsx` for testing

**If full component tests needed:**
- Use Vitest + Testing Library
- Test event handlers via simulated pointer events
- Avoid mocking React internals

## Test Data Management

**Real Files:**
- PDF invoices stored in `../../Süd-Nord-Kontor/` directory
- Two invoice formats tested: `Rechnung 2600988.pdf` (Format A), `Rechnung 2552709.pdf` (Format B)
- Allows regression testing against actual Süd-Nord-Kontor invoices

**Inline Factories:**
- Product, CartItem, Sale objects created via `makeProduct()`, `makeCartItem()` helpers
- Keep test data close to test code

**No Database Seeding:**
- Tests don't use Dexie in-memory mode
- Pure function tests avoid database dependency

## Test Isolation

**No Shared State:**
- Each test creates fresh fixtures via factory functions
- No `beforeEach` hooks to manage setup/teardown
- Tests are independent (can run in any order)

**Per-Test Isolation:**
```typescript
it('Test 1', () => {
  const product = makeProduct(5);
  const result = checkStockBeforeAdd(product, []);
  expect(result).toEqual({ added: true });
});

it('Test 2', () => {
  const product = makeProduct(0);  // Fresh fixture
  const result = checkStockBeforeAdd(product, []);
  expect(result).toEqual({ added: false, reason: 'out_of_stock' });
});
```

## Test Execution

**Running Tests:**
```bash
# Client workspace
cd client
npm run test

# Server workspace
cd server
npm run test

# Root (runs both)
npm run test --workspaces
```

**Watch Mode:**
- Not configured in `package.json`
- Run manually if needed: `npm run test -- --watch`

**CI/CD:**
- Tests not yet integrated into GitHub Actions
- Would be added to `.github/workflows/` when CI/CD phase implemented

---

*Testing analysis: 2026-03-24*
