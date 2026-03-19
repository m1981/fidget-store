# CLAUDE.md — Fidget Fun!

## Project
"Fidget Fun!" — mobile-first PWA e-commerce for 3D-printed fidget toys. Poland market, PLN only.
Run by two kids (Leo & Sam) + Uncle Mike. Weekly Drop model, scarcity-driven.

## Tech Stack
- **SvelteKit 5** with **Svelte 5** (runes syntax: `$state`, `$derived`, `$effect`, `$props`)
- **TypeScript** — strict mode
- **Tailwind CSS 4** — utility-first, no component libraries
- **Drizzle ORM** + **PostgreSQL** (Neon)
- **pnpm** — always use pnpm, never npm or yarn
- **Vercel** — deployment target (`adapter-auto` — currently in svelte.config.js)
- **Vitest** — unit/integration tests (browser via Playwright, server via node)

## Commands
```bash
pnpm dev               # dev server
pnpm build             # production build
pnpm check             # svelte-check + tsc
pnpm lint              # eslint
pnpm test              # vitest (all projects)
pnpm test:unit         # unit tests only (server + client projects)
pnpm test:integration  # integration tests only (requires DATABASE_URL)
pnpm test:watch        # watch mode
pnpm db:push           # push schema to DB (requires DATABASE_URL)
pnpm db:generate       # generate migrations
pnpm db:studio         # drizzle studio
pnpm db:seed           # seed initial data
```

## Domain Model

Capacity is tracked in **Production Minutes** (not item slots). A single Drop owns all capacity.

| Entity | Key fields |
|---|---|
| `product` | id, name, description, print_duration_minutes, price_pln, inpost_gabaryt, is_active |
| `product_variant` | id, product_id, filament_color, hex_code, is_mystery, is_active |
| `drop` | id, status (DRAFT/ACTIVE/CLOSED), opens_at, closes_at, total_capacity_minutes, allocated_minutes |
| `drop_product` | drop_id, product_id (junction — which products are in a drop) |
| `order` | id (uuid), drop_id, status (see state machine), customer_email, customer_phone, inpost_point_id, total_pln, locked_minutes, locked_until, payment_gateway_id, tracking_number |
| `order_item` | id, order_id, variant_id, quantity, status (PENDING/PRINTED), printed_at |
| `global_settings` | id=1 (single row), printer_is_on, status_message, active_window_start_hour, active_window_end_hour, turnaround_buffer_minutes, mystery_box_minutes |

### Order State Machine
`PENDING_PAYMENT` → `PAID` → `PRINTING` → `PACKED` → `SHIPPED` → `DELIVERED`
Side exits: `CANCELLED` (BLIK timeout), `REFUNDED` (admin action)

## Business Rules (always enforce)
- **Factory Switch:** when `printer_is_on = false`, add-to-cart and checkout are disabled
- **Capacity unit:** Production Minutes. `drop.allocated_minutes + cart_minutes <= drop.total_capacity_minutes`
- **Soft Lock:** on BLIK initiation, increment `drop.allocated_minutes` + set `order.locked_until = now() + 3 min`
- **Hard Deduction:** on payment webhook `PAID` — `locked_until` cleared; allocation stays
- **Lock Release:** Vercel Cron `/api/cron/release-locks` — expired locks restore `allocated_minutes`, set order `CANCELLED`
- **Currency:** PLN only, store as integer cents (grosz), display with `zł`
- **No fake discounts:** no strikethrough pricing (Polish Omnibus law — no `compare_at_price` field)
- **BLIK:** 2-minute UI countdown timer; backend lock = 3 minutes
- **Guest checkout:** no mandatory account creation
- **Mystery Box:** variant with `is_mystery = true`; uses `global_settings.mystery_box_minutes` for capacity math
- **FIFO Allocation:** Makers tap `[+1]`; system finds oldest `PRINTING` order for that variant → marks item `PRINTED`
- **InPost Gabaryt:** auto-calculated as `MAX(gabaryt)` across order items at fulfillment time
- **Drop Close:** when Admin closes drop, all PAID orders automatically advance to PRINTING (unlocks Makers view)

## Coding Conventions
- Use **Svelte 5 runes** everywhere — no `export let`, no `$:`, no `writable()`
- **Inline prop types** — use `let { x }: { x: string } = $props()`, NOT `interface Props {}` (causes parse errors without script preprocessing)
- **`$derived` for page data** — always `const foo = $derived(data.foo)` in components, never destructure `data` directly (avoids `state_referenced_locally` warning)
- **`untrack(() => value)`** — use when intentionally capturing a prop's initial value without reactivity (e.g. timers)
- Server logic in `src/lib/server/` only — never import server modules in client code
- Database access only in `+page.server.ts` / `+server.ts` / `src/lib/server/`
- Use SvelteKit **form actions** for mutations (not fetch-based where possible)
- Tailwind classes directly on elements — no `@apply` in CSS
- Keep components small and focused; co-locate component-specific logic
- TypeScript: infer types from Drizzle schema using `$inferSelect` / `$inferInsert`
- `$env/dynamic/private` for server-side env vars (works in SvelteKit context; standalone scripts use `import 'dotenv/config'`)

## Svelte Config Note
`svelte.config.js` uses `vitePlugin.dynamicCompileOptions` to enable runes mode — NOT `vitePreprocess`. Do not add `vitePreprocess` back.

## Development Process
- See `docs/PLAN.md` for the full phased implementation plan
- Every business logic module in `src/lib/server/` must have a co-located `.test.ts`
- Run `pnpm test:unit` to validate logic without a DB
- Run `pnpm test:integration` for DB-backed tests (requires `.env` with `DATABASE_URL`)
- Run `pnpm check` and fix all problems before committing
- Update `docs/PLAN.md` after finishing each phase/increment

## Implementation Status
- **Phase 0** ✅ — Schema + capacity engine (34 tests)
- **Phase 1** ✅ — Customer storefront `/(shop)` (95 unit + integration tests)
- **Phase 2** ✅ — Admin panel `/admin` (auth, factory switch, orders, drops, cron)
- **Phase 3** ✅ — Makers view `/makers` (PIN auth, FIFO print queue, undo window)
- **Phase 4** 🚀 NEXT — Real integrations (PayU/Przelewy24, InPost, email)

**Current test count: 102 unit tests + 46 integration tests = 148 total**

## Actors / Routes
| Actor | Route | Access |
|---|---|---|
| Customer | `/(shop)` | public |
| Admin | `/admin` | password (ADMIN_PASSWORD env var) |
| Makers | `/makers` | PIN (MAKER_PIN env var) |

## Environment Variables
```
DATABASE_URL=       # Neon PostgreSQL connection string
SESSION_SECRET=     # Secret for HMAC-signed admin session cookies (min 32 chars)
ADMIN_PASSWORD=     # Plaintext admin password (compared timing-safe)
MAKER_PIN=          # Numeric PIN for Makers view
CRON_SECRET=        # Vercel Cron authorization secret (Bearer token)
```
Copy `.env.example` to `.env` to get started.

## Auth Implementation
- **Admin:** `src/lib/server/auth.ts` — scrypt password hash + HMAC-SHA256 session cookies
  - `SESSION_SECRET` env var required; cookie name `admin_session`; 8-hour TTL
- **Makers:** Simple PIN stored in `MAKER_PIN` env var, compared timing-safe; cookie name `maker_session`; 24-hour TTL
- **Cron:** Bearer token in `Authorization` header matched against `CRON_SECRET`

## Key Architecture Decisions
- **Capacity atomicity:** Conditional UPDATE (`WHERE allocated_minutes + X <= total`) — no SELECT FOR UPDATE needed
- **Soft lock storage:** `drop.allocated_minutes` incremented on BLIK init; decremented on cancel/refund only
- **FIFO:** `markNextPrinted(variantId)` finds oldest `PRINTING` order with `PENDING` item → marks PRINTED → auto-PACKED if all done
- **Undo window:** 5 minutes (`UNDO_WINDOW_MS` in `fifo.ts`); `undoLastPrinted` reverts PACKED→PRINTING if needed
- **Drop close flow:** `closeDrop()` → `advancePaidOrdersToPrinting()` in same admin action
