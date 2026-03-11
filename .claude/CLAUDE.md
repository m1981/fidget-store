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
| Entity | Key fields |
|---|---|
| `product` | id, name, description, print_time_hours, base_price_pln, is_active |
| `product_variant` | id, product_id, filament_color, hex_code, capacity_slots_remaining |
| `drop` | id, opens_at, closes_at, total_capacity_slots |
| `order` | id, drop_id, status, customer_email, customer_phone, inpost_point_id, total_pln |
| `order_item` | id, order_id, variant_id, quantity |
| `global_settings` | id (single row), printer_is_on, status_message, estimated_ship_days |

## Business Rules (always enforce)
- **Factory Switch:** when `printer_is_on = false`, add-to-cart and checkout are disabled
- **Capacity:** decrement `capacity_slots_remaining` on confirmed payment, not on cart add
- **Currency:** PLN only, store as integer cents (grosz), display with `zł`
- **No fake discounts:** no strikethrough pricing (Polish Omnibus law)
- **BLIK:** 2-minute countdown timer; payment timeout = order cancellation + capacity restore
- **Guest checkout:** no mandatory account creation
- **Mystery Box:** single variant with `is_mystery = true`, bypasses color selection

## Coding Conventions
- Use **Svelte 5 runes** everywhere — no `export let`, no `$:`, no `writable()`
- Server logic in `src/lib/server/` only — never import server modules in client code
- Database access only in `+page.server.ts` / `+server.ts` / `src/lib/server/`
- Use SvelteKit **form actions** for mutations (not fetch-based where possible)
- Tailwind classes directly on elements — no `@apply` in CSS
- Keep components small and focused; co-locate component-specific logic
- TypeScript: infer types from Drizzle schema using `$inferSelect` / `$inferInsert`

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
