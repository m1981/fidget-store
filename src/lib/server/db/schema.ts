import {
	pgTable,
	pgEnum,
	serial,
	uuid,
	text,
	integer,
	boolean,
	timestamp
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const dropStatusEnum = pgEnum('drop_status', ['DRAFT', 'ACTIVE', 'CLOSED']);

export const orderStatusEnum = pgEnum('order_status', [
	'PENDING_PAYMENT',
	'PAID',
	'PRINTING',
	'PACKED',
	'SHIPPED',
	'DELIVERED',
	'CANCELLED',
	'REFUNDED'
]);

export const orderItemStatusEnum = pgEnum('order_item_status', ['PENDING', 'PRINTED']);

export const inpostGabarytEnum = pgEnum('inpost_gabaryt', ['A', 'B', 'C']);

// ─── Tables ───────────────────────────────────────────────────────────────────

/**
 * Single-row configuration table (id is always 1).
 * Controls Factory Switch, active window, and capacity constants.
 */
export const globalSettings = pgTable('global_settings', {
	id: integer('id').primaryKey().default(1),
	printer_is_on: boolean('printer_is_on').notNull().default(false),
	status_message: text('status_message').notNull().default(''),
	/** Hour of day (0-23) when the printer becomes available */
	active_window_start_hour: integer('active_window_start_hour').notNull().default(8),
	/** Hour of day (0-23) when the printer stops for the day */
	active_window_end_hour: integer('active_window_end_hour').notNull().default(18),
	/** Cool-down + bed-scrape buffer between jobs, in minutes */
	turnaround_buffer_minutes: integer('turnaround_buffer_minutes').notNull().default(30),
	/** Fixed capacity cost for a Mystery Box order item */
	mystery_box_minutes: integer('mystery_box_minutes').notNull().default(120)
});

/**
 * A product in the catalog.
 * `price_pln` stored in grosze (integer cents). No compare_at_price — Omnibus compliance.
 */
export const product = pgTable('product', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	/** How long a single unit takes to print, in minutes */
	print_duration_minutes: integer('print_duration_minutes').notNull(),
	/** Price in grosze (1 PLN = 100 grosze) */
	price_pln: integer('price_pln').notNull(),
	/** InPost parcel size required for this product */
	inpost_gabaryt: inpostGabarytEnum('inpost_gabaryt').notNull().default('A'),
	is_active: boolean('is_active').notNull().default(true),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * A colour/filament variant of a product.
 * `is_mystery = true` means no colour selection — used for Mystery Box.
 */
export const productVariant = pgTable('product_variant', {
	id: serial('id').primaryKey(),
	product_id: integer('product_id')
		.notNull()
		.references(() => product.id),
	filament_color: text('filament_color').notNull(),
	hex_code: text('hex_code').notNull(),
	is_mystery: boolean('is_mystery').notNull().default(false),
	is_active: boolean('is_active').notNull().default(true),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * A weekly production window. Capacity is tracked in Production Minutes.
 * `allocated_minutes` is incremented atomically on soft-lock (BLIK initiation).
 */
export const drop = pgTable('drop', {
	id: serial('id').primaryKey(),
	status: dropStatusEnum('status').notNull().default('DRAFT'),
	opens_at: timestamp('opens_at', { withTimezone: true }).notNull(),
	closes_at: timestamp('closes_at', { withTimezone: true }).notNull(),
	/** Total printer time available for this drop window */
	total_capacity_minutes: integer('total_capacity_minutes').notNull(),
	/** Minutes currently allocated (soft-locked + paid). Never manually decremented except on cancellation/refund. */
	allocated_minutes: integer('allocated_minutes').notNull().default(0),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * Junction table: which products are available in a given drop.
 */
export const dropProduct = pgTable('drop_product', {
	drop_id: integer('drop_id')
		.notNull()
		.references(() => drop.id),
	product_id: integer('product_id')
		.notNull()
		.references(() => product.id)
});

/**
 * A customer order. UUID is used as the public-facing identifier.
 *
 * Soft lock fields:
 *   `locked_minutes` — how many drop minutes are held by this pending order
 *   `locked_until`   — when the soft lock expires; NULL after PAID
 */
export const order = pgTable('order', {
	id: uuid('id').primaryKey().defaultRandom(),
	drop_id: integer('drop_id')
		.notNull()
		.references(() => drop.id),
	status: orderStatusEnum('status').notNull().default('PENDING_PAYMENT'),
	customer_email: text('customer_email').notNull(),
	customer_phone: text('customer_phone').notNull(),
	inpost_point_id: text('inpost_point_id').notNull(),
	/** Total order value in grosze */
	total_pln: integer('total_pln').notNull(),
	/** Minutes held in drop.allocated_minutes by this order's soft lock */
	locked_minutes: integer('locked_minutes').notNull().default(0),
	/** Soft lock expiry. NULL = not locked or already confirmed */
	locked_until: timestamp('locked_until', { withTimezone: true }),
	/** Reference returned by the payment gateway on BLIK initiation */
	payment_gateway_id: text('payment_gateway_id'),
	/** InPost tracking number, set when label is generated */
	tracking_number: text('tracking_number'),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/**
 * A line item within an order.
 * `status` drives the Makers' FIFO allocation workflow.
 */
export const orderItem = pgTable('order_item', {
	id: serial('id').primaryKey(),
	order_id: uuid('order_id')
		.notNull()
		.references(() => order.id),
	variant_id: integer('variant_id')
		.notNull()
		.references(() => productVariant.id),
	quantity: integer('quantity').notNull().default(1),
	status: orderItemStatusEnum('status').notNull().default('PENDING'),
	printed_at: timestamp('printed_at', { withTimezone: true })
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type GlobalSettings = typeof globalSettings.$inferSelect;
export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;
export type ProductVariant = typeof productVariant.$inferSelect;
export type NewProductVariant = typeof productVariant.$inferInsert;
export type Drop = typeof drop.$inferSelect;
export type NewDrop = typeof drop.$inferInsert;
export type DropProduct = typeof dropProduct.$inferSelect;
export type Order = typeof order.$inferSelect;
export type NewOrder = typeof order.$inferInsert;
export type OrderItem = typeof orderItem.$inferSelect;
export type NewOrderItem = typeof orderItem.$inferInsert;

export type DropStatus = Drop['status'];
export type OrderStatus = Order['status'];
export type OrderItemStatus = OrderItem['status'];
export type InpostGabaryt = Product['inpost_gabaryt'];
