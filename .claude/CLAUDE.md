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
- **Vercel** — deployment target (`adapter-vercel`)
- **Vitest** — unit/integration tests (browser via Playwright, server via node)

## Commands
```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm check        # svelte-check + tsc
pnpm lint         # eslint
pnpm test         # vitest (all)
pnpm db:push      # push schema to DB (requires DATABASE_URL)
pnpm db:generate  # generate migrations
pnpm db:studio    # drizzle studio
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
- **FIFO Allocation:** Makers tap `[+1]`; system finds oldest `PAID` order for that variant → marks item `PRINTED`
- **InPost Gabaryt:** auto-calculated as `MAX(gabaryt)` across order items at fulfillment time

## Coding Conventions
- Use **Svelte 5 runes** everywhere — no `export let`, no `$:`, no `writable()`
- Server logic in `src/lib/server/` only — never import server modules in client code
- Database access only in `+page.server.ts` / `+server.ts` / `src/lib/server/`
- Use SvelteKit **form actions** for mutations (not fetch-based where possible)
- Tailwind classes directly on elements — no `@apply` in CSS
- Keep components small and focused; co-locate component-specific logic
- TypeScript: infer types from Drizzle schema using `$inferSelect` / `$inferInsert`

## Development Process

- See `docs/PLAN.md` for the full phased implementation plan
- Phase 0 (schema + business logic) must be complete before any routes
- Every business logic module in `src/lib/server/` must have a co-located `.test.ts`
- Run `pnpm test` (server project) to validate logic without a DB
- Run `pnpm check` and fix all problems if any 
- Update PLAN after you finish implementation and tests are passing. 

## Actors / Routes
| Actor | Route | Access |
|---|---|---|
| Customer | `/(shop)` | public |
| Admin | `/admin` | protected (simple password or magic link) |
| Makers | `/makers` | protected (read-only PIN) |

## Environment Variables
```
DATABASE_URL=          # Neon PostgreSQL connection string
```
Copy `.env.example` to `.env` to get started.
