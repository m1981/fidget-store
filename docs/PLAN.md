# Fidget Fun! — Implementation Plan

**Status:** Phase 0 in progress | **Last updated:** 2026-03-11

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

## Phase 0 — Schema & Foundation ✅ IN PROGRESS

**Goal:** DB schema, business logic module, DB client, Vitest coverage.

- [x] `src/lib/server/db/schema.ts` — Drizzle schema (all tables + enums)
- [x] `src/lib/server/db/index.ts` — Neon postgres client
- [x] `src/lib/server/capacity.ts` — Capacity engine (pure functions, no DB)
- [x] `src/lib/server/capacity.test.ts` — Vitest tests for capacity engine
- [ ] `pnpm db:push` — apply schema to Neon (requires DATABASE_URL)
- [ ] `.env` setup

**Outcome:** Schema is live, all business logic is tested, types exported for use across the app.

---

## Phase 1 — Customer Storefront `/(shop)`

**Goal:** Full purchase flow for a customer on mobile.

### Routes
| File | Purpose |
|---|---|
| `src/routes/(shop)/+layout.server.ts` | Load `global_settings` + active `drop` for all shop pages |
| `src/routes/(shop)/+page.svelte` | Homepage: Factory Switch widget, Drop countdown, product grid |
| `src/routes/(shop)/products/[id]/+page.server.ts` | Load product + variants |
| `src/routes/(shop)/products/[id]/+page.svelte` | PDP: swatches, print time widget, Add to Cart |
| `src/routes/(shop)/checkout/+page.server.ts` | Capacity validation action, BLIK initiation action |
| `src/routes/(shop)/checkout/+page.svelte` | Checkout form: email/phone, InPost Geowidget, BLIK timer |
| `src/routes/(shop)/orders/[id]/+page.server.ts` | Load order by ID |
| `src/routes/(shop)/orders/[id]/+page.svelte` | Order status display |
| `src/routes/api/webhook/payment/+server.ts` | Payment gateway webhook: hard deduct, order → PAID |

### Components (co-located or `src/lib/components/`)
- `PrinterStatus.svelte` — Factory Switch widget (ON/OFF state)
- `DropCountdown.svelte` — live countdown to drop close
- `ScarcityBadge.svelte` — "Only N minutes left!" display
- `ColorSwatch.svelte` — filament color picker
- `BlikTimer.svelte` — 2-minute countdown + 6-digit input
- `InPostWidget.svelte` — embed InPost Geowidget script

### Tests
- `src/lib/server/checkout.test.ts` — order creation, soft lock logic
- `src/routes/(shop)/checkout/checkout.svelte.test.ts` — BlikTimer component

---

## Phase 2 — Admin Panel `/admin`

**Goal:** Uncle Mike can operate the business without touching code.

### Routes
| File | Purpose |
|---|---|
| `src/routes/admin/+layout.server.ts` | Auth guard (password check) |
| `src/routes/admin/+page.svelte` | Dashboard overview |
| `src/routes/admin/factory/+page.svelte` | Factory Switch toggle + message |
| `src/routes/admin/drops/+page.server.ts` | List drops |
| `src/routes/admin/drops/new/+page.server.ts` | Create drop action |
| `src/routes/admin/drops/[id]/+page.server.ts` | Edit drop, assign products, publish |
| `src/routes/admin/orders/+page.server.ts` | Order list with status filters |
| `src/routes/admin/orders/[id]/+page.server.ts` | Order detail, fulfillment, refund actions |
| `src/routes/api/cron/release-locks/+server.ts` | Vercel Cron: release expired soft locks |

---

## Phase 3 — Makers View `/makers`

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
