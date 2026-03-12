# Testing Guide - Fidget Fun!

## Test Structure

### 1. Unit Tests (60-70% coverage)
Pure function tests with no external dependencies.

**Location**: `src/**/*.{test,spec}.ts` and `src/**/*.svelte.{test,spec}.ts`

**Examples**:
- `src/lib/formatting.test.ts` - Currency, time, status formatting
- `src/lib/server/capacity.test.ts` - Capacity calculation logic
- `src/lib/components/BlikTimer.svelte.test.ts` - UI component behavior

**Run**: `pnpm test:unit`

### 2. Integration Tests (20-30% coverage) ✅ NEW!
Tests that verify components work together with real database.

**Location**: `src/**/*.integration.{test,spec}.ts`

**Test Files**:
- `src/lib/server/db/soft-lock.integration.test.ts` (8 tests)
  - Order creation with soft lock
  - Capacity deduction
  - Payment confirmation

- `src/lib/server/db/capacity-restoration.integration.test.ts` (3 tests)
  - Expired soft lock release
  - Multiple expired locks

**Run**: `pnpm test:integration`

---

## Running Tests

```bash
# Run all tests (unit + integration)
pnpm test

# Run only unit tests
pnpm test:unit

# Run only integration tests
pnpm test:integration

# Watch mode (auto-rerun on file changes)
pnpm test:watch
```

---

## Writing Integration Tests

### Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSetup, cleanupTestData, ensureGlobalSettings } from '$lib/test-helpers/db-setup';

describe('My Test Suite', () => {
  let testDropId: number;
  let testProductId: number;
  let testVariantId: number;

  beforeEach(async () => {
    await ensureGlobalSettings();
    const setup = await createTestSetup();
    testDropId = setup.dropId;
    testProductId = setup.productId;
    testVariantId = setup.variantId;
  });

  afterEach(async () => {
    await cleanupTestData({ dropId: testDropId, productId: testProductId, variantId: testVariantId });
  });

  it('should do something', async () => {
    // Arrange, Act, Assert
  });
});
```

### Test Helpers (`src/lib/test-helpers/db-setup.ts`)

- **`createTestSetup()`** - Creates drop + product + variant
- **`createTestDrop(overrides?)`** - Creates a test drop
- **`createTestProduct(overrides?)`** - Creates a test product
- **`createTestVariant(productId, overrides?)`** - Creates a variant
- **`cleanupTestData(ids)`** - Deletes test data by ID
- **`ensureGlobalSettings()`** - Ensures global_settings exists
- **`getDropAllocatedMinutes(dropId)`** - Checks capacity

---

## Current Coverage

### Integration Tests (11 tests, all passing ✅)

**Soft Lock** (8 tests):
- ✅ Creates order and applies soft lock
- ✅ Sets correct locked_minutes and locked_until
- ✅ Rejects when capacity insufficient
- ✅ Allows exact capacity fit
- ✅ Handles multiple items
- ✅ Converts soft lock to hard lock on payment
- ✅ Rejects non-existent payment
- ✅ Prevents double confirmation

**Capacity Restoration** (3 tests):
- ✅ Releases expired soft locks
- ✅ Handles multiple expired locks
- ✅ Preserves non-expired locks

---

## Best Practices

1. **Test Isolation**: Use `beforeEach`/`afterEach` with specific IDs
2. **Descriptive Names**: `should reject order when capacity is insufficient`
3. **Arrange-Act-Assert**: Clear test structure
4. **Test Both Paths**: Happy path AND error cases

---

## Next Steps

### Phase 2: Additional Integration Tests
1. FIFO Allocation (Makers' workflow)
2. Factory Switch (Checkout blocking)
3. Mystery Box (Fixed capacity)
4. InPost Gabaryt (Parcel size)

### Phase 3: E2E Tests (Future)
1. BLIK Purchase Flow
2. Capacity Sold Out UI
3. Order Tracking

---

**Status**: ✅ 11 integration tests passing  
**Last Updated**: 2026-03-12

