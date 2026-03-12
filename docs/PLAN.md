# Fidget Fun! — Implementation Plan

**Status:** Phase 1 ✅ | Phase 2 ✅ COMPLETE | Phase 3 🚀 NEXT | **Last updated:** 2026-03-13

---

## Resolved Inconsistencies (CLAUDE.md vs DDD doc)

The DDD doc (`02-domain-driven-design-and-rules.md`) is canonical. CLAUDE.md has been updated to match.

| # | Was | Now |
|---|---|---|
| Capacity unit | `capacity_slots_remaining` (items) | `Production Minutes` on `drop` |
| Product time field | `print_time_hours` | `print_duration_minutes` |
| Drop capacity fields | `total_capacity_slots` | `total_capacity_minutes` + `allocated_minutes` |
| Capacity ownership | On `product_variant` | On `drop` (allocated/total) |
| Soft lock | "Decrement on payment" | Soft Lock on BLIK init → Hard Deduct on webhook |
| Order states | Undefined | Full enum state machine |
| Missing product field | — | `inpost_gabaryt` (A/B/C) |
| Missing item status | — | `order_item.status` (PENDING/PRINTED) for FIFO |
| Global settings | `estimated_ship_days` (crude) | `active_window_start/end_hour` + `turnaround_buffer_minutes` |

---

## Architecture Decisions

- **Capacity** lives on `drop.allocated_minutes` — atomically updated with `SELECT FOR UPDATE`
- **Soft Lock** = `drop.allocated_minutes` incremented on BLIK initiation + `order.locked_until` set to `now() + 3 min`
- **Hard Deduction** = no additional change (already allocated); `order.locked_until` cleared on `PAID`
- **Soft Lock Release** = Vercel Cron (`/api/cron/release-locks`) runs every minute; decrements `allocated_minutes` for expired locks, sets order to `CANCELLED`
- **FIFO Allocation** = on Maker `[+1]`, query oldest `PAID` order containing that variant → mark item `PRINTED`
- **InPost Gabaryt** = auto-calculated at fulfillment as `MAX(gabaryt)` across order items (A < B < C)
- **Mystery Box** = `is_mystery = true` on variant; uses `global_settings.mystery_box_minutes` for capacity math
- **Auth** = Admin: bcrypt password hash in env; Makers: PIN in env; sessions via SvelteKit cookies

---

## Phase 0 — Schema & Foundation ✅ COMPLETE

**Goal:** DB schema, business logic module, DB client, Vitest coverage.

- [x] `src/lib/server/db/schema.ts` — Drizzle schema (all tables + enums)
- [x] `src/lib/server/db/index.ts` — Neon postgres client
- [x] `src/lib/server/capacity.ts` — Capacity engine (pure functions, no DB)
- [x] `src/lib/server/capacity.test.ts` — 34 tests passing
- [ ] `pnpm db:push` — apply schema to Neon (requires DATABASE_URL in .env)

**Outcome:** Schema defined, 34 capacity engine tests green, types exported for use across the app.

---

## Phase 1 — Customer Storefront `/(shop)` ✅ COMPLETE

**Goal:** Full purchase flow for a customer on mobile.

**Architecture notes:**
- Cart is client-side `$state` in `src/lib/cart.svelte.ts`, persisted to `sessionStorage`
- Checkout sends only `variantId + quantity`; server re-validates prices and capacity from DB
- Atomic soft lock uses Drizzle UPDATE with conditional WHERE (no SELECT FOR UPDATE needed)
- BLIK payment gateway call is **stubbed** — real integration is Phase 4

**Testing Coverage:**
- ✅ **Unit Tests**: 64 tests passing (formatting, capacity, orders, components)
- ✅ **Integration Tests**: 11 tests passing (soft lock, payment confirmation, capacity restoration)
- 📊 **Test Infrastructure**: Vitest with 3 projects (client, server, integration)

### Files
| File | Status | Purpose |
|---|---|---|
| `src/lib/formatting.ts` | [x] | PLN formatter, status labels, print time display |
| `src/lib/formatting.test.ts` | [x] | 16 tests |
| `src/lib/server/orders.ts` | [x] | Pure order logic: validateDropIsOpen, computeTotal, lock expiry |
| `src/lib/server/orders.test.ts` | [x] | 14 tests |
| `src/lib/server/db/queries.ts` | [x] | All DB interactions |
| `src/lib/cart.svelte.ts` | [x] | Client cart state (runes, sessionStorage) |
| `src/routes/(shop)/+layout.server.ts` | [x] | Load global_settings + active drop |
| `src/routes/(shop)/+layout.svelte` | [x] | Shop shell with header |
| `src/routes/(shop)/+page.server.ts` | [x] | Load drop products |
| `src/routes/(shop)/+page.svelte` | [x] | Homepage: status, countdown, product grid |
| `src/routes/(shop)/products/[id]/+page.server.ts` | [x] | Load product + variants |
| `src/routes/(shop)/products/[id]/+page.svelte` | [x] | PDP: swatches, print time, Add to Cart |
| `src/routes/(shop)/checkout/+page.server.ts` | [x] | Checkout action: capacity + order creation |
| `src/routes/(shop)/checkout/+page.svelte` | [x] | Checkout form + BLIK timer |
| `src/routes/(shop)/orders/[id]/+page.server.ts` | [x] | Load order |
| `src/routes/(shop)/orders/[id]/+page.svelte` | [x] | Order status display |
| `src/routes/api/webhook/payment/+server.ts` | [x] | Payment webhook (signature stubbed) |
| `src/lib/components/PrinterStatus.svelte` | [x] | Factory Switch widget |
| `src/lib/components/DropCountdown.svelte` | [x] | Live drop countdown |
| `src/lib/components/ScarcityBadge.svelte` | [x] | Remaining capacity badge |
| `src/lib/components/ColorSwatch.svelte` | [x] | Filament colour picker |
| `src/lib/components/BlikTimer.svelte` | [x] | 2-min countdown + BLIK input |
| `src/lib/components/BlikTimer.svelte.test.ts` | [x] | Component tests |

### Integration Tests
| File | Status | Tests | Purpose |
|---|---|---|---|
| `src/lib/test-helpers/db-setup.ts` | [x] | - | Test data factories & cleanup utilities |
| `src/lib/server/db/soft-lock.integration.test.ts` | [x] | 8 | Order creation, soft lock, payment confirmation |
| `src/lib/server/db/capacity-restoration.integration.test.ts` | [x] | 3 | Expired lock release, capacity restoration |

**Test Commands:**
```bash
pnpm test              # Run all tests
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:watch        # Watch mode
```

---

## Phase 2 — Admin Panel `/admin` ✅ COMPLETE

**Goal:** Uncle Mike can operate the business without touching code.

**Test Coverage:**
- 9 auth unit tests (scrypt password hashing, HMAC session tokens)
- 12 admin queries integration tests (factory switch, order filters, ship, refund, stats)
- 14 drop management integration tests (create → publish → close lifecycle, product assignment)
- **37 integration tests total | 95 unit tests total**

### Implementation Strategy (COMPLETED)

Sub-phases completed:
1. **Phase 2A** ✅: Auth module, admin queries, login, dashboard, factory switch, orders list/detail
2. **Phase 2B** ✅: Drop management (create/edit/publish/close, product assignment)
3. **Phase 2C** ✅: Cron endpoint `/api/cron/release-locks` + `vercel.json`

---

### Phase 2A — Critical Operations ✅

**Goal:** Enable day-to-day business operations

#### Routes to Implement
| Priority | File | Purpose | Complexity |
|---|---|---|---|
| 🔴 HIGH | `src/routes/admin/+layout.server.ts` | Auth guard (password check) | Low |
| 🔴 HIGH | `src/routes/admin/+layout.svelte` | Admin shell with navigation | Low |
| 🔴 HIGH | `src/routes/admin/+page.svelte` | Dashboard overview (stats) | Medium |
| 🔴 HIGH | `src/routes/admin/factory/+page.server.ts` | Factory Switch actions | Low |
| 🔴 HIGH | `src/routes/admin/factory/+page.svelte` | Toggle + status message form | Low |
| 🔴 HIGH | `src/routes/admin/orders/+page.server.ts` | Order list with filters | Medium |
| 🔴 HIGH | `src/routes/admin/orders/+page.svelte` | Order table with status badges | Medium |
| 🔴 HIGH | `src/routes/admin/orders/[id]/+page.server.ts` | Order detail + actions | High |
| 🔴 HIGH | `src/routes/admin/orders/[id]/+page.svelte` | Order detail view + fulfillment | High |

#### Database Queries to Add
```typescript
// src/lib/server/db/queries.ts

// Factory Switch
export async function updateFactorySwitch(isOn: boolean, message: string)
export async function getFactoryStatus()

// Order Management
export async function getOrdersWithFilters(filters: OrderFilters)
export async function getOrderById(orderId: string)
export async function markOrderAsShipped(orderId: string, trackingNumber: string)
export async function refundOrder(orderId: string)

// Dashboard Stats
export async function getDashboardStats()
```

#### Auth Implementation
```typescript
// src/lib/server/auth.ts
export function hashPassword(password: string): Promise<string>
export function verifyPassword(password: string, hash: string): Promise<boolean>
export function createAdminSession(cookies: Cookies): void
export function verifyAdminSession(cookies: Cookies): boolean
```

**Deliverables:**
- ✅ Admin can log in with password
- ✅ Admin can toggle Factory Switch ON/OFF
- ✅ Admin can view all orders with status filters
- ✅ Admin can view order details
- ✅ Admin can mark orders as shipped (manual tracking number entry)
- ✅ Admin can issue refunds

**Testing:**
- Integration tests for order management queries
- Integration tests for refund flow (capacity restoration)

---

### Phase 2B — Drop Management ✅

**Goal:** Create and manage weekly drops

#### Routes to Implement
| Priority | File | Purpose | Complexity |
|---|---|---|---|
| 🟡 MEDIUM | `src/routes/admin/drops/+page.server.ts` | List all drops | Low |
| 🟡 MEDIUM | `src/routes/admin/drops/+page.svelte` | Drop list with status | Low |
| 🟡 MEDIUM | `src/routes/admin/drops/new/+page.server.ts` | Create drop action | Medium |
| 🟡 MEDIUM | `src/routes/admin/drops/new/+page.svelte` | Drop creation form | Medium |
| 🟡 MEDIUM | `src/routes/admin/drops/[id]/+page.server.ts` | Edit drop, assign products | High |
| 🟡 MEDIUM | `src/routes/admin/drops/[id]/+page.svelte` | Drop editor with product picker | High |

#### Database Queries to Add
```typescript
// Drop Management
export async function getAllDrops()
export async function createDrop(data: NewDrop)
export async function updateDrop(dropId: number, data: Partial<Drop>)
export async function publishDrop(dropId: number)
export async function closeDrop(dropId: number)
export async function assignProductsToDrop(dropId: number, productIds: number[])
export async function getDropProducts(dropId: number)
```

**Deliverables:**
- ✅ Admin can view all drops (past, active, draft)
- ✅ Admin can create new drop with capacity and dates
- ✅ Admin can assign products to a drop
- ✅ Admin can publish a drop (DRAFT → ACTIVE)
- ✅ Admin can close a drop (ACTIVE → CLOSED)

**Testing:**
- Integration tests for drop lifecycle (create → publish → close)
- Integration tests for product assignment

---

### Phase 2C — Automation ✅

**Goal:** Automated processes and UX improvements

#### Routes to Implement
| Priority | File | Purpose | Complexity |
|---|---|---|---|
| 🟢 LOW | `src/routes/api/cron/release-locks/+server.ts` | Vercel Cron: release expired soft locks | Low |
| 🟢 LOW | `src/routes/admin/products/+page.server.ts` | Product management (optional) | Medium |

#### Cron Job Setup
```typescript
// src/routes/api/cron/release-locks/+server.ts
import { releaseExpiredSoftLocks } from '$lib/server/db/queries';

export async function GET({ request }) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await releaseExpiredSoftLocks();
  return json({ released: result.released });
}
```

**Vercel Configuration:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/release-locks",
    "schedule": "* * * * *"
  }]
}
```

**Deliverables:**
- ✅ Automated soft lock release (every minute)
- ✅ Admin dashboard with real-time stats
- ✅ Bulk operations (optional: bulk refund, bulk ship)

**Testing:**
- Integration test for cron endpoint
- E2E test for admin login flow

---

## Phase 3 — Makers View `/makers` 🚀 NEXT

**Goal:** Leo & Sam can manage their print queue from a phone.

### Routes
| File | Purpose |
|---|---|
| `src/routes/makers/+layout.server.ts` | PIN auth guard |
| `src/routes/makers/+page.server.ts` | Load PrintBatch for latest CLOSED drop |
| `src/routes/makers/+page.svelte` | Print Batch list grouped by filament + model |
| `src/routes/makers/+page.server.ts` | `[+1]` / `[-1]` FIFO allocation actions |

### Tests
- `src/lib/server/fifo.test.ts` — FIFO allocation logic, undo window

---

## Phase 4 — Integrations

| Integration | Where | Notes |
|---|---|---|
| PayU/Przelewy24 | `src/lib/server/payment.ts` | BLIK initiation + webhook signature validation |
| InPost Geowidget | `InPostWidget.svelte` | Client-side embed, result passed via hidden form field |
| InPost Label API | `src/lib/server/inpost.ts` | Server-only, called from admin fulfillment action |
| Email (Resend) | `src/lib/server/notifications.ts` | Order confirmation, status updates |
| SMS (optional) | `src/lib/server/notifications.ts` | smsapi.pl or Twilio |

---

## Data Flow Summary

```
Customer adds to cart
    └─> client $state (sessionStorage)

Customer initiates checkout
    └─> +page.server.ts action
        ├─> validateCapacity() — pure function check
        ├─> INSERT order (PENDING_PAYMENT) + soft lock allocated_minutes
        └─> call payment gateway BLIK API

Payment gateway webhook POST /api/webhook/payment
    └─> verify signature
    └─> UPDATE order SET status = PAID, locked_until = NULL

Vercel Cron /api/cron/release-locks (every minute)
    └─> find orders WHERE status = PENDING_PAYMENT AND locked_until < now()
    └─> UPDATE drop SET allocated_minutes -= order.locked_minutes
    └─> UPDATE order SET status = CANCELLED

Drop closes (manual by Admin or scheduled)
    └─> UPDATE all PAID orders SET status = PRINTING
    └─> Makers view becomes available

Maker taps [+1] on a print job
    └─> FIFO: find oldest PAID order with that variant
    └─> UPDATE order_item SET status = PRINTED
    └─> IF all items PRINTED: UPDATE order SET status = PACKED, notify Admin

Admin generates InPost label
    └─> calculate MAX(gabaryt) from order items
    └─> call InPost API
    └─> store tracking_number, UPDATE order SET status = SHIPPED
```
